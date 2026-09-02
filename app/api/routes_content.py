"""Content endpoints: Word-of-Day, News, Podcast, and dictionary lookup."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.schemas.content import DictionaryLookup, NewsPulse, PodcastDigest, WordOfDay
from app.services.dictionary import DictionaryService
from app.services.news import NewsService
from app.services.podcast import PodcastService
from app.services.word_of_day import entry_for_date

router = APIRouter(prefix="/api", tags=["content"])


@router.get("/word-of-day", response_model=WordOfDay)
async def word_of_day(
    day: Annotated[date | None, Query(alias="date")] = None,
) -> WordOfDay:
    return entry_for_date(day or date.today())


@router.get("/news", response_model=NewsPulse)
async def news_pulse(request: Request) -> NewsPulse:
    service: NewsService = request.app.state.news
    return await service.pulse()


@router.get("/podcast-digest", response_model=PodcastDigest)
async def podcast_digest(request: Request) -> PodcastDigest:
    service: PodcastService = request.app.state.podcast
    return await service.digest()


@router.get("/dictionary/lookup", response_model=DictionaryLookup)
async def dictionary_lookup(
    word: Annotated[str, Query(min_length=1, max_length=64)],
    request: Request,
) -> DictionaryLookup:
    service: DictionaryService = request.app.state.dictionary
    return await service.lookup(word)
