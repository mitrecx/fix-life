# User management (admin) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship admin-only user management (`users:manage`), `/api/v1/admin/users` + `/admin/roles`, `must_change_password` + forced change flow, and frontend `/admin/users` + `/force-change-password`.

**Architecture:** Alembic adds column + seeds permission; `AdminUserService` centralizes list/patch/temp-password and “≥1 active admin” checks; dedicated `admin` router; extend `ChangePasswordRequest` + `change_password` handler; frontend guard redirects when `must_change_password`.

**Tech stack:** FastAPI, SQLAlchemy, Alembic, Pydantic v2, React Router 6, Zustand, Ant Design.

**Spec:** `docs/superpowers/specs/2026-04-21-user-management-admin-design.md`

---

## File map

| Path | Action |
|------|--------|
| `backend/alembic/versions/20260421_xxxx_add_must_change_password_and_users_manage.py` | Create |
| `backend/app/models/user.py` | Add `must_change_password` |
| `backend/app/schemas/user.py` | `UserResponse.must_change_password`, `ChangePasswordRequest.old_password` optional + validation note |
| `backend/app/services/rbac_service.py` | `USERS_MANAGE = "users:manage"` |
| `backend/app/api/v1/deps.py` | `require_users_manage = require_permission(USERS_MANAGE)` + `__all__` |
| `backend/app/schemas/admin_user.py` | Create: list item, patch body, temp password response, list wrapper |
| `backend/app/services/admin_user_service.py` | Create: list, get, patch, reset_temp_password, active_admin_count helpers |
| `backend/app/api/v1/endpoints/admin_users.py` | Create: routes |
| `backend/app/api/v1/api.py` | `include_router(admin_users.router, prefix="/admin", tags=["admin"])` |
| `backend/app/api/v1/endpoints/users.py` | `change_password` branch for `must_change_password` |
| `backend/tests/test_admin_users.py` | Create |
| `backend/tests/test_change_password_force.py` | Create (or merge into one file) |
| `frontend/src/types/auth.ts` | `must_change_password?: boolean` on `User` |
| `frontend/src/types/adminUser.ts` | Create |
| `frontend/src/services/adminUserService.ts` | Create |
| `frontend/src/pages/AdminUsersPage.tsx` | Create |
| `frontend/src/pages/ForceChangePasswordPage.tsx` | Create |
| `frontend/src/components/RequireNoPasswordReset.tsx` | Create (guard: redirect to force change) |
| `frontend/src/router/index.tsx` | Routes `/admin/users`, `/force-change-password`, guard wrapper |
| `frontend/src/components/Layout.tsx` | Nav item if `users:manage` |
| `frontend/src/pages/LoginPage.tsx` | After login, if `must_change_password` → `/force-change-password` |

---

### Task 1: Alembic — `must_change_password` + `users:manage` seed

**Files:** new revision `down_revision = "dd274ce3882b"`.

- [ ] **Step 1:** `cd backend && uv run alembic revision -m "must change password and users manage permission"`

- [ ] **Step 2:** In `upgrade()`:
  - `op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false")))`
  - Remove `server_default` after backfill if desired, or keep (PostgreSQL OK).
  - Insert permission `users:manage` with **new stable UUID** (e.g. `a0000001-0000-4000-8000-000000000002`).
  - `INSERT INTO role_permissions` linking **existing** `ROLE_ADMIN` UUID from prior migration (`b0000001-0000-4000-8000-000000000001`) to new permission id.

Use the same `ROLE_ADMIN` constant value as in `20260420_2142_dd274ce3882b_add_rbac_tables_and_seed.py`:

```python
ROLE_ADMIN = uuid.UUID("b0000001-0000-4000-8000-000000000001")
PERM_USERS_MANAGE = uuid.UUID("a0000001-0000-4000-8000-000000000002")
```

- [ ] **Step 3:** `downgrade()` drop FK row, permission row, drop column.

- [ ] **Step 4:** `uv run alembic upgrade head`

- [ ] **Step 5:** Commit: `feat(backend): must_change_password and users:manage permission`

---

### Task 2: User model + `UserResponse`

**Files:** `backend/app/models/user.py`, `backend/app/schemas/user.py`

- [ ] **Step 1:** On `User` model add:

```python
must_change_password = Column(Boolean, default=False, nullable=False)
```

- [ ] **Step 2:** On `UserResponse` add:

```python
must_change_password: bool = False
```

(`Field(default=False)` if needed for validation.)

- [ ] **Step 3:** `build_user_response` uses `model_validate(user)` — ensure ORM has attribute (SQLAlchemy loads it).

- [ ] **Step 4:** Commit: `feat(backend): expose must_change_password on user model and response`

---

### Task 3: RBAC constant + deps

**Files:** `backend/app/services/rbac_service.py`, `backend/app/api/v1/deps.py`

