# Phase 19 Canonical Surface Receipt — `/dashboard/people/*` Dead-Route Cleanup

**Date:** 2026-04-21
**Author:** Claude Opus 4.7 (1M)
**Task:** ACTIVE-PRIORITIES.md:41 — `/dashboard/people/*` dead-route cleanup (P1, still open).
**Rule compliance:** Produced before any code change per rules 15, 26, 27, 31.

---

## 1. Canonical Surface Receipt (Rule 26)

| Layer | File | Line | Evidence |
|-------|------|------|----------|
| (a) Route mount | [frontend/src/routes/DashboardRoutes.tsx](frontend/src/routes/DashboardRoutes.tsx#L49-L58) | 49–58 | JSX: `<Route path="/dashboard/*" element={<ProtectedRoute ...><UniversalDashboardLayout /></ProtectedRoute>} />` — real mount, not just an import. |
| (b) Mounted page | [frontend/src/components/DashBoard/UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L500) | 500 | `{ path: '/client-management', component: React.lazy(() => import('./workspaces/ClientsWorkspace')), title: 'Client Hub' }` under `admin` role config. |
| (c) Role resolver | [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L650-L660) | 650–660 | `activeRole` derived from URL: `pathSegments[indexOf('dashboard') + 1]`. `/dashboard/admin/client-management` → `activeRole = 'admin'` → admin routes applied. |
| (d) Canonical URL | — | — | **`/dashboard/admin/client-management`** |
| (e) Backend | n/a | — | Pure frontend routing surface. |
| (f) Model | n/a | — | No model involved. |

## 2. Trap Mechanism (Rules 27 + 31)

Catch-all evidence: [UniversalDashboardLayout.tsx:869](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L869) and [:874](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L874)

```jsx
<Route path="*" element={<Navigate to={`/dashboard/${activeRole}${roleConfig.defaultPath}`} replace />} />
```

When a live user-facing link navigates to `/dashboard/people/<anything>`:
1. Path-segment resolver sees `people` in the role slot; `validUrlRoles` doesn't include it → falls back to `activeRole = user.role`.
2. For an admin user, React Router tries to match `/people/<rest>` against admin relative routes (`/overview`, `/client-management`, ...).
3. No match → catch-all `*` → `Navigate to="/dashboard/admin/overview"` (admin `defaultPath` is `/overview`, [UniversalDashboardLayout.tsx:598](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L598)).

**Net effect: silent redirect to Admin Command Center with no error UI, no toast, no log entry. User loses context.**

Historical note: [dashboard-tabs.ts:541–547](frontend/src/config/dashboard-tabs.ts#L541-L547) documents this trap as landing on Coach Assistant — that was true at Phase 6 when admin `defaultPath` was `/dashboard/admin/coach-assistant`. It's since been moved to `/overview`. Trap still exists; landing surface is now Overview. ACTIVE-PRIORITIES.md:44 carries forward the stale description.

## 3. Surface Classification Table (Rule 27)

### 3.1 Canonical

| File | Line | Status | Evidence |
|------|------|--------|----------|
| [ClientsWorkspace.tsx](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx) | 1–483 | **canonical** | JSX-mounted at `UniversalDashboardLayout.tsx:500`. Does NOT import `MasterDetailLayout` (verified by repo-wide grep). Self-documenting at lines 42–46. |

### 3.2 Legacy — Unmounted Parent Chain

| File | Line | Status | Evidence |
|------|------|--------|----------|
| [UnifiedAdminRoutes.tsx](frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx) | 1–329 | **legacy** | Not JSX-mounted in live tree. Only reference: `main-routes.tsx:336` lazy-imports `UnifiedAdminDashboardLayout` (import alone is not proof per rule 26). PHASE-17 / PHASE-18 receipts already classified legacy. Contains 20+ `Navigate to="/dashboard/people/*"` redirect routes (lines 130–148) — all dormant. |
| [UnifiedAdminDashboardLayout.tsx](frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx) | 14, 163 | **legacy** | Renders `<UnifiedAdminRoutes />` at line 163. Itself only lazy-imported at `main-routes.tsx:336`; no verified JSX mount. Phase 17/18 receipts classified legacy. |
| [MasterDetailLayout.tsx](frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx) | 1–542 | **dormant** | **Zero runtime imports** (confirmed). Re-exported at `clients-team/index.ts:9`, no consumer. Uses `/dashboard/people` paths throughout (lines 82–108, 213, 226, 239). Explicitly documented as dormant at `ClientsWorkspace.tsx:42–46` and `ClientDetailView.test.tsx:10–16`. |

### 3.3 Live Runtime — User-Facing Navigation Traps

These files ARE in the live tree and navigate to `/dashboard/people/*`. Each triggers the Overview trap.

| # | File | Line | Trigger | Target URL | Canonical Replacement Available? |
|---|------|------|---------|------------|----------------------------------|
| L1 | [AdminViewAsWrapper.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx) | 330 | `handleExit()` — back button | `/dashboard/people` | **Yes** → `/dashboard/admin/client-management` |
| L2 | [ContactNotifications.tsx](frontend/src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.tsx) | 472 | Notification link for `new_user` event | `/dashboard/people` | **Yes** → `/dashboard/admin/client-management` |
| L3 | [ClientsManagementSection.tsx](frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx) | 1455 | "Movement Screen" action menu item | `/dashboard/people/movement-screen/new/{clientId}` | **Blocked** — no canonical admin movement-screen route exists. Admin routes have `/body-map` and `/video-call` only. Needs Sean's decision. |
| L4 | [MovementAnalysisWizard.tsx](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx) | 480, 971 | `completeAssessment()` + close button | `/dashboard/people/movement-screen` | **Blocked** — same as L3. Also: is this wizard itself live? Not in admin `roleConfigurations`. Consumer unknown. |
| L5 | [MovementAnalysisListPage.tsx](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx) | 273, 313 | NewButton + TableRow | `/dashboard/people/movement-screen{/new,/<id>}` | **Blocked** — same as L3 + L4. |
| L6 | [EnhancedAdminClientManagementView.tsx](frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx) | 1841, 2130 | "View client dashboard" button + Swan Coach insights CTA | `/dashboard/people/view-as/{clientId}` | **Blocked on Phase 18.B** — no canonical admin-as-client impersonation route. |
| L7 | [ClientMeasurementPanel.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.tsx) | 365 | Modal "Open full measurements" CTA | `/dashboard/people/measurements/{clientId}` | **Blocked** — no canonical admin measurements route. |

### 3.4 Live Runtime — Config Only

| File | Line | Status | Notes |
|------|------|--------|-------|
| [dashboard-tabs.ts](frontend/src/config/dashboard-tabs.ts) | 161 | **config — trap** | `route: '/dashboard/people/movement-screen'` on `movement-screen` tab. If any consumer renders this tab as a clickable nav item, it's a trap. Blocked with L3/L4/L5. |
| [dashboard-tabs.ts](frontend/src/config/dashboard-tabs.ts) | 537–547 | **doc polish (approved)** | Historical canonical-surface-audit comment. Two inaccuracies: "coach-assistant" (actual landing is now `/overview`) and cites `:856/:861` (current lines `:869/:874`). Approved for update in this slice. |

### 3.5 Live Runtime — Stale Header Comment

| File | Line | Status |
|------|------|--------|
| [AdminWaiversManager.tsx](frontend/src/components/DashBoard/Pages/admin-waivers/AdminWaiversManager.tsx) | 13 | Stale JSDoc: `UnifiedAdminRoutes → /dashboard/people/waivers → AdminWaiversManager`. Live mount is actually `/dashboard/admin/waivers`. Doc-only fix in this slice. |

### 3.6 Backend

| File | Line | Status |
|------|------|--------|
| [orientationController.mjs](backend/controllers/orientationController.mjs) | 272 | **trap** — constructs in-app notification link `/dashboard/people/orientations`. Fix target: `/dashboard/admin/client-management` (no canonical admin orientations surface exists; client-management is the closest operational surface for handling a new orientation). |

### 3.7 E2E Tests

| File | Lines | Status | In-slice? |
|------|-------|--------|-----------|
| [frontend/e2e/admin-focused-flow.spec.ts](frontend/e2e/admin-focused-flow.spec.ts) | 159, 185, 206, 231, 264 | **test-surface trap** | Not in slice. Added to allowlist so source-text test can land. |
| [frontend/e2e/admin-nav-cleanup.spec.ts](frontend/e2e/admin-nav-cleanup.spec.ts) | 95, 104, 141, 144–147 | **test-surface trap** | Same. |
| [frontend/e2e/admin-onboarding-workout.spec.ts](frontend/e2e/admin-onboarding-workout.spec.ts) | 25, 79 | **test-surface trap** | Same. |

### 3.8 QA Scripts (Not Part of CI)

| File | Lines | Status |
|------|-------|--------|
| [tests/playwright-qa-phase2-5.py](tests/playwright-qa-phase2-5.py) | 109, 113, 213, 229, 239, 420 | Historical QA. Not a CI gate. Leave alone; not in slice. |
| [tests/playwright-qa-phase2-5-manual-login.py](tests/playwright-qa-phase2-5-manual-login.py) | 76, 80, 170, 172, 470 | Same. |

### 3.9 Docs / Archive — Reference Only (NO CHANGES)

Leave as-is: `ACTIVE-PRIORITIES.md`, `PHASE-17/18-CANONICAL-SURFACE-RECEIPT-*.md`, `SWANSTUDIOS-CURRENT-COMPLETION-STATE-2026-04-19.md`, `PHASE-16-WRITER-SIDE-TRUTHFULNESS-DEBATE-2026-04-16.md` (and its debate-archive mirror), `AI-Village-Documentation/**`, `docs/ai-workflow/blueprints/ADMIN-AS-CLIENT-AND-IMPERSONATION-BLUEPRINT.md`, `docs/ai-workflow/blueprints/DASHBOARD-ENHANCEMENT-MASTER-PLAN.md`, `docs/qa/playwright-phase0/**`, `AI-Village-Documentation/gemini-consults/2026-03-25T01-21-35-plan.md`.

## 4. Backend Route Ownership Walk (Rule 31)

Not applicable — this surface is pure frontend routing. The only backend reference is a notification-link *string* (`orientationController.mjs:272`), not an Express route. No Express mount-order audit needed.

## 5. Blast Radius Summary

- **Unblocked (safe, canonical target exists):** L1, L2, orientationController.mjs:272, AdminWaiversManager.tsx:13 (doc), dashboard-tabs.ts:541–547 (doc polish approved).
- **Blocked on Phase 18.B admin impersonation decision:** L6 (2 hits), L7 (1 hit).
- **Blocked on movement-screen canonical admin route decision:** L3, L4, L5 + dashboard-tabs.ts:161.
- **E2E specs (`frontend/e2e/*.spec.ts`):** excluded from the guard by `SCAN_DIRS` (guard scans only `frontend/src` and `backend/`). They're not in the test's `ALLOWLIST` — they're pre-filtered by path. Left as-is in this slice; updated when Phase 18.B / movement-screen canonical decisions land.
- **QA scripts:** not CI, low priority.
- **Dormant files (UnifiedAdminRoutes.tsx, MasterDetailLayout.tsx):** no in-slice edits. Deferred deletion pass with Sean's approval (rule 34 — no blind cleanup).

## 6. Narrow Slice (Phase 19.A) — Decisions Locked

| Edit | File | Change | Status |
|------|------|--------|--------|
| E1 | `AdminViewAsWrapper.tsx:330` | `navigate('/dashboard/people')` → `navigate('/dashboard/admin/client-management')`. Also update JSDoc at line 23 (`/dashboard/people` → canonical URL). | proceed |
| E2 | `ContactNotifications.tsx:472` | `new_user: '/dashboard/people'` → `new_user: '/dashboard/admin/client-management'` | proceed |
| E3 | `backend/controllers/orientationController.mjs:272` | `link: '/dashboard/people/orientations'` → `link: '/dashboard/admin/client-management'` | proceed (default target accepted) |
| E4 | `AdminWaiversManager.tsx:13` | Update header JSDoc to live canonical: `UniversalDashboardLayout → /dashboard/admin/waivers → AdminWaiversManager`. | proceed |
| E5 | new `frontend/src/__tests__/no-dead-people-routes.test.ts` | Vitest unit test that fs-reads files under `frontend/src/**` + `backend/**` and fails if any file outside the allowlist contains the string `/dashboard/people`. | proceed |
| E6 | `dashboard-tabs.ts:541–547` | Fix stale comment: `coach-assistant` → `overview`; line refs `856/861` → `869/874`. | proceed (explicit yes) |

Guard exclusions (hard, explicit — rule 34). Two layers:

**Layer 1 — Path exclusion (via `SCAN_DIRS`, `EXCLUDE_DIRS`, `SCAN_EXTENSIONS`, `SKIP_TEST_FILES` in the test file):**
- Guard scans only `frontend/src/` and `backend/`. Anything outside those roots is pre-filtered — no allowlist entry needed. This is how `frontend/e2e/*.spec.ts`, `tests/*.py` (Python QA), `docs/`, `AI-Village-Documentation/`, `node_modules/`, `dist/`, `build/`, `coverage/` stay green without being named.
- Inside scan roots, `SKIP_TEST_FILES` further drops any `*.test.*` / `*.spec.*` file (the guard itself is at `frontend/src/__tests__/no-dead-people-routes.test.ts` and needs this skip to avoid self-flagging).

**Layer 2 — Explicit `ALLOWLIST` entries (in-file, each with a reason string):**
- `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx` — legacy, not JSX-mounted, pending dormant-removal pass
- `frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx` — dormant, zero runtime imports, pending dormant-removal pass
- `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx` — canonical, doc comment only at lines 42–46
- `frontend/src/config/dashboard-tabs.ts` — historical audit comment at 537–547 + movement-screen tab config at line 161 (L3 blocked)
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx` — L6, blocked on Phase 18.B impersonation decision
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.tsx` — L7, blocked on canonical measurements route decision
- `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx` — L3, blocked on canonical movement-screen decision
- `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx` — L4, blocked on canonical movement-screen decision
- `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx` — L5, blocked on canonical movement-screen decision

Removing a Layer-2 entry = declaring a surface canonically cleaned. Land the code edit and the allowlist delete in the same commit. Adding an entry requires a receipt update (this file) explaining why.

Expanded allowlist entries for L3–L7 temporary bypass (must be removed when each decision lands):
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx` (L6 — Phase 18.B)
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.tsx` (L7 — measurements canonical)
- `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx` (L3 — movement-screen canonical)
- `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx` (L4 — movement-screen canonical)
- `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx` (L5 — movement-screen canonical)

**NOT in this slice:**
- L3–L7 navigation fixes (blocked on decisions)
- `dashboard-tabs.ts:161` config target (blocked with L3–L5)
- `UnifiedAdminRoutes.tsx` / `MasterDetailLayout.tsx` deletion (separate dead-code-removal pass)
- QA-script cleanup

## 7. Hygiene

- New file: receipt doc at `docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md`. Follows existing naming convention. No `.gitignore` changes needed.
- New file: `frontend/src/__tests__/no-dead-people-routes.test.ts`. Lives inside the vitest test-discovery tree.
- No temp artifacts, no screenshots, no debate docs created by this slice.

## 8. Scope Guards (Rule 42 + handoff constraints)

- No Phase 18.B work.
- No Hermes work.
- No repo-hygiene sweep.
- No edits to the 162 pre-existing dirty backend/frontend WIP files.
- No stash pops.
- No history rewrite.
- No pushes without explicit Sean approval. `git add` will target only the files in §6.
