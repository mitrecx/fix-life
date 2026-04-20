# User management (admin) — design spec

**Date:** 2026-04-21  
**Status:** Awaiting implementation plan after spec review  
**Scope:** Admin-only user management UI and APIs under `/api/v1/admin/users`, with role assignment, account enable/disable, one-time temporary password + forced password change on next session. Uses **independent permission** `users:manage` and **`/admin/users` API prefix** (方案 1).

---

## 1. Goals

- Add a **frontend page** reachable only by users with **`users:manage`**.
- Admins can **list/search users**, **view details**, **enable/disable accounts**, **replace role assignments**, and **issue a temporary password** (returned once in API response).
- Users who must change password (**`must_change_password`**) are **forced through a dedicated change-password flow** after login until the flag is cleared.
- Preserve **at least one active admin** and **prevent self-deactivation**.

## 2. Non-goals (v1)

- Self-service “forgot password” changes beyond existing flows (unless reused internally later).
- Per-field arbitrary user profile editing by admin (only what is listed in §4 APIs unless expanded later).
- Full audit log UI (optional structured logging only).

## 3. Data model

### 3.1 `users` table

| Column | Type | Notes |
|--------|------|--------|
| `must_change_password` | `Boolean`, NOT NULL, default `false` | Set `true` when admin issues temp password |

**Alembic:** add column; backfill not required (default `false`).

### 3.2 RBAC

| Artifact | Detail |
|----------|--------|
| New permission | **`users:manage`** — manage users (list, roles, active flag, temp password) |
| Seed / migration | Insert `users:manage`; link to **`admin`** role via `role_permissions` (keep existing **`system_status:read`** on `admin`) |
| Existing admins | Any user already linked to **`admin`** gains **`users:manage`** after migration |

### 3.3 Business rules

1. **No self-deactivation:** `PATCH` must reject `is_active: false` when `user_id == current_user.id` (**400**).
2. **Last active admin:** After any change that would apply, there must remain **≥1** user where **`users.is_active == true`** AND user has role **`admin`** (by `roles.name == 'admin'`). Otherwise **400** with clear `detail`.
3. **Temp password reset:** **`POST .../reset-temp-password`** — **reject** target `user_id == current_user.id` (**400**), unless product later explicitly allows (v1: **forbid**).
4. **Secrets:** Never log temporary password or new password plaintext.

## 4. Backend APIs

**Global:** All routes below require **JWT** + **`require_permission("users:manage")`**. Missing permission → **403**.

### 4.1 `GET /api/v1/admin/roles`

- Returns list of assignable roles: `id`, `name`, `description` (optional).
- Used by admin UI role picker.

### 4.2 `GET /api/v1/admin/users`

- **Query:** `page` (default 1), `page_size` (default 20, max 100), `q` optional (search `username` / `email`, case-insensitive).
- **Response:** `{ "items": [...], "total": N }`.
- **Item fields (minimum):** `id`, `username`, `email`, `full_name`, `is_active`, `must_change_password`, `created_at`, `roles: [{ "id", "name" }]`.

### 4.3 `GET /api/v1/admin/users/{user_id}`

- Same shape as list item or superset; **404** if not found.

### 4.4 `PATCH /api/v1/admin/users/{user_id}`

- **Body (all optional but at least one required):** `is_active?: bool`, `role_ids?: UUID[]` (**replaces** all roles for that user).
- Enforce §3.3 rules before commit.
- **400** for rule violations; **404** missing user.

### 4.5 `POST /api/v1/admin/users/{user_id}/reset-temp-password`

- Generate strong random temp password (e.g. `secrets.token_urlsafe`), hash with existing password hasher, save, set **`must_change_password = true`**.
- **Response:** `{ "temp_password": "<plaintext only this once>" }`.
- Enforce §3.3 (no self-target).

## 5. Login & forced password change

### 5.1 API surface

- Expose **`must_change_password`** on **`UserResponse`** and in login/register payloads (already pattern for `permissions`).
- **`GET /users/me`** returns current value.

### 5.2 Change password behavior

- Extend **`POST /users/me/change-password`** (or equivalent documented route):
  - If **`must_change_password == true`**: allow **only `new_password`** (and validation); **omit or ignore `old_password`**.
  - Else: require **`old_password`** as today.
- On success: update hash, set **`must_change_password = false`**.

### 5.3 Frontend gating

- If authenticated and **`user.must_change_password`**, **only** allow routes for the forced change flow (e.g. **`/force-change-password`**); all other app routes **redirect** there until flag clears (after successful change, refresh `/users/me`).

## 6. Frontend

### 6.1 Navigation

- Show **「用户管理」** (or similar) **only if** `permissions` includes **`users:manage`**.
- Route **`/admin/users`** (path may be adjusted for consistency but must be documented).

### 6.2 User management page

- Table with pagination + search aligned with `GET /admin/users`.
- Actions: toggle **active** (with confirm), **edit roles** (multi-select from `GET /admin/roles`), **generate temp password** (modal shows one-time string + copy).
- **403** on page load: message + redirect home (same pattern as system status).

### 6.3 Force change password page

- Minimal layout: **new password** + confirm; submit to extended change-password API; on success update store / refetch `/users/me` and navigate to main app.

## 7. Testing (recommended)

- **API:** 403 without `users:manage`; list pagination; PATCH last-admin guard; self-deactivate blocked; temp password sets flag; change-password without old when flag true.
- **Frontend (optional):** nav visibility; gated route when `must_change_password`.

## 8. Implementation notes

- New router module e.g. `app/api/v1/endpoints/admin_users.py` (or `admin/users.py`), registered under **`prefix="/admin"`** with sub-path **`/users`** and **`/roles`**.
- Service layer for “count active admins”, “apply roles atomically”, temp password generation.
- Reuse existing password hashing utilities.

## 9. Spec self-review

- **Placeholders:** None intentional.
- **Consistency:** Permission code **`users:manage`**; API **`/api/v1/admin/...`**; aligns with existing **`require_permission`** pattern.
- **Scope:** Single cohesive feature; force-change is required for temp-password option **C**.

---

**Next step:** After stakeholder review of this file, use **writing-plans** to produce `docs/superpowers/plans/2026-04-21-user-management-admin.md`.
