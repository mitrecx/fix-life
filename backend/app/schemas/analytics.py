"""Analytics schemas for data statistics and analysis."""
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """Dashboard overview statistics."""
    total_goals: int = Field(description="Total number of yearly goals")
    active_goals: int = Field(description="Number of active goals")
    completed_goals: int = Field(description="Number of completed goals")
    total_monthly_plans: int = Field(description="Total monthly plans this year")
    total_daily_plans: int = Field(description="Total daily plans this month")
    total_tasks: int = Field(description="Total tasks across all plans")
    completed_tasks: int = Field(description="Total completed tasks")
    overall_completion_rate: float = Field(description="Overall task completion rate percentage")


class GoalCategoryStats(BaseModel):
    """Statistics by goal category."""
    category: str
    count: int
    completed: int
    completion_rate: float


class YearlyStats(BaseModel):
    """Yearly statistics."""
    year: int
    total_goals: int
    goal_completion_rate: float
    category_stats: List[GoalCategoryStats]
    monthly_progress: List[dict] = Field(description="Monthly goal progress data")
    total_plans: int = Field(description="Total monthly/daily plans")
    total_tasks: int
    completed_tasks: int
    task_completion_rate: float


class MonthlyStats(BaseModel):
    """Monthly statistics."""
    year: int
    month: int
    total_plans: int = Field(description="Total monthly plans")
    total_daily_plans: int = Field(description="Total daily plans in this month")
    total_tasks: int
    completed_tasks: int
    task_completion_rate: float
    daily_completion_data: List[dict] = Field(description="Daily task completion data")
    priority_distribution: List[dict] = Field(description="Task distribution by priority")
    weekly_comparison: List[dict] = Field(description="Week by week comparison")


class CompletionRateTrend(BaseModel):
    """Completion rate trend over time."""
    period: str = Field(description="Time period (daily, weekly, monthly)")
    start_date: date
    end_date: date
    data: List[dict] = Field(description="Array of {date, rate} objects")
    average_rate: float
    trend: str = Field(description="up, down, stable")


class HeatmapData(BaseModel):
    """Heatmap data for visualization."""
    start_date: date
    end_date: date
    data: List[dict] = Field(description="Array of {date, value, label} objects")


class AnalyticsResponse(BaseModel):
    """Generic analytics response wrapper."""
    success: bool = True
    data: dict
