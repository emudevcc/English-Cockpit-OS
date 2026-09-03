# Frontend

Vanilla HTML5 + CSS Grid + ES modules. **No framework, no build step** — the
browser loads modules directly from `/static/js`. Pure logic lives in `lib/` and
is unit-tested with Node's built-in `node:test` (no dependencies).

## Layout

```
static/
  css/cockpit.css             Apple-inspired dark theme + Kindle serif reading + a11y
  js/main.js                  boot: WS client + event bus + module mount + focus/hints
  js/ws_client.js             auto-reconnecting WebSocket (backoff 1s→15s, binary-capable)
  js/lib/                     pure, testable logic
    api.js backoff.js bus.js text.js timer.js speech.js connectors.js highlight.js
    srs.js audio.js word_extract.js pronounce.js shadow.js drill.js dom.js
  js/components/              one DOM module per feature
    word_of_day news podcast radio srs_deck prep_drill grammar declutter voice
    speech_coach dictionary shadowing register weekly_plan stats
templates/index.html         13 <section data-module> cards
```

## Boot sequence (`main.js`)

1. Create the event `bus` and the auto-reconnecting `/ws` client (updates the
   header online/offline badge).
2. Incoming WS messages are dispatched to the bus by `message.type`.
3. Mount each `[data-module]` section into its `[data-slot]` via the `MODULES` map.
4. Init the global click-to-translate dictionary and the focus-mode + hints helpers.

## Cross-cutting interactions

- **Click-to-translate** (`components/dictionary.js`) — a document-level click
  handler uses `caretRangeFromPoint` to extract the word under the cursor
  (`lib/word_extract.js`), then fetches `/api/dictionary/lookup` into a popover
  (with pronounce + add-to-review). It ignores buttons/links/inputs/card-titles.
- **Focus mode** (`main.js`) — clicking a card title toggles `is-focus`, which
  expands that card full-screen (CSS `position: fixed`); ✕ or `Esc` closes it.
- **Hints bar** (`main.js`) — a one-time shortcut hint, dismissed via `localStorage`.

## Live radio transcription flow

```
<audio crossorigin>  ──createMediaElementSource──►  AudioContext (ScriptProcessor)
                                                        │ 16-bit PCM (binary WS frames)
                                                        ▼
                                              /ws/radio  ──►  Deepgram live WS
                                                        │
              /ws  ◄── radio:transcript broadcast ───────┘
               │
               ▼
   radio.js: interim → replace live caption; final → commit to history
```

- `crossorigin="anonymous"` is required so `MediaElementSource` captures the
  cross-origin stream instead of silence.
- `ScriptProcessor` passes audio through by copying input → output (otherwise the
  radio would be muted while transcribing).
- `ws_client.send()` sends `ArrayBuffer`/typed arrays as raw binary frames; control
  messages (`start`/`stop`) are JSON text.

## Feature components

| Component | Interaction |
|---|---|
| `word_of_day` | render + 🔊 pronounce + "Add to review" + ‹ Prev / Next › archive |
| `news` | headlines + vocab + per-headline "Quiz"; auto-refresh 30 min |
| `podcast` | brief + key terms + player (1×/1.25×) + "Transcript" |
| `radio` | station select + player + live caption/transcript + Pause/Clear |
| `srs_deck` | new+due queue (New/Review badge), Space flip, 1–4 grade, 🔊, Export |
| `prep_drill` | 90 s countdown, auto-submit, feedback + "Run again" |
| `grammar` | 7-tab hub: irregular verbs, phrasal verbs, collocations, use of English, word forms, rule of the day, grammar coach (each drill save-to-SRS) |
| `declutter` | Writing Coach: Polish (word-count/verb/tone) + Correct (per-error explanations) tabs |
| `voice` | hold-to-talk → roleplay turn → TTS playback |
| `speech_coach` | Live Metrics (WPM/pace/fillers/cadence HUD) + Monologue (record → LLM feedback) tabs |
| `shadowing` | Pronunciation: Shadow / Minimal Pairs / Dictation tabs |
| `register` | rewrite a sentence as Executive/Informal/Technical/Polite/Hedged |
| `weekly_plan` | goal + minutes + focus chips → LLM seven-day plan (persisted to localStorage) |
| `dictionary` | global click-any-word popover (pronounce + add-to-review) |
| `stats` | header greeting + 🔥 streak + daily-goal progress ring |

## Design language

- **Apple-inspired**: near-black `#000` canvas, `#1c1c1e` cards, Apple system colors
  (`#0a84ff` accent), 16 px radii, layered soft shadows, pill buttons, hairline borders,
  and a subtle top light-catch on cards.
- **Kindle-inspired reading**: a serif stack (Georgia/Iowan) for definitions, examples,
  briefs, transcript captions, and shadowing sentences.
- **Habit-forming**: the header shows a time-of-day greeting, the 🔥 streak, and an
  Apple-Watch-style daily-goal ring (`reviews_today / daily_review_goal`), refreshed
  every minute.

## Performance notes

- All animations are `transform`/`opacity` (GPU-composited); `prefers-reduced-motion`
  is respected.
- Content modules refetch every 30 min and expose Retry buttons; the dictionary and
  news/podcast caches avoid redundant work.
- Transcript history is capped at 50 lines; voice history/log and speech transcript
  are length-capped to keep the DOM bounded.

## Testing

```bash
npm test            # node --test tests/frontend/  (55 tests)
```

Pure logic in `lib/` is covered; DOM components are syntax-checked (`node --check`)
and exercised on-device.