- [ ] **Step 1:** Add `USERS_MANAGE = "users:manage"` next to `SYSTEM_STATUS_READ`.

- [ ] **Step 2:** In `deps.py`:

```python
from app.services.rbac_service import SYSTEM_STATUS_READ, USERS_MANAGE, get_permission_codes_for_user
require_users_manage = require_permission(USERS_MANAGE)
```

Export in `__all__`.

- [ ] **Step 3:** Commit: `feat(backend): users:manage dependency`

---

### Task 4: Pydantic schemas for admin API

**Files:** `backend/app/schemas/admin_user.py` (new)

- [ ] **Step 1:** Define:

```python
class RoleBrief(BaseModel):
    id: UUID
    name: str

class AdminUserListItem(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    must_change_password: bool
    created_at: datetime
    roles: list[RoleBrief] = []

class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItem]
    total: int

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role_ids: Optional[list[UUID]] = None

class TempPasswordResponse(BaseModel):
    temp_password: str

class RoleListItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
```

Use `model_config = ConfigDict(from_attributes=True)` where using ORM helpers, or build dicts in service.

- [ ] **Step 2:** Commit: `feat(backend): admin user pydantic schemas`

---

### Task 5: `AdminUserService`

**Files:** `backend/app/services/admin_user_service.py`

Implement (signatures illustrative):

- `list_users(db, page, page_size, q) -> tuple[list, total]`
- `get_user(db, user_id) -> User | None`
- `set_roles_replace(db, user, role_ids)` — delete existing `UserRole` rows for user, insert new; validate all `role_ids` exist
- `count_active_admins(db) -> int` — users with `is_active` and role name `admin`
- `would_remain_active_admin(db, user, proposed_active, proposed_role_ids) -> bool` — simulate post-state (careful: if only patching `is_active`, roles unchanged; if only `role_ids`, merge logic)

**Rule implementation sketch:**

```python
def assert_at_least_one_active_admin_after(db, target_user, new_active: bool | None, new_role_ids: list[UUID] | None):
    # Build hypothetical: copy current is_active and roles, apply overrides
    # Count users u where u.is_active and admin role in u.roles
    # If count < 1: raise HTTPException(400, "须至少保留一名可用的管理员")
```

- `reset_temp_password(db, user) -> str` — `secrets.token_urlsafe(16)`, `get_password_hash`, set `must_change_password=True`, return plaintext

- [ ] **Step 1:** Implement service with unit-testable helpers.

- [ ] **Step 2:** Commit: `feat(backend): admin user service`

---

### Task 6: Admin routes

**Files:** `backend/app/api/v1/endpoints/admin_users.py`, `backend/app/api/v1/api.py`

- [ ] **Step 1:** Create router:

```python
router = APIRouter(dependencies=[Depends(require_users_manage)])
```

**Note:** `require_users_manage` is a Depends instance — use `Depends(require_users_manage)` incorrectly; pattern: either add dependency to each route or use:

```python
router = APIRouter()
# each route: current_user: User = Depends(require_users_manage)  # WRONG - require_users_manage returns callable

# Correct: use dependency=list on APIRouter in FastAPI:
router = APIRouter(dependencies=[Depends(require_users_manage)])
```

Verify: `require_users_manage` is the inner async function from `require_permission` — actually it's `require_permission(USERS_MANAGE)` return value. In deps.py it's `require_users_manage = require_permission(USERS_MANAGE)` which **is** the `permission_checker` callable. So:

```python
router = APIRouter(dependencies=[Depends(require_users_manage)])
```

works if `require_users_manage` is the same callable type as `get_current_user` — it's `async def permission_checker(...)`.

- [ ] **Step 2:** Implement:
  - `GET /roles` → list roles from `db.query(Role).order_by(Role.name)`
  - `GET /users` pagination + search (`ilike` on username/email with `or_`)
  - `GET /users/{user_id}`
  - `PATCH /users/{user_id}` — validate at least one field; self-deactivate check; last-admin check; commit
  - `POST /users/{user_id}/reset-temp-password` — reject self; return `TempPasswordResponse`

- [ ] **Step 3:** Register:

```python
from app.api.v1.endpoints import admin_users
api_router.include_router(admin_users.router, prefix="/admin", tags=["admin"])
```

Paths become `/api/v1/admin/users` etc.

- [ ] **Step 4:** Manual curl / OpenAPI check.

- [ ] **Step 5:** Commit: `feat(backend): admin users and roles API`

---

### Task 7: Change password — forced flow

**Files:** `backend/app/schemas/user.py`, `backend/app/api/v1/endpoints/users.py`

- [ ] **Step 1:** Change `ChangePasswordRequest`:

```python
old_password: Optional[str] = Field(None, min_length=1)
new_password: str = Field(..., min_length=8, max_length=100)
```

