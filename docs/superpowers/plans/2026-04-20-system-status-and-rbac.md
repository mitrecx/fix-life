# System status page & normalized RBAC — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship DB-backed RBAC (roles, permissions, junction tables), seed `admin` + `system_status:read`, assign `Mitre` when present, expose `GET /api/v1/system/status` for dependency health, and a frontend `/system-status` page visible only to users with that permission.

**Architecture:** SQLAlchemy models + Alembic migration with idempotent seed; `PermissionService` loads codes per user; `require_permission` FastAPI dependency; `UserResponse.permissions` filled via a single builder used by `/users/me`, login, and register; `SystemStatusService` runs Postgres + Redis PING checks; React route + conditional nav + Ant Design UI.

**Tech stack:** FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL, Redis (existing `redis` package), React 18, Zustand, React Router 6, Ant Design, Vitest optional for frontend.

---

## File map (create / modify)

| Path | Responsibility |
|------|------------------|
| `backend/app/models/role.py` | `Role` ORM |
| `backend/app/models/permission.py` | `Permission` ORM |
| `backend/app/models/user_role.py` | `UserRole` association |
| `backend/app/models/role_permission.py` | `RolePermission` association |
| `backend/app/models/user.py` | Add `roles` relationship (optional back_populates) |
| `backend/app/models/__init__.py` | Export new models |
| `backend/alembic/env.py` | Import new models for metadata |
| `backend/alembic/versions/20260420_xxxx_add_rbac_and_seed.py` | Tables + seed + Mitre |
| `backend/app/services/rbac_service.py` | `get_permission_codes_for_user`, constants |
| `backend/app/services/system_status_service.py` | `run_checks()` → structured dict |
| `backend/app/schemas/rbac.py` | Optional small schemas for status response |
| `backend/app/schemas/user.py` | `UserResponse.permissions: list[str]` |
| `backend/app/schemas/system_status.py` | Pydantic models for API response |
| `backend/app/api/v1/deps.py` | `require_permission(code: str)` |
| `backend/app/services/user_response.py` | `build_user_response(db, user) -> UserResponse` |
| `backend/app/api/v1/endpoints/system.py` | `GET /status` router |
| `backend/app/api/v1/endpoints/users.py` | Use `build_user_response` in `/me` and PUT `/me` |
| `backend/app/api/v1/endpoints/auth.py` | Wrap `user` in `TokenResponse` with permissions |
| `backend/app/api/v1/api.py` | `include_router(system.router, prefix="/system", ...)` |
| `backend/tests/conftest.py` | `app`, `db_session` or dependency overrides |
| `backend/tests/test_rbac_permissions.py` | Permission loading + 403 |
| `backend/tests/test_system_status.py` | Status endpoint happy/forbidden path |
| `frontend/src/types/auth.ts` | `User.permissions?: string[]` |
| `frontend/src/types/systemStatus.ts` | Status response types |
| `frontend/src/services/userService.ts` | `getMe()` if missing; else extend `authService` |
| `frontend/src/services/systemService.ts` | `getSystemStatus()` |
| `frontend/src/pages/SystemStatusPage.tsx` | UI |
| `frontend/src/router/index.tsx` | Route `system-status` |
| `frontend/src/components/Layout.tsx` | Conditional nav item |
| `frontend/src/App.tsx` | On mount, refresh `/users/me` when token exists |

**Spec:** `docs/superpowers/specs/2026-04-20-system-status-and-rbac-design.md`

---

### Task 1: SQLAlchemy models (Role, Permission, associations)

**Files:**
- Create: `backend/app/models/permission.py`
- Create: `backend/app/models/role.py`
- Create: `backend/app/models/user_role.py`
- Create: `backend/app/models/role_permission.py`
- Modify: `backend/app/models/user.py` (relationship `user_roles` / `roles` via secondary — prefer explicit `UserRole` table class for composite PK)
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/alembic/env.py` (import new models)

- [ ] **Step 1: Add `Permission` model**

Create `backend/app/models/permission.py`:

```python
import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: Add `Role` model**

Create `backend/app/models/role.py`:

```python
import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 3: Add `UserRole` and `RolePermission`**

Create `backend/app/models/user_role.py`:

```python
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
```

Create `backend/app/models/role_permission.py`:

```python
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
```

- [ ] **Step 4: Wire `User` relationship**

In `backend/app/models/user.py`, add:

```python
from sqlalchemy.orm import relationship

# inside class User:
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
```

Add to `user_role.py`:

```python
from sqlalchemy.orm import relationship

class UserRole(Base):
    ...
    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_links")
