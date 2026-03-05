"""Celery tasks for weekly summary generation."""
from datetime import date
from typing import Dict, Any
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from app.core.celery import celery_app
from app.db.session import SessionLocal
from app.services.weekly_summary_service import WeeklySummaryService
from app.services.email_service import EmailService

logger = get_task_logger(__name__)


@celery_app.task(name="app.tasks.weekly_summary_tasks.generate_all_weekly_summaries")
def generate_all_weekly_summaries() -> Dict[str, Any]:
    """
    为所有活跃用户生成上周的周总结
    每周一早上5:00自动触发
    """
    logger.info("Starting weekly summary generation task")

    db = SessionLocal()
    try:
        service = WeeklySummaryService(db)

        # 获取上周的时间范围
        year, week_number, start_date, end_date = service.get_last_week_range()

        logger.info(f"Generating summaries for week {year}-{week_number} ({start_date} to {end_date})")

        # 获取所有有日计划的活跃用户
        active_user_ids = service.get_active_users_with_daily_plans(start_date, end_date)
        logger.info(f"Found {len(active_user_ids)} active users")

        results = {
            "year": year,
            "week_number": week_number,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "total_users": len(active_user_ids),
            "success_count": 0,
            "skipped_count": 0,
            "failed_count": 0,
            "errors": []
        }

        # 为每个用户生成周总结
        for user_id in active_user_ids:
            try:
                # 为当前用户生成周总结
                task_id = generate_user_weekly_summary.delay(user_id, year, week_number).id
                logger.info(f"Queued weekly summary generation for user {user_id}, task ID: {task_id}")

            except Exception as e:
                logger.error(f"Failed to queue weekly summary for user {user_id}: {str(e)}")
                results["failed_count"] += 1
                results["errors"].append({
                    "user_id": user_id,
                    "error": str(e)
                })

        logger.info(f"Weekly summary generation task completed: {results}")
        return results

    except Exception as e:
        logger.error(f"Failed to generate weekly summaries: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.weekly_summary_tasks.generate_user_weekly_summary")
def generate_user_weekly_summary(user_id: str, year: int, week_number: int) -> Dict[str, Any]:
    """
    为单个用户生成周总结
    """
    logger.info(f"Generating weekly summary for user {user_id}, week {year}-{week_number}")

    db = SessionLocal()
    try:
        from app.models.user import User
        service = WeeklySummaryService(db)

        # 生成周总结
        summary = service.generate_weekly_summary(
            user_id=user_id,
            year=year,
            week_number=week_number,
            task_id=generate_user_weekly_summary.request.id
        )

        if summary:
            logger.info(f"Successfully generated weekly summary for user {user_id}")

            # 发送通知邮件
            try:
                email_service = EmailService()
                user = db.query(User).filter(User.id == user_id).first()

                if user and user.email:
                    subject = f"您的{year}年第{week_number}周总结已生成"
                    body = f"""
                    <h2>周总结已生成</h2>
                    <p>您好 {user.username}，</p>
                    <p>您的{year}年第{week_number}周总结已自动生成。</p>
                    <p><strong>统计概览：</strong></p>
                    <ul>
                        <li>时间范围：{summary.start_date} 至 {summary.end_date}</li>
                        <li>总任务数：{summary.total_tasks}</li>
                        <li>已完成：{summary.completed_tasks}</li>
                        <li>完成率：{summary.completion_rate}%</li>
                    </ul>
                    <p>请登录系统查看详细报告。</p>
                    """

                    email_service.send_email(
                        to_email=user.email,
                        subject=subject,
                        body=body
                    )
                    logger.info(f"Email notification sent to user {user_id}")
            except Exception as e:
                logger.error(f"Failed to send email notification to user {user_id}: {str(e)}")

            return {
                "user_id": user_id,
                "success": True,
                "summary_id": str(summary.id),
                "year": year,
                "week_number": week_number
            }
        else:
            logger.info(f"No data for user {user_id} in week {year}-{week_number}, skipped")
            return {
                "user_id": user_id,
                "success": False,
                "reason": "no_data",
                "year": year,
                "week_number": week_number
            }

    except Exception as e:
        logger.error(f"Failed to generate weekly summary for user {user_id}: {str(e)}")
        return {
            "user_id": user_id,
            "success": False,
            "error": str(e),
            "year": year,
            "week_number": week_number
        }
    finally:
        db.close()


@celery_app.task(name="app.tasks.weekly_summary_tasks.regenerate_weekly_summary")
def regenerate_weekly_summary(summary_id: str) -> Dict[str, Any]:
    """
    重新生成指定的周总结（补救机制）
    """
    logger.info(f"Regenerating weekly summary {summary_id}")

    db = SessionLocal()
    try:
        service = WeeklySummaryService(db)

        # 获取原总结
        summary = service.get_weekly_summary_by_id(summary_id)
        if not summary:
            return {
                "success": False,
                "error": "Summary not found"
            }

        # 重新生成
        new_summary = service.generate_weekly_summary(
            user_id=str(summary.user_id),
            year=summary.year,
            week_number=summary.week_number,
            task_id=regenerate_weekly_summary.request.id
        )

        if new_summary:
            return {
                "success": True,
                "summary_id": str(new_summary.id)
            }
        else:
            return {
                "success": False,
                "error": "No data available for regeneration"
            }

    except Exception as e:
        logger.error(f"Failed to regenerate weekly summary {summary_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()
