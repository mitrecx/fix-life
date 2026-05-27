# Changelog

All notable user-facing and integration changes for Fix Life.

## [Unreleased]

### Added

- MCP tool **`daily_progress`** — canonical API for 每日进度 (by-date execution view).
- REST prefix **`/api/v1/daily-progress`** — replaces removed `/daily-plans`.
- Frontend route **`/daily-progress`** — replaces removed `/daily-plans`.
- Analytics fields **`total_daily_progress_days`** — same value as deprecated `total_daily_plans`.
- Backend canonical modules: `app.services.daily_progress_service`, `app.schemas.daily_progress`.
- Frontend canonical modules: `dailyProgressService`, `DailyProgressPage`, `DailyProgressList`, etc.

### Changed

- Product copy unified to **「每日进度」** (was 「每日计划」 in places).
- MCP `reflect` daily summary actions: prefer `get_daily_summary`, `create_daily_summary`, etc.

### Deprecated (removal windows)

| Asset | Use instead | Planned removal |
|-------|-------------|-----------------|
| MCP tool `daily` | `daily_progress` | ~2026-08-22 (+90 days from 2026-05-24) |
| MCP reflect `get_daily`, `create_daily`, … | `get_daily_summary`, `create_daily_summary`, … | ~2026-08-22 |
| TS `dailyPlanService` / `dailyPlan.ts` re-exports | `dailyProgressService` / `dailyProgress.ts` | ~2026-11-20 (+180 days) |
| Python `DailyPlanService` direct import | `DailyProgressService` from `daily_progress_service` | ~2026-11-20 |
| Analytics `total_daily_plans` | `total_daily_progress_days` | TBD (keep both for now) |

### Removed

- REST **`/api/v1/daily-plans`** — no redirect; use `/daily-progress`.
- Frontend route **`/daily-plans`** — no redirect; use `/daily-progress`.

### Internal (unchanged for integrators)

- PostgreSQL tables `daily_plans`, `daily_tasks` and ORM class `DailyPlan` — historical names; no DB rename in this release.
