from fastapi import APIRouter
from app.api.v1.endpoints import yearly_goals

api_router = APIRouter()

api_router.include_router(yearly_goals.router, prefix="/yearly-goals", tags=["yearly-goals"])
