# Frontend cold start performance — design spec

**Date:** 2026-04-21  
**Status:** Awaiting implementation plan after spec review  
**Scope:** Reduce **long white screen** on **first cold load** of the production SPA (`fixlife.mitrecx.top`), primarily for **unauthenticated** first visits (e.g. before login UI appears).

---

## 1. Problem & goals

### 1.1 Problem

Users report that on **first open** of the site in a new browser session, the screen stays **fully white** for a noticeable time before any UI appears.

### 1.2 Goals

- Shorten **time to first paint (FCP)** so users see **something meaningful** (brand, shell, or lightweight skeleton) as early as possible.
- Reduce **initial JavaScript download and parse** required before the first route can render (especially for `/login` and default landing paths).
- Keep changes **compatible** with the existing Vite + React 18 + React Router v6 stack.

### 1.3 Success criteria (recommended)

- **Quantitative:** Compare **FCP** and **LCP** in Lighthouse (mobile throttling) or equivalent before vs after; document in PR.
- **Qualitative:** Cold start in a **new private window** shows **non-white content** (inline shell or Suspense fallback) within a **target band** agreed at implementation time (e.g. under ~1.5s on a reference connection — tune during plan).
- **Regression:** Login, protected routes, and lazy-loaded routes still work; no broken deep links.

---

## 2. Non-goals (v1)

- **SSR / SSG** for the whole app (out of scope unless revisited in a later spec).
- **Rewriting** the UI framework or removing Ant Design in one pass.
- **Backend** API shape changes or new endpoints for this initiative.
- **Perfect** bundle size for every page — focus is **initial** critical path for first paint.

---

## 3. Current context (baseline)

- `frontend/src/router/index.tsx` **eagerly imports** all page components; production builds produce a **very large** main JS chunk (~1.9MB raw / ~570KB gzip in recent builds), delaying parse and execution on cold start.
- `App.tsx` triggers **`GET /users/me`** when a token exists (relevant after login, not the main cause of **pre-login** white screen, but should remain correct after lazy loading).

---

## 4. Proposed approach

### 4.1 Primary: route-level code splitting

- Use **`React.lazy`** (or Vite-friendly dynamic `import()`) for **route-level** page components (e.g. `DailyPlansPage`, `AnalyticsPage`, `AdminUsersPage`, etc.).
- Wrap lazy routes in **`Suspense`** with a **minimal, consistent fallback** (spinner or skeleton matching the eventual shell).
- Keep **small, shared** pieces in the **initial** bundle as needed: e.g. `ProtectedRoute`, `Layout`, and possibly `LoginPage` / auth layout — exact split is an **implementation detail** in the plan; the rule is **minimize what loads before first paint** for the **default cold path** (typically `/login` or redirect).

### 4.2 Secondary: static first-paint shell in `index.html`

- Add a **tiny** inline block in `frontend/index.html`: minimal branding (e.g. app name / gradient background) or neutral skeleton **without** depending on React.
- Purpose: improve **perceived** performance when the main chunk is still downloading/parsing.
- Must remain **accessible** (e.g. don’t rely only on color contrast issues) and **removed or hidden** once React mounts (implementation: root replaces content or shell is outside `#root`).

### 4.3 Tertiary: deployment / transfer

- Verify **compression** (gzip and ideally **Brotli** for static assets) and **cache headers** for hashed assets on Nginx (see `deploy/nginx.conf`).
- Optional: **`modulepreload`** for the **entry** module if measurements show benefit (plan phase validates).

---

## 5. Error handling & UX

- **Lazy chunk load failure:** Optional **error boundary** or router-level error UI with “刷新重试” for failed dynamic imports.
- **Suspense fallback:** Should not flash jarringly vs `index.html` shell; align colors/layout loosely with the app.

---

## 6. Testing & validation

- **Local:** `npm run build`, inspect `dist/assets` chunk sizes and **Network** waterfall in `vite preview` or static server.
- **Staging / prod:** Incognito cold load; Lighthouse mobile; spot-check **login**, **deep link** to a lazy route (e.g. `/analytics`), and **admin** routes if applicable.
- **Regression:** Token refresh path (`/users/me`) and `must_change_password` gating unchanged in behavior.

---

## 7. Risks

- **More HTTP requests** on subsequent navigations (one per lazy chunk); acceptable for this product; HTTP/2 mitigates.
- **Heavier pages** (e.g. charts) must not be pulled into the **login** initial chunk — verify with bundle analysis after split.

---

## 8. Open decisions (for implementation plan)

- Exact list of **eager vs lazy** imports (whether `LoginPage` stays eager).
- Whether to add **route prefetch** on hover for primary nav (optional, post-v1).
