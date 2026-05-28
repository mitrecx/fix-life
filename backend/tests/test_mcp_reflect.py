"""Tests for MCP reflect daily summary actions."""

from app.mcp.tools.reflect import require_daily_progress_day_id


def test_require_daily_progress_day_id():
    assert require_daily_progress_day_id({"daily_progress_day_id": "day-1"}) == "day-1"
