"""Tests for MCP daily_progress tool helpers."""

from datetime import date
from types import SimpleNamespace

from app.mcp.tools.daily_progress import (
    dump_daily_progress,
    list_day_responses,
    parse_context_filter,
    prepare_day_create_payload,
)
from app.models.task_context import TaskContext


def test_prepare_day_create_payload_keeps_progress_date():
    payload = prepare_day_create_payload({"progress_date": "2026-05-24", "title": "Today"})
    assert payload["progress_date"] == "2026-05-24"
    assert "plan_date" not in payload


def test_dump_daily_progress_strips_legacy_keys():
    data = dump_daily_progress(
        {
            "id": "day-1",
            "progress_date": "2026-05-24",
            "daily_plan_id": "day-1",
            "daily_progress_day_id": "day-1",
            "daily_tasks": [{"id": "entry-1"}],
            "daily_progress_entries": [
                {"id": "entry-1", "daily_progress_day_id": "day-1", "daily_plan_id": "day-1"}
            ],
        }
    )
    assert data["progress_date"] == "2026-05-24"
    assert "plan_date" not in data
    assert "daily_plan_id" not in data
    assert "daily_tasks" not in data
    assert data["daily_progress_entries"][0]["daily_progress_day_id"] == "day-1"
    assert "daily_plan_id" not in data["daily_progress_entries"][0]


def test_parse_context_filter():
    assert parse_context_filter(None) is None
    assert parse_context_filter("all") is None
    assert parse_context_filter("work") == TaskContext.WORK
    assert parse_context_filter(TaskContext.LEARNING) == TaskContext.LEARNING


def test_list_day_responses_filters_empty_days_when_context_set():
    day_a = SimpleNamespace(
        id="day-a", daily_progress_entries=[SimpleNamespace(context=TaskContext.WORK)]
    )
    day_b = SimpleNamespace(
        id="day-b", daily_progress_entries=[SimpleNamespace(context=TaskContext.LIFE)]
    )

    class FakeService:
        def get_user_days(self, user_id, start_date=None, end_date=None):
            del user_id, start_date, end_date
            return [day_a, day_b]

        def to_day_response(self, day, *, context=None):
            entries = [
                entry
                for entry in day.daily_progress_entries
                if context is None or entry.context == context
            ]
            return SimpleNamespace(
                id=day.id,
                daily_progress_entries=entries,
                total_tasks=len(entries),
                completed_tasks=0,
                completion_rate=0.0,
            )

    responses = list_day_responses(
        FakeService(),
        "user-1",
        start_date=date(2026, 5, 26),
        end_date=date(2026, 5, 27),
        context=TaskContext.WORK,
    )
    assert len(responses) == 1
    assert responses[0].id == "day-a"
    assert responses[0].total_tasks == 1


def test_list_day_responses_keeps_all_days_without_context():
    day_a = SimpleNamespace(
        id="day-a", daily_progress_entries=[SimpleNamespace(context=TaskContext.WORK)]
    )
    day_b = SimpleNamespace(id="day-b", daily_progress_entries=[])

    class FakeService:
        def get_user_days(self, user_id, start_date=None, end_date=None):
            del user_id, start_date, end_date
            return [day_a, day_b]

        def to_day_response(self, day, *, context=None):
            entries = list(day.daily_progress_entries)
            return SimpleNamespace(
                id=day.id,
                daily_progress_entries=entries,
                total_tasks=len(entries),
                completed_tasks=0,
                completion_rate=0.0,
            )

    responses = list_day_responses(
        FakeService(),
        "user-1",
        start_date=None,
        end_date=None,
        context=None,
    )
    assert len(responses) == 2


def test_mcp_server_lists_daily_progress_tool_only():
    import asyncio

    from app.mcp.server import mcp_server

    tools = asyncio.run(mcp_server.list_tools())
    names = {tool.name for tool in tools}
    assert "daily_progress" in names
    assert "daily" not in names
