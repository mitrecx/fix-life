from __future__ import annotations

from typing import Any

from app.mcp.tools.daily_progress import handle_daily_progress


def handle_daily(payload: dict[str, Any]) -> dict[str, Any]:
    """Deprecated: use daily_progress tool (planned removal ~2026-08-22)."""
    return handle_daily_progress(payload)
