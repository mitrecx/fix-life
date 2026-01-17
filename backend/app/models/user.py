from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)

    # Relationships
    yearly_goals = relationship("YearlyGoal", back_populates="user", cascade="all, delete-orphan")
    # TODO: Add these relationships when models are implemented
    # monthly_plans = relationship("MonthlyPlan", back_populates="user", cascade="all, delete-orphan")
    # daily_plans = relationship("DailyPlan", back_populates="user", cascade="all, delete-orphan")
    # habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"
