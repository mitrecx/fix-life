"""Analytics service for calculating statistics and trends."""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.yearly_goal import YearlyGoal, GoalStatus, GoalCategory
from app.models.monthly_plan import MonthlyPlan, MonthlyTask, TaskStatus
from app.models.daily_plan import DailyPlan, DailyTask, DailyTaskStatus
from app.schemas.analytics import (
    DashboardStats,
    GoalCategoryStats,
    YearlyStats,
    MonthlyStats,
    CompletionRateTrend,
    HeatmapData,
)


class AnalyticsService:
    """Service for analytics and statistics calculations."""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self, user_id: str) -> DashboardStats:
        """Get dashboard overview statistics."""
        today = date.today()
        current_year = today.year
        current_month = today.month

        # Yearly goals stats
        total_goals = self.db.query(YearlyGoal).filter(
            YearlyGoal.user_id == user_id,
            YearlyGoal.year == current_year
        ).count()

        active_goals = self.db.query(YearlyGoal).filter(
            YearlyGoal.user_id == user_id,
            YearlyGoal.year == current_year,
            YearlyGoal.status == GoalStatus.IN_PROGRESS
        ).count()

        completed_goals = self.db.query(YearlyGoal).filter(
            YearlyGoal.user_id == user_id,
            YearlyGoal.year == current_year,
            YearlyGoal.status == GoalStatus.COMPLETED
        ).count()

        # Monthly plans stats
        total_monthly_plans = self.db.query(MonthlyPlan).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == current_year
        ).count()

        # Daily plans stats
        total_daily_plans = self.db.query(DailyPlan).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == current_year,
            func.extract('month', DailyPlan.plan_date) == current_month
        ).count()

        # Tasks stats (monthly + daily)
        total_monthly_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == current_year,
            MonthlyPlan.month == current_month
        ).count()

        completed_monthly_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == current_year,
            MonthlyPlan.month == current_month,
            MonthlyTask.status == TaskStatus.DONE
        ).count()

        total_daily_tasks = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == current_year,
            func.extract('month', DailyPlan.plan_date) == current_month
        ).count()

        completed_daily_tasks = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == current_year,
            func.extract('month', DailyPlan.plan_date) == current_month,
            DailyTask.status == DailyTaskStatus.DONE
        ).count()

        total_tasks = total_monthly_tasks + total_daily_tasks
        completed_tasks = completed_monthly_tasks + completed_daily_tasks

        overall_completion_rate = round(
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
        )

        return DashboardStats(
            total_goals=total_goals,
            active_goals=active_goals,
            completed_goals=completed_goals,
            total_monthly_plans=total_monthly_plans,
            total_daily_plans=total_daily_plans,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            overall_completion_rate=overall_completion_rate,
        )

    def get_yearly_stats(self, user_id: str, year: int) -> YearlyStats:
        """Get yearly statistics."""
        # Get all goals for the year
        goals = self.db.query(YearlyGoal).filter(
            YearlyGoal.user_id == user_id,
            YearlyGoal.year == year
        ).all()

        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.status == GoalStatus.COMPLETED])
        goal_completion_rate = round(
            (completed_goals / total_goals * 100) if total_goals > 0 else 0, 2
        )

        # Category stats
        category_stats_map = {}
        for goal in goals:
            cat = goal.category.value if goal.category else "other"
            if cat not in category_stats_map:
                category_stats_map[cat] = {"count": 0, "completed": 0}
            category_stats_map[cat]["count"] += 1
            if goal.status == GoalStatus.COMPLETED:
                category_stats_map[cat]["completed"] += 1

        category_stats = []
        for cat, data in category_stats_map.items():
            completion_rate = round(
                (data["completed"] / data["count"] * 100) if data["count"] > 0 else 0, 2
            )
            category_stats.append(GoalCategoryStats(
                category=cat,
                count=data["count"],
                completed=data["completed"],
                completion_rate=completion_rate,
            ))

        # Monthly progress
        monthly_progress = []
        for month in range(1, 13):
            month_goals = self.db.query(YearlyGoal).join(
                MonthlyPlan, YearlyGoal.id == MonthlyPlan.yearly_goal_id
            ).filter(
                YearlyGoal.user_id == user_id,
                YearlyGoal.year == year,
                MonthlyPlan.month == month
            ).all()

            completed_count = len([g for g in month_goals if g.status == GoalStatus.COMPLETED])
            monthly_progress.append({
                "month": month,
                "total": len(month_goals),
                "completed": completed_count,
            })

        # Get total plans and tasks for the year
        total_plans = self.db.query(MonthlyPlan).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year
        ).count()

        total_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year
        ).count()

        completed_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year,
            MonthlyTask.status == TaskStatus.DONE
        ).count()

        # Add daily tasks
        daily_tasks_total = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == year
        ).count()

        daily_tasks_completed = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == year,
            DailyTask.status == DailyTaskStatus.DONE
        ).count()

        total_tasks += daily_tasks_total
        completed_tasks += daily_tasks_completed

        task_completion_rate = round(
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
        )

        return YearlyStats(
            year=year,
            total_goals=total_goals,
            goal_completion_rate=goal_completion_rate,
            category_stats=category_stats,
            monthly_progress=monthly_progress,
            total_plans=total_plans,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            task_completion_rate=task_completion_rate,
        )

    def get_monthly_stats(self, user_id: str, year: int, month: int) -> MonthlyStats:
        """Get monthly statistics."""
        # Get monthly plans
        monthly_plans = self.db.query(MonthlyPlan).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year,
            MonthlyPlan.month == month
        ).all()

        total_plans = len(monthly_plans)

        # Get daily plans
        daily_plans = self.db.query(DailyPlan).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == year,
            func.extract('month', DailyPlan.plan_date) == month
        ).all()

        total_daily_plans = len(daily_plans)

        # Task stats from monthly plans
        total_monthly_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year,
            MonthlyPlan.month == month
        ).count()

        completed_monthly_tasks = self.db.query(MonthlyTask).join(
            MonthlyPlan, MonthlyTask.monthly_plan_id == MonthlyPlan.id
        ).filter(
            MonthlyPlan.user_id == user_id,
            MonthlyPlan.year == year,
            MonthlyPlan.month == month,
            MonthlyTask.status == TaskStatus.DONE
        ).count()

        # Task stats from daily plans
        total_daily_tasks = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == year,
            func.extract('month', DailyPlan.plan_date) == month
        ).count()

        completed_daily_tasks = self.db.query(DailyTask).join(
            DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
        ).filter(
            DailyPlan.user_id == user_id,
            func.extract('year', DailyPlan.plan_date) == year,
            func.extract('month', DailyPlan.plan_date) == month,
            DailyTask.status == DailyTaskStatus.DONE
        ).count()

        total_tasks = total_monthly_tasks + total_daily_tasks
        completed_tasks = completed_monthly_tasks + completed_daily_tasks

        task_completion_rate = round(
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
        )

        # Daily completion data
        daily_completion_data = []
        for day in range(1, 32):
            day_tasks = self.db.query(DailyTask).join(
                DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
            ).filter(
                DailyPlan.user_id == user_id,
                func.extract('year', DailyPlan.plan_date) == year,
                func.extract('month', DailyPlan.plan_date) == month,
                func.extract('day', DailyPlan.plan_date) == day
            ).all()

            if day_tasks:
                completed = len([t for t in day_tasks if t.status == DailyTaskStatus.DONE])
                rate = round((completed / len(day_tasks) * 100), 2)
                daily_completion_data.append({
                    "day": day,
                    "total": len(day_tasks),
                    "completed": completed,
                    "rate": rate,
                })

        # Priority distribution (for daily tasks)
        priority_distribution = []
        for priority in ["low", "medium", "high"]:
            count = self.db.query(DailyTask).join(
                DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
            ).filter(
                DailyPlan.user_id == user_id,
                func.extract('year', DailyPlan.plan_date) == year,
                func.extract('month', DailyPlan.plan_date) == month,
                DailyTask.priority == priority
            ).count()

            priority_distribution.append({
                "priority": priority,
                "count": count,
            })

        # Weekly comparison
        weekly_comparison = []
        for week in range(1, 6):
            start_day = (week - 1) * 7 + 1
            end_day = min(week * 7, 31)

            week_tasks = self.db.query(DailyTask).join(
                DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
            ).filter(
                DailyPlan.user_id == user_id,
                func.extract('year', DailyPlan.plan_date) == year,
                func.extract('month', DailyPlan.plan_date) == month,
                func.extract('day', DailyPlan.plan_date) >= start_day,
                func.extract('day', DailyPlan.plan_date) <= end_day
            ).all()

            if week_tasks:
                completed = len([t for t in week_tasks if t.status == DailyTaskStatus.DONE])
                rate = round((completed / len(week_tasks) * 100), 2)
                weekly_comparison.append({
                    "week": week,
                    "total": len(week_tasks),
                    "completed": completed,
                    "rate": rate,
                })

        return MonthlyStats(
            year=year,
            month=month,
            total_plans=total_plans,
            total_daily_plans=total_daily_plans,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            task_completion_rate=task_completion_rate,
            daily_completion_data=daily_completion_data,
            priority_distribution=priority_distribution,
            weekly_comparison=weekly_comparison,
        )

    def get_completion_rate_trend(
        self,
        user_id: str,
        period: str,
        start_date: date,
        end_date: date
    ) -> CompletionRateTrend:
        """Get completion rate trend over time."""
        data = []
        rates = []

        if period == "daily":
            current = start_date
            while current <= end_date:
                day_tasks = self.db.query(DailyTask).join(
                    DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
                ).filter(
                    DailyPlan.user_id == user_id,
                    DailyPlan.plan_date == current
                ).all()

                if day_tasks:
                    completed = len([t for t in day_tasks if t.status == DailyTaskStatus.DONE])
                    rate = round((completed / len(day_tasks) * 100), 2)
                    data.append({
                        "date": current.isoformat(),
                        "rate": rate,
                    })
                    rates.append(rate)

                current = current + timedelta(days=1)

        elif period == "weekly":
            # Group by week
            current = start_date
            week_num = 1
            while current <= end_date:
                week_end = min(current.replace(day=current.day + 6), end_date)

                week_tasks = self.db.query(DailyTask).join(
                    DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
                ).filter(
                    DailyPlan.user_id == user_id,
                    DailyPlan.plan_date >= current,
                    DailyPlan.plan_date <= week_end
                ).all()

                if week_tasks:
                    completed = len([t for t in week_tasks if t.status == DailyTaskStatus.DONE])
                    rate = round((completed / len(week_tasks) * 100), 2)
                    data.append({
                        "week": week_num,
                        "start_date": current.isoformat(),
                        "end_date": week_end.isoformat(),
                        "rate": rate,
                    })
                    rates.append(rate)
                    week_num += 1

                current = week_end + timedelta(days=1)

        elif period == "monthly":
            current = start_date
            while current <= end_date:
                month_tasks = self.db.query(DailyTask).join(
                    DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
                ).filter(
                    DailyPlan.user_id == user_id,
                    func.extract('year', DailyPlan.plan_date) == current.year,
                    func.extract('month', DailyPlan.plan_date) == current.month
                ).all()

                if month_tasks:
                    completed = len([t for t in month_tasks if t.status == DailyTaskStatus.DONE])
                    rate = round((completed / len(month_tasks) * 100), 2)
                    data.append({
                        "month": current.month,
                        "year": current.year,
                        "rate": rate,
                    })
                    rates.append(rate)

                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

        # Calculate average and trend
        average_rate = round(sum(rates) / len(rates), 2) if rates else 0

        if len(rates) >= 2:
            if rates[-1] > rates[-2]:
                trend = "up"
            elif rates[-1] < rates[-2]:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return CompletionRateTrend(
            period=period,
            start_date=start_date,
            end_date=end_date,
            data=data,
            average_rate=average_rate,
            trend=trend,
        )

    def get_heatmap_data(
        self,
        user_id: str,
        start_date: date,
        end_date: date
    ) -> HeatmapData:
        """Get heatmap data for task completion visualization."""
        data = []
        current = start_date

        while current <= end_date:
            day_tasks = self.db.query(DailyTask).join(
                DailyPlan, DailyTask.daily_plan_id == DailyPlan.id
            ).filter(
                DailyPlan.user_id == user_id,
                DailyPlan.plan_date == current
            ).all()

            if day_tasks:
                completed = len([t for t in day_tasks if t.status == DailyTaskStatus.DONE])
                rate = round((completed / len(day_tasks) * 100), 2)

                # Determine activity level
                if rate == 100:
                    level = "high"
                elif rate >= 50:
                    level = "medium"
                elif rate > 0:
                    level = "low"
                else:
                    level = "none"

                data.append({
                    "date": current.isoformat(),
                    "value": rate,
                    "level": level,
                    "total": len(day_tasks),
                    "completed": completed,
                })
            else:
                data.append({
                    "date": current.isoformat(),
                    "value": 0,
                    "level": "none",
                    "total": 0,
                    "completed": 0,
                })

            current = current + timedelta(days=1)

        return HeatmapData(
            start_date=start_date,
            end_date=end_date,
            data=data,
        )
