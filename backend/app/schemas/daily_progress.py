"""Daily progress (每日进度) API schemas — canonical import path."""

from app.schemas.daily_plan import (
    DailyPlanBase,
    DailyPlanByDateResponse,
    DailyPlanCreate,
    DailyPlanList,
    DailyPlanResponse,
    DailyPlanTaskAdd,
    DailyPlanUpdate,
    DailyTaskBase,
    DailyTaskCreate,
    DailyTaskResponse,
    DailyTaskUpdate,
)

DailyProgressDayBase = DailyPlanBase
DailyProgressDayByDateResponse = DailyPlanByDateResponse
DailyProgressDayCreate = DailyPlanCreate
DailyProgressDayList = DailyPlanList
DailyProgressDayResponse = DailyPlanResponse
DailyProgressDayUpdate = DailyPlanUpdate
DailyProgressEntryAdd = DailyPlanTaskAdd
DailyProgressEntryBase = DailyTaskBase
DailyProgressEntryCreate = DailyTaskCreate
DailyProgressEntryResponse = DailyTaskResponse
DailyProgressEntryUpdate = DailyTaskUpdate

__all__ = [
    "DailyPlanBase",
    "DailyPlanByDateResponse",
    "DailyPlanCreate",
    "DailyPlanList",
    "DailyPlanResponse",
    "DailyPlanTaskAdd",
    "DailyPlanUpdate",
    "DailyTaskBase",
    "DailyTaskCreate",
    "DailyTaskResponse",
    "DailyTaskUpdate",
    "DailyProgressDayBase",
    "DailyProgressDayByDateResponse",
    "DailyProgressDayCreate",
    "DailyProgressDayList",
    "DailyProgressDayResponse",
    "DailyProgressDayUpdate",
    "DailyProgressEntryAdd",
    "DailyProgressEntryBase",
    "DailyProgressEntryCreate",
    "DailyProgressEntryResponse",
    "DailyProgressEntryUpdate",
]
