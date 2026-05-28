from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.daily_progress import DailySummary, DailyProgressDay
from app.schemas.daily_summary import (
    DailySummaryCreate,
    DailySummaryUpdate,
    DailySummaryResponse,
    SUMMARY_TYPE_LABELS,
)

router = APIRouter()


@router.get("/days/{daily_progress_day_id}/summary", response_model=DailySummaryResponse)
def get_summary_by_day(
    daily_progress_day_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailySummary:
    """获取指定每日进度的总结"""
    day = db.query(DailyProgressDay).filter(
        and_(DailyProgressDay.id == daily_progress_day_id, DailyProgressDay.user_id == current_user.id)
    ).first()
    if not day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="每日进度不存在"
        )

    summary = db.query(DailySummary).filter(
        DailySummary.daily_progress_day_id == daily_progress_day_id
    ).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="总结不存在"
        )
    return summary


@router.post("/days/{daily_progress_day_id}/summary", response_model=DailySummaryResponse, status_code=status.HTTP_201_CREATED)
def create_summary(
    daily_progress_day_id: str,
    summary_in: DailySummaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailySummary:
    """为指定每日进度创建总结"""
    day = db.query(DailyProgressDay).filter(
        and_(DailyProgressDay.id == daily_progress_day_id, DailyProgressDay.user_id == current_user.id)
    ).first()
    if not day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="每日进度不存在"
        )

    existing = db.query(DailySummary).filter(
        DailySummary.daily_progress_day_id == daily_progress_day_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该日已有总结，请使用更新接口"
        )

    summary = DailySummary(
        daily_progress_day_id=daily_progress_day_id,
        user_id=current_user.id,
        **summary_in.model_dump()
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.put("/summaries/{summary_id}", response_model=DailySummaryResponse)
def update_summary(
    summary_id: str,
    summary_in: DailySummaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailySummary:
    """更新总结"""
    summary = db.query(DailySummary).filter(
        and_(DailySummary.id == summary_id, DailySummary.user_id == current_user.id)
    ).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="总结不存在"
        )

    update_data = summary_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(summary, field, value)

    db.commit()
    db.refresh(summary)
    return summary


@router.delete("/summaries/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """删除总结"""
    summary = db.query(DailySummary).filter(
        and_(DailySummary.id == summary_id, DailySummary.user_id == current_user.id)
    ).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="总结不存在"
        )

    db.delete(summary)
    db.commit()


@router.get("/summary-types", response_model=dict)
def get_summary_types() -> dict:
    """获取所有总结类型"""
    return SUMMARY_TYPE_LABELS
