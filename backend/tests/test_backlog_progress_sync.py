"""Tests for backlog vs daily progress consistency."""

from datetime import date, timedelta
from unittest.mock import MagicMock

from app.models.backlog_daily_link import BacklogDailyLink
from app.services.backlog_task_service import BacklogTaskService


def _make_link(*, plan_date: date, progress_after: int | None) -> BacklogDailyLink:
    link = BacklogDailyLink(
        backlog_task_id="backlog-1",
        daily_task_id="daily-1",
        plan_date=plan_date,
    )
    link.progress_after = progress_after
    return link


def test_resolve_link_progress_prefers_backlog_for_current_and_future_links():
    service = BacklogTaskService(db=MagicMock())
    link = _make_link(plan_date=date.today() + timedelta(days=2), progress_after=38)

    after, delta = service._resolve_link_progress(
        link,
        prev_after=0,
        backlog_progress=0,
    )

    assert after == 0
    assert delta == 0


def test_resolve_link_progress_keeps_historical_snapshot_for_past_links():
    service = BacklogTaskService(db=MagicMock())
    link = _make_link(plan_date=date.today() - timedelta(days=3), progress_after=38)

    after, delta = service._resolve_link_progress(
        link,
        prev_after=10,
        backlog_progress=0,
    )

    assert after == 38
    assert delta == 28


def test_record_progress_snapshot_updates_all_active_links_without_plan_date():
    service = BacklogTaskService(db=MagicMock())
    today = date.today()
    past_link = _make_link(plan_date=today - timedelta(days=1), progress_after=25)
    future_link = _make_link(plan_date=today + timedelta(days=1), progress_after=38)
    service.get_links_for_backlog = MagicMock(return_value=[future_link, past_link])

    task = MagicMock()
    task.id = "backlog-1"

    service._record_progress_snapshot(task, 60)

    assert future_link.progress_after == 60
    assert past_link.progress_after == 25


def test_record_progress_snapshot_with_plan_date_updates_single_link():
    service = BacklogTaskService(db=MagicMock())
    target = date.today() - timedelta(days=2)
    link = _make_link(plan_date=target, progress_after=10)
    service.get_link_for_date = MagicMock(return_value=link)

    task = MagicMock()
    task.id = "backlog-1"

    service._record_progress_snapshot(task, 45, plan_date=target)

    assert link.progress_after == 45
    service.get_link_for_date.assert_called_once_with("backlog-1", target)


def test_ensure_in_progress_daily_link_skips_when_links_exist():
    service = BacklogTaskService(db=MagicMock())
    service.get_links_for_backlog = MagicMock(return_value=[_make_link(plan_date=date.today(), progress_after=50)])

    task = MagicMock()
    task.id = "backlog-1"
    task.status = "in_progress"
    task.progress = 92

    service._ensure_in_progress_daily_link("user-1", task)

    service.get_links_for_backlog.assert_called_once_with("backlog-1")


def test_ensure_in_progress_daily_link_skips_completed_or_pending():
    service = BacklogTaskService(db=MagicMock())
    service.get_links_for_backlog = MagicMock(return_value=[])

    pending = MagicMock(id="backlog-1", status="pending", progress=0)
    done = MagicMock(id="backlog-2", status="done", progress=100)

    service._ensure_in_progress_daily_link("user-1", pending)
    service._ensure_in_progress_daily_link("user-1", done)

    service.get_links_for_backlog.assert_not_called()


def test_update_task_with_progress_plan_date_skips_today_completion_sync():
    service = BacklogTaskService(db=MagicMock())
    past = date.today() - timedelta(days=2)
    task = MagicMock()
    task.id = "backlog-1"
    task.user_id = "user-1"
    task.progress = 0

    service.get_task = MagicMock(return_value=task)
    service._sync_completed_daily_task = MagicMock()
    service._record_progress_snapshot = MagicMock()
    service._sync_linked_daily_status_for_plan_date = MagicMock()
    service.get_links_for_backlog = MagicMock(
        return_value=[_make_link(plan_date=past, progress_after=0)]
    )
    service.db.commit = MagicMock()
    service.db.refresh = MagicMock()

    from app.schemas.backlog_task import BacklogTaskUpdate

    service.update_task(
        "backlog-1",
        BacklogTaskUpdate(progress=100, progress_plan_date=past),
    )

    service._sync_completed_daily_task.assert_not_called()
    service._record_progress_snapshot.assert_called_once_with(task, 100, plan_date=past)
    service._sync_linked_daily_status_for_plan_date.assert_called_once_with(
        task,
        plan_date=past,
        progress=100,
    )
