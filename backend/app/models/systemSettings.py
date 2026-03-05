from datetime import datetime
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class SystemSettings(Base):
    """System settings for each user."""
    __tablename__ = "system_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    show_daily_summary = Column(Boolean, default=False, nullable=False)

    # Weekly summary notification settings
    weekly_summary_email_enabled = Column(Boolean, default=False, nullable=False)
    weekly_summary_email = Column(String, nullable=True)  # Custom email for weekly summary notifications
    weekly_summary_feishu_enabled = Column(Boolean, default=False, nullable=False)
    feishu_app_id = Column(String, nullable=True)
    feishu_app_secret = Column(String, nullable=True)
    feishu_chat_id = Column(String, nullable=True)  # Target group chat ID

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="system_settings")

    def __repr__(self):
        return f"<SystemSettings user_id={self.user_id} show_daily_summary={self.show_daily_summary}>"
