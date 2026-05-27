"""Tests for MCP reflect action aliases."""

from app.mcp.tools.reflect import REFLECT_ACTION_ALIASES, normalize_reflect_action


def test_normalize_reflect_action_aliases():
    assert normalize_reflect_action("get_daily_summary") == "get_daily"
    assert normalize_reflect_action("create_daily_summary") == "create_daily"
    assert normalize_reflect_action("update_daily_summary") == "update_daily"
    assert normalize_reflect_action("delete_daily_summary") == "delete_daily"
    assert normalize_reflect_action("list_weekly") == "list_weekly"


def test_reflect_action_alias_map_is_complete():
    assert set(REFLECT_ACTION_ALIASES.values()) == {
        "get_daily",
        "create_daily",
        "update_daily",
        "delete_daily",
    }
