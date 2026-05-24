from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

from app.mcp.auth import FixLifeApiKeyVerifier
from app.mcp.tools.account import handle_account
from app.mcp.tools.admin import admin_tool_visible, handle_admin
from app.mcp.tools.daily import handle_daily
from app.mcp.tools.plan import handle_plan
from app.mcp.tools.reflect import handle_reflect
from app.mcp.tools.todo import handle_todo


def _run_tool(handler, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return handler(payload)
    except HTTPException as exc:
        detail = exc.detail
        if isinstance(detail, dict):
            code = detail.get("code", "ERROR")
            message = detail.get("message", str(detail))
            raise ToolError(f"[{code}] {message}") from exc
        raise ToolError(str(detail)) from exc


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(
        name="fixlife",
        instructions=(
            "Fix Life MCP server for todos, daily progress, planning, reflections, "
            "account settings, and admin operations. Each tool accepts a JSON payload "
            "with an `action` field plus action-specific parameters. "
            "Todo category uses field `context`: work (工作), learning (学习), life (生活). "
            "GitHub issue skill: when create title or description is a github.com/.../issues/N URL, "
            "the server fetches the issue title, stores the URL as description, and sets context=work."
        ),
        auth=FixLifeApiKeyVerifier(),
    )

    @mcp.tool(
        description=(
            "Manage backlog todos: list, get, create, update, delete, complete, schedule, revert. "
            "Payload: { action, ...params }. For create/update, pass fields at top level or under data. "
            "context (category): work | learning | life — maps to 工作/学习/生活; default learning if omitted. "
            "Use context=work for job/project tasks, context=life for chores/errands, context=learning for study/skills. "
            "priority: high | medium | low. "
            "create/update fields: title (required on create), description, context, priority, progress (0-100). "
            "GitHub issue skill on create: pass a github.com/owner/repo/issues/N URL, or owner/repo#N "
            "(e.g. GitHub: x2-tech/x-pulsar#518) in title or description; "
            "server sets title from GitHub, description to the URL only, context=work. "
            "list filters: tab (pending|in_progress|done), context, priority, q, time_field, date_from, date_to, limit, offset. "
            "delete/get/update/complete require task_id: copy tasks[].id from a fresh list response exactly; never guess UUIDs. "
            "delete also accepts title when exactly one task matches. After delete, call list again to verify."
        ),
    )
    def todo(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_todo, payload)

    @mcp.tool(
        description="Manage daily progress plans and tasks for specific dates.",
    )
    def daily(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_daily, payload)

    @mcp.tool(
        description="Manage daily and weekly summaries, including generation and notifications.",
    )
    def reflect(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_reflect, payload)

    @mcp.tool(
        description="Manage yearly goals and monthly plans.",
    )
    def plan(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_plan, payload)

    @mcp.tool(
        description="Manage current user profile and notification settings.",
    )
    def account(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_account, payload)

    @mcp.tool(
        description="Admin operations: users, roles, system status, and backlog data repair.",
        auth=admin_tool_visible,
        tags={"admin"},
    )
    def admin(payload: dict[str, Any]) -> dict[str, Any]:
        return _run_tool(handle_admin, payload)

    return mcp


mcp_server = create_mcp_server()
mcp_app = mcp_server.http_app(
    path="/",
    transport="streamable-http",
    stateless_http=True,
)
