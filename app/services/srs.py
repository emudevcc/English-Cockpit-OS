"""Spaced-repetition persistence service.

Wraps the pure SM-2 engine with SQLite reads/writes. Reviews are applied inside
a single serialized transaction so card state and review history stay atomic.
"""

from __future__ import annotations

import json
from datetime import timedelta

import aiosqlite

from app.core.db import Database
from app.core.timeutil import iso_utc, utc_now
from app.schemas.srs import CardCreateRequest, CardOut, DeckOut, ReviewRequest, ReviewResponse
from app.services.srs_engine import next_repetition


class SrsError(RuntimeError):
    """Raised when an SRS operation cannot be completed."""


class SrsService:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def list_decks(self) -> list[DeckOut]:
        cursor = await self._db.connection.execute(
            "SELECT id, slug, name, description FROM decks ORDER BY id"
        )
        rows = await cursor.fetchall()
        decks: list[DeckOut] = []
        for row in rows:
            decks.append(
                DeckOut(
                    id=row["id"],
                    slug=row["slug"],
                    name=row["name"],
                    description=row["description"],
                    due_count=await self._due_count(row["id"]),
                )
            )
        return decks

    async def due_cards(self, deck_id: int, limit: int = 20) -> list[CardOut]:
        now = iso_utc(utc_now())
        cursor = await self._db.connection.execute(
            "SELECT * FROM cards WHERE deck_id = ? AND due_at <= ? ORDER BY due_at ASC LIMIT ?",
            (deck_id, now, limit),
        )
        rows = await cursor.fetchall()
        return [_card_out(row) for row in rows]

    async def get_card(self, card_id: int) -> CardOut | None:
        cursor = await self._db.connection.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
        row = await cursor.fetchone()
        return _card_out(row) if row is not None else None

    async def review(self, request: ReviewRequest) -> ReviewResponse:
        card_id = request.card_id
        async with self._db.transaction() as conn:
            cursor = await conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
            row = await cursor.fetchone()
            if row is None:
                raise SrsError(f"Card {card_id} not found")
            card = _card_out(row)

            outcome = next_repetition(
                ease_factor=card.ease_factor,
                interval_days=card.interval_days,
                repetitions=card.repetitions,
                grade=request.grade,
            )

            now = utc_now()
            due_at = iso_utc(now + timedelta(days=outcome.interval_days))
            now_iso = iso_utc(now)

            await conn.execute(
                "UPDATE cards "
                "SET ease_factor = ?, interval_days = ?, repetitions = ?, "
                "    due_at = ?, updated_at = ? "
                "WHERE id = ?",
                (
                    outcome.ease_factor,
                    outcome.interval_days,
                    outcome.repetitions,
                    due_at,
                    now_iso,
                    card_id,
                ),
            )
            await conn.execute(
                "INSERT INTO reviews "
                "(card_id, grade, quality, ease_factor_before, ease_factor_after, "
                " interval_before, interval_after) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    card_id,
                    request.grade,
                    outcome.quality,
                    card.ease_factor,
                    outcome.ease_factor,
                    card.interval_days,
                    outcome.interval_days,
                ),
            )

            return ReviewResponse(
                card_id=card_id,
                grade=request.grade,
                quality=outcome.quality,
                ease_factor=outcome.ease_factor,
                interval_days=outcome.interval_days,
                repetitions=outcome.repetitions,
                due_at=due_at,
            )

    async def add_card(self, request: CardCreateRequest) -> CardOut:
        deck_id = request.deck_id or await self._default_deck_id()
        if deck_id is None:
            raise SrsError("No deck available")

        due_at = iso_utc(utc_now())
        async with self._db.transaction() as conn:
            cursor = await conn.execute("SELECT id FROM decks WHERE id = ?", (deck_id,))
            if await cursor.fetchone() is None:
                raise SrsError(f"Deck {deck_id} not found")
            cursor = await conn.execute(
                "INSERT INTO cards "
                "(deck_id, front, back, ipa, register_tag, examples, due_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    deck_id,
                    request.front,
                    request.back,
                    request.ipa,
                    request.register_tag,
                    json.dumps(request.examples),
                    due_at,
                ),
            )
            card_id = cursor.lastrowid
            if card_id is None:
                raise SrsError("Failed to create card")

        card = await self.get_card(card_id)
        if card is None:
            raise SrsError("Failed to create card")
        return card

    async def _default_deck_id(self) -> int | None:
        cursor = await self._db.connection.execute("SELECT id FROM decks ORDER BY id LIMIT 1")
        row = await cursor.fetchone()
        return int(row["id"]) if row is not None else None

    async def _due_count(self, deck_id: int) -> int:
        now = iso_utc(utc_now())
        cursor = await self._db.connection.execute(
            "SELECT COUNT(*) AS n FROM cards WHERE deck_id = ? AND due_at <= ?",
            (deck_id, now),
        )
        row = await cursor.fetchone()
        return int(row["n"]) if row is not None else 0


def _card_out(row: aiosqlite.Row) -> CardOut:
    return CardOut(
        id=row["id"],
        deck_id=row["deck_id"],
        front=row["front"],
        back=row["back"],
        ipa=row["ipa"],
        register_tag=row["register_tag"],
        examples=json.loads(row["examples"]),
        ease_factor=row["ease_factor"],
        interval_days=row["interval_days"],
        repetitions=row["repetitions"],
        due_at=row["due_at"],
    )
