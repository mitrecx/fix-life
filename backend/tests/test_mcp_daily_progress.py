"""Tests for MCP daily_progress tool helpers."""

from datetime import date
from types import SimpleNamespace

from app.mcp.tools.daily_progress import (
    list_plan_responses,
    normalize_daily_progress_action,
    parse_context_filter,
)
from app.models.task_context import TaskContext


def test_normalize_daily_progress_action_aliases():
    assert normalize_daily_progress_action("list_by_range") == "list"
    assert normalize_daily_progress_action("link_entry") == "add_task"
    assert normalize_daily_progress_action("get_by_date") == "get_by_date"


def test_parse_context_filter():
    assert parse_context_filter(None) is None
    assert parse_context_filter("all") is None
    assert parse_context_filter("work") == TaskContext.WORK
    assert parse_context_filter(TaskContext.LEARNING) == TaskContext.LEARNING


def test_list_plan_responses_filters_empty_days_when_context_set():
    plan_a = SimpleNamespace(id="plan-a", daily_tasks=[SimpleNamespace(context=TaskContext.WORK)])
    plan_b = SimpleNamespace(id="plan-b", daily_tasks=[SimpleNamespace(context=TaskContext.LIFE)])

    class FakeService:
        def get_user_plans(self, user_id, start_date=None, end_date=None):
            del user_id, start_date, end_date
            return [plan_a, plan_b]

        def to_plan_response(self, plan, *, context=None):
            tasks = [task for task in plan.daily_tasks if context is None or task.context == context]
            return SimpleNamespace(
                id=plan.id,
                daily_tasks=tasks,
                total_tasks=len(tasks),
                completed_tasks=0,
                completion_rate=0.0,
            )

    responses = list_plan_responses(
        FakeService(),
        "user-1",
        start_date=date(2026, 5, 26),
        end_date=date(2026, 5, 27),
        context=TaskContext.WORK,
    )
    assert len(responses) == 1
    assert responses[0].id == "plan-a"
    assert responses[0].total_tasks == 1


def test_list_plan_responses_keeps_all_days_without_context():
    plan_a = SimpleNamespace(id="plan-a", daily_tasks=[SimpleNamespace(context=TaskContext.WORK)])
    plan_b = SimpleNamespace(id="plan-b", daily_tasks=[])

    class FakeService:
        def get_user_plans(self, user_id, start_date=None, end_date=None):
            del user_id, start_date, end_date
            return [plan_a, plan_b]

        def to_plan_response(self, plan, *, context=None):
            tasks = list(plan.daily_tasks)
            return SimpleNamespace(
                id=plan.id,
                daily_tasks=tasks,
                total_tasks=len(tasks),
                completed_tasks=0,
                completion_rate=0.0,
            )

    responses = list_plan_responses(
        FakeService(),
        "user-1",
        start_date=None,
        end_date=None,
        context=None,
    )
    assert len(responses) == 2


def test_mcp_server_lists_daily_progress_tool():
    import asyncio

    from app.mcp.server import mcp_server

    tools = asyncio.run(mcp_server.list_tools())
    names = {tool.name for tool in tools}
    assert "daily_progress" in names
    assert "daily" in names
