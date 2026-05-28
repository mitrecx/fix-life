# Changelog

All notable user-facing and integration changes for Fix Life.

## [Unreleased]

### Added

- MCP tool **`daily_progress`** — canonical API for 每日进度 (by-date execution view).
- REST prefix **`/api/v1/daily-progress`** — replaces removed `/daily-plans`.
- Frontend route **`/daily-progress`** — replaces removed `/daily-plans`.
- Analytics field **`total_daily_progress_days`**.
- Backend canonical modules: `app.services.daily_progress_service`, `app.schemas.daily_progress`.
- Frontend canonical modules: `dailyProgressService`, `DailyProgressPage`, `DailyProgressList`, etc.

### Changed

- Product copy unified to **「每日进度」** (was 「每日计划」 in places).
- **MCP breaking change:** `daily_progress` uses canonical actions, parameters, and response keys only.
- **MCP breaking change:** removed tool `daily`; `reflect` daily summary requires `get_daily_summary` / `create_daily_summary` with `daily_progress_day_id`.
- **REST breaking change:** removed deprecated JSON fields `daily_plan_id`, `daily_tasks`, `total_daily_plans` (use `daily_progress_day_id`, `daily_progress_entries`, `total_daily_progress_days`).
- **REST breaking change (legacy cleanup):** paths use `daily_progress_day_id`, `/entries/{entry_id}`, `/by-date/{progress_date}`, `/days/{id}/summary`; list field `daily_progress_days`; body field `progress_date`.
- Dropped PostgreSQL compat views `daily_plans` / `daily_tasks`.
- Removed frontend deprecated re-exports and localStorage legacy key fallback.
- **ORM/models:** `DailyProgressDay`, `DailyProgressEntry`, column `progress_date`; removed `DailyPlan` / `DailyTask` / `daily_plan_*` modules.

### Removed

- REST **`/api/v1/daily-plans`** — no redirect; use `/daily-progress`.
- Frontend route **`/daily-plans`** — no redirect; use `/daily-progress`.
- Dual-field API compatibility for daily progress naming migration.
- Legacy modules: `daily_plan.py`, `daily_plan_service.py`, `daily_plans.py` endpoints.

### Internal

- Tables: `daily_progress_days`, `daily_progress_entries`, `daily_progress_day_id`.
