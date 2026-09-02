"""Spaced-repetition endpoints: decks, due cards, and review grading."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.schemas.srs import CardCreateRequest, CardOut, DeckOut, ReviewRequest, ReviewResponse
from app.services.srs import SrsError, SrsService

router = APIRouter(prefix="/api/srs", tags=["srs"])


@router.get("/decks", response_model=list[DeckOut])
async def list_decks(request: Request) -> list[DeckOut]:
    service: SrsService = request.app.state.srs
    return await service.list_decks()


@router.get("/decks/{deck_id}/due", response_model=list[CardOut])
async def due_cards(
    deck_id: int,
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[CardOut]:
    service: SrsService = request.app.state.srs
    return await service.due_cards(deck_id, limit)


@router.post("/review", response_model=ReviewResponse)
async def review(payload: ReviewRequest, request: Request) -> ReviewResponse:
    service: SrsService = request.app.state.srs
    try:
        return await service.review(payload)
    except SrsError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/cards",
    response_model=CardOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_card(payload: CardCreateRequest, request: Request) -> CardOut:
    service: SrsService = request.app.state.srs
    try:
        return await service.add_card(payload)
    except SrsError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
