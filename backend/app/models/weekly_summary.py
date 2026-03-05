from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Date, ForeignKey, Text, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class WeeklySummary(Base):
    __tablename__ = "weekly_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 周次标识
    year = Column(Integer, nullable=False, index=True)
    week_number = Column(Integer, nullable=False)  # ISO week number (1-53)

    # 时间范围
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)

    # 统计数据（存储为 JSONB，方便查询和扩展）
    stats = Column(JSONB, nullable=False)  # 存储详细统计数据

    # 汇总文本（可选，用户可编辑）
    summary_text = Column(Text, nullable=True)

    # 元数据
    total_tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 自动生成标记
    auto_generated = Column(String(50), nullable=True)  # Celery Task ID

    # Relationships
    user = relationship("User", back_populates="weekly_summaries")

    def __repr__(self):
        return f"<WeeklySummary {self.year}年第{self.week_number}周: {self.start_date} - {self.end_date}>"
