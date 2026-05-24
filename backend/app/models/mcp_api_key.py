from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class McpApiKey(Base):
    """MCP API keys for Streamable HTTP authentication."""

    __tablename__ = "mcp_api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    key_prefix = Column(String(32), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)
    key_ciphertext = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="mcp_api_keys")

    def __repr__(self) -> str:
        return f"<McpApiKey id={self.id} user_id={self.user_id} prefix={self.key_prefix}>"
