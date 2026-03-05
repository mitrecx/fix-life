"""Celery configuration and application setup."""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "fix_life",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.weekly_summary_tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=False,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Celery Beat schedule - 每周一早上5点执行（北京时间）
celery_app.conf.beat_schedule = {
    "generate-weekly-summaries": {
        "task": "app.tasks.weekly_summary_tasks.generate_all_weekly_summaries",
        "schedule": crontab(hour=5, minute=0, day_of_week=1),  # Every Monday at 5:00 AM
        "options": {"expires": 3600},  # Task expires after 1 hour
    },
}
