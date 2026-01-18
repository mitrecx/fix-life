from fastapi import APIRouter
from app.api.v1.endpoints import yearly_goals, monthly_plans, daily_plans, analytics, auth, users

api_router = APIRouter()

# Auth routes (no authentication required)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Protected routes (authentication required)
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(yearly_goals.router, prefix="/yearly-goals", tags=["yearly-goals"])
api_router.include_router(monthly_plans.router, prefix="/monthly-plans", tags=["monthly-plans"])
api_router.include_router(daily_plans.router, prefix="/daily-plans", tags=["daily-plans"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
