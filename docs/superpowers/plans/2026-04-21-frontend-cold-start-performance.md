# Frontend cold start performance — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut **long white screen** on cold load by **route-level code splitting**, a **minimal HTML shell**, and optional **Nginx compression** verification — per spec `docs/superpowers/specs/2026-04-21-frontend-cold-start-performance-design.md`.

**Architecture:** Keep **`LoginPage` eager** so `/login` pulls minimal JS first. **Lazy-load** all other pages via `React.lazy` + `import()`. Wrap **`Layout`’s `<Outlet />`** in one **`Suspense`** so protected routes share a single fallback. Add **`#initial-splash`** in `index.html` (inline styles) for instant paint; remove it after React mounts in **`App.tsx`**. Optionally tighten **`deploy/nginx.conf`** for `gzip`/`brotli` on static assets.

**Tech Stack:** React 18, React Router 6.21 (`createBrowserRouter`), Vite 5, TypeScript, Tailwind 4 (existing).

---

## File map

| File | Role |
|------|------|
| Create: `frontend/src/components/PageLoader.tsx` | Full-viewport fallback (spinner + label) for `Suspense`. |
| Modify: `frontend/src/router/index.tsx` | `lazy()` for all pages except `LoginPage`; `Suspense` on routes that don’t use `Layout`. |
| Modify: `frontend/src/components/Layout.tsx` | `Suspense` around `<Outlet />` with `PageLoader` fallback. |
| Modify: `frontend/index.html` | `#initial-splash` block with inline CSS (no JS). |
| Modify: `frontend/src/App.tsx` | `useEffect` to remove `#initial-splash` after first paint. |
| Modify (optional): `deploy/nginx.conf` | Ensure `gzip on`; add `brotli` only if module available on server. |

---

### Task 1: `PageLoader` component

**Files:**
- Create: `frontend/src/components/PageLoader.tsx`

- [ ] **Step 1: Add component**

```tsx
/** Lightweight full-viewport loader for React.Suspense (route lazy chunks). */
export default function PageLoader() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-gray-500"
      role="status"
      aria-live="polite"
      aria-label="加载中"
    >
      <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      <span className="text-sm">加载中…</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PageLoader.tsx
git commit -m "feat(frontend): PageLoader for lazy route Suspense"
```

---

### Task 2: Lazy routes + `Suspense` in router

**Files:**
- Modify: `frontend/src/router/index.tsx`

- [ ] **Step 1: Replace top imports**

Use `lazy` and `Suspense` from `react`, keep static imports for guards and `Layout` and **`LoginPage`** only.

```tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireNoPasswordReset from "@/components/RequireNoPasswordReset";
import RequireUsersManage from "@/components/RequireUsersManage";
import Layout from "@/components/Layout";
import PageLoader from "@/components/PageLoader";
import LoginPage from "@/pages/LoginPage";

const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const YearlyGoalsPage = lazy(() => import("@/pages/YearlyGoalsPage"));
const MonthlyPlansPage = lazy(() => import("@/pages/MonthlyPlansPage"));
const DailyPlansPage = lazy(() => import("@/pages/DailyPlansPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const WeeklySummariesPage = lazy(() => import("@/pages/WeeklySummariesPage"));
const WeeklySummaryDetailPage = lazy(() => import("@/pages/WeeklySummaryDetailPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SystemStatusPage = lazy(() => import("@/pages/SystemStatusPage"));
const ForceChangePasswordPage = lazy(() => import("@/pages/ForceChangePasswordPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
```

- [ ] **Step 2: Wrap non-Layout lazy routes with `Suspense`**

Example replacements:

```tsx
{
  path: "/register",
  element: (
    <Suspense fallback={<PageLoader />}>
      <RegisterPage />
    </Suspense>
  ),
},
{
  path: "/forgot-password",
  element: (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordPage />
    </Suspense>
  ),
},
{
  path: "/force-change-password",
  element: (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <ForceChangePasswordPage />
      </Suspense>
    </ProtectedRoute>
  ),
},
```

- [ ] **Step 3: Leave `children` route `element`s as bare lazy components**

Example (no per-route `Suspense` here — `Layout` will wrap `Outlet`):

```tsx
{
  path: "daily-plans",
  element: <DailyPlansPage />,
},
```

Repeat for `monthly-plans`, `yearly-goals`, `weekly-summaries`, `weekly-summaries/:summaryId`, `analytics`, `system-status`, `settings`, `profile`.

- [ ] **Step 4: `admin/users` keeps `RequireUsersManage`; page stays lazy**

