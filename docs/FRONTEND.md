# Frontend

Vanilla HTML5 + CSS Grid + ES modules. **No framework, no build step** — the
browser loads modules directly from `/static/js`. Pure logic lives in `lib/` and
is unit-tested with Node's built-in `node:test` (no dependencies).

## Layout

```
static/
  css/cockpit.css             dark CSS Grid, a11y (focus-visible, aria-live)
  js/main.js                  boot: WS client + event bus + module mount + focus/hints
  js/ws_client.js             auto-reconnecting WebSocket (backoff 1s→15s, binary-capable)
  js/lib/                     pure, testable logic
    api.js backoff.js bus.js text.js timer.js speech.js connectors.js highlight.js
    srs.js audio.js word_extract.js pronounce.js dom.js
  js/components/              one DOM module per feature
    word_of_day news podcast radio srs_deck prep_drill declutter voice speech_coach dictionary
templates/index.html         9 <section data-module> cards
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
| `word_of_day` | render + 🔊 pronounce + "Add to review" (POST `/api/srs/cards`) |
| `news` | headlines + vocab; auto-refresh every 30 min; retry on error |
| `podcast` | brief + key terms + audio player with 1×/1.25× rate controls |
| `radio` | station select + player + live caption/transcript + Pause/Clear |
| `srs_deck` | Space flip, 1–4 grade (scoped away from form fields), 🔊 pronounce |
| `prep_drill` | 90 s countdown, auto-submit at 0, feedback + "Run again" |
| `declutter` | paste → polish → word-count/verb/tone + "Copy revised" |
| `voice` | hold-to-talk (mouse/touch/Space-Enter) → roleplay turn → TTS playback |
| `speech_coach` | live WPM + filler-count HUD from `SpeechRecognition` interim results |
| `dictionary` | global click-any-word popover |

## Performance notes

- All animations are `transform`/`opacity` (GPU-composited); `prefers-reduced-motion`
  is respected.
- Content modules refetch every 30 min and expose Retry buttons; the dictionary and
  news/podcast caches avoid redundant work.
- Transcript history is capped at 50 lines; voice history/log and speech transcript
  are length-capped to keep the DOM bounded.

## Testing

```bash
npm test            # node --test tests/frontend/  (40 tests)
```

Pure logic in `lib/` is covered; DOM components are syntax-checked (`node --check`)
and exercised on-device.
