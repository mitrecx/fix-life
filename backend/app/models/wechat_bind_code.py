"""One-time codes for binding a WeChat mini program account to a Web user."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class WeChatBindCode(Base):
    __tablename__ = "wechat_bind_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code = Column(String(6), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def is_valid(self) -> bool:
        if self.used_at is not None:
            return False
        return datetime.now(timezone.utc) < self.expires_at

    def mark_used(self) -> None:
        self.used_at = datetime.now(timezone.utc)
