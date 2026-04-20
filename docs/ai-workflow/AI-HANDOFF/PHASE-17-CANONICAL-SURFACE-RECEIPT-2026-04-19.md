# Phase 17 — Canonical Surface Receipt

**Scope:** Admin/trainer "Log Workout" UX/routing. Make the Log Workout path discoverable from admin Clients & Team + trainer My Clients, and make `EnhancedWorkoutLogger` role-aware so it works for admins, not just trainers.

**Protocol:** CLAUDE.md rules 26 (Canonical Surface Receipt), 27 (Surface Classification Table), 29 (Schema Cross-Check), 31 (Backend Route Ownership / Shadow Audit). No implementation code written until this receipt is approved.

---

## Section 1 — Canonical Surface Receipt (Rule 26)

### (a) Route file that actually mounts the target URL

- **App-level router file:** [frontend/src/routes/main-routes.tsx](frontend/src/routes/main-routes.tsx)
- **Mount point (JSX, not a lazy import):** [main-routes.tsx:908-917](frontend/src/routes/main-routes.tsx#L908-L917)
  ```tsx
  {
    path: 'dashboard/*',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'trainer', 'client']}>
        <Suspense fallback={<PageLoader />}>
          <UniversalDashboardLayout />
        </Suspense>
      </ProtectedRoute>
    )
  }
  ```
- **Role-aware route tables live inside** [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx). Role detection at [line 644](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L644): `rawRole === 'user' ? 'client' : rawRole`. Dispatcher at [line 769-771](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L769-L771) selects admin / trainer / client route table based on `activeRole`.

### (b) Mounted JSX page/component (not just lazy imports)

**Phase 17 surface URLs, all under the canonical `dashboard/*` route prefix:**

| Role | URL | Component (JSX mount, not lazy import) | Source line |
|---|---|---|---|
| admin | `/dashboard/.../log-workout` | `EnhancedWorkoutLogger` | [UniversalDashboardLayout.tsx:541](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L541) |
| trainer | `/dashboard/.../log-workout` | `EnhancedWorkoutLogger` | [UniversalDashboardLayout.tsx:575](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L575) |
| client | `/dashboard/.../log-workout` | `WorkoutLogger` (not Enhanced) | [UniversalDashboardLayout.tsx:601](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L601) |
| admin | `/dashboard/.../client-management` | `ClientsWorkspace` (lazy) | [UniversalDashboardLayout.tsx:497](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L497) |
| trainer | `/dashboard/.../clients` | `MyClientsView` (barrel default → `MyClientsViewWithFallback`) | [UniversalDashboardLayout.tsx:574](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L574) |

**Import chain for the trainer My Clients barrel:**
- [UniversalDashboardLayout.tsx:89](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L89): `import MyClientsView from '../TrainerDashboard/ClientManagement';` — default import
- [TrainerDashboard/ClientManagement/index.ts:14](frontend/src/components/TrainerDashboard/ClientManagement/index.ts#L14): `export { default } from './MyClientsViewWithFallback';` — default export
- **Effective canonical component: `MyClientsViewWithFallback.tsx`**, which internally imports and wraps `MyClientsView.tsx` at [MyClientsViewWithFallback.tsx:19](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx#L19).

### (c) Consumer hook / service

- **`EnhancedWorkoutLogger` client loader** at [EnhancedWorkoutLogger.tsx:456-503](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L456-L503).
- **Client ID resolution** at [EnhancedWorkoutLogger.tsx:450-453](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L450-L453):
  ```ts
  const { activeClient } = useGlobalClient();
  const urlClientId = searchParams.get('clientId');
  const clientId = urlClientId || (activeClient?.id ? String(activeClient.id) : null);
  ```
  URL `?clientId=X` wins, otherwise `GlobalClientContext.activeClient.id` is the fallback.
- **Auth transport:** `authAxios` from `useAuth()` context at [EnhancedWorkoutLogger.tsx:438](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L438). JWT flows through the authenticated axios instance.

### (d) Exact frontend API path string literal

**Current (broken for trainer role):**

```
/api/client-trainer-assignments/client/${clientId}
```

at [EnhancedWorkoutLogger.tsx:468](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L468). See Schema Cross-Check below for why this 403s on trainer accounts.

**Codex-approved target (Phase 17, Option 2):**

```
/api/workout-forms/client/${clientId}/info
```

already used in two other consumers:
- [WorkoutLogger.tsx:571](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx#L571) (client-role logger, canonical and working)
- [EnhancedClientProgressView.tsx:387](frontend/src/components/TrainerDashboard/ClientProgress/EnhancedClientProgressView.tsx#L387) (trainer progress view, canonical and working)

### (e) Backend route match for `/api/workout-forms/client/:clientId/info`

- **Top-level mount:** [backend/core/routes.mjs:615](backend/core/routes.mjs#L615)
  ```js
  app.use('/api/workout-forms', dailyWorkoutFormRoutes);
  ```
- **Handler:** [backend/routes/dailyWorkoutFormRoutes.mjs:99-228](backend/routes/dailyWorkoutFormRoutes.mjs#L99-L228)
  ```js
  router.get('/client/:clientId/info', protect, trainerOrAdminOnly, async (req, res) => { ... });
  ```
- **Middleware chain:**
  - `protect` — JWT verification
  - `trainerOrAdminOnly` — role gate (admin OR trainer passes)
  - Inline check [line 140-154](backend/routes/dailyWorkoutFormRoutes.mjs#L140-L154): if role is trainer, require active `ClientTrainerAssignment` row for `(clientId, trainerId)`; if role is admin, skip the assignment check
  - Inline check [line 156-163](backend/routes/dailyWorkoutFormRoutes.mjs#L156-L163): if role is trainer, require `edit_workouts` permission via `checkTrainerPermission(trainerId, PERMISSION_TYPES.EDIT_WORKOUTS)`
- **Response shape:** [line 200-218](backend/routes/dailyWorkoutFormRoutes.mjs#L200-L218) returns
  ```json
  {
    "success": true,
    "client": {
      "id": number,
      "firstName": string,
      "lastName": string,
      "email": string,
      "phone": string | null,
      "availableSessions": number,
      "memberSince": ISO datetime,
      "recentWorkoutCount": number (30-day window),
      "hasWorkoutToday": boolean,
      "todayWorkoutId": number | null
    }
  }
  ```

### (f) Authoritative model fields

**Model:** [backend/models/DailyWorkoutForm.mjs](backend/models/DailyWorkoutForm.mjs) (see Rule 29 cross-check below for the full drift table).

**User model fields referenced by `/client/:clientId/info` handler** (verified by reading [dailyWorkoutFormRoutes.mjs:121-130](backend/routes/dailyWorkoutFormRoutes.mjs#L121-L130)):

```js
attributes: [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'availableSessions',
  'createdAt'
]
```

All 7 of these fields exist on the live `"Users"` table per prior Phase 16 verification. `memberSince` in the response is derived from `client.createdAt`.

**`DailyWorkoutForm` fields read by the handler** (count + findOne at [line 171-194](backend/routes/dailyWorkoutFormRoutes.mjs#L171-L194)):

- `clientId` — model field name, declared at [DailyWorkoutForm.mjs:190](backend/models/DailyWorkoutForm.mjs#L190)
- `date` — model field name, declared at [DailyWorkoutForm.mjs:210](backend/models/DailyWorkoutForm.mjs#L210)
- `id` — standard PK

No drift between handler usage and model declaration for these fields.

---

## Section 2 — Surface Classification Table (Rule 27)

### Competing routing / admin-layout surfaces

| File | Classification | Evidence | Notes |
|---|---|---|---|
| [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx) | **canonical** | JSX mount at [main-routes.tsx:913](frontend/src/routes/main-routes.tsx#L913) under `path: 'dashboard/*'` with `allowedRoles={['admin','trainer','client']}` | Sole live dispatcher for admin/trainer/client dashboards |
| [UnifiedAdminRoutes.tsx](frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx) | **legacy** | Only referenced by [UnifiedAdminDashboardLayout.tsx:163](frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx#L163), which itself is only referenced by the lazy import at [main-routes.tsx:336](frontend/src/routes/main-routes.tsx#L336) — that lazy ref has no JSX mount in the primary tree. Per Rule 26 "a lazy import is NOT proof of mount" | Legacy admin workspace router; not loaded by the canonical `dashboard/*` route |
| [UnifiedAdminDashboardLayout.tsx](frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx) | **legacy** | Same: lazy-imported but no JSX mount reachable from the live `dashboard/*` tree | Likely remains from a prior consolidation pass |
| [DashBoard/routes/AdminRoutes.tsx](frontend/src/components/DashBoard/routes/AdminRoutes.tsx) | **dormant** | No consumer in the live route tree; appears in a verification script only ([verify-universal-schedule-integration.mjs:198](frontend/src/scripts/verify-universal-schedule-integration.mjs#L198)) | Earlier admin route file, no mount |
| [TrainerDashboard/routes/TrainerDashboardRoutes.tsx](frontend/src/components/TrainerDashboard/routes/TrainerDashboardRoutes.tsx) | **dormant** | Not imported by `UniversalDashboardLayout.tsx` (grep confirmed no import of it in the canonical dispatcher) | Pre-consolidation trainer router |
| [TrainerDashboard/StellarComponents/StellarTrainerDashboard.tsx](frontend/src/components/TrainerDashboard/StellarComponents/StellarTrainerDashboard.tsx) | **dormant** | Imports `EnhancedWorkoutLogger` but itself is not imported by `UniversalDashboardLayout.tsx` | Alternative trainer shell, not mounted |

### Competing trainer-clients components

| File | Classification | Evidence |
|---|---|---|
| [MyClientsViewWithFallback.tsx](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx) | **canonical** | Barrel default export at [ClientManagement/index.ts:14](frontend/src/components/TrainerDashboard/ClientManagement/index.ts#L14); default-imported as `MyClientsView` into [UniversalDashboardLayout.tsx:89](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L89); mounted at [UniversalDashboardLayout.tsx:574](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L574) |
| [MyClientsView.tsx](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx) | **dormant-wrapped** | Named export at [ClientManagement/index.ts:10](frontend/src/components/TrainerDashboard/ClientManagement/index.ts#L10); imported internally by the fallback wrapper at [MyClientsViewWithFallback.tsx:19](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx#L19). Runs as the primary content when the API call inside the wrapper succeeds |
| [DashBoard/Pages/trainer-dashboard/TrainerClients.tsx](frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerClients.tsx) | **legacy** | Not imported by `UniversalDashboardLayout.tsx` |

### Competing admin-clients surfaces

| File | Classification | Evidence |
|---|---|---|
| [DashBoard/workspaces/ClientsWorkspace.tsx](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx) | **canonical** | Lazy import + mounted at [UniversalDashboardLayout.tsx:497](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L497) under admin `/client-management`. Grep found zero `log-workout` / `Log Workout` references inside it — the CTA is missing, which is exactly the Phase 17 discoverability gap |
| [DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx](frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx) | **canonical (secondary)** | Imported directly at [UniversalDashboardLayout.tsx:59](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L59), mounted at `/client-details` ([line 498](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L498)) |
| [DashBoard/Pages/admin-clients/ClientManagementDashboard.tsx](frontend/src/components/DashBoard/Pages/admin-clients/ClientManagementDashboard.tsx) | **dormant** | Imported at [UniversalDashboardLayout.tsx:58](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L58) but I did NOT find a route entry that references it in the admin table. Possibly unwired |
| [DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx) | **canonical (narrow)** | Lazy import at [UniversalDashboardLayout.tsx:80](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L80); purpose-specific (admin-view-as-trainer flow) |

### Competing workout-logger components

| File | Classification | Evidence |
|---|---|---|
| [TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx) | **canonical (admin + trainer)** | Default export of the `WorkoutLogging` barrel ([index.ts:14](frontend/src/components/TrainerDashboard/WorkoutLogging/index.ts#L14)); mounted at admin [line 541](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L541) and trainer [line 575](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L575). **Has a live bug that this phase fixes** (see Section 3) |
| [WorkoutLogger/WorkoutLogger.tsx](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx) | **canonical (client only)** | Mounted at client role [line 601](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L601); Phase 16.2 verified end-to-end. NOT to be changed by Phase 17 |
| [TrainerDashboard/WorkoutLogging/IntegrationTest.tsx](frontend/src/components/TrainerDashboard/WorkoutLogging/IntegrationTest.tsx) | **dormant** | Not imported from `UniversalDashboardLayout.tsx` |

---

## Section 3 — Schema Cross-Check / Backend Route Shadow Audit (Rules 29, 31)

### Drift table — `EnhancedWorkoutLogger` → live backend

The current loader calls `/api/client-trainer-assignments/client/${clientId}`. That endpoint is **admin-only**:

- Handler: [clientTrainerAssignmentRoutes.mjs:495](backend/routes/clientTrainerAssignmentRoutes.mjs#L495)
  ```js
  router.get('/client/:clientId', protect, adminOnly, async (req, res) => { ... });
  ```

**Caller-vs-handler drift:**

| Caller expectation | Real handler | Match? |
|---|---|---|
| Works for trainer + admin roles | `adminOnly` — trainer gets 403 | **DRIFT** (the reason the logger silently falls back to demo mode on trainer accounts, per [EnhancedWorkoutLogger.tsx:489](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L489)) |
| Returns client fields (firstName, lastName, etc.) in a known shape | Returns `ClientTrainerAssignment` join row with `snake_case` + `camelCase` mixing (hence the normalization block at lines 472-483) | Works for admins only; adds conversion cost |

### Shadow audit — mount order for `/api/workout-forms/*` and overlapping paths

Backend mount (one-pass grep of `backend/routes/*.mjs` + `backend/core/routes.mjs`):

| Mount | File | Overlaps? |
|---|---|---|
| `app.use('/api/workout-forms', dailyWorkoutFormRoutes)` | [core/routes.mjs:615](backend/core/routes.mjs#L615) | None — `/api/workout-forms` prefix is unique |
| `app.use('/api/client-trainer-assignments', ...)` | elsewhere in `core/routes.mjs` | Different prefix, no shadow over the target |

**Conclusion:** No shadowing concern for the target path. The switch from `/api/client-trainer-assignments/client/:clientId` to `/api/workout-forms/client/:clientId/info` is a clean route-swap.

### Response-shape delta (current vs Codex-approved)

The current normalizer at [EnhancedWorkoutLogger.tsx:472-483](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx#L472-L483) handles snake_case/camelCase for:
- `firstName` / `first_name` / `username` → `firstName`
- `lastName` / `last_name` → `lastName`
- `phone` / `phoneNumber` → `phone`
- `availableSessions` / `available_sessions` → `availableSessions`
- `totalSessionsCompleted` / `total_sessions_completed` → `totalSessionsCompleted`
- `lastSessionDate` / `last_session_date` → `lastSessionDate`
- `membershipLevel` / `membership_level` → `membershipLevel`

The `/info` endpoint returns pure camelCase (see Section 1.e response shape). BUT it returns different fields — specifically, it does not return `totalSessionsCompleted`, `lastSessionDate`, or `membershipLevel`, and it does add `recentWorkoutCount`, `hasWorkoutToday`, `todayWorkoutId`.

| Field used by `EnhancedWorkoutLogger` | `/info` response | Gap |
|---|---|---|
| `firstName`, `lastName`, `email`, `phone` | present (camelCase) | none |
| `availableSessions` | present | none |
| `totalSessionsCompleted` | **missing** | defaults to `0` via `??` — low risk; sessions-completed is display-only in the card |
| `lastSessionDate` | **missing** | defaults to `null` — display-only |
| `membershipLevel` | **missing** | defaults to `'standard'` — display-only |
| `recentWorkoutCount` (new) | present | ignored unless we surface it |
| `hasWorkoutToday` (new) | present | surfaces the duplicate-workout-today guard |
| `todayWorkoutId` (new) | present | enables deep-link to today's workout for editing |

**Display-only gaps are acceptable** (they already have `?? 0` / `?? null` fallbacks). The new fields are an upside — `hasWorkoutToday` could drive a confirmation prompt in a future follow-up (out of Phase 17 scope).

---

## Section 4 — Narrow Implementation Plan

### Exact files to edit

**1. Switch the admin/trainer logger to the canonical `/info` endpoint + role-aware navigation.**

- [frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx](frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx)
  - Line 468: change URL from `/api/client-trainer-assignments/client/${clientId}` → `/api/workout-forms/client/${clientId}/info`
  - Lines 472-483: simplify normalizer — `/info` returns camelCase already. Preserve defensive `??` fallbacks for the 3 missing fields (`totalSessionsCompleted`, `lastSessionDate`, `membershipLevel`).
  - Lines 512, 523, 529: make navigate targets role-aware. Use `useAuth()` → `user.role` → compute `backPath`:
    - admin → `/dashboard/people` (or `/dashboard/client-management`)
    - trainer → `/dashboard/trainer/clients`
  - Preserve the response-shape handling so the card still renders if the three omitted fields are absent.

**2. Add a "Log Workout" CTA in admin Clients & Team.**

- [frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx)
  - Add a "Log Workout" button next to the client row that navigates to `/dashboard/{activeRole}/log-workout?clientId=${client.id}`.
  - Must use the existing `useNavigate` + `GlowButton` pattern (no new deps).
  - Subject to the Rule 26 sub-check: confirm `ClientsWorkspace` is actually the page a client-row click lands on. If the canonical click path goes through `EnhancedAdminClientManagementView` instead, the CTA goes there. I'll confirm with one targeted read before editing.

**3. Add a "Log Workout" CTA in trainer My Clients.**

- [frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx) (the inner component rendered by the fallback wrapper)
  - Add the same CTA next to each client row. Navigate target: `/dashboard/trainer/log-workout?clientId=${client.id}`.
  - Existing `lucide-react` icons (`Edit`, `Calendar`, `BarChart3`) are already imported at [MyClientsViewWithFallback.tsx:11](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx#L11); use `Dumbbell` or `ClipboardList` for the CTA.

### Exact tests to run

| Test | Purpose | Location |
|---|---|---|
| New unit test: `EnhancedWorkoutLogger.clientRoute.test.tsx` | Assert the URL literal at line 468 is `/api/workout-forms/client/${clientId}/info`, parallel to the existing [WorkoutLogger.clientRoute.test.ts](frontend/src/components/WorkoutLogger/WorkoutLogger.clientRoute.test.ts) | `frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.clientRoute.test.tsx` |
| New unit test: `EnhancedWorkoutLogger.roleNavigation.test.tsx` | Assert navigation targets are `/dashboard/people` for admin and `/dashboard/trainer/clients` for trainer, driven by `user.role` | same dir |
| Rerun existing backend tests | Regression safety | `cd backend && npx vitest run tests/unit/` |
| Rerun existing frontend tests | Regression safety on the logger-adjacent surface | `cd frontend && npx vitest run src/components/WorkoutLogger/ src/components/TrainerDashboard/` |
| Manual smoke | As admin `1`: `/dashboard/people/clients` → click a client row → "Log Workout" CTA → `/dashboard/admin/log-workout?clientId=X` loads with correct client in the card (not demo mode). Then as trainer: same flow from trainer My Clients | Local dev |

### Explicitly out of scope

- **No backend changes.** The `/api/workout-forms/client/:clientId/info` handler already has the correct admin+trainer behavior. Rule 26.(e) receipt confirms this.
- **No `WorkoutLogger.tsx` (client-role) edits.** Phase 16.2 verified that path end-to-end; it's canonical for the client role and should not be disturbed.
- **No consolidation of `MyClientsView.tsx` and `MyClientsViewWithFallback.tsx`.** The wrapper's fallback behavior exists on purpose (when the live clients API fails, show demo data). Collapsing the two is a separate refactor.
- **No socket URL resolver unification** (deferred per runtime-drift ROUND 3 follow-up list).
- **No `EnhancedWorkoutLogger` demo mode removal.** Kept as-is so the "API not available" path still degrades gracefully — but the new path should rarely hit demo mode in practice since `/info` works for both roles.
- **No new fields surfaced from `/info`.** `hasWorkoutToday` / `todayWorkoutId` / `recentWorkoutCount` stay unused in this phase; they're upside for a follow-up.
- **No changes to `UnifiedAdminRoutes.tsx`, `UnifiedAdminDashboardLayout.tsx`, `AdminRoutes.tsx`, `TrainerDashboardRoutes.tsx`, `StellarTrainerDashboard.tsx`.** All classified legacy/dormant in Section 2 and not in the live tree for this surface.

### Acceptance criteria

1. Admin logged in at `/dashboard/people/clients` (or wherever Clients & Team lives) sees a "Log Workout" CTA on each client row.
2. Trainer logged in at `/dashboard/trainer/clients` sees a "Log Workout" CTA on each client row.
3. Clicking the CTA lands on the admin/trainer log-workout route with the correct `clientId` in the URL, and the client card shows real data (not demo mode).
4. `EnhancedWorkoutLogger` back / cancel / complete navigation routes to the correct role's client-list URL (admin → admin's list, trainer → trainer's list).
5. `WorkoutLogger.tsx` (client role) unchanged; Phase 16.2 smoke still passes.
6. New unit tests cover: API path literal + role-aware navigation.

---

## Section 5 — Open questions back to Sean before coding

1. **Admin client-row click target.** Does the admin's real "click a client row" flow land on `ClientsWorkspace` or `EnhancedAdminClientManagementView`? I found both mounted. I'll need to confirm the live click path before placing the CTA. Preference: I test locally with my own admin login rather than guess. OK with that, or do you already know the canonical path?
2. **Log Workout button style.** Should match the trainer surface's existing CTA (currently there's `Edit`, `Calendar`, `BarChart3` icon buttons on the client card per the lucide import at [MyClientsViewWithFallback.tsx:11](frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx#L11)). I'll follow the pattern there unless you want a dedicated `GlowButton` treatment.
3. **Admin back-nav target.** Two candidates: `/dashboard/people` (the generic people hub) vs `/dashboard/client-management` (the ClientsWorkspace URL). Recommend `/dashboard/people` since that's the closest "back to clients" target for admins — let me know if you prefer the other.
4. **Test harness for role switching.** The new role-navigation test needs `useAuth` mocked with a `user.role` value. OK to follow the pattern from `WorkoutLogger.clientRoute.test.ts`?

---

*Authored by Claude Opus 4.7 (1M context) per CLAUDE.md rules 26, 27, 29, 30, 31. No code written. Ready for Sean approval or pushback before Phase 17 implementation.*