```tsx
{
  path: "admin/users",
  element: (
    <RequireUsersManage>
      <AdminUsersPage />
    </RequireUsersManage>
  ),
},
```

- [ ] **Step 5: Run TypeScript check**

Run: `cd frontend && npm run build`  
Expected: **success**; `dist/assets/` shows **multiple** `index-*.js` chunks (not a single giant app chunk only).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router/index.tsx
git commit -m "perf(frontend): lazy-load routes except login"
```

---

### Task 3: `Suspense` around `Layout` outlet

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Import and wrap**

```tsx
import { Suspense } from "react";
import PageLoader from "@/components/PageLoader";
```

Wrap the existing `<Outlet />`:

```tsx
<Suspense fallback={<PageLoader />}>
  <Outlet />
</Suspense>
```

- [ ] **Step 2: `npm run build`**

Expected: still **success**.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "perf(frontend): Suspense around Layout outlet for lazy pages"
```

---

### Task 4: Static splash in `index.html` + remove in `App`

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Insert splash before `#root` in `index.html`**

Inside `<body>`, **before** `<div id="root"></div>`, add (inline styles so no CSS bundle needed for first paint):

```html
<div
  id="initial-splash"
  style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#eef2ff 0%,#faf5ff 50%,#fdf2f8 100%);font-family:system-ui,sans-serif;z-index:99999;"
>
  <div style="font-size:1.75rem;font-weight:800;background:linear-gradient(90deg,#4f46e5,#9333ea,#db2777);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
    Fix Life
  </div>
  <div style="margin-top:0.5rem;font-size:0.875rem;color:#6b7280;">加载中…</div>
</div>
```

- [ ] **Step 2: Remove splash after mount in `App.tsx`**

At top: `import { useEffect } from "react";` (merge with existing import).

Inside `App`, before `return`:

```tsx
  useEffect(() => {
    document.getElementById("initial-splash")?.remove();
  }, []);
```

Keep the existing `useEffect` for `/users/me`; **two separate hooks** are fine.

- [ ] **Step 3: `npm run build`**

Expected: **success**.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html frontend/src/App.tsx
git commit -m "perf(frontend): initial HTML splash until React mounts"
```

---

### Task 5 (optional): Nginx static compression

**Files:**
- Modify: `deploy/nginx.conf`

- [ ] **Step 1: Inside the `server { listen 443 ... }` block**, after `ssl_prefer_server_ciphers`, add if not already present on the live server config:

```nginx
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;
```

- [ ] **Step 2: Brotli** — only if `ngx_http_brotli_module` is installed (check server). If yes, add:

```nginx
    brotli on;
    brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

If the module is **not** installed, **skip** brotli and leave a comment in the plan PR description.

- [ ] **Step 3: Deploy / reload Nginx on server** per your ops process (`sudo nginx -t && sudo systemctl reload nginx`).

- [ ] **Step 4: Commit** (if repo config changed)

```bash
git add deploy/nginx.conf
git commit -m "chore(deploy): gzip static assets for faster cold load"
```

---

### Task 6: Verification

- [ ] **Step 1: Local build**

Run: `cd frontend && npm run build`  
Expected: **exit 0**; note largest chunk size vs previous baseline.

- [ ] **Step 2: Manual cold load**

Open **new private window** → `https://fixlife.mitrecx.top/login` (or local preview).  
Expected: **non-white screen** (splash or login form) quickly; no functional regressions on login.

- [ ] **Step 3: Protected deep link**

After login, open `/analytics` in new tab (cold).  
Expected: brief `PageLoader`, then page; charts load.

- [ ] **Step 4 (optional): Lighthouse**

Run mobile Lighthouse on `/login`; record **FCP** / **LCP** for PR notes.

---

## Spec coverage (self-review)

| Spec section | Tasks |
|--------------|-------|
| Route-level code splitting | Task 2, 3 |
| `index.html` shell | Task 4 |
| Nginx / transfer | Task 5 (optional) |
| Error handling (lazy fail) | Out of scope v1; add error boundary in a follow-up if chunk load fails in the wild |
| Testing | Task 6 |

**Placeholder scan:** None intentional.  
**Type consistency:** Lazy components are default exports from existing page modules (already `export default`).

---

## Execution handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-04-21-frontend-cold-start-performance.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.  
2. **Inline Execution** — run tasks in this session with checkpoints.

**Which approach do you want?**

After implementation, merge to `main`, run `deploy.sh deploy` per project rule, and re-run Task 6 on production.
