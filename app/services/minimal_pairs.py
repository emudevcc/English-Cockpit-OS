"""Curated minimal pairs and pronunciation pitfalls for Spanish speakers.

Deterministic data used by the free pronunciation drill (no LLM, no cost).
"""

from __future__ import annotations

from app.schemas.learning import MinimalPair, Pitfall

MINIMAL_PAIRS: tuple[MinimalPair, ...] = (
    MinimalPair(a="ship", b="sheep", ipa_a="/ʃɪp/", ipa_b="/ʃiːp/"),
    MinimalPair(a="bit", b="beat", ipa_a="/bɪt/", ipa_b="/biːt/"),
    MinimalPair(a="sit", b="seat", ipa_a="/sɪt/", ipa_b="/siːt/"),
    MinimalPair(a="fill", b="feel", ipa_a="/fɪl/", ipa_b="/fiːl/"),
    MinimalPair(a="live", b="leave", ipa_a="/lɪv/", ipa_b="/liːv/"),
    MinimalPair(a="it", b="eat", ipa_a="/ɪt/", ipa_b="/iːt/"),
    MinimalPair(a="van", b="ban", ipa_a="/væn/", ipa_b="/bæn/"),
    MinimalPair(a="vest", b="best", ipa_a="/vest/", ipa_b="/best/"),
    MinimalPair(a="very", b="berry", ipa_a="/ˈveri/", ipa_b="/ˈberi/"),
    MinimalPair(a="think", b="sink", ipa_a="/θɪŋk/", ipa_b="/sɪŋk/"),
    MinimalPair(a="thick", b="sick", ipa_a="/θɪk/", ipa_b="/sɪk/"),
    MinimalPair(a="three", b="tree", ipa_a="/θriː/", ipa_b="/triː/"),
    MinimalPair(a="cat", b="cut", ipa_a="/kæt/", ipa_b="/kʌt/"),
    MinimalPair(a="hat", b="hut", ipa_a="/hæt/", ipa_b="/hʌt/"),
    MinimalPair(a="bed", b="bad", ipa_a="/bed/", ipa_b="/bæd/"),
    MinimalPair(a="pen", b="pan", ipa_a="/pen/", ipa_b="/pæn/"),
    MinimalPair(a="wish", b="witch", ipa_a="/wɪʃ/", ipa_b="/wɪtʃ/"),
    MinimalPair(a="shoes", b="choose", ipa_a="/ʃuːz/", ipa_b="/tʃuːz/"),
    MinimalPair(a="see", b="she", ipa_a="/siː/", ipa_b="/ʃiː/"),
    MinimalPair(a="work", b="walk", ipa_a="/wɜːk/", ipa_b="/wɔːk/"),
    MinimalPair(a="bird", b="board", ipa_a="/bɜːd/", ipa_b="/bɔːd/"),
    MinimalPair(a="eyes", b="ice", ipa_a="/aɪz/", ipa_b="/aɪs/"),
)

SPANISH_PITFALLS: tuple[Pitfall, ...] = (
    Pitfall(issue="/v/ vs /b/", tip="'very' vs 'berry': keep /v/ voiced, lips and teeth."),
    Pitfall(issue="/θ/ vs /s/", tip="'think' vs 'sink': tongue between teeth for 'th'."),
    Pitfall(issue="Short vs long vowels", tip="Lengthen 'sheep' vs 'ship', 'beat' vs 'bit'."),
    Pitfall(issue="Initial s + consonant", tip="Say 'Spain', not 'eSpain': no vowel before sp."),
    Pitfall(issue="Final consonant clusters", tip="Say every consonant in 'asked' and 'texts'."),
    Pitfall(issue="Silent h", tip="Silent in 'hour', 'honest'; keep it in 'house', 'hotel'."),
    Pitfall(issue="/ʃ/ vs /tʃ/", tip="'sheep' vs 'cheap': /ʃ/ smooth, /tʃ/ starts with a stop."),
    Pitfall(issue="/s/ vs /z/ endings", tip="'ice' ends in /s/, 'eyes' in /z/."),
    Pitfall(issue="Word stress", tip="Stress 'DE-ve-lop' but 'in-for-MA-tion'."),
    Pitfall(issue="/d/ vs /ð/", tip="'day' vs 'they': /ð/ is a soft voiced 'th'."),
)
