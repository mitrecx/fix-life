# System status page & normalized RBAC — design spec

**Date:** 2026-04-20  
**Status:** Approved for implementation planning  
**Scope:** Application-layer service health dashboard (no systemd), plus DB-backed roles/permissions with admin-only access. First admin seed user: **`Mitre`**.

---

## 1. Goals

- Add a **protected frontend page** that shows whether core **application dependencies** are healthy: PostgreSQL, Redis (Celery broker / result backend as configured).
- Restrict access to **users who hold permission** `system_status:read` (via **`admin`** role in seed data).
- Use **normalized RBAC** (roles, permissions, junction tables) for future extension.
- Keep existing **`GET /health`** as a simple unauthenticated liveness probe; **detailed checks** live behind auth + permission.

## 2. Non-goals

- Monitoring host **systemd** units or arbitrary OS processes.
- Celery worker process liveness via `celery inspect` in v1 (optional follow-up); v1 treats **Redis reachability** as broker health.
- Full admin UI for assigning roles (v1 may use SQL / one-off migration for role assignment).

## 3. Data model

### 3.1 Tables

| Table | Purpose |
|--------|--------|
| `roles` | `id` (UUID PK), `name` (unique, e.g. `admin`), `description` (optional), `created_at`, `updated_at` |
| `permissions` | `id` (UUID PK), `code` (unique, e.g. `system_status:read`), `description` (optional), timestamps |
| `role_permissions` | `(role_id, permission_id)` composite PK, FKs to `roles`, `permissions` |
| `user_roles` | `(user_id, role_id)` composite PK, FKs to `users`, `roles` |

### 3.2 Seed (Alembic migration)

1. Insert permission **`system_status:read`** (description e.g. “View system dependency status”).
2. Insert role **`admin`**, link to `system_status:read` via `role_permissions`.
3. **If** a row exists in `users` with **`username = 'Mitre'`** (exact case), insert `user_roles` linking that user to `admin`.
4. **If** no such user exists, migration **must not fail**; no `user_roles` row for Mitre until a follow-up step (see §7).

### 3.3 Default users

- New users: **no** `user_roles` rows ⇒ no admin permissions until assigned.
- Optional future: explicit `user` role with no permissions — **out of scope** for v1.

## 4. Backend

### 4.1 Authorization

- Dependency factory: **`require_permission("system_status:read")`** (or generic `require_permissions(...)`).
- After `get_current_user`, load permission codes for that user: `user_roles` → `role_permissions` → `permissions.code`, dedupe.
- Missing permission ⇒ **403 Forbidden**.

### 4.2 User profile / token payloads

- Extend **`UserResponse`** (or introduce `UserMeResponse` used by `/me` and nested in login) with **`permissions: list[str]`**, computed from DB on each request for `/me`.
- **`TokenResponse.user`** includes **`permissions`** so the SPA can set auth store after login/register without an extra round-trip; still **refresh via `GET /users/me`** on app load (or when entering sensitive pages) to pick up role changes.

### 4.3 System status API

- **Route:** `GET /api/v1/system/status` (exact prefix aligns with existing `api/v1` router).
- **Auth:** JWT + **`require_permission("system_status:read")`**.
- **Response:** HTTP **200** with structured body (dashboard-friendly):
  - `checked_at`: ISO-8601 UTC
  - `all_ok`: bool — true iff every check succeeded
  - `checks`: object or list of objects, each with at least:
    - `name`: e.g. `postgres`, `redis`
    - `ok`: bool
    - `latency_ms`: optional float
    - `error`: optional string (safe for client; no secrets)
- **Checks v1:**
  - **`postgres`:** execute trivial query (e.g. `SELECT 1`).
  - **`redis`:** PING using broker URL from settings; if `CELERY_RESULT_BACKEND` points to a **different** Redis than `CELERY_BROKER_URL`, run a second check or a single combined check — document in implementation to avoid duplicate PING to the same instance.
- **Omit** redundant **`api`** self-check unless product wants a placeholder row.

### 4.4 Public health

- **`GET /health`** remains unauthenticated, minimal `{ "status": "healthy", ... }` for load balancers.

## 5. Frontend

### 5.1 Routing

- New protected route: **`/system-status`** (final path locked during implementation; keep short and consistent with menu).

### 5.2 Navigation

- In **`Layout`**, show **「系统状态」** (or equivalent label) **only if** `permissions` includes **`system_status:read`**.

### 5.3 Page behavior

- Fetch `GET /api/v1/system/status` on load and on **manual refresh**.
- Display checks with clear **green/red** (or Ant Design `Tag` / `Result`).
- **403:** show message and redirect to e.g. `/daily-plans`.
- **Loading / errors:** `Spin`, `message.error` for network/5xx.
- **Auto-refresh:** optional v1 — manual refresh only is acceptable.

### 5.4 Types & API client

- Add TS types for status response and extended user with `permissions`.
- Add `systemService.getStatus()` (or similar) in `src/services`.

## 6. Security

- No dependency details for callers without `system_status:read`.
- Error strings from probes must not include connection URLs, passwords, or stack traces to the client.

## 7. Operations

**Bootstrap admin `Mitre`:**

1. Deploy migrations.
2. Ensure user **`Mitre`** exists (register or existing row).
3. If migration ran before `Mitre` existed, run documented **SQL** (or follow-up migration) to insert `user_roles` for `users.username = 'Mitre'` and role `admin`.

**Username validation:** Must match existing registration rules (`^[a-zA-Z0-9_-]+$`); **`Mitre`** is valid.

## 8. Testing

- **API:** 403 without permission; 200 with permission when deps healthy; structured `all_ok: false` when a check fails (e.g. Redis down in test env).
- **Permission loader:** user with `admin` role receives `system_status:read` in `/me`.
- **Frontend (optional):** menu visibility based on `permissions`.

## 9. Implementation notes

- Follow existing FastAPI layout: `models/`, `schemas/`, `services/`, `api/v1/endpoints/`, register router in `api.py`.
- Alembic revision: create tables + seed + conditional Mitre assignment.
- No change to JWT payload required for v1 if `/me` and login `user` carry `permissions`.

## 10. Open items for implementation plan

- Exact Redis check strategy when broker and backend share one Redis instance (single `redis` check vs two labels).
- Whether to add a tiny **“assign admin”** dev-only endpoint or rely solely on SQL — default: **SQL in ops doc** for v1.