```

Add to `role.py`:

```python
from sqlalchemy.orm import relationship

class Role(Base):
    ...
    user_links = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    permission_links = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
```

Add `role_permission.py` relationship to `Permission` and `Role` (mirror pattern). Keep imports cycle-free (use string names in `relationship`).

- [ ] **Step 5: Export models**

Update `backend/app/models/__init__.py` to import `Role`, `Permission`, `UserRole`, `RolePermission` and list in `__all__`.

Update `backend/alembic/env.py`:

```python
from app.models import User, YearlyGoal, MonthlyMilestone
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models backend/alembic/env.py
git commit -m "feat(backend): add RBAC ORM models"
```

---

### Task 2: Alembic migration — tables + seed + Mitre

**Files:**
- Create: `backend/alembic/versions/20260420_hhmm_add_rbac_tables_and_seed.py` (use `alembic revision -m "add rbac tables and seed"` then edit; `down_revision = "20260305_2200"`)

- [ ] **Step 1: Generate empty revision**

Run:

```bash
cd backend && uv run alembic revision -m "add rbac tables and seed"
```

Set `down_revision` to `20260305_2200` (current head from `uv run alembic heads`).

- [ ] **Step 2: Implement `upgrade()`**

In `upgrade()`:

1. `op.create_table("permissions", ...)`
2. `op.create_table("roles", ...)`
3. `op.create_table("role_permissions", ...)`
4. `op.create_table("user_roles", ...)`
5. Insert permission row with fixed UUIDs via `op.get_bind().execute(sa.text(...))` or `uuid.uuid4()` variables in Python then insert — **use stable UUIDs in Python constants** so seed is repeatable:

```python
import uuid
import sqlalchemy as sa
from alembic import op

PERM_SYSTEM_STATUS = uuid.UUID("a0000001-0000-4000-8000-000000000001")
ROLE_ADMIN = uuid.UUID("b0000001-0000-4000-8000-000000000001")

def upgrade():
    op.create_table(
        "permissions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)
    # ... roles, role_permissions, user_roles similarly matching models

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "INSERT INTO permissions (id, code, description) VALUES (:id, :code, :desc)"
        ),
        {"id": PERM_SYSTEM_STATUS, "code": "system_status:read", "desc": "View system dependency status"},
    )
    conn.execute(
        sa.text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :desc)"),
        {"id": ROLE_ADMIN, "name": "admin", "desc": "Administrator"},
    )
    conn.execute(
        sa.text(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)"
        ),
        {"rid": ROLE_ADMIN, "pid": PERM_SYSTEM_STATUS},
    )
    conn.execute(
        sa.text(
            """
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, :rid FROM users u
            WHERE u.username = 'Mitre'
            ON CONFLICT DO NOTHING
            """
        ),
        {"rid": ROLE_ADMIN},
    )
```

Use PostgreSQL `ON CONFLICT DO NOTHING` only if a unique constraint exists on `(user_id, role_id)` — composite PK already prevents duplicates; `INSERT ... SELECT` with `WHERE NOT EXISTS` is also fine:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, :rid FROM users u
WHERE u.username = 'Mitre'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = :rid
)
```

- [ ] **Step 3: Implement `downgrade()`**

Drop tables in order: `user_roles`, `role_permissions`, `roles`, `permissions`.

- [ ] **Step 4: Run migration locally**

```bash
cd backend && uv run alembic upgrade head
```

Expected: completes without error.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(backend): alembic RBAC tables and seed Mitre admin"
```

---

### Task 3: RBAC service + permission dependency

**Files:**
- Create: `backend/app/services/rbac_service.py`
- Modify: `backend/app/api/v1/deps.py`

- [ ] **Step 1: Implement `get_permission_codes_for_user`**

Create `backend/app/services/rbac_service.py`:

```python
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID

from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.models.permission import Permission

SYSTEM_STATUS_READ = "system_status:read"


def get_permission_codes_for_user(db: Session, user_id: UUID) -> list[str]:
    stmt = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    rows = db.execute(stmt).scalars().all()
    return sorted(set(rows))
```

- [ ] **Step 2: Add `require_permission` to deps**

In `backend/app/api/v1/deps.py`, after `get_current_user`:

```python
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.services.rbac_service import get_permission_codes_for_user

def require_permission(permission_code: str):
    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        codes = get_permission_codes_for_user(db, current_user.id)
        if permission_code not in codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return checker
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/rbac_service.py backend/app/api/v1/deps.py
git commit -m "feat(backend): load permissions and require_permission dependency"
```

---

### Task 4: `build_user_response` + schema update

**Files:**
- Create: `backend/app/services/user_response.py`
- Modify: `backend/app/schemas/user.py`

- [ ] **Step 1: Extend `UserResponse`**

In `backend/app/schemas/user.py`, add to `UserResponse`:

```python
from pydantic import Field

