from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from fastmcp import FastMCP

from app.mcp.auth import FixLifeApiKeyVerifier
from app.mcp.helpers import handle_http_exception
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
        return handle_http_exception(exc)


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(
        name="fixlife",
        instructions=(
            "Fix Life MCP server for todos, daily progress, planning, reflections, "
            "account settings, and admin operations. Each tool accepts a JSON payload "
            "with an `action` field plus action-specific parameters."
        ),
        auth=FixLifeApiKeyVerifier(),
    )

    @mcp.tool(
        description="Manage backlog todos: list, get, create, update, delete, complete, schedule, revert.",
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
mcp_app = mcp_server.http_app(path="/", transport="streamable-http")
