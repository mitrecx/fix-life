from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.secret_encryption import decrypt_secret, encrypt_secret
from app.models.mcp_api_key import McpApiKey
from app.services.rbac_service import get_permission_codes_for_user

API_KEY_PREFIX = "fl_live_"
MAX_KEYS_PER_USER = 10


def _hash_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


class McpApiKeyService:
    def __init__(self, db: Session):
        self.db = db

    def list_active_keys(self, user_id: UUID) -> list[McpApiKey]:
        return (
            self.db.query(McpApiKey)
            .filter(McpApiKey.user_id == user_id, McpApiKey.revoked_at.is_(None))
            .order_by(McpApiKey.created_at.desc())
            .all()
        )

    def create_key(self, user_id: UUID, name: str) -> tuple[McpApiKey, str]:
        active_count = (
            self.db.query(McpApiKey)
            .filter(McpApiKey.user_id == user_id, McpApiKey.revoked_at.is_(None))
            .count()
        )
        if active_count >= MAX_KEYS_PER_USER:
            raise ValueError(f"Each user may have at most {MAX_KEYS_PER_USER} active MCP API keys")

        raw = secrets.token_urlsafe(32)
        api_key = f"{API_KEY_PREFIX}{raw}"
        record = McpApiKey(
            user_id=user_id,
            name=name.strip(),
            key_prefix=api_key[:16],
            key_hash=_hash_key(api_key),
            key_ciphertext=encrypt_secret(api_key),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record, api_key

    def get_key_secret(self, user_id: UUID, key_id: UUID) -> str | None:
        record = (
            self.db.query(McpApiKey)
            .filter(
                McpApiKey.id == key_id,
                McpApiKey.user_id == user_id,
                McpApiKey.revoked_at.is_(None),
            )
            .first()
        )
        if not record or not record.key_ciphertext:
            return None
        return decrypt_secret(record.key_ciphertext)

    def rotate_key_secret(self, user_id: UUID, key_id: UUID) -> tuple[McpApiKey, str] | None:
        record = (
            self.db.query(McpApiKey)
            .filter(
                McpApiKey.id == key_id,
                McpApiKey.user_id == user_id,
                McpApiKey.revoked_at.is_(None),
            )
            .first()
        )
        if not record:
            return None

        raw = secrets.token_urlsafe(32)
        api_key = f"{API_KEY_PREFIX}{raw}"
        record.key_prefix = api_key[:16]
        record.key_hash = _hash_key(api_key)
        record.key_ciphertext = encrypt_secret(api_key)
        self.db.commit()
        self.db.refresh(record)
        return record, api_key

    def revoke_key(self, user_id: UUID, key_id: UUID) -> bool:
        record = (
            self.db.query(McpApiKey)
            .filter(
                McpApiKey.id == key_id,
                McpApiKey.user_id == user_id,
                McpApiKey.revoked_at.is_(None),
            )
            .first()
        )
        if not record:
            return False
        record.revoked_at = datetime.now(timezone.utc)
        self.db.commit()
        return True

    def verify_and_touch(self, api_key: str) -> tuple[UUID, list[str]] | None:
        if not api_key.startswith(API_KEY_PREFIX):
            return None
        key_hash = _hash_key(api_key)
        record = (
            self.db.query(McpApiKey)
            .filter(McpApiKey.key_hash == key_hash, McpApiKey.revoked_at.is_(None))
            .first()
        )
        if not record:
            return None
        record.last_used_at = datetime.now(timezone.utc)
        self.db.commit()
        permissions = get_permission_codes_for_user(self.db, record.user_id)
        return record.user_id, permissions

    @staticmethod
    def mask_suffix(api_key: str) -> str:
        return api_key[-4:]
