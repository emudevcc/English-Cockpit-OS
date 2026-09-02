"""Unit tests for the SRS persistence service and seed data."""

import pytest

from app.core.db import Database
from app.schemas.srs import CardCreateRequest, ReviewRequest
from app.services.srs import SrsError, SrsService
from app.services.srs_seed import DEFAULT_DECK_SLUG, seed_default_deck


async def test_seed_creates_deck_and_cards(database: Database) -> None:
    await seed_default_deck(database)
    service = SrsService(database)
    decks = await service.list_decks()
    assert len(decks) == 1
    assert decks[0].slug == DEFAULT_DECK_SLUG
    assert decks[0].due_count > 0


async def test_seed_is_idempotent(database: Database) -> None:
    await seed_default_deck(database)
    await seed_default_deck(database)
    service = SrsService(database)
    assert len(await service.list_decks()) == 1


async def test_review_updates_card_and_records_history(database: Database) -> None:
    await seed_default_deck(database)
    service = SrsService(database)
    deck = (await service.list_decks())[0]
    card = (await service.due_cards(deck.id))[0]

    response = await service.review(ReviewRequest(card_id=card.id, grade=3))

    assert response.card_id == card.id
    assert response.grade == 3
    assert response.quality == 4
    assert response.interval_days == 1
    assert response.repetitions == 1

    updated = await service.get_card(card.id)
    assert updated is not None
    assert updated.interval_days == 1
    assert updated.repetitions == 1

    cursor = await database.connection.execute(
        "SELECT COUNT(*) FROM reviews WHERE card_id = ?", (card.id,)
    )
    row = await cursor.fetchone()
    assert row is not None
    assert row[0] == 1


async def test_review_applies_sm2_across_repetitions(database: Database) -> None:
    await seed_default_deck(database)
    service = SrsService(database)
    deck = (await service.list_decks())[0]
    card = (await service.due_cards(deck.id))[0]

    first = await service.review(ReviewRequest(card_id=card.id, grade=3))
    second = await service.review(ReviewRequest(card_id=card.id, grade=3))

    assert first.interval_days == 1
    assert second.interval_days == 6
    assert second.repetitions == 2


async def test_review_unknown_card_raises(database: Database) -> None:
    service = SrsService(database)
    with pytest.raises(SrsError):
        await service.review(ReviewRequest(card_id=999999, grade=3))


async def test_add_card_creates_due_card(database: Database) -> None:
    await seed_default_deck(database)
    service = SrsService(database)

    created = await service.add_card(
        CardCreateRequest(front="hello", back="hola", ipa="/həˈloʊ/", examples=["She said hello."])
    )

    assert created.id > 0
    assert created.front == "hello"
    assert created.back == "hola"

    deck = (await service.list_decks())[0]
    due_ids = [card.id for card in await service.due_cards(deck.id)]
    assert created.id in due_ids
