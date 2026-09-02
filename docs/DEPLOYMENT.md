# Deployment & Operations

Target: **Raspberry Pi 3B**, 64-bit Raspberry Pi OS Lite, Python 3.11+.
Dev machine: macOS (Apple Silicon) with Python 3.11+ and Node.js (for frontend tests).

## Local development

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m app        # binds 127.0.0.1:8000
```

Remote access from the dev machine via SSH tunnel:

```bash
ssh -L 8000:localhost:8000 pi@<pi-host>
```

## Configuration

Secrets and tuning live in a `.env` file (gitignored) in the app directory, read once
at startup. Copy `deploy/env.example` and fill in the keys.

| Env var | Default | Purpose |
|---|---|---|
| `COCKPIT_DB` | `data/cockpit.db` | SQLite location |
| `LLM_API_KEY` | *(empty)* | Groq key; enables LLM features |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | OpenAI-compatible endpoint |
| `LLM_MODEL` | `qwen/qwen3.8-27b` | model on your Groq account |
| `LLM_TIMEOUT_SECONDS` | `60` | per-request LLM timeout |
| `LLM_MAX_RETRIES` | `2` | retries on 5xx/429/transport |
| `LLM_DAILY_LIMIT` | `1000` | max LLM calls / 24 h (0 = unlimited) |
| `DEEPGRAM_API_KEY` | *(empty)* | enables transcription |
| `DEEPGRAM_MODEL` | `nova-2` | Deepgram model |
| `DEEPGRAM_TIMEOUT_SECONDS` | `300` | transcription timeout |
| `DEEPGRAM_MAX_RETRIES` | `2` | retries on 5xx/429/transport |
| `DEEPGRAM_ALLOWED_HOSTS` | `[]` | JSON list restricting `audio_url` hosts |
| `DEEPGRAM_DAILY_LIMIT` | `200` | max Deepgram calls / 24 h |
| `RATE_LIMIT_PER_MINUTE` | `30` | per-IP limit on LLM/STT endpoints |
| `CONTENT_CACHE_TTL_SECONDS` | `600` | news/podcast cache TTL |
| `DICTIONARY_CACHE_TTL_SECONDS` | `86400` | dictionary cache TTL |
| `CORS_ORIGINS` | `[]` | JSON list; empty = same-origin only |
| `WS_MAX_CONNECTIONS` | `100` | WebSocket cap |
| `HOST` / `PORT` | `127.0.0.1` / `8000` | bind address/port |

Feed URLs (news/podcast/radio stations) are code constants in
`app/services/{news,podcast,radio}.py`.

## One-time Pi setup

```bash
mkdir -p /home/pi/english-cockpit
cp deploy/env.example /home/pi/english-cockpit/.env   # edit keys
sudo cp deploy/english-cockpit.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable english-cockpit
```

## Deploying (`deploy.sh`)

Run from the dev machine (repo root). It is **test-gated** — it refuses to deploy
unless backend and frontend tests pass.

```bash
PI_HOST=raspberrypi.local INSTALL_DEPS=1 INSTALL_UNIT=1 ./deploy.sh   # first time
./deploy.sh                                                          # afterwards
```

Flags / env:

| Var | Default | Purpose |
|---|---|---|
| `PI_HOST` | `raspberrypi.local` | Pi hostname/IP |
| `PI_USER` | `pi` | SSH user |
| `APP_DIR` | `/home/pi/english-cockpit` | install dir |
| `UNIT_NAME` | `english-cockpit` | systemd unit name |
| `PORT` | `8000` | health-check port |
| `INSTALL_DEPS=1` | off | build the venv + install requirements on the Pi |
| `INSTALL_UNIT=1` | off | install/enable the systemd unit |

Flow: `pytest` → `npm test` → rsync (excluding `.venv/`, `data/`, `tests/`, `.env`,
caches) → (optional deps/unit install) → `systemctl restart` → wait up to 15 s for
`/healthz`.

## systemd unit (`deploy/english-cockpit.service`)

Runs `python -m app` (binds 127.0.0.1), `Restart=always`, `After=network-online.target`.
The `.env` is read by pydantic-settings from the working directory.

## Kiosk (`deploy/kiosk.sh`)

Launches Chromium with memory-friendly flags (`--kiosk --noerrdialogs --disable-gpu
--no-sandbox`). Override `BROWSER` (e.g. `chromium-browser`) if needed. Add it to the
Pi's autostart for a 24/7 dashboard.

## Optional LAN exposure (`deploy/Caddyfile`)

The app binds to localhost by default. If you need LAN-wide browsing (without an SSH
tunnel), front it with Caddy + basic auth:

```bash
caddy hash-password --plaintext 'your-password'
COCKPIT_BASIC_AUTH_HASH='$2a$14$…' caddy run --config deploy/Caddyfile
```

Caddy listens on `:8080` and proxies to `127.0.0.1:8000`.

## Security model

- **No application-level auth.** The app is intended for a trusted LAN and binds to
  `127.0.0.1` by default; remote access is via authenticated SSH tunnel.
- CORS is same-origin by default (`CORS_ORIGINS=[]`).
- Spending is capped by rate limiting and daily budgets; the dictionary/news/podcast
  caches reduce redundant paid calls.
- Do **not** expose the app directly to the public internet. Use Caddy/reverse proxy
  or network isolation for anything beyond a LAN.

## Operations

- **Health**: `curl http://localhost:8000/healthz`.
- **Logs**: `journalctl -u english-cockpit -f` (the live-STT relay logs
  `live STT started/stopped` and audio-chunk counts).
- **Database**: `data/cockpit.db` (WAL); it is excluded from deploys so SRS progress
  survives updates.
- **Feed drift**: BBC/Reuters/NPR feed URLs are the most likely thing to break over
  time — they're constants in the service modules (edit + redeploy).
