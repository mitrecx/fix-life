"""Analytics API endpoints."""
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.analytics import (
    DashboardStats,
    YearlyStats,
    MonthlyStats,
    CompletionRateTrend,
    HeatmapData,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get dashboard overview statistics.

    Returns:
    - Total yearly goals for current year
    - Active and completed goals
    - Monthly plans count
    - Daily plans count for current month
    - Total tasks and completion rate
    """
    service = AnalyticsService(db)
    return service.get_dashboard_stats(user_id=str(current_user.id))


@router.get("/yearly/{year}", response_model=YearlyStats)
def get_yearly_stats(
    year: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get yearly statistics.

    Returns:
    - Goal completion rate
    - Category-wise statistics
    - Monthly progress data
    - Task completion statistics
    """
    service = AnalyticsService(db)
    return service.get_yearly_stats(user_id=str(current_user.id), year=year)


@router.get("/monthly/{year}/{month}", response_model=MonthlyStats)
def get_monthly_stats(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get monthly statistics.

    Returns:
    - Plan counts (monthly and daily)
    - Task completion rate
    - Daily completion data
    - Priority distribution
    - Weekly comparison
    """
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    service = AnalyticsService(db)
    return service.get_monthly_stats(user_id=str(current_user.id), year=year, month=month)


@router.get("/completion-rate", response_model=CompletionRateTrend)
def get_completion_rate_trend(
    period: str = Query("daily", description="Time period: daily, weekly, or monthly"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    days: Optional[int] = Query(30, description="Number of days to look back (used if start/end not provided)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get completion rate trend over time.

    Parameters:
    - period: daily, weekly, or monthly
    - start_date: Start date in YYYY-MM-DD format
    - end_date: End date in YYYY-MM-DD format
    - days: Number of days to look back (default: 30)

    Returns:
    - Completion rate data points
    - Average completion rate
    - Trend direction (up, down, stable)
    """
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(
            status_code=400,
            detail="Period must be one of: daily, weekly, monthly"
        )

    # Parse dates or use defaults
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    else:
        start = date.today() - timedelta(days=days)

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    else:
        end = date.today()

    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    service = AnalyticsService(db)
    return service.get_completion_rate_trend(
        user_id=str(current_user.id),
        period=period,
        start_date=start,
        end_date=end,
    )


@router.get("/heatmap", response_model=HeatmapData)
def get_heatmap_data(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    days: Optional[int] = Query(90, description="Number of days to include (used if start/end not provided)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get heatmap data for task completion visualization.

    Parameters:
    - start_date: Start date in YYYY-MM-DD format
    - end_date: End date in YYYY-MM-DD format
    - days: Number of days to include (default: 90)

    Returns:
    - Daily completion rates
    - Activity levels (none, low, medium, high)
    - Task counts per day
    """
    # Parse dates or use defaults
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    else:
        start = date.today() - timedelta(days=days)

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    else:
        end = date.today()

    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    service = AnalyticsService(db)
    return service.get_heatmap_data(
        user_id=str(current_user.id),
        start_date=start,
        end_date=end,
    )
