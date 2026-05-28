"""Daily progress service."""

from typing import List, Optional, Tuple
from datetime import date
from sqlalchemy.orm import Session, load_only
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError

from app.models.backlog_daily_link import BacklogDailyLink
from app.models.backlog_task import BacklogTask
from app.models.daily_progress import (
    DailyProgressDay,
    DailyProgressEntry,
    DailyProgressEntryPriority,
    DailyProgressEntryStatus,
)
from app.models.task_context import TaskContext
from app.schemas.daily_progress import (
    DailyProgressDayCreate,
    DailyProgressDayUpdate,
    DailyProgressEntryCreate,
    DailyProgressEntryUpdate,
    DailyProgressDayResponse,
    DailyProgressEntryResponse,
)


class DailyProgressService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_days(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[DailyProgressDay]:
        """Get all daily progress days for a user with optional date range filter."""
        query = self.db.query(DailyProgressDay).filter(DailyProgressDay.user_id == user_id)

        if start_date:
            query = query.filter(DailyProgressDay.progress_date >= start_date)
        if end_date:
            query = query.filter(DailyProgressDay.progress_date <= end_date)

        return query.order_by(DailyProgressDay.progress_date.desc()).all()

    def get_day(self, day_id: str) -> Optional[DailyProgressDay]:
        """Get a single daily progress day by ID."""
        return self.db.query(DailyProgressDay).filter(DailyProgressDay.id == day_id).first()

    def get_day_by_date(self, user_id: str, progress_date: date) -> Optional[DailyProgressDay]:
        """Get a daily progress day by user and date."""
        return (
            self.db.query(DailyProgressDay)
            .filter(
                and_(
                    DailyProgressDay.user_id == user_id,
                    DailyProgressDay.progress_date == progress_date,
                )
            )
            .first()
        )

    def get_day_head_by_date(self, user_id: str, progress_date: date) -> Optional[DailyProgressDay]:
        """Same as get_day_by_date but avoid loading relationships (no entry lazy load)."""
        return (
            self.db.query(DailyProgressDay)
            .options(
                load_only(
                    DailyProgressDay.id,
                    DailyProgressDay.user_id,
                    DailyProgressDay.progress_date,
                    DailyProgressDay.title,
                    DailyProgressDay.notes,
                    DailyProgressDay.monthly_plan_id,
                    DailyProgressDay.created_at,
                    DailyProgressDay.updated_at,
                )
            )
            .filter(
                and_(
                    DailyProgressDay.user_id == user_id,
                    DailyProgressDay.progress_date == progress_date,
                )
            )
            .first()
        )

    def _merge_incoming_into_day(self, day: DailyProgressDay, day_in: DailyProgressDayCreate) -> None:
        """Apply merge rules (title overwrite, notes append, monthly_plan_id if empty)."""
        data = day_in.model_dump(exclude_unset=True)

        new_title = data.get("title")
        if new_title is not None and str(new_title).strip():
            day.title = new_title

        new_notes = data.get("notes")
        if new_notes is not None and str(new_notes).strip():
            incoming = str(new_notes).strip()
            if day.notes and str(day.notes).strip():
                day.notes = str(day.notes).rstrip() + "\n---\n" + incoming
            else:
                day.notes = incoming

        new_mid = data.get("monthly_plan_id")
        if day.monthly_plan_id is None and new_mid is not None:
            day.monthly_plan_id = new_mid

    def create_or_merge_day(
        self, user_id: str, day_in: DailyProgressDayCreate
    ) -> Tuple[DailyProgressDay, bool]:
        """
        Create a new daily progress day or merge into existing same-day row.
        Returns (day, created) where created is True if a new row was inserted.
        """
        existing = self.get_day_by_date(user_id, day_in.progress_date)
        if existing:
            self._merge_incoming_into_day(existing, day_in)
            self.db.commit()
            self.db.refresh(existing)
            return existing, False
        try:
            day = self.create_day(user_id, day_in)
            return day, True
        except IntegrityError:
            self.db.rollback()
            existing = self.get_day_by_date(user_id, day_in.progress_date)
            if existing:
                self._merge_incoming_into_day(existing, day_in)
                self.db.commit()
                self.db.refresh(existing)
                return existing, False
            raise

    def create_day(self, user_id: str, day_in: DailyProgressDayCreate) -> DailyProgressDay:
        """Create a new daily progress day."""
        day_data = day_in.model_dump(exclude_unset=True)

        if not day_data.get("title"):
            day_data["title"] = f"{day_data['progress_date']} 每日进度"

        day = DailyProgressDay(**day_data, user_id=user_id)
        self.db.add(day)
        self.db.commit()
        self.db.refresh(day)
        return day

    def update_day(self, day_id: str, day_in: DailyProgressDayUpdate) -> Optional[DailyProgressDay]:
        """Update an existing daily progress day."""
        day = self.get_day(day_id)
        if not day:
            return None

        update_data = day_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(day, field, value)

        self.db.commit()
        self.db.refresh(day)
        return day

    def delete_day(self, day_id: str) -> bool:
        """Delete a daily progress day."""
        day = self.get_day(day_id)
        if not day:
            return False

        self.db.delete(day)
        self.db.commit()
        return True

    def get_day_entries(self, day_id: str) -> List[DailyProgressEntry]:
        """Get all entries for a daily progress day."""
        return (
            self.db.query(DailyProgressEntry)
            .filter(DailyProgressEntry.daily_progress_day_id == day_id)
            .order_by(
                DailyProgressEntry.time_slot,
                DailyProgressEntry.priority.desc(),
                DailyProgressEntry.created_at,
            )
            .all()
        )

    def get_entry(self, entry_id: str) -> Optional[DailyProgressEntry]:
        """Get a single entry by ID."""
        return self.db.query(DailyProgressEntry).filter(DailyProgressEntry.id == entry_id).first()

    def create_entry(
        self,
        day_id: str,
        entry_in: DailyProgressEntryCreate,
        *,
        backlog_task_id: Optional[str] = None,
    ) -> Optional[DailyProgressEntry]:
        """Create a new entry for a daily progress day."""
        day = self.get_day(day_id)
        if not day:
            return None

        entry_data = entry_in.model_dump(exclude_unset=True)
        entry = DailyProgressEntry(**entry_data, daily_progress_day_id=day_id)
        if backlog_task_id:
            entry.backlog_task_id = backlog_task_id
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def update_entry(
        self, entry_id: str, entry_in: DailyProgressEntryUpdate
    ) -> Optional[DailyProgressEntry]:
        """Update an existing entry."""
        entry = self.get_entry(entry_id)
        if not entry:
            return None

        update_data = entry_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        self.db.commit()
        self.db.refresh(entry)
        return entry

    def delete_entry(self, entry_id: str) -> bool:
        """Delete an entry and its backlog daily link, if any."""
        entry = self.get_entry(entry_id)
        if not entry:
            return False

        link = (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.daily_task_id == entry.id)
            .first()
        )
        if link is not None:
            backlog = (
                self.db.query(BacklogTask)
                .filter(BacklogTask.id == link.backlog_task_id)
                .first()
            )
            self.db.delete(link)
            self.db.flush()

            if backlog is not None:
                if backlog.daily_task_id == entry.id:
                    backlog.daily_task_id = None
                remaining = (
                    self.db.query(BacklogDailyLink)
                    .filter(BacklogDailyLink.backlog_task_id == backlog.id)
                    .order_by(BacklogDailyLink.plan_date.desc())
                    .first()
                )
                backlog.scheduled_date = remaining.plan_date if remaining else None

        self.db.delete(entry)
        self.db.commit()
        return True

    def update_entry_status(
        self, entry_id: str, status: DailyProgressEntryStatus
    ) -> Optional[DailyProgressEntry]:
        """Update entry status."""
        entry = self.get_entry(entry_id)
        if not entry:
            return None

        entry.status = status
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def to_entry_response(self, entry: DailyProgressEntry) -> DailyProgressEntryResponse:
        from app.services.backlog_task_service import BacklogTaskService

        base = DailyProgressEntryResponse.model_validate(entry)
        if not entry.backlog_task_id:
            return base

        progress_map = BacklogTaskService(self.db).batch_daily_task_progress([str(entry.id)])
        meta = progress_map.get(str(entry.id))
        if not meta:
            return base
        return base.model_copy(update=meta)

    def to_day_response(
        self,
        day: DailyProgressDay,
        *,
        context: Optional[TaskContext] = None,
    ) -> DailyProgressDayResponse:
        from app.services.backlog_task_service import BacklogTaskService

        entry_ids = [
            str(entry.id) for entry in day.daily_progress_entries if entry.backlog_task_id
        ]
        progress_map = BacklogTaskService(self.db).batch_daily_task_progress(entry_ids)

        entries: List[DailyProgressEntryResponse] = []
        for entry in day.daily_progress_entries:
            if context is not None and entry.context != context:
                continue
            base = DailyProgressEntryResponse.model_validate(entry)
            meta = progress_map.get(str(entry.id))
            entries.append(base.model_copy(update=meta) if meta else base)

        total_tasks = len(entries)
        completed_tasks = len(
            [entry for entry in entries if entry.status == DailyProgressEntryStatus.DONE]
        )
        completion_rate = round(completed_tasks / total_tasks * 100, 2) if total_tasks else 0.0

        base_day = DailyProgressDayResponse.model_validate(day)
        return base_day.model_copy(
            update={
                "daily_progress_entries": entries,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_rate": completion_rate,
            }
        )
