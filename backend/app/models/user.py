from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    avatar_url = Column(String(500), nullable=True)
    avatar_data = Column(LargeBinary, nullable=True)  # Store avatar image binary data
    avatar_mime_type = Column(String(50), nullable=True)  # Store MIME type (image/jpeg, etc.)
    bio = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    yearly_goals = relationship("YearlyGoal", back_populates="user", cascade="all, delete-orphan")
    monthly_plans = relationship("MonthlyPlan", back_populates="user", cascade="all, delete-orphan")
    daily_plans = relationship("DailyPlan", back_populates="user", cascade="all, delete-orphan")
    daily_summaries = relationship("DailySummary", cascade="all, delete-orphan")
    # TODO: Add these relationships when models are implemented
    # habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"
