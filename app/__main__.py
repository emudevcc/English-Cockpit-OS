"""Run the application with uvicorn using the configured host and port.

Usage: ``python -m app``. Binds to ``127.0.0.1`` by default so the kiosk can
reach it locally while nothing else can; remote access goes via SSH tunnel.
"""

from __future__ import annotations

import uvicorn

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    main()
