"""LLM-generated grammar drills (phrasal verbs, collocations, use of English,
word forms) and a free-form grammar coach.

Each drill is generated fresh on demand; callers are rate-limited and budgeted
via the shared LLM client.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.schemas.learning import ClozeDrill, DrillKind, GrammarCoachResult, WordFormDrill
from app.services.llm import LLMError, LLMProvider

_KIND_INSTRUCTION: dict[str, str] = {
    "phrasal_verb": (
        "a business-English phrasal verb (e.g. 'to push back on', 'to rule out')"
    ),
    "collocation": (
        "a professional English collocation (e.g. 'meet a deadline', 'reach a decision')"
    ),
    "use_of_english": (
        "a C1-level vocabulary or grammar item in a single gap (Cambridge Use of "
        "English style: one word or short phrase from four options)"
    ),
}

_CLOZE_SYSTEM = (
    "You are an English drill generator for a Spanish-speaking learner at B2→C1. "
    "Generate ONE multiple-choice fill-the-blank exercise about {instruction}. "
    "Write a realistic sentence with a single blank shown as ___ , four options "
    "(only one correct), the correct answer exactly as written in options, and a "
    "one-sentence explanation. Respond ONLY with JSON: "
    '{{"sentence": "string with ___", "options": ["string", "string", "string", "string"], '
    '"answer": "string", "explanation": "string"}}.'
)

_WORD_FORM_SYSTEM = (
    "You are an English word-forms drill generator for a Spanish-speaking learner at "
    "B2→C1. Generate ONE gap-fill where the learner must supply the correct derived "
    "form of a root word. The sentence must contain a single blank shown as ___ . "
    "Respond ONLY with JSON: "
    '{{"sentence": "string with ___", "root": "string", "answer": "string", '
    '"explanation": "string"}}.'
)

_COACH_SYSTEM = (
    "You are an expert English grammar coach for a Spanish-speaking learner at B2→C1. "
    "Answer the learner's question clearly and concisely, explain the rule, contrast it "
    "with common Spanish-speaker errors, and give one or two short examples. Respond "
    'ONLY with JSON: {{"answer": "string"}}.'
)


class _ClozeLLM(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sentence: str
    options: list[str] = Field(default_factory=list)
    answer: str
    explanation: str = ""


class _WordFormLLM(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sentence: str
    root: str
    answer: str
    explanation: str = ""


class _CoachLLM(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str


class GrammarDrillService:
    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    async def drill(self, kind: DrillKind) -> ClozeDrill:
        system = _CLOZE_SYSTEM.format(instruction=_KIND_INSTRUCTION[kind])
        raw = await self._llm.complete_json(system=system, user=kind, max_tokens=400)
        try:
            parsed = _ClozeLLM.model_validate(raw)
        except ValidationError as exc:
            raise LLMError(f"Grammar drill validation failed: {exc}") from exc
        options = parsed.options[:4]
        if parsed.answer not in options:
            raise LLMError("Grammar drill answer is not one of the options")
        return ClozeDrill(
            sentence=parsed.sentence,
            options=options,
            answer=parsed.answer,
            explanation=parsed.explanation,
        )

    async def word_forms(self) -> WordFormDrill:
        raw = await self._llm.complete_json(system=_WORD_FORM_SYSTEM, user="", max_tokens=400)
        try:
            parsed = _WordFormLLM.model_validate(raw)
        except ValidationError as exc:
            raise LLMError(f"Word-forms drill validation failed: {exc}") from exc
        return WordFormDrill(
            sentence=parsed.sentence,
            root=parsed.root,
            answer=parsed.answer,
            explanation=parsed.explanation,
        )

    async def coach(self, question: str) -> GrammarCoachResult:
        raw = await self._llm.complete_json(system=_COACH_SYSTEM, user=question, max_tokens=600)
        try:
            parsed = _CoachLLM.model_validate(raw)
        except ValidationError as exc:
            raise LLMError(f"Grammar coach validation failed: {exc}") from exc
        return GrammarCoachResult(answer=parsed.answer)