class UserResponse(UserBase):
    ...
    permissions: list[str] = Field(default_factory=list)
```

- [ ] **Step 2: Builder**

Create `backend/app/services/user_response.py`:

```python
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.rbac_service import get_permission_codes_for_user


def build_user_response(db: Session, user: User) -> UserResponse:
    perms = get_permission_codes_for_user(db, user.id)
    data = UserResponse.model_validate(user).model_dump()
    data["permissions"] = perms
    return UserResponse(**data)
```

(If `model_validate` ignores extra fields, build dict manually: `UserResponse(..., permissions=perms)` using explicit fields from `user`.)

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/user.py backend/app/services/user_response.py
git commit -m "feat(backend): UserResponse.permissions and builder"
```

---

### Task 5: Wire `/users/me` and auth `TokenResponse`

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py`
- Modify: `backend/app/api/v1/endpoints/auth.py`

- [ ] **Step 1: `/users/me` returns `build_user_response`**

Replace `return UserResponse.model_validate(current_user)` with `return build_user_response(db, current_user)` and add `db: Session = Depends(get_db)` to `get_profile` and `update_profile` return paths.

- [ ] **Step 2: Register/login return user with permissions**

In `register` and `login`, after obtaining `user`:

```python
from app.services.user_response import build_user_response

return TokenResponse(
    access_token=access_token,
    token_type="bearer",
    user=build_user_response(db, user),
)
```

Ensure `TokenResponse.user` type is `UserResponse` (already).

- [ ] **Step 3: Manual smoke**

```bash
cd backend && ./start.sh
# Login as Mitre after DB seed; curl -H "Authorization: Bearer $T" http://localhost:8000/api/v1/users/me
```

Expected JSON includes `"permissions": ["system_status:read"]` for admin.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/users.py backend/app/api/v1/endpoints/auth.py
git commit -m "feat(backend): include permissions in me, login, register"
```

---

### Task 6: System status service + API

**Files:**
- Create: `backend/app/schemas/system_status.py`
- Create: `backend/app/services/system_status_service.py`
- Create: `backend/app/api/v1/endpoints/system.py`
- Modify: `backend/app/api/v1/api.py`

- [ ] **Step 1: Pydantic response models**

Create `backend/app/schemas/system_status.py`:

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class StatusCheckItem(BaseModel):
    name: str
    ok: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class SystemStatusResponse(BaseModel):
    checked_at: datetime
    all_ok: bool
    checks: list[StatusCheckItem]
```

- [ ] **Step 2: Service**

Create `backend/app/services/system_status_service.py`:

```python
import time
from datetime import datetime, timezone
import redis
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.schemas.system_status import StatusCheckItem, SystemStatusResponse


class SystemStatusService:
    def __init__(self, db: Session):
        self.db = db

    def run(self) -> SystemStatusResponse:
        checks: list[StatusCheckItem] = []
        checks.append(self._check_postgres())
        checks.append(self._check_redis(settings.CELERY_BROKER_URL, "redis_broker"))
        rb = settings.CELERY_RESULT_BACKEND
        if rb and rb != settings.CELERY_BROKER_URL:
            checks.append(self._check_redis(rb, "redis_result_backend"))
        all_ok = all(c.ok for c in checks)
        return SystemStatusResponse(
            checked_at=datetime.now(timezone.utc),
            all_ok=all_ok,
            checks=checks,
        )

    def _check_postgres(self) -> StatusCheckItem:
        t0 = time.perf_counter()
        try:
            self.db.execute(text("SELECT 1"))
            self.db.commit()
            return StatusCheckItem(
                name="postgres",
                ok=True,
                latency_ms=(time.perf_counter() - t0) * 1000,
            )
        except Exception as e:
            self.db.rollback()
            return StatusCheckItem(name="postgres", ok=False, error=str(e)[:200])

    def _check_redis(self, url: str, name: str) -> StatusCheckItem:
        t0 = time.perf_counter()
        try:
            r = redis.from_url(url, socket_connect_timeout=2)
            r.ping()
            return StatusCheckItem(
                name=name,
                ok=True,
                latency_ms=(time.perf_counter() - t0) * 1000,
            )
        except Exception as e:
            return StatusCheckItem(name=name, ok=False, error=str(e)[:200])
