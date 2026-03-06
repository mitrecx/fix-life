from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID


class DailyTaskData(BaseModel):
    """每日任务数据结构"""
    title: str
    status: str
    priority: str


class DailySummaryData(BaseModel):
    """每日数据结构"""
    date: str
    plan_id: Optional[str] = None
    title: Optional[str] = None
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    daily_summary: Optional[Dict[str, Any]] = None
    tasks: List[DailyTaskData] = Field(default_factory=list)


class PriorityDistribution(BaseModel):
    """优先级分布统计"""
    total: int
    completed: int


class WeeklySummaryStats(BaseModel):
    """周统计数据结构"""
    daily_data: List[DailySummaryData]
    priority_distribution: Dict[str, PriorityDistribution]
    task_trend: List[Dict[str, Any]]


class WeeklySummaryBase(BaseModel):
    """周总结基础模型"""
    year: int = Field(..., ge=2020, le=2100, description="年份")
    week_number: int = Field(..., ge=1, le=53, description="周数")
    start_date: date = Field(..., description="周开始日期")
    end_date: date = Field(..., description="周结束日期")


class WeeklySummaryCreate(WeeklySummaryBase):
    """创建周总结（手动触发）"""
    summary_text: Optional[str] = Field(None, max_length=5000, description="周总结文本")


class WeeklySummaryUpdate(BaseModel):
    """更新周总结"""
    summary_text: Optional[str] = Field(None, max_length=5000)


class WeeklySummaryResponse(WeeklySummaryBase):
    """周总结响应"""
    id: UUID
    user_id: UUID
    stats: WeeklySummaryStats
    summary_text: Optional[str] = None
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    created_at: datetime
    updated_at: datetime
    auto_generated: Optional[str] = None

    class Config:
        from_attributes = True


class WeeklySummaryList(BaseModel):
    """周总结列表"""
    summaries: List[WeeklySummaryResponse]
    total: int


class WeeklySummaryGenerationRequest(BaseModel):
    """手动触发生成周总结"""
    year: Optional[int] = Field(None, ge=2020, le=2100, description="年份（不指定则为上周）")
    week_number: Optional[int] = Field(None, ge=1, le=53, description="周数（不指定则为上周）")
    force_regenerate: bool = Field(False, description="是否强制重新生成")
