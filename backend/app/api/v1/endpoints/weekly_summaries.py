"""Weekly summary API endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.weekly_summary import (
    WeeklySummaryResponse,
    WeeklySummaryList,
    WeeklySummaryCreate,
    WeeklySummaryUpdate,
    WeeklySummaryGenerationRequest,
)
from app.services.weekly_summary_service import WeeklySummaryService

router = APIRouter()


@router.get("/", response_model=WeeklySummaryList)
def get_weekly_summaries(
    year: Optional[int] = Query(None, description="筛选年份"),
    skip: int = Query(0, ge=0, description="跳过条数"),
    limit: int = Query(20, ge=1, le=100, description="返回条数"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    获取当前用户的所有周总结列表

    参数:
    - year: 筛选指定年份（可选）
    - skip: 分页跳过条数
    - limit: 分页返回条数
    """
    service = WeeklySummaryService(db)

    # 一次性获取所有符合条件的周总结（用于分页和总数统计）
    all_summaries = service.get_user_weekly_summaries(
        user_id=str(current_user.id),
        year=year,
        skip=0,
        limit=10000  # 获取足够多的记录用于计算总数
    )

    # 计算总数
    total = len(all_summaries)

    # 应用分页
    summaries = all_summaries[skip:skip + limit]

    return WeeklySummaryList(
        summaries=summaries,
        total=total
    )


@router.get("/{summary_id}", response_model=WeeklySummaryResponse)
def get_weekly_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    获取单个周总结详情

    包含每天的详细数据、任务统计、完成率等信息
    """
    service = WeeklySummaryService(db)
    summary = service.get_weekly_summary_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Weekly summary not found")

    # 验证权限
    if str(summary.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this summary")

    return summary


@router.post("/", response_model=WeeklySummaryResponse)
def create_weekly_summary(
    data: WeeklySummaryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    手动创建周总结

    如果该周已有总结，返回400错误
    系统会自动统计该周的所有数据
    """
    service = WeeklySummaryService(db)

    try:
        summary = service.create_weekly_summary(
            user_id=str(current_user.id),
            data=data
        )
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate", response_model=WeeklySummaryResponse)
def generate_weekly_summary(
    data: WeeklySummaryGenerationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    手动触发生成周总结（补救机制）

    参数:
    - year: 年份（不指定则为上周）
    - week_number: 周数（不指定则为上周）
    - force_regenerate: 是否强制重新生成（覆盖已有数据）

    如果不指定年份和周数，默认生成上周的总结
    """
    service = WeeklySummaryService(db)

    # 获取目标周
    if data.year is None or data.week_number is None:
        year, week_number, _, _ = service.get_last_week_range()
    else:
        year = data.year
        week_number = data.week_number

    # 检查是否已存在
    if not data.force_regenerate:
        existing = service.get_weekly_summary_by_week(
            user_id=str(current_user.id),
            year=year,
            week_number=week_number
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Weekly summary for {year} week {week_number} already exists. Use force_regenerate=true to overwrite."
            )

    # 生成周总结
    summary = service.generate_weekly_summary(
        user_id=str(current_user.id),
        year=year,
        week_number=week_number
    )

    if not summary:
        raise HTTPException(
            status_code=404,
            detail=f"No daily plan data found for week {year}-{week_number}"
        )

    return summary


@router.put("/{summary_id}", response_model=WeeklySummaryResponse)
def update_weekly_summary(
    summary_id: str,
    data: WeeklySummaryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    更新周总结

    只能更新 summary_text 字段，统计数据由系统自动生成
    """
    service = WeeklySummaryService(db)
    summary = service.get_weekly_summary_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Weekly summary not found")

    # 验证权限
    if str(summary.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this summary")

    updated_summary = service.update_weekly_summary(summary_id, data)
    return updated_summary


@router.delete("/{summary_id}")
def delete_weekly_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    删除周总结
    """
    service = WeeklySummaryService(db)
    summary = service.get_weekly_summary_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Weekly summary not found")

    # 验证权限
    if str(summary.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this summary")

    success = service.delete_weekly_summary(summary_id)
    if not success:
        raise HTTPException(status_code=404, detail="Failed to delete summary")

    return {"message": "Weekly summary deleted successfully"}


@router.post("/{summary_id}/send")
def send_weekly_summary_notification(
    summary_id: str,
    send_email: bool = Query(False, description="发送邮件通知"),
    send_feishu: bool = Query(False, description="发送飞书通知"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    手动发送周总结通知

    可以选择发送到邮箱和/或飞书群。
    系统会检查用户的系统设置，只有在启用了相应通道的情况下才会发送。

    参数:
    - send_email: 是否发送邮件通知
    - send_feishu: 是否发送飞书通知
    """
    from app.services.notification_service import NotificationService

    # Get summary first to verify ownership
    service = WeeklySummaryService(db)
    summary = service.get_weekly_summary_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Weekly summary not found")

    # Verify ownership
    if str(summary.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to send notifications for this summary")

    # At least one channel should be requested
    if not send_email and not send_feishu:
        raise HTTPException(
            status_code=400,
            detail="At least one notification channel (email or feishu) must be specified"
        )

    # Send notifications
    notification_service = NotificationService(db)
    result = notification_service.send_weekly_summary(
        summary_id=summary_id,
        send_email=send_email,
        send_feishu=send_feishu
    )

    return result
