# Phase 18 — Canonical Surface Receipt + Plan

**Scope:** Admin View-As / QA Role Switcher. Let one admin login inspect trainer and client experiences without re-authenticating. Admin stays the authenticated actor. No JWT role swap. No silent impersonation. All writes still audit the real admin user.

**Protocol:** CLAUDE.md rules 26 (Canonical Surface Receipt), 27 (Surface Classification Table), 29 (Schema Cross-Check when Sequelize is touched), 30 (Subagent Skepticism — this doc is a direct-read Receipt, not a subagent hypothesis), 31 (Backend Route Ownership / Shadow Audit).

**Status:** Discovery + plan only. No implementation. Codex review gate at ROUND 1 before any code.

---

## Section 1 — Canonical Surface Receipt (Rule 26)

### (a) Route files that mount the relevant surfaces

- **App-level router** — [main-routes.tsx:908-917](frontend/src/routes/main-routes.tsx#L908-L917). JSX mount at `path: 'dashboard/*'` is `<UniversalDashboardLayout />`.
- **Role dispatcher** inside `UniversalDashboardLayout` at [UniversalDashboardLayout.tsx:644-655](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L644-L655) — derives `userRole` + `activeRole` from `user.role` and URL role segment. Admin explicitly allowed to use `urlRole === 'trainer'` or `'client'` at [line 655](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L655): `(urlRole && validUrlRoles.includes(urlRole) && (userRole === 'admin' || urlRole === userRole)) ? urlRole : userRole`. So admin already can steer into trainer/client URL space.
- **Role switcher dropdown** — [DashboardSelector.tsx:135-137](frontend/src/components/DashboardSelector/DashboardSelector.tsx#L135-L137): trainer dropdown entry enabled for `user.role === 'admin' || user.role === 'trainer'`; client dropdown entry enabled for `user.role === 'admin' || user.role === 'client'`. Admin already has navigation affordances to `/dashboard/trainer/overview` and `/dashboard/client/overview`.

### (b) Mounted JSX — not lazy declarations

| URL | Component (mounted, not just lazy) | File:line |
|---|---|---|
| `/dashboard/admin/client-management` | `ClientsWorkspace` (admin Client Hub) | [UniversalDashboardLayout.tsx:497](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L497) |
| `/dashboard/trainer/clients` | `MyClientsView` barrel default → `MyClientsViewWithFallback.tsx` → inner `MyClientsView.tsx` | [UniversalDashboardLayout.tsx:574](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L574) + [ClientManagement/index.ts:14](frontend/src/components/TrainerDashboard/ClientManagement/index.ts#L14) |
| `/dashboard/trainer/log-workout` | `EnhancedWorkoutLogger` (admin + trainer share this mount) | [UniversalDashboardLayout.tsx:575](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L575) |
| `/dashboard/client/log-workout` | `WorkoutLogger` (client-self) | [UniversalDashboardLayout.tsx:601](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L601) |
| `/dashboard/client/overview` | `ClientHomeTab` | [UniversalDashboardLayout.tsx:599](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L599) |
| `/dashboard/people/view-as/:userId` | `AdminViewAsWrapper` (read-only summary card, NOT a full dashboard impersonation) | [UniversalDashboardLayout.tsx:80](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L80) **lazy import only — not mounted in the live route tree.** Grep of `UniversalDashboardLayout.tsx` for `view-as` / `AdminViewAsWrapper` / `AdminViewAsBar` returns zero matches. Any route usage lives in legacy `UnifiedAdminRoutes.tsx`, not in the live dispatcher. Per rule 26, a lazy import is not proof of mount — this surface is **dormant-partial** (see Section 2 correction). |

### (c) Consumer hooks / services

**Trainer dashboard client list:**
- `GlobalClientContext` at [GlobalClientContext.tsx:155-158](frontend/src/context/GlobalClientContext.tsx#L155-L158) — **already role-switched**:
  ```ts
  const endpoint =
    user.role === 'admin'
      ? '/api/admin/clients'
      : `/api/client-trainer-assignments/trainer/${user.id}`;
  ```
- `MyClientsView.tsx` at [MyClientsView.tsx:665](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L665) — **bypasses GlobalClientContext**, hits the trainer endpoint directly:
  ```ts
  const response = await authAxios.get(`/api/client-trainer-assignments/trainer/${user.id}`);
  ```
  → **This is the live bug Sean hit.** When `user.role === 'admin'`, `user.id` is the admin's ID, which has zero assignment rows → trainer dashboard renders empty.

**Client dashboard:**
- Uses `user` from `useAuth()` directly throughout client-scoped components. `WorkoutLogger.tsx` resolves `effectiveClientId` from the authenticated session in client self-mode ([WorkoutLogger.tsx:571](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx#L571)). There is **no existing "view-as client" override path** — an admin clicking `/dashboard/client/overview` sees their own (admin) client-scope data, not a target client's.

**Existing "View As" partial — NOT a full impersonation:**
- `AdminViewAsBar` at [AdminViewAsBar.tsx:178-274](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsBar.tsx#L178-L274) — complete UI: search dropdown, role badge, "Viewing as X" banner with Exit button, accessibility annotations.
- `AdminViewAsWrapper` at [AdminViewAsWrapper.tsx:241-454](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx#L241-L454) — **summary page only**: 4 stat cards, gamification XP bar, recent workouts list, upcoming sessions list. Fetches `/api/admin/clients/:userId`, `/api/admin/clients/:userId/workouts`, `/api/sessions`, `/api/gamification/profile/:userId`. Does **not** render `UniversalDashboardLayout` as the target user. Exit navigates to `/dashboard/people`.

### (d) Exact frontend API path string literals

Phase-18-relevant endpoints:

```
GET /api/admin/clients                               (admin's real roster)
GET /api/admin/clients/:clientId                     (single client detail)
GET /api/client-trainer-assignments/trainer/:trainerId  (trainer's assigned clients — empty for admin)
GET /api/client-trainer-assignments/trainer/:trainerId/clients
GET /api/workout-forms/client/:clientId/info         (Phase 17 — already trainerOrAdmin)
GET /api/sessions                                    (AdminViewAsWrapper uses this)
GET /api/gamification/profile/:userId
```

### (e) Backend route matches

- **Trainer endpoint** — [clientTrainerAssignmentRoutes.mjs:429-488](backend/routes/clientTrainerAssignmentRoutes.mjs#L429-L488):
  ```js
  router.get('/trainer/:trainerId', protect, trainerOrAdminOnly, async (req, res) => { ... })
  ```
  - Middleware: `protect` + `trainerOrAdminOnly`
  - Trainer-scope guard at [line 436](backend/routes/clientTrainerAssignmentRoutes.mjs#L436): trainer can only view own (`requestingUserRole === 'trainer' && parseInt(trainerId) !== requestingUserId` → 403). Admin bypasses this guard but still queries `ClientTrainerAssignment WHERE trainerId = :trainerId AND status = 'active'` — so admin can query any trainer's assignments, but if admin asks for their own (`trainerId = admin.id`), the result is empty because admin has no assignments.
  - **No admin-see-all-clients override exists here.**
  - Mounted twice: [core/routes.mjs:290-291](backend/core/routes.mjs#L290-L291) — both `/api/client-trainer-assignments` and `/api/assignments` prefixes.

- **Admin clients endpoint** — `/api/admin/clients` mounted at [core/routes.mjs:389](backend/core/routes.mjs#L389) via `adminClientRoutes`. Globally `authorize(['admin'])` at router level per the [adminClientRoutes.mjs:43](backend/routes/adminClientRoutes.mjs#L43) header comment. Returns paginated full client roster.

- **Phase 17 info endpoint** — [dailyWorkoutFormRoutes.mjs:99-228](backend/routes/dailyWorkoutFormRoutes.mjs#L99-L228) `router.get('/client/:clientId/info', protect, trainerOrAdminOnly, ...)` — already has the admin-bypass-assignment pattern at [line 140-164](backend/routes/dailyWorkoutFormRoutes.mjs#L140-L164): `if (userRole === 'trainer') { require assignment + edit_workouts permission }` — skips entirely for admin. **Reference pattern for Phase 18.**

### (f) Authoritative model fields (Rule 29)

**ClientTrainerAssignment** (from [adminClientController.mjs:122](backend/controllers/adminClientController.mjs) + the file-header schema docs at [clientTrainerAssignmentRoutes.mjs:26-38](backend/routes/clientTrainerAssignmentRoutes.mjs#L26-L38)):
```
id (PK)
clientId    (FK → Users.id — client being assigned)
trainerId   (FK → Users.id — trainer assigned)
assignedBy  (FK → Users.id — admin who created assignment)
assignedAt  (TIMESTAMP, default NOW)
status      (ENUM: active, inactive, pending)
notes       (TEXT, nullable)
createdAt, updatedAt
```
No `assignedBy`-style audit column that distinguishes "viewed-as-by" vs "actioned-by-real-user" — **the current schema has no view-as audit trail**. Any write performed while admin is viewing-as must be attributed to the real admin via the existing `req.user.id` flow (NOT the viewed-as user). Current write endpoints already use `req.user.id` by default, so Phase 18 does NOT need schema changes if it never spoofs `req.user`.

**User role field** — `role: ENUM('admin', 'trainer', 'client', 'user')` — the driver for every admin-bypass check in the backend.

---

## Section 2 — Surface Classification Table (Rule 27)

### Role-switcher / dashboard-navigation surfaces

| File | Classification | Evidence |
|---|---|---|
| [DashboardSelector.tsx](frontend/src/components/DashboardSelector/DashboardSelector.tsx) | **canonical** | Referenced by the live top-bar in both `UniversalDashboardLayout` and legacy `UnifiedAdminDashboardLayout`. Already handles admin → trainer / admin → client navigation via plain nav; does NOT persist view-as state. |
| [UniversalDashboardLayout.tsx:644-655](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L644-L655) role-resolver | **canonical** | JSX-mounted via `main-routes.tsx:913`. Admin's URL-role override is already in place. |
| [UnifiedAdminRoutes.tsx](frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx) | **legacy** | Phase 17 receipt already classified as legacy — no JSX mount in the live tree. |

### "View As" surfaces

| File | Classification | Evidence |
|---|---|---|
| [AdminViewAsBar.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsBar.tsx) | **dormant-ready** | Complete, reusable UI component. No grep match for its import outside its own component sibling — not currently mounted. Ready to drop into a host surface. |
| [AdminViewAsWrapper.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx) | **legacy / dormant-partial** *(corrected per Codex ROUND 1)* | Lazy-imported at [UniversalDashboardLayout.tsx:80](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L80) with **no JSX mount in the live route tree** — `grep view-as\|AdminViewAsWrapper\|AdminViewAsBar` against `UniversalDashboardLayout.tsx` returns zero matches. Any `/dashboard/people/view-as/:userId` route entry lives in legacy `UnifiedAdminRoutes.tsx` (already classified legacy in Phase 17 receipt). Treat as reachable-only-via-legacy-surface unless proven in browser. **Not live Phase 18 infrastructure.** |

### Trainer-clients consumer surfaces

| File | Classification | Evidence |
|---|---|---|
| [GlobalClientContext.tsx](frontend/src/context/GlobalClientContext.tsx) | **canonical** | Already role-switches admin to `/api/admin/clients`. Used by many consumers for global client list state. This is the consolidation target. |
| [MyClientsView.tsx:665](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L665) | **canonical with a gap** | Mounted via the `MyClientsViewWithFallback` barrel. Hits trainer endpoint directly with `user.id` — this is the surface that renders empty when admin visits `/dashboard/trainer/clients`. Phase 18 should either (a) re-route this query through GlobalClientContext, or (b) call an admin-aware endpoint. |
| [clientTrainerAssignmentService.ts:107](frontend/src/services/clientTrainerAssignmentService.ts#L107) | **canonical (admin-scoped)** | Used by admin CT-assignment management screens (legitimate admin surface). NOT the same code path as the trainer dashboard bug. Leave alone. |

### Client-dashboard surfaces

| File | Classification | Evidence |
|---|---|---|
| [WorkoutLogger.tsx](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx) client-self mode | **canonical** | Phase 16.2 verified. Uses `effectiveClientId` from session. No view-as override exists. |
| [ClientHomeTab](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L599) + full client route table at [lines 597-619](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L597-L619) | **canonical** | Reads `user.id` directly. No override mechanism. |

---

## Section 3 — Backend Admin-Bypass Pattern Inventory (Rule 31)

Existing endpoints that already implement "admin bypass" on trainer/client scope:

| Endpoint | Pattern | File:line |
|---|---|---|
| `GET /api/workout-forms/client/:clientId/info` | Skip assignment + permission check when `userRole === 'trainer'` path is not entered (admin does not go through those gates). | [dailyWorkoutFormRoutes.mjs:140-164](backend/routes/dailyWorkoutFormRoutes.mjs#L140-L164) |
| `GET /api/equipment/*` | `where: req.user.role === 'admin' ? { isActive: true } : { trainerId: req.user.id, isActive: true }` | [equipmentRoutes.mjs:205, 213, 223](backend/routes/equipmentRoutes.mjs#L205) |
| `GET /api/exercises/custom` | Admin + `?all=true` override | [customExerciseRoutes.mjs:348](backend/routes/customExerciseRoutes.mjs#L348) |
| `GET /api/ai/*` | Admin/trainer can target any `userId` via `targetUserId` param | [aiChatRoutes.mjs:122](backend/routes/aiChatRoutes.mjs#L122) |
| `GET /api/dashboard/*` | Explicit admin branch at [sharedDashboardRoutes.mjs:248](backend/routes/dashboard/sharedDashboardRoutes.mjs#L248) and [adminDashboardRoutes.mjs:185](backend/routes/dashboard/adminDashboardRoutes.mjs#L185) |

**Gap:** `GET /api/client-trainer-assignments/trainer/:trainerId` does **not** implement the admin-bypass pattern. This is the direct cause of the empty trainer dashboard when Sean (admin) clicks Trainer Dashboard.

### Shadow Audit for Phase 18 touch surface

- `/api/client-trainer-assignments/*` mounted TWICE at [core/routes.mjs:290-291](backend/core/routes.mjs#L290-L291): once at `/api/client-trainer-assignments` (canonical) and once at `/api/assignments` (alias). Any backend change must be validated under both prefixes. No overlapping mounts shadow these paths.
- `/api/admin/clients` mounted at [core/routes.mjs:389](backend/core/routes.mjs#L389). Already admin-gated. Returns real client roster — this is what admin-view-as-trainer should query.
- No new mounts required for Phase 18.A.

---

## Section 4 — Narrow Phase 18 Plan

Phase 18 splits into two independently-shippable scopes. Scope A is the immediate blocker resolution for Sean's trainer-smoke. Scope B is broader and requires stronger audit story.

### Scope A — Admin-as-Trainer (small, targeted) — RECOMMENDED FIRST

**Goal:** When admin navigates to `/dashboard/trainer/*`, trainer dashboards (including `MyClientsView`) see admin's real clients instead of an empty assignment-scoped list. Banner clearly indicates "Viewing trainer dashboard as admin."

**Why the banner matters:** admin sees clients they aren't explicitly trainer-assigned to. Without the banner, admin could forget which view they're in, especially when making state-changing clicks.

**Approach — frontend-only route consolidation (no backend change):**

1. **[MyClientsView.tsx](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx) (line 665)** — branch by role:
   - `user.role === 'trainer'` → **keep existing trainer endpoint** call unchanged. No regression to trainer accounts.
   - `user.role === 'admin'` → read from `useGlobalClient().clientList` and **adapt** into the local `ClientAssignment[]` shape (MyClientsView's interface at [MyClientsView.tsx:87](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L87)). This is **not a drop-in** — `ActiveClient` has flat fields (`id / firstName / lastName / email / photo / role`) while `ClientAssignment` expects nested `assignment.client.{status, availableSessions, totalSessionsCompleted, progress, membershipLevel}` plus `assignment.{isActive, assignedAt}`. Codex flagged this explicitly in ROUND 1.

   Adapter defaults for the admin path:
   - `assignment.isActive: true`
   - `assignment.assignedAt: new Date().toISOString()` (pseudo-assignment, admin-view-as only)
   - `client.status: 'active'` (admin's filter semantics)
   - `client.availableSessions: client.availableSessions ?? 0` — consider adding `availableSessions` as an additive optional field on `ActiveClient` so the admin payload from `/api/admin/clients` (which already returns this field) flows through without loss. Additive optional fields do not break existing consumers.
   - `client.totalSessionsCompleted: 0` default (admin-view may enrich via `/api/sessions/history/:clientId` later, same enrichment pattern already used in the trainer branch at [MyClientsView.tsx:674](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L674))
   - `client.membershipLevel: 'basic'` default
   - Progress values: **replace the current `Math.random()` stubs at [MyClientsView.tsx:688-689](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L688-L689) with deterministic fallbacks** when we touch that block — `overallProgress: 0` and `recentTrend: 'stable'`. Codex called out that replacing random with deterministic is required when this path is touched. Non-negotiable.
   - No `as any` cast. No unchecked blanket spread. All field defaults explicit and auditable.

2. **Mount a persistent `ViewAsBanner`** in [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx) whenever `userRole === 'admin' && activeRole !== 'admin'`. Inside the dashboard content area, above the route outlet — visible on **every** trainer/client route under admin view-as, not just `MyClientsView`. Never rendered when URL role matches the user's real role. Copy per Codex ROUND 1:
   - Heading: `Admin view: Trainer Dashboard` (or `Admin view: Client Dashboard`)
   - Supporting text: `You are still signed in as Admin. Actions audit to your admin account.`
   - Quick-return link: `Return to Admin Dashboard` → `/dashboard/admin/overview` or `/dashboard/admin/client-management` (finalize in code — the second is richer given Phase 17.1 landing)

3. **Attribution invariant preserved** — no change to write endpoints. Admin's JWT is still in the header; every server-side `req.user.id` stays the real admin. No impersonation leaks. Writes are **enabled** in admin-view-as-trainer (Codex ROUND 1 answer) — the banner makes the attribution explicit.

**Files touched (estimate):** 2 source + 1 new banner component + 2-3 new tests. All frontend. Zero backend.

**Why not add an admin-bypass in the backend endpoint?** Because the frontend already has role-switching in `GlobalClientContext`. Consolidating `MyClientsView` onto that path solves the immediate gap without another source of truth. Backend bypass can be a later refinement if more non-`MyClientsView` trainer surfaces need it.

### Scope B — Admin-as-Client (deferred; larger) — Phase 18.B

**Goal:** Admin picks a specific client and sees that client's `/dashboard/client/*` dashboard populated with the client's data (workouts, progress, gamification, sessions, etc.). Read-only by default.

**Why it's bigger:**
- Every client-scoped query in the client dashboard reads `user.id` implicitly. There is no `effectiveUserId` override today.
- Writes from client dashboard (e.g., client self-log workout, book session, update profile, social post) must NOT fire as the viewed-as client. Read-only gate required.
- Client-read endpoints that are gated by `:userId === req.user.id` need admin bypass, similar to what Phase 17 did for trainer/admin — but spread across many endpoints.
- The existing `AdminViewAsWrapper` summary-card preview already covers the 80% use case (quick dashboard glance) without needing full impersonation. Phase 18.B may not be worth the blast radius vs. extending `AdminViewAsWrapper`'s coverage.

**Decision needed before Phase 18.B work begins:** does Sean need full client-dashboard impersonation (big effort, multi-endpoint audit bypass, read-only gate), or is the existing `AdminViewAsWrapper` summary + log-workout via admin `/dashboard/admin/log-workout?clientId=X` (already shipping in Phase 17.1) enough?

### Explicit out-of-scope for Phase 18.A

- No backend route changes.
- No `AdminViewAsWrapper` / `AdminViewAsBar` changes (keep their existing `/dashboard/people/view-as/:userId` scope).
- No modifications to `ClientTrainerAssignment` schema.
- No client-dashboard impersonation (that's Phase 18.B).
- No JWT role swap, no impersonation claim, no session override — admin stays admin in the JWT.
- No changes to the Phase-17 `/info` endpoint or `EnhancedWorkoutLogger`.
- No AI-workflow files touched.
- No stash pop.

### Acceptance criteria — Scope A

1. Admin at `/dashboard/trainer/clients` sees the real admin client roster (same list as `/dashboard/admin/client-management`).
2. Admin at `/dashboard/trainer/*` sees a persistent banner stating they're in trainer-view as admin, with a quick-return link.
3. Trainer accounts at `/dashboard/trainer/clients` still see only their own assigned clients (no regression).
4. No new backend routes. No schema changes. No audit-log change needed (writes still attribute to real admin).
5. The stale direct `authAxios.get('/api/client-trainer-assignments/trainer/...')` call in `MyClientsView` is gone.
6. Manual smoke: admin with **zero trainer assignments** (Sean's current state) sees a populated trainer dashboard. Trainer's own accounts unchanged.

### Test plan

- **Source-text lock (Phase 18 `.clientList.test.ts`)** — assert `MyClientsView` no longer contains the direct trainer-endpoint literal; assert it reads from `useGlobalClient`.
- **Behavior test (`MyClientsView.adminViewAs.test.tsx`)** — mock `useAuth.user.role = 'admin'` + `useGlobalClient.clientList = [stubAdminRoster]`; assert the clients render and the admin-viewing banner is visible. Mirror test with `role = 'trainer'` asserting trainer scope is untouched and banner is hidden.
- **Regression**: all existing Phase 16 / 17 / 17.1 tests pass unchanged.

### Apply sequence

1. Sean approves this Receipt (or pushes back with scope changes).
2. Codex ROUND 1 review on the Receipt + Scope A plan.
3. If approved: implement Scope A with tests.
4. Codex ROUND 2 on the diff.
5. Manual smoke by Sean.
6. Commit: `feat(phase-18a): admin-as-trainer dashboard view-as (no JWT swap)`
7. Scope B (client-side impersonation) opens as a separate decision gate — may be punted if `AdminViewAsWrapper` summary-page coverage is sufficient.

---

## Section 5 — Open questions — RESOLVED via Codex ROUND 1

1. **Scope decision:** Phase 18.A only. Phase 18.B deferred — full client-dashboard impersonation is too large for this pass; `AdminViewAsWrapper` summary preview + Phase 17.1 admin log-workout route cover the immediate needs.
2. **Banner copy:** heading `Admin view: Trainer Dashboard` (or `Client Dashboard`); supporting text `You are still signed in as Admin. Actions audit to your admin account.` Finalized.
3. **Banner placement:** inside `UniversalDashboardLayout`, above page content. Must remain visible on all trainer/client routes while admin is viewing another role. Finalized.
4. **Admin-as-trainer write actions:** enabled. Admin stays the authenticated actor, writes still audit to real admin, banner makes attribution explicit. Finalized.

---

## Section 6 — ROUND 1 Response (Codex corrections + approval)

Codex ROUND 1 verdict: **REVISE, then proceed with Phase 18.A.** Both corrections verified against live source and applied to this doc:

### Correction 1 — `/dashboard/people/view-as/:userId` classification

**Original receipt claim:** `canonical-narrow`.
**Correction:** `legacy/dormant-partial`.
**Verification performed:** `grep view-as\|AdminViewAsWrapper\|AdminViewAsBar` against [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx) returned **zero matches**. The lazy `const AdminViewAsWrapper = React.lazy(...)` declaration at line 80 has no JSX consumer in the live dispatcher. Per rule 26 ("a lazy `import()` declaration is NOT proof of mount, JSX usage is"), this surface is not live in the canonical dashboard route tree. Any `/dashboard/people/view-as/:userId` entry lives in legacy `UnifiedAdminRoutes.tsx` and should not be treated as reachable infrastructure for Phase 18 without browser proof. **Both the Classification Table (Section 2) and the Mounted-JSX table (Section 1.b) are updated with this correction.**

### Correction 2 — `GlobalClientContext.clientList` is not a drop-in for `MyClientsView`

**Original plan wording:** "replace the direct API call with `useGlobalClient().clientList`."
**Correction:** wording implied a blanket swap; the actual shapes differ.
**Verification performed:** direct file reads confirmed:
- `MyClientsView` defines its own `interface ClientAssignment` at [MyClientsView.tsx:87](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx#L87) with nested `assignment.client.{status, availableSessions, totalSessionsCompleted, progress, membershipLevel}` plus `assignment.{isActive, assignedAt}`.
- `GlobalClientContext` returns flat `ActiveClient` at [GlobalClientContext.tsx:32](frontend/src/context/GlobalClientContext.tsx#L32): `id / firstName / lastName / email / photo / role`.
- `MyClientsView.tsx:688-689` currently uses **`Math.random()` for progress stubs** — TODO per the inline comment.

**Section 4 Scope A plan now spells out the adapter approach explicitly**: role-branched call site, additive optional fields on `ActiveClient` preferred over cast-and-pray, `Math.random()` replaced with deterministic fallbacks (`overallProgress: 0`, `recentTrend: 'stable'`) **whenever the block is touched**. No `as any`. No silent field invention.

### Approval boundary

Codex status: **"NEEDS RECEIPT REVISION, then approved for `go phase 18.A`."** Both revisions complete above. Phase 18.A implementation is now unblocked under the exact scope Codex listed:

- `MyClientsView.tsx` role-branched + adapter + deterministic progress fallback
- `UniversalDashboardLayout.tsx` — persistent `ViewAsBanner` when admin is viewing a non-admin role
- Small local `ViewAsBanner` component
- Tests: admin-path adapts global client list & renders; trainer-path unchanged; banner visibility correct for both roles; source-lock that admin path no longer calls `/api/client-trainer-assignments/trainer/${user.id}` from `MyClientsView`
- No backend / schema / JWT / `AdminViewAsWrapper` work
- No AI-workflow / 3-Brain files; no stash operations; no touching the 34 dirty backend WIP files

---

*Authored by Claude Opus 4.7 (1M context). Direct source reads, no subagent output (rule 30). No code written — this is the planning artifact required before Phase 18 implementation per rule 15. Revised per Codex ROUND 1; corrections verified against live source; Phase 18.A implementation unblocked.*