```

- [ ] **Step 3: Router**

Create `backend/app/api/v1/endpoints/system.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, require_permission
from app.services.rbac_service import SYSTEM_STATUS_READ
from app.services.system_status_service import SystemStatusService
from app.schemas.system_status import SystemStatusResponse

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(
    db: Session = Depends(get_db),
    _=Depends(require_permission(SYSTEM_STATUS_READ)),
):
    return SystemStatusService(db).run()
```

- [ ] **Step 4: Register router**

In `backend/app/api/v1/api.py`:

```python
from app.api.v1.endpoints import system
api_router.include_router(system.router, prefix="/system", tags=["system"])
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/system_status.py backend/app/services/system_status_service.py backend/app/api/v1/endpoints/system.py backend/app/api/v1/api.py
git commit -m "feat(backend): GET /system/status dependency checks"
```

---

### Task 7: Backend tests

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_system_status.py`
- Create: `backend/tests/test_rbac_permissions.py`
- Modify: `backend/pyproject.toml` only if test paths need `[tool.pytest.ini_options]` — optional

- [ ] **Step 1: `conftest` with TestClient + override DB**

Use FastAPI `TestClient` from `starlette.testclient`, import `app` from `app.main`, override `get_db` with a session bound to a **test database URL** from env `TEST_DATABASE_URL` or skip if unset. Minimal pattern:

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)
```

For DB-heavy tests, document: run against disposable Postgres or mark `pytest.mark.integration`.

- [ ] **Step 2: Test 403 without permission**

`test_system_status.py`: override `get_current_user` to return a fake user; override `require_permission` or use real DB with user without roles — expect 403 when calling `GET /api/v1/system/status`.

- [ ] **Step 3: Test 200 shape**

With Mitre fixture or mocked `require_permission` to pass, assert response has `checks`, `all_ok`, `checked_at`.

- [ ] **Step 4: Run**

```bash
cd backend && uv run pytest tests/ -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests
git commit -m "test(backend): system status and rbac"
```

---

### Task 8: Frontend — types, API, refresh profile, page, router, nav

**Files:**
- Modify: `frontend/src/types/auth.ts`
- Create: `frontend/src/types/systemStatus.ts`
- Create or modify: `frontend/src/services/userService.ts` / `authService.ts` — add `fetchCurrentUser()`
- Create: `frontend/src/services/systemService.ts`
- Create: `frontend/src/pages/SystemStatusPage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Types**

`frontend/src/types/auth.ts` — extend `User`:

```typescript
permissions?: string[];
```

`frontend/src/types/systemStatus.ts`:

```typescript
export interface StatusCheckItem {
  name: string;
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

export interface SystemStatusResponse {
  checked_at: string;
  all_ok: boolean;
  checks: StatusCheckItem[];
}
```

- [ ] **Step 2: `systemService`**

```typescript
import api from "./api";
import type { SystemStatusResponse } from "@/types/systemStatus";

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  return api.get<SystemStatusResponse>("/system/status");
}
```

- [ ] **Step 3: Refresh `/users/me` on app load**

In `App.tsx`, keep a single `RouterProvider` and add `useEffect` beside it:

```typescript
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import type { User } from "@/types/auth";

function App() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const user = await api.get<User>("/users/me");
        setUser(user);
      } catch {
        /* optional: clearAuth on 401 */
      }
    })();
  }, [token, setUser]);

  return <RouterProvider router={router} />;
}

export default App;
```

- [ ] **Step 4: `SystemStatusPage`**

Use Ant Design `Card`, `Tag`, `Button`, `Alert`; call `getSystemStatus` on mount and on Refresh; on 403 use `message.error` + `Navigate`.

- [ ] **Step 5: Router + Layout**

Add route `path: "system-status", element: <SystemStatusPage />`.

In `Layout`, add nav item when `user?.permissions?.includes("system_status:read")`.

- [ ] **Step 6: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): system status page and permissions in user"
```

---

## Plan self-review (spec coverage)

| Spec section | Tasks |
|--------------|--------|
| §3 Data model + seed Mitre conditional | Task 1–2 |
| §4 Backend auth + `/system/status` | Task 3–6 |
| §5 Frontend | Task 8 |
| §6 Security | Task 3, 6 (403), service error truncation |
| §7 Ops Mitre follow-up | Document in README or spec — add one line in `docs/CELERY.md` or deployment doc if desired |
| §8 Testing | Task 7 |

**Placeholder scan:** None intentional; migration UUIDs and table defs must be completed when editing the generated revision file.

**Type consistency:** Permission code string is `system_status:read` everywhere; constant `SYSTEM_STATUS_READ` in `rbac_service.py` used by router and frontend string match.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-system-status-and-rbac.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints  

**Which approach do you want?**
