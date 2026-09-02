"""Tech & Business News Pulse: three curated headlines with key vocabulary.

Each source is fetched concurrently; a single failing feed is skipped rather
than failing the whole pulse. Vocabulary is extracted via the LLM when a key is
configured, otherwise the headline is returned without annotations.
"""

from __future__ import annotations

import asyncio
import logging

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.cache import TTLCache
from app.schemas.content import Headline, NewsPulse, VocabTerm
from app.services.llm import LLMError, LLMProvider
from app.services.rss import FeedItem, fetch_feed

logger = logging.getLogger(__name__)

NEWS_FEEDS: tuple[tuple[str, str], ...] = (
    ("BBC Technology", "http://feeds.bbci.co.uk/news/technology/rss.xml"),
    ("The Verge", "https://www.theverge.com/rss/index.xml"),
    ("The Guardian Technology", "https://www.theguardian.com/uk/technology/rss"),
)

_VOCAB_SYSTEM = (
    "You are an English vocabulary assistant for an advanced (C1/C2) learner. "
    "Given a news headline, extract up to 3 key words or collocations and write a "
    "brief learner-friendly definition for each. Respond ONLY with JSON shaped "
    'exactly like: {"terms": [{"term": "string", "definition": "string"}]}.'
)


class _LLMTerm(BaseModel):
    term: str
    definition: str


class _NewsVocab(BaseModel):
    model_config = ConfigDict(extra="ignore")

    terms: list[_LLMTerm]


class NewsService:
    def __init__(
        self,
        client: httpx.AsyncClient,
        llm: LLMProvider,
        feeds: tuple[tuple[str, str], ...] = NEWS_FEEDS,
        ttl_seconds: float = 600.0,
    ) -> None:
        self._client = client
        self._llm = llm
        self._feeds = feeds
        self._cache = TTLCache[NewsPulse](ttl_seconds)

    async def pulse(self) -> NewsPulse:
        return await self._cache.get("news", self._fetch_pulse)

    async def _fetch_pulse(self) -> NewsPulse:
        results = await asyncio.gather(
            *(self._one_headline(name, url) for name, url in self._feeds),
            return_exceptions=True,
        )
        headlines = [result for result in results if isinstance(result, Headline)]
        return NewsPulse(headlines=headlines[:3])

    async def _one_headline(self, name: str, url: str) -> Headline | None:
        items = await fetch_feed(self._client, url, limit=3)
        if not items:
            return None
        item: FeedItem = items[0]
        vocab = await self._extract_vocab(item.title)
        return Headline(
            source=name,
            title=item.title,
            link=item.link,
            published=item.published,
            vocab=vocab,
        )

    async def _extract_vocab(self, title: str) -> list[VocabTerm]:
        if not self._llm.enabled:
            return []
        try:
            raw = await self._llm.complete_json(system=_VOCAB_SYSTEM, user=title, max_tokens=300)
            parsed = _NewsVocab.model_validate(raw)
        except (LLMError, ValidationError) as exc:
            logger.warning("Vocabulary extraction failed for %r: %s", title, exc)
            return []
        return [VocabTerm(term=t.term, definition=t.definition) for t in parsed.terms][:3]