- [ ] **Step 2:** In `change_password`:

```python
if current_user.must_change_password:
    if password_data.old_password:
        # optional: ignore or 400 — spec says omit; ignore is fine
        pass
else:
    if not password_data.old_password or not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(400, detail="原密码错误")
current_user.hashed_password = get_password_hash(password_data.new_password)
current_user.must_change_password = False
db.commit()
return {"message": "密码修改成功"}
```

- [ ] **Step 3:** Commit: `feat(backend): change password when must_change_password without old password`

---

### Task 8: Backend tests

**Files:** `backend/tests/test_admin_users.py`, `backend/tests/test_change_password_force.py`

- [ ] **Step 1:** Use `TestClient` + dependency overrides (`require_users_manage` as override returning mock user) mirroring `test_system_status.py` pattern — add `require_users_manage` to `app.dependency_overrides` in fixture.

- [ ] **Step 2:** Tests:
  - `GET /admin/users` → 403 without override permission (override `get_permission_codes_for_user` to `[]` and use real `require_users_manage` — may be easier to override `require_users_manage` directly with async lambda returning user).
  - With full DB: optional integration — if heavy, mock service layer.

Minimal approach: override **`require_users_manage`** the same way as `require_system_status_permission`:

```python
app.dependency_overrides[require_users_manage] = fake_user_dep
```

Register `require_users_manage` in deps for test imports.

- [ ] **Step 3:** Test `change_password` with `must_change_password=True` mock user without old_password.

- [ ] **Step 4:** `uv run pytest tests/ -q`

- [ ] **Step 5:** Commit: `test(backend): admin users and forced password change`

---

### Task 9: Frontend — types, services, pages, router

**Files:** see file map.

- [ ] **Step 1:** `auth.ts` — `must_change_password?: boolean` on `User`.

- [ ] **Step 2:** `types/adminUser.ts` — mirror API types.

- [ ] **Step 3:** `services/adminUserService.ts` — `listUsers`, `getUser`, `patchUser`, `resetTempPassword`, `listRoles` using `api` helper.

- [ ] **Step 4:** `ForceChangePasswordPage.tsx` — form new + confirm; `api.post("/users/me/change-password", { new_password })` without `old_password`; on success `api.get("/users/me")` + `setUser` + `navigate("/daily-plans")`.

- [ ] **Step 5:** `RequireNoPasswordReset.tsx` — children; if `user?.must_change_password` and `location.pathname !== "/force-change-password"` → `<Navigate to="/force-change-password" replace />`; else render children.

Wrap **only** the `Layout` branch:

```tsx
<ProtectedRoute>
  <RequireNoPasswordReset>
    <Layout />
  </RequireNoPasswordReset>
</ProtectedRoute>
```

Add **sibling** route:

```tsx
{
  path: "/force-change-password",
  element: (
    <ProtectedRoute>
      <ForceChangePasswordPage />
    </ProtectedRoute>
  ),
},
```

- [ ] **Step 6:** `ForceChangePasswordPage` — if `!user?.must_change_password` → `Navigate` to `/daily-plans`.

- [ ] **Step 7:** `LoginPage` — after `setAuth`, if `user.must_change_password` → `navigate("/force-change-password")`.

- [ ] **Step 8:** `AdminUsersPage.tsx` — Ant Design `Table`, `Input.Search`, `Pagination`, modals for roles (`Select mode="multiple"`), `Popconfirm` for active toggle, temp password `Modal` with `Typography.Paragraph copyable`.

- [ ] **Step 9:** Router child `path: "admin/users", element: <AdminUsersPage />`.

- [ ] **Step 10:** `Layout.tsx` — `USERS_MANAGE = "users:manage"`; if `user?.permissions?.includes(USERS_MANAGE)` push nav `{ path: "/admin/users", label: "用户管理", shortLabel: "管" }`.

- [ ] **Step 11:** `AdminUsersPage` — on load 403 → `SystemStatusForbiddenError`-style or dedicated `AdminForbiddenError` + redirect.

- [ ] **Step 12:** `npm run build`

- [ ] **Step 13:** Commit: `feat(frontend): admin users and force password change flow`

---

## Plan self-review

| Spec section | Tasks |
|--------------|--------|
| §3 Data + RBAC | 1–3 |
| §4 Admin APIs | 4–6 |
| §5 Change password | 7 |
| §6 Frontend | 9 |
| §7 Tests | 8 |

**Placeholder scan:** None. **Note:** Exact UUID for `users:manage` must match migration; router dependency list verified against FastAPI version in project.

---

## Execution handoff

**Plan saved to `docs/superpowers/plans/2026-04-21-user-management-admin.md`.**

1. **Subagent-driven (recommended)** — one subagent per task, review between tasks.  
2. **Inline execution** — run tasks in this session with checkpoints.

Which approach do you want?
