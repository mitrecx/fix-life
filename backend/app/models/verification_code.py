"""Verification code model for email verification."""
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class VerificationCode(Base):
    """Model for storing email verification codes."""

    __tablename__ = "verification_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(100), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    purpose = Column(String(20), nullable=False, default="register")  # register, reset_password, etc.
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VerificationCode {self.email}: {self.code}>"

    def is_valid(self) -> bool:
        """Check if code is valid (not expired and not used)."""
        if self.used is not None:
            return False
        return datetime.now(timezone.utc) < self.expires_at

    def mark_as_used(self):
        """Mark code as used."""
        self.used = datetime.now(timezone.utc)
