from __future__ import annotations

from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.daily_plan import DailySummary, DailyPlan
from app.schemas.daily_summary import DailySummaryCreate, DailySummaryUpdate
from app.schemas.weekly_summary import (
    WeeklySummaryCreate,
    WeeklySummaryGenerationRequest,
    WeeklySummaryUpdate,
)
from app.services.notification_service import NotificationService
from app.services.weekly_summary_service import WeeklySummaryService
from sqlalchemy import and_


def handle_reflect(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    user_id = get_user_id()

    with db_session() as db:
        if action == "get_daily":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = (
                db.query(DailyPlan)
                .filter(and_(DailyPlan.id == plan_id, DailyPlan.user_id == user_id))
                .first()
            )
            if not plan:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            summary = db.query(DailySummary).filter(DailySummary.daily_plan_id == plan_id).first()
            if not summary:
                tool_error(404, "NOT_FOUND", "Daily summary not found")
            return dump(summary)

        if action == "create_daily":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = (
                db.query(DailyPlan)
                .filter(and_(DailyPlan.id == plan_id, DailyPlan.user_id == user_id))
                .first()
            )
            if not plan:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            existing = db.query(DailySummary).filter(DailySummary.daily_plan_id == plan_id).first()
            if existing:
                tool_error(400, "CONFLICT", "Daily summary already exists for this plan")
            body = DailySummaryCreate.model_validate(payload.get("data") or payload)
            summary = DailySummary(daily_plan_id=plan_id, user_id=user_id, **body.model_dump())
            db.add(summary)
            db.commit()
            db.refresh(summary)
            return dump(summary)

        if action == "update_daily":
            summary_id = payload.get("summary_id")
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            summary = (
                db.query(DailySummary)
                .filter(and_(DailySummary.id == summary_id, DailySummary.user_id == user_id))
                .first()
            )
            if not summary:
                tool_error(404, "NOT_FOUND", "Daily summary not found")
            body = DailySummaryUpdate.model_validate(payload.get("data") or payload)
            for field, value in body.model_dump(exclude_unset=True).items():
                setattr(summary, field, value)
            db.commit()
            db.refresh(summary)
            return dump(summary)

        if action == "delete_daily":
            summary_id = payload.get("summary_id")
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            summary = (
                db.query(DailySummary)
                .filter(and_(DailySummary.id == summary_id, DailySummary.user_id == user_id))
                .first()
            )
            if not summary:
                tool_error(404, "NOT_FOUND", "Daily summary not found")
            db.delete(summary)
            db.commit()
            return {"deleted": True, "summary_id": summary_id}

        service = WeeklySummaryService(db)

        if action == "list_weekly":
            year = payload.get("year")
            skip = int(payload.get("skip", 0))
            limit = int(payload.get("limit", 20))
            summaries = service.get_user_weekly_summaries(
                user_id=user_id, year=year, skip=skip, limit=limit
            )
            return {"summaries": dump(summaries), "total": len(summaries)}

        if action == "get_weekly":
            summary_id = payload.get("summary_id")
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            summary = service.get_weekly_summary_by_id(summary_id)
            if not summary or str(summary.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Weekly summary not found")
            return dump(summary)

        if action == "create_weekly":
            body = WeeklySummaryCreate.model_validate(payload.get("data") or payload)
            try:
                summary = service.create_weekly_summary(user_id=user_id, data=body)
                return dump(summary)
            except ValueError as exc:
                tool_error(400, "VALIDATION_ERROR", str(exc))

        if action == "generate_weekly":
            body = WeeklySummaryGenerationRequest.model_validate(payload.get("data") or payload)
            if body.year is None or body.week_number is None:
                year, week_number, _, _ = service.get_last_week_range()
            else:
                year = body.year
                week_number = body.week_number
            if not body.force_regenerate:
                existing = service.get_weekly_summary_by_week(user_id, year, week_number)
                if existing:
                    tool_error(
                        409,
                        "CONFLICT",
                        f"Weekly summary for {year} week {week_number} already exists",
                    )
            summary = service.generate_weekly_summary(user_id, year, week_number)
            if not summary:
                tool_error(404, "NOT_FOUND", f"No daily plan data found for week {year}-{week_number}")
            return dump(summary)

        if action == "update_weekly":
            summary_id = payload.get("summary_id")
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            summary = service.get_weekly_summary_by_id(summary_id)
            if not summary or str(summary.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Weekly summary not found")
            body = WeeklySummaryUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_weekly_summary(summary_id, body)
            return dump(updated)

        if action == "delete_weekly":
            summary_id = payload.get("summary_id")
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            summary = service.get_weekly_summary_by_id(summary_id)
            if not summary or str(summary.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Weekly summary not found")
            service.delete_weekly_summary(summary_id)
            return {"deleted": True, "summary_id": summary_id}

        if action == "send_weekly":
            summary_id = payload.get("summary_id")
            send_email = bool(payload.get("send_email", False))
            send_feishu = bool(payload.get("send_feishu", False))
            if not summary_id:
                tool_error(422, "VALIDATION_ERROR", "summary_id is required")
            if not send_email and not send_feishu:
                tool_error(422, "VALIDATION_ERROR", "At least one of send_email or send_feishu is required")
            summary = service.get_weekly_summary_by_id(summary_id)
            if not summary or str(summary.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Weekly summary not found")
            result = NotificationService(db).send_weekly_summary(
                summary_id=summary_id,
                send_email=send_email,
                send_feishu=send_feishu,
            )
            return dump(result)

    tool_error(422, "VALIDATION_ERROR", f"Unknown reflect action: {action}")
