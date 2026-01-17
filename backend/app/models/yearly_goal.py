import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Integer, Date, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class GoalStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    PAUSED = "paused"


class GoalCategory(str, enum.Enum):
    HEALTH = "health"
    CAREER = "career"
    LEARNING = "learning"
    FINANCE = "finance"
    RELATIONSHIP = "relationship"
    ENTERTAINMENT = "entertainment"


class YearlyGoal(Base):
    __tablename__ = "yearly_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(Enum(GoalCategory, values_callable=lambda x: [e.value for e in x]), nullable=False)
    color = Column(String(7))
    target_value = Column(Numeric(10, 2), nullable=False)
    current_value = Column(Numeric(10, 2), default=0)
    unit = Column(String(20))
    status = Column(Enum(GoalStatus, values_callable=lambda x: [e.value for e in x]), default=GoalStatus.PENDING)
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="yearly_goals")
    monthly_milestones = relationship("MonthlyMilestone", back_populates="yearly_goal", cascade="all, delete-orphan")
    # TODO: Add monthly_plans relationship when MonthlyPlan model is implemented
    # monthly_plans = relationship("MonthlyPlan", back_populates="yearly_goal", cascade="all, delete-orphan")

    @property
    def completion_rate(self) -> float:
        if self.target_value and float(self.target_value) > 0:
            return round(float(self.current_value) / float(self.target_value) * 100, 2)
        return 0.0

    @property
    def milestones(self):
        return self.monthly_milestones

    def __repr__(self):
        return f"<YearlyGoal {self.year}: {self.title}>"


class MonthlyMilestone(Base):
    __tablename__ = "monthly_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    yearly_goal_id = Column(UUID(as_uuid=True), ForeignKey("yearly_goals.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    target_value = Column(Numeric(10, 2), nullable=False)
    achieved_value = Column(Numeric(10, 2), default=0)
    note = Column(Text)

    # Relationships
    yearly_goal = relationship("YearlyGoal", back_populates="monthly_milestones")

    def __repr__(self):
        return f"<MonthlyMilestone month={self.month} target={self.target_value}>"
