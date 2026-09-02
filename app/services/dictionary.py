"""Click-to-translate dictionary lookup via the LLM.

Each word is normalized, lowercased, and cached per-process for a day so repeat
lookups are instant and free (no duplicate LLM spend).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.cache import TTLCache
from app.schemas.content import DictionaryLookup
from app.services.llm import LLMError, LLMProvider

_SYSTEM = (
    "You are an English dictionary for a Spanish-speaking learner. Given a single "
    "English word, return its IPA pronunciation, part of speech, up to 4 common "
    "synonyms, its Spanish translation, and one short example sentence. Respond "
    'ONLY with JSON: {"ipa": "string", "part_of_speech": "string", '
    '"synonyms": ["string"], "spanish": "string", "example": "string"}.'
)


class _Lookup(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ipa: str
    part_of_speech: str = ""
    synonyms: list[str] = Field(default_factory=list)
    spanish: str
    example: str = ""


class DictionaryService:
    def __init__(self, llm: LLMProvider, ttl_seconds: float = 86400.0) -> None:
        self._llm = llm
        self._cache = TTLCache[DictionaryLookup](ttl_seconds)

    async def lookup(self, word: str) -> DictionaryLookup:
        normalized = word.strip().lower()
        return await self._cache.get(normalized, lambda: self._fetch(normalized))

    async def _fetch(self, word: str) -> DictionaryLookup:
        raw = await self._llm.complete_json(system=_SYSTEM, user=word, max_tokens=200)
        try:
            parsed = _Lookup.model_validate(raw)
        except ValidationError as exc:
            raise LLMError(f"Dictionary lookup validation failed: {exc}") from exc
        return DictionaryLookup(
            word=word,
            ipa=parsed.ipa,
            part_of_speech=parsed.part_of_speech,
            synonyms=parsed.synonyms[:4],
            spanish=parsed.spanish,
            example=parsed.example,
        )
