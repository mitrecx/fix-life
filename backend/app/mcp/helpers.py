from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Generator, NoReturn
from uuid import UUID

from fastapi import HTTPException
from fastmcp.exceptions import ToolError
from mcp.server.auth.middleware.auth_context import get_access_token
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.rbac_service import SYSTEM_STATUS_READ, USERS_MANAGE


@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_token_claims() -> dict[str, Any]:
    token = get_access_token()
    if token is None:
        raise HTTPException(status_code=401, detail="Missing or invalid MCP API key")
    claims = getattr(token, "claims", None) or {}
    user_id = claims.get("user_id") or token.client_id
    permissions = claims.get("permissions") or list(token.scopes)
    return {"user_id": str(user_id), "permissions": list(permissions)}


def get_user_id() -> str:
    return get_token_claims()["user_id"]


def get_permissions() -> set[str]:
    return set(get_token_claims()["permissions"])


def require_permission(permission: str) -> None:
    if permission not in get_permissions():
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": f"Missing required permission: {permission}",
                "required_permission": permission,
            },
        )


def has_admin_access(permissions: set[str] | None = None) -> bool:
    perms = permissions if permissions is not None else get_permissions()
    return USERS_MANAGE in perms or SYSTEM_STATUS_READ in perms


def dump(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [dump(item) for item in value]
    if isinstance(value, dict):
        return {key: dump(item) for key, item in value.items()}
    if isinstance(value, UUID):
        return str(value)
    if hasattr(value, "__dict__") and not isinstance(value, (str, int, float, bool, type(None))):
        data: dict[str, Any] = {}
        for key in dir(value):
            if key.startswith("_"):
                continue
            attr = getattr(value, key)
            if callable(attr):
                continue
            data[key] = dump(attr)
        return data
    return value


def tool_error(status_code: int, code: str, message: str, **extra: Any) -> NoReturn:
    del status_code
    suffix = f" {extra}" if extra else ""
    raise ToolError(f"[{code}] {message}{suffix}")


def handle_http_exception(exc: HTTPException) -> dict[str, Any]:
    detail = exc.detail
    if isinstance(detail, dict):
        return detail
    return {"isError": True, "code": "ERROR", "message": str(detail)}
