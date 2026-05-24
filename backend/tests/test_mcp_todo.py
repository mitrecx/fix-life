"""Tests for MCP todo tool helpers."""

import pytest
from fastmcp.exceptions import ToolError

from app.mcp.helpers import tool_error
from app.mcp.tools.todo import _resolve_task_id


class _FakeTask:
    def __init__(self, task_id: str, title: str) -> None:
        self.id = task_id
        self.title = title


class _FakeBacklogTaskService:
    def __init__(self, tasks_by_tab: dict[str, list[_FakeTask]]) -> None:
        self.tasks_by_tab = tasks_by_tab

    def get_user_tasks(self, user_id: str, tab: str, q: str | None = None, limit: int = 50):
        del user_id, q, limit
        return list(self.tasks_by_tab.get(tab, [])), len(self.tasks_by_tab.get(tab, []))


def test_tool_error_raises_tool_error():
    with pytest.raises(ToolError, match="\\[NOT_FOUND\\] Backlog task not found"):
        tool_error(404, "NOT_FOUND", "Backlog task not found")


def test_resolve_task_id_prefers_explicit_id():
    service = _FakeBacklogTaskService({})
    task_id = _resolve_task_id(service, "user-1", {"task_id": "abc-123"}, action="delete")
    assert task_id == "abc-123"


def test_resolve_task_id_by_exact_title():
    service = _FakeBacklogTaskService(
        {
            "pending": [_FakeTask("real-id", "解决GitHub上面的issue")],
            "in_progress": [],
            "done": [],
        }
    )
    task_id = _resolve_task_id(
        service,
        "user-1",
        {"title": "解决GitHub上面的issue"},
        action="delete",
    )
    assert task_id == "real-id"


def test_resolve_task_id_unknown_id_not_found():
    service = _FakeBacklogTaskService({"pending": [], "in_progress": [], "done": []})
    with pytest.raises(ToolError, match="\\[NOT_FOUND\\]"):
        _resolve_task_id(service, "user-1", {"title": "missing task"}, action="delete")
