# API Reference

Base path: all routes are under `/api` unless noted. Content is JSON; requests
and responses are validated with Pydantic. Error bodies are `{"detail": "..."}`.

## Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | success (201 for created SRS cards) |
| 404 | card/deck not found |
| 422 | validation error (`extra="forbid"` on request models) |
| 429 | rate limit or daily spend budget exceeded |
| 502 | external LLM/Deepgram upstream failure |
| 503 | LLM/Deepgram not configured (missing key) |

## System

### `GET /healthz`
Liveness probe + config flags:
`{"status":"ok","app":"English Cockpit OS","llm_configured":true,"deepgram_configured":true}`

### `GET /healthz/external`
Live (free) reachability probe of Groq and Deepgram:
`{"llm":"ok","deepgram":"ok"}` — each value is `ok`, `error <status>`, or `unconfigured`.

### `GET /`
Serves the kiosk dashboard (`templates/index.html`).

## Content

### `GET /api/word-of-day`
Deterministic daily rotation from a curated list. Optional `?date=YYYY-MM-DD`.

```json
{"date":"2026-09-02","expression":"to push back (on)","kind":"phrasal_verb",
 "ipa":"/pʊʃ bæk/","register_tag":"Professional",
 "definition":"To resist or raise an objection…","examples":["…","…"]}
```

### `GET /api/news`
Three headlines (BBC / The Verge / The Guardian) fetched from RSS concurrently; a
failing feed is skipped. `vocab` is populated only when an LLM key is configured.

```json
{"headlines":[{"source":"BBC Technology","title":"…","link":"https://…",
  "published":"…","vocab":[{"term":"…","definition":"…"}]}]}
```

### `GET /api/podcast-digest`
Latest podcast episodes + a 3-paragraph brief + key terms (LLM, or summaries as
fallback).

```json
{"title":"Morning Brief","brief":["…","…","…"],
 "key_terms":[{"term":"…","definition":"…"}],
 "episodes":[{"title":"…","link":"…","published":"…","summary":"…","audio_url":"…"}]}
```

### `GET /api/word-of-day/entries`
The curated archive list: `[{"expression":"…","kind":"…","register_tag":"…"}, …]`.

### `GET /api/dictionary/lookup?word=<word>`
Click-to-translate lookup (LLM, cached 24 h).

```json
{"word":"resilient","ipa":"/rɪˈzɪl.i.ənt/","part_of_speech":"adjective",
 "synonyms":["tough","sturdy","robust"],"spanish":"resiliente","example":"…"}
```

### `GET /api/speech/connectors`
Returns the list of discourse connectors used for transcript highlighting.

## SRS

### `GET /api/srs/decks`
```json
[{"id":1,"slug":"workplace","name":"Workplace English","description":"…","due_count":12}]
```

### `GET /api/srs/decks/{deck_id}/due?limit=20`
Review cards (`repetitions > 0`) whose `due_at` has passed, ordered oldest-first.

### `GET /api/srs/decks/{deck_id}/new?limit=`
Unseen cards (`repetitions = 0`) to introduce, up to the limit (defaults to
`NEW_CARDS_PER_DAY`).

### `GET /api/srs/stats`
```json
{"cards_due":0,"cards_new":12,"cards_total":12,"reviews_today":0,"streak_days":0,"daily_goal":20}
```

### `GET /api/srs/export`
JSON backup of decks + cards: `{"decks":[…],"cards":[…]}`.

### `POST /api/srs/review`
Grade a card (1–4). Applies SM-2 atomically and records review history.

Request: `{"card_id":1,"grade":3}`
```json
{"card_id":1,"grade":3,"quality":4,"ease_factor":2.5,
 "interval_days":1,"repetitions":1,"due_at":"2026-09-03T22:45:40Z"}
```

### `POST /api/srs/cards`
Create a card (defaults to the first deck when `deck_id` is omitted).

Request: `{"front":"resilient","back":"resiliente","ipa":"/…/","register_tag":"","examples":["…"]}`
→ 201 with the created `CardOut`.

## PREP

### `GET /api/prep/scenario`
Random workplace scenario. `{"id":"scope_creep","context":"…","task":"…"}`

### `POST /api/prep/evaluate`
Evaluate a PREP response (LLM). `scenario` and `response` required; `elapsed_seconds`
optional (0–300).

```json
{"conciseness_score":70,"conciseness_feedback":"…","structure_score":90,
 "structure_feedback":"…","bluf_rewrite":"…","overall_feedback":"…"}
```

## Assist

### `POST /api/declutter`
Polish a draft (LLM). Request `{"draft":"…"}`.

```json
{"word_count_before":12,"word_count_after":7,"reduction_pct":41.7,
 "revised":"…","cut_phrases":["…"],"verb_upgrades":[{"weak":"…","strong":"…"}],
 "tone_assessment":"…"}
```

### `POST /api/voice/turn`
Roleplay partner turn (LLM). Request `{"scenario":"…","user_says":"…","history":[…]}`
(history capped server-side to the last 10 turns).

```json
{"partner_says":"…","follow_up_hint":"…"}
```

### `POST /api/quiz`
Generate a multiple-choice comprehension question (LLM). Request `{"text":"…"}`.

```json
{"question":"…","correct_answer":"…","distractors":["…","…","…"]}
```

### `POST /api/register/rewrite`
Rewrite a sentence in a target register (LLM). Request
`{"text":"…","register_tag":"Executive"}` (`Executive`/`Informal`/`Technical`).

```json
{"rewritten":"…"}
```

### `GET /api/radio/stations`
```json
[{"id":"npr","name":"NPR News","stream_url":"https://…","format":"mp3"},
 {"id":"bbc-radio-4","name":"BBC Radio 4","stream_url":"https://…","format":"mp3"}]
```

### `POST /api/radio/transcribe`
Transcribe a remote audio URL (Deepgram pre-recorded) and highlight connectors.

Request `{"audio_url":"https://…"}` (http/https only; optional `DEEPGRAM_ALLOWED_HOSTS`).
```json
{"text":"However, …","highlights":[{"connector":"however","index":0}]}
```

## WebSockets

### `/ws` — dashboard broadcast bus
- Server → client on connect: `{"type":"hello"}`
- Server → client heartbeat: `{"type":"ping"}` every 25 s; client must reply
  `{"type":"pong"}` or the peer is evicted after 60 s.
- Client → server: `{"type":"ping"}` answered with `{"type":"pong"}`.
- Server → client broadcasts, e.g. `{"type":"radio:transcript","text":"…","final":true}`.

### `/ws/radio` — live transcription relay
- Client sends a JSON text frame `{"type":"start","sample_rate":48000}` to open a
  Deepgram live session.
- Client streams **raw binary** 16-bit little-endian mono PCM frames.
- Client sends `{"type":"stop"}` (or closes) to end.
- Transcripts are broadcast to `/ws` clients as `radio:transcript` messages.
- On failure, server sends `{"type":"error","detail":"…"}`.
