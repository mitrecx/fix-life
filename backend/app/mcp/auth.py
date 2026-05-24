from __future__ import annotations

from fastmcp.server.auth import AccessToken, TokenVerifier

from app.db.session import SessionLocal
from app.services.mcp_api_key_service import McpApiKeyService


class FixLifeApiKeyVerifier(TokenVerifier):
    """Verify MCP API keys issued from system settings."""

    async def verify_token(self, token: str) -> AccessToken | None:
        db = SessionLocal()
        try:
            result = McpApiKeyService(db).verify_and_touch(token)
            if not result:
                return None
            user_id, permissions = result
            return AccessToken(
                token=token,
                client_id=str(user_id),
                scopes=permissions,
                expires_at=None,
                claims={"user_id": str(user_id), "permissions": permissions},
            )
        finally:
            db.close()
