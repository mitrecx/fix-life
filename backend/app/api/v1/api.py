from fastapi import APIRouter
from app.api.v1.endpoints import yearly_goals, monthly_plans, daily_plans, analytics

api_router = APIRouter()

api_router.include_router(yearly_goals.router, prefix="/yearly-goals", tags=["yearly-goals"])
api_router.include_router(monthly_plans.router, prefix="/monthly-plans", tags=["monthly-plans"])
api_router.include_router(daily_plans.router, prefix="/daily-plans", tags=["daily-plans"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
