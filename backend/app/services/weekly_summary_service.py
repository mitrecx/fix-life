"""Weekly summary service for generating and managing weekly summaries."""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from app.models.weekly_summary import WeeklySummary
from app.models.daily_plan import DailyPlan, DailyTask, DailyTaskStatus, DailySummary, SummaryType
from app.schemas.weekly_summary import (
    WeeklySummaryCreate,
    WeeklySummaryUpdate,
)

logger = logging.getLogger(__name__)


class WeeklySummaryService:
    """Service for weekly summary operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_weekly_summaries(
        self,
        user_id: str,
        year: Optional[int] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[WeeklySummary]:
        """获取用户的所有周总结（分页）"""
        query = self.db.query(WeeklySummary).filter(WeeklySummary.user_id == user_id)

        if year:
            query = query.filter(WeeklySummary.year == year)

        return query.order_by(WeeklySummary.start_date.desc()).offset(skip).limit(limit).all()

    def get_weekly_summary_by_id(self, summary_id: str) -> Optional[WeeklySummary]:
        """根据ID获取周总结"""
        return self.db.query(WeeklySummary).filter(WeeklySummary.id == summary_id).first()

    def get_weekly_summary_by_week(
        self,
        user_id: str,
        year: int,
        week_number: int
    ) -> Optional[WeeklySummary]:
        """根据年份和周数获取周总结"""
        return self.db.query(WeeklySummary).filter(
            and_(
                WeeklySummary.user_id == user_id,
                WeeklySummary.year == year,
                WeeklySummary.week_number == week_number
            )
        ).first()

    def get_week_date_range(self, year: int, week_number: int) -> tuple[date, date]:
        """获取指定年份和周数的日期范围（周一到周日）"""
        # ISO week date: first week is the one with the first Thursday
        jan_4 = date(year, 1, 4)
        week_start = jan_4 - timedelta(days=jan_4.weekday())
        week_start_date = week_start + timedelta(weeks=week_number - 1)
        week_end_date = week_start_date + timedelta(days=6)
        return week_start_date, week_end_date

    def get_last_week_range(self) -> tuple[int, int, date, date]:
        """获取上周的年份、周数和日期范围"""
        today = date.today()
        # 计算上周一
        last_monday = today - timedelta(days=today.weekday() + 7)
        last_sunday = last_monday + timedelta(days=6)

        # 计算 ISO week number
        year = last_monday.year
        week_number = last_monday.isocalendar()[1]

        return year, week_number, last_monday, last_sunday

    def generate_weekly_summary(
        self,
        user_id: str,
        year: int,
        week_number: int,
        task_id: Optional[str] = None
    ) -> Optional[WeeklySummary]:
        """
        生成周总结

        Args:
            user_id: 用户ID
            year: 年份
            week_number: 周数
            task_id: Celery 任务ID（用于追踪自动生成）

        Returns:
            WeeklySummary 对象，如果该周没有数据则返回 None
        """
        start_date, end_date = self.get_week_date_range(year, week_number)

        # 检查该周是否有日计划数据
        daily_plans = self.db.query(DailyPlan).filter(
            and_(
                DailyPlan.user_id == user_id,
                DailyPlan.plan_date >= start_date,
                DailyPlan.plan_date <= end_date
            )
        ).all()

        if not daily_plans:
            logger.info(f"User {user_id} has no daily plans for week {year}-{week_number}")
            return None

        # 聚合每天的数据
        daily_data = []
        total_tasks = 0
        completed_tasks = 0
        priority_distribution = {"high": {"total": 0, "completed": 0},
                                  "medium": {"total": 0, "completed": 0},
                                  "low": {"total": 0, "completed": 0}}

        for plan in daily_plans:
            # 获取该日的每日总结（如果有）
            daily_summary = self.db.query(DailySummary).filter(
                DailySummary.daily_plan_id == plan.id
            ).first()

            summary_data = None
            if daily_summary:
                summary_data = {
                    "summary_type": daily_summary.summary_type.value,
                    "content": daily_summary.content
                }

            daily_data.append({
                "date": plan.plan_date.isoformat(),
                "plan_id": str(plan.id),
                "title": plan.title,
                "total_tasks": plan.total_tasks,
                "completed_tasks": plan.completed_tasks,
                "completion_rate": plan.completion_rate,
                "daily_summary": summary_data
            })

            total_tasks += plan.total_tasks
            completed_tasks += plan.completed_tasks

            # 统计优先级分布
            for task in plan.daily_tasks:
                priority = task.priority.value
                if priority in priority_distribution:
                    priority_distribution[priority]["total"] += 1
                    if task.status == DailyTaskStatus.DONE:
                        priority_distribution[priority]["completed"] += 1

        # 计算完成率
        completion_rate = round((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0.0

        # 构建统计数据
        stats = {
            "daily_data": daily_data,
            "priority_distribution": priority_distribution,
            "task_trend": [
                {
                    "date": item["date"],
                    "completion_rate": item["completion_rate"]
                }
                for item in sorted(daily_data, key=lambda x: x["date"])
            ]
        }

        # 检查是否已存在周总结
        existing_summary = self.get_weekly_summary_by_week(user_id, year, week_number)

        if existing_summary:
            # 更新现有总结
            existing_summary.stats = stats
            existing_summary.total_tasks = total_tasks
            existing_summary.completed_tasks = completed_tasks
            existing_summary.completion_rate = completion_rate
            existing_summary.auto_generated = task_id
            existing_summary.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing_summary)
            logger.info(f"Updated weekly summary for user {user_id}, week {year}-{week_number}")
            return existing_summary
        else:
            # 创建新总结
            new_summary = WeeklySummary(
                user_id=user_id,
                year=year,
                week_number=week_number,
                start_date=start_date,
                end_date=end_date,
                stats=stats,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                completion_rate=completion_rate,
                auto_generated=task_id
            )
            self.db.add(new_summary)
            self.db.commit()
            self.db.refresh(new_summary)
            logger.info(f"Created weekly summary for user {user_id}, week {year}-{week_number}")
            return new_summary

    def create_weekly_summary(
        self,
        user_id: str,
        data: WeeklySummaryCreate
    ) -> WeeklySummary:
        """手动创建周总结"""
        # 检查是否已存在
        existing = self.get_weekly_summary_by_week(user_id, data.year, data.week_number)
        if existing:
            raise ValueError(f"Weekly summary for {data.year} week {data.week_number} already exists")

        # 生成统计数据
        summary = self.generate_weekly_summary(user_id, data.year, data.week_number)
        if not summary:
            raise ValueError(f"No daily plan data found for week {data.year}-{data.week_number}")

        # 更新用户提供的总结文本
        if data.summary_text:
            summary.summary_text = data.summary_text
            self.db.commit()
            self.db.refresh(summary)

        return summary

    def update_weekly_summary(
        self,
        summary_id: str,
        data: WeeklySummaryUpdate
    ) -> Optional[WeeklySummary]:
        """更新周总结（只能更新 summary_text）"""
        summary = self.get_weekly_summary_by_id(summary_id)
        if not summary:
            return None

        if data.summary_text is not None:
            summary.summary_text = data.summary_text

        self.db.commit()
        self.db.refresh(summary)
        return summary

    def delete_weekly_summary(self, summary_id: str) -> bool:
        """删除周总结"""
        summary = self.get_weekly_summary_by_id(summary_id)
        if not summary:
            return False

        self.db.delete(summary)
        self.db.commit()
        return True

    def get_active_users_with_daily_plans(
        self,
        start_date: date,
        end_date: date
    ) -> List[str]:
        """获取指定时间范围内有日计划的活跃用户ID列表"""
        user_ids = self.db.query(DailyPlan.user_id).filter(
            and_(
                DailyPlan.plan_date >= start_date,
                DailyPlan.plan_date <= end_date
            )
        ).distinct().all()

        return [str(user_id[0]) for user_id in user_ids]
