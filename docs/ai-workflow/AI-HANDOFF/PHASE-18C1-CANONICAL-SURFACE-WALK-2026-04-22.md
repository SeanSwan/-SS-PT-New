# Phase 18.C.1 Canonical Surface Walk — Client-Role Route Tree Identity-Read Inventory

**Date:** 2026-04-22
**Author:** Claude Opus 4.7 (1M)
**Produced per:** PHASE-18C-PLANNING-ADMIN-IMPERSONATION-2026-04-22.md §11.1
**Purpose:** Enumerate every component in the LIVE client-role route tree (`UniversalDashboardLayout.tsx:600-623`), classify its identity-read pattern, and produce the concrete swap file list before any code.
**Scope-of-claim lock (rule 28):** This is a DISCOVERY RECEIPT. No code changed. No swap decision finalized — this produces the evidence Sean approves or re-scopes.

**Important boundary finding (§4 below):** The surface walk reveals that a **non-trivial subset of live client components delegate identity resolution to the backend** (calls like `authAxios.get('/api/.../me')` where backend uses `req.user.id`). These **cannot be swapped from frontend alone** and will require the 18.C.2 backend middleware to actually show target-client data. Sean's explicit instruction was to stop and report that rather than coding around it. Reporting.

---

## 1. Live Client-Role Route Tree (18 routes, per `UniversalDashboardLayout.tsx:600-623`)

| # | URL suffix | Component | Import source |
|---|-----------|-----------|---------------|
| 1 | `/overview` | `ClientHomeTab` | [Pages/client-dashboard/ClientHomeTab.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx) (lazy :115) |
| 2 | `/workouts` | `ClientMyWorkoutsPage` | [Pages/client-dashboard/ClientMyWorkoutsPage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx) (lazy :112) |
| 3 | `/log-workout` | `WorkoutLogger` | [../WorkoutLogger/WorkoutLogger](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx) (direct :85) |
| 4 | `/progress` | `ClientProgressDashboardPage` | [Pages/client-dashboard/ClientProgressDashboardPage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx) (lazy :462) |
| 5 | `/progress/detailed` | `ClientProgressWrapper` (inline wrapper) | [UniversalDashboardLayout.tsx:467-470](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L467-L470) |
| 6 | `/ai-consent` | `AiConsentScreen` | [Pages/client-dashboard/AiConsentScreen](frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx) (lazy :98) |
| 7 | `/meal-planner` | `NutritionWorkspaceLazy` | [./workspaces/NutritionWorkspace](frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx) (lazy :100) |
| 8 | `/schedule` | `UniversalScheduleLazy` | [../Schedule/UniversalSchedule](frontend/src/components/Schedule/UniversalSchedule.tsx) (lazy :97) |
| 9 | `/community` | `ClientCommunityPage` | [Pages/client-dashboard/ClientCommunityPage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx) (lazy :119) |
| 10 | `/messages` | `MessagingPageLazy` | [../../pages/MessagingPage](frontend/src/pages/MessagingPage.tsx) (lazy :99) |
| 11 | `/live` | `LiveStreamingPage` | [../Social/LiveStreaming/LiveStreamingView](frontend/src/components/Social/LiveStreaming/LiveStreamingView.tsx) (lazy :106) |
| 12 | `/creators` | `CreatorEconomyPage` | [../Social/CreatorEconomy/CreatorEconomyView](frontend/src/components/Social/CreatorEconomy/CreatorEconomyView.tsx) (lazy :107) |
| 13 | `/profile` | `ClientProfilePage` | [Pages/client-dashboard/ClientProfilePage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx) (lazy :117) |
| 14 | `/rewards` | `ClientRewardsPage` | [Pages/client-dashboard/ClientRewardsPage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientRewardsPage.tsx) (lazy :118) |
| 15 | `/body-map` | `BodyMapPage` | [../BodyMap](frontend/src/components/BodyMap/index.tsx) (lazy :121) |
| 16 | `/my-home` | `AvatarHomePage` | [../AvatarHome/AvatarHomePage](frontend/src/components/AvatarHome/AvatarHomePage.tsx) (lazy :134) |
| 17 | `/coach-assistant` | `SwanCoachAssistantPage` | [./Pages/coach-assistant/SwanCoachAssistantPage](frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx) (lazy :108) |
| 18 | `/virtual-olympics` | `VirtualOlympicsPage` | [../VirtualOlympics/VirtualOlympicsPage](frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx) (lazy :135) |

**NOT in scope:** `frontend/src/components/ClientDashboard/` directory (10 files with `user.id` reads from my initial scan). Path inspection confirms the LIVE route tree points to `frontend/src/components/DashBoard/Pages/client-dashboard/` — the other directory is legacy/dormant and not transitively imported by the live tree.

## 2. Classification Table

Columns:
- **Identity-read location** — file:line hits for `useAuth()`, `user.id`, `userId`, `clientId`, `useSearchParams`, etc.
- **Scope** — DATA (identity controls what data displays) / DISPLAY (identity controls greeting/avatar) / MIXED / DELEGATED (identity passed to a hook that does the fetching) / NONE (no identity read)
- **Swap class** — A/B/C/D/E per §3

| # | Component | Identity-read location | Scope | Swap class |
|---|-----------|------------------------|-------|-----------|
| 1 | ClientHomeTab | `:337` `useAuth()` for `user.firstName`/`user.username` display; `:338` `useGamificationData()` with NO args | DISPLAY + DELEGATED | **B** (swap at hook call-site: pass `effectiveClientId`) |
| 2 | ClientMyWorkoutsPage | No direct identity read. Uses `useWorkoutSessions(params)` from `hooks/useDashboardQueries.ts:156`. Hook accepts `params: WorkoutSessionParams` — need to check if it accepts userId override. | DELEGATED | **B** if hook supports userId param; **boundary** if hook hardcodes auth user |
| 3 | WorkoutLogger | `:159-167` already has `effectiveClientId` (prop `clientId` fallback to `user.id`). Line 96 types the prop. | ALREADY SWAPPED (prop-based) | **C** (parent passes `clientId`; no component change — BUT client-role route at UDL:604 mounts as `<WorkoutLogger />` with NO prop → need to pass `effectiveClientId` at the route wrapper) |
| 4 | ClientProgressDashboardPage | `:342` `useAuth()`; `:352` `/api/gamification/users/${user.id}/weekly-recap` — DATA fetch; `:434` `<CompanionPet userId={user.id}>` — child data prop; `:514` `<CanonicalProgressChartsGrid userId={user.id}>` — child data prop | DATA | **A** (direct swap to `effectiveClientId`) |
| 5 | ClientProgressWrapper | [UDL:467-470](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L467-L470) — `useAuth()` then `<NASMProgressCharts clientId={user?.id \|\| 0}>` | DATA | **A** (direct swap — inline wrapper in UDL itself) |
| 6 | AiConsentScreen | No identity-read matches. Likely reads `user.id` internally for a consent API — needs deeper read. Not critical for impersonation (consent is always per the LOGGED-IN user, not the impersonated one). | TBD; probably DISPLAY or SELF-ONLY | **E** likely (leave on auth user; consent is a self-action, not a per-client view) |
| 7 | NutritionWorkspace | No identity-read matches at top of file. Delegates to internal hooks/pages. | DELEGATED | **B** (hook audit needed during implementation) |
| 8 | UniversalSchedule | No identity-read matches at top of file. Role-aware internal logic (used by admin, trainer, client). | DELEGATED | **B** (hook audit needed during implementation) |
| 9 | ClientCommunityPage | No identity-read matches. Social feed — likely pulls posts from followed users, not self. | NONE | **E** (not per-client-scope) |
| 10 | MessagingPage | `:12` `useAuth()` for `user, isAuthenticated` — but no `user.id` hits at top. Messaging threads are presumably self-scoped from backend. | DATA (backend-resolved) | **Boundary D** — likely requires 18.C.2 backend swap |
| 11 | LiveStreamingView | No identity-read matches. Pure display/viewer. | NONE | **E** |
| 12 | CreatorEconomyView | No identity-read matches. Pure display. | NONE | **E** |
| 13 | ClientProfilePage | `:187` `useAuth()`; `:267` `<CompanionPet userId={user.id}>` — child data prop; `:293` `userId={user.id}` — child data prop | DATA + DISPLAY | **A** (direct swap for data; keep display reads on real auth user for "my account" semantics — see §5 risk) |
| 14 | ClientRewardsPage | `:181` `useAuth()` for `authAxios` only. **NO `user.id` read.** Implies fetches use `/api/.../me` style endpoints where backend resolves identity. | DATA (backend-resolved) | **Boundary D** — requires 18.C.2 backend swap |
| 15 | BodyMapPage (→ BodyMap) | BodyMap:`158` accepts `userId?: number` prop; `:165` falls back to `user?.id`. Already prop-driven. | ALREADY SWAPPED (prop-based) | **C** (parent passes `userId={effectiveClientId}`) |
| 16 | AvatarHomePage | No identity-read matches. Likely avatar display with hook-delegated data. | DELEGATED | **B** (hook audit) |
| 17 | SwanCoachAssistantPage | `:348` `useAuth()`; `:353-356` already uses `useSearchParams` to read `clientId` URL param; `:380-382` updates URL clientId param | ALREADY has URL-clientId pattern | **D** (independent pattern — adopt `?viewAs=` or make it a no-op; decision needed) |
| 18 | VirtualOlympicsPage | No identity-read matches. Gamification-driven display. | DELEGATED | **B** (hook audit) |

## 3. Swap Classes

- **A — Direct swap** (the component reads `useAuth().user.id` and uses it for data; change to `useEffectiveClientId()` directly): components #4, #5, #13 partial.
- **B — Hook-param swap** (the component calls a hook that accepts an identity param; swap at the call-site): components #1, #2 (tentative), #7, #8, #16, #18.
- **C — Route-mount prop swap** (the component already accepts a prop and falls back to auth; the route-level mount needs to pass `effectiveClientId`): components #3, #15. **Specifically: `UniversalDashboardLayout.tsx:604` `<WorkoutLogger />` and #615 / the client route entries need to pass `effectiveClientId` when mounted under impersonation.** This requires wrapping the lazy-loaded component in an adapter that reads the context and forwards the prop.
- **D — Already has its own client-scoping pattern** (independent): components #10 (messaging, backend-resolved), #14 (rewards, backend-resolved), #17 (Swan Coach, URL-param). Each needs its own policy.
- **E — No swap needed** (no per-client-scope data, or explicitly self-only): components #6, #9, #11, #12.

## 4. BOUNDARY FINDING — backend-resolved identity

**Components #10 (MessagingPage), #14 (ClientRewardsPage), and potentially others** fetch data via endpoints that use `req.user.id` at the backend — there is NO `user.id` or `clientId` in the request path or query. A representative fetch looks like `authAxios.get('/api/gamification/profile/me')` → server reads `req.user.id` from JWT → returns that user's data.

**These components cannot be swapped from the frontend alone.** Even with `useEffectiveClientId()` returning the target client id, the request sent to the backend doesn't CARRY that id — the backend always resolves to the authenticated admin's id and returns admin data (empty for a real admin).

**What 18.C.1 can do today for these components:**
- Disable them entirely when `isImpersonating` (banner: "This view is not yet supported under impersonation — Phase 18.C.2 required").
- OR silently allow them but warn that the admin is seeing their OWN data even while the banner says "impersonating".
- OR skip them — leave the route active, admin sees empty/own-data with banner mismatch.

**The correct 18.C.2 fix** is a backend middleware that accepts a standard `?viewAs=:id` query param on admin-authenticated requests and swaps `req.user.id` to target id ON READ ENDPOINTS ONLY. This is the exact middleware §11 of the Phase 18.C planning doc already describes.

**Recommended Phase 18.C.1 boundary handling (pending Sean's call):**
- Mark Category D-backend components with a "not yet supported" banner/shim when `isImpersonating`.
- Category D URL-param (SwanCoachAssistantPage) already works for admin-per-client; Phase 18.C.1 can hand off `?viewAs=` → `?clientId=` inside the Swan Coach entry.
- Ship Category A, B, C today. Leave D-backend for 18.C.2.

## 5. Risk Notes

| Risk | Impact | Mitigation |
|------|--------|------------|
| Admin impersonating sees THEIR OWN data on rewards/messaging tabs | User-facing banner lies about what data is shown | §4 boundary handling — explicit "not supported" block on D-backend tabs in 18.C.1 |
| ClientProfilePage "edit profile" / "my account" semantics while impersonating | Potential admin accidentally editing ACROSS-client settings | Profile data reads: swap to effective. Profile WRITE buttons: `disabled={isImpersonating}` per §11.5 of planning doc. |
| ClientProgressWrapper inline in `UniversalDashboardLayout.tsx` | Touches the UDL file directly — a high-traffic file | Edit is 2 lines (add `useEffectiveClientId`, replace `user?.id`). Low risk if the hook is already in scope. |
| WorkoutLogger mount prop pass at UDL:604 | Adapter pattern needs care — WorkoutLogger expects `clientId?: number`. Passing `effectiveClientId` (which is `user.id` when not impersonating, target when impersonating) should match the existing fallback semantics. | Sanity test in unit tests: `effectiveClientId === user.id` when NOT impersonating (no behavior change). |
| `useGamificationData` call-site swap (ClientHomeTab:338) | Hook accepts `{ userId }` option (line 235). Existing consumers pass nothing → hook falls back to auth. Passing `{ userId: effectiveClientId }` preserves this behavior when NOT impersonating (effective === auth.id). | Correct by construction. |
| Hook audit for delegated components (NutritionWorkspace, UniversalSchedule, AvatarHomePage, VirtualOlympicsPage, ClientMyWorkoutsPage) | Unknown until I read the hooks | 18.C.1's first ACTUAL-CODE task is the hook audit receipt — similar shape to this one. Budget 1–2 hours. |

## 6. Proposed Concrete Swap File List (pending Sean's approval)

### 6.1 New files
- `frontend/src/context/AdminImpersonationContext.tsx`
- `frontend/src/context/useEffectiveClientId.ts`
- `frontend/src/components/DashBoard/components/ImpersonationBanner.tsx`
- Corresponding test files.

### 6.2 Modified files — Category A (direct swap)
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:467-470` — `ClientProgressWrapper` inline wrapper.
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx:352,434,514` — 3 hits.
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx:267,293` — 2 data-prop hits (NOT line 187's display reads).

### 6.3 Modified files — Category B (hook call-site)
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx:338` — `useGamificationData({ userId: effectiveClientId })`.
- Pending hook audit for: `ClientMyWorkoutsPage` (`useWorkoutSessions` signature), `NutritionWorkspace` (internal hooks), `UniversalSchedule` (internal hooks), `AvatarHomePage` (internal hooks), `VirtualOlympicsPage` (internal hooks).

### 6.4 Modified files — Category C (route-mount wrappers)
- `UniversalDashboardLayout.tsx` client role config at `:602-619` needs adapter mounting for WorkoutLogger (`/log-workout`) and BodyMapPage (`/body-map`). Wrapper reads `useEffectiveClientId()` and forwards as prop.

### 6.5 Modified files — Category D (independent pattern)
- `SwanCoachAssistantPage.tsx:353-356` — make `?viewAs=` interoperate with `?clientId=` (narrow scope: if `viewAs` present and no `clientId`, use `viewAs`).
- `MessagingPage.tsx` — boundary-disable shim when `isImpersonating` (banner "not yet supported").
- `ClientRewardsPage.tsx` — boundary-disable shim when `isImpersonating` (banner "not yet supported").

### 6.6 Write-button disable pass
- Audited at per-component implementation. Priority buttons (from Category C files): `WorkoutLogger` save (line 820+ `effectiveClientId` checks — add `isImpersonating` gate). `ClientProfilePage` save-buttons (lines TBD). `BodyMap` pain-entry save (line 234 `painService.update`, 236 `painService.create`, 275 `painService.remove` — each gets `isImpersonating` check).

## 7. Decisions Needed From Sean Before 18.C.1 Code

1. **Category D-backend handling** (§4): block the tab entirely under impersonation with an explicit "not supported" banner, OR silently allow with mismatch, OR skip-for-now?
2. **SwanCoachAssistantPage `?viewAs=` → `?clientId=` bridging** (§6.5): interop (preferred) or independent?
3. **Hook audits** for delegated components (§6.3): do them NOW as part of this receipt pass, or AT IMPLEMENTATION as the first task of 18.C.1 code session?
4. **Write-button pass scope** (§6.6): enumerate ALL write buttons now (~1-2 hour extra scan), or handle per-file during implementation?
5. **Route-mount wrapper pattern** (§6.4): extend the existing `roleConfigurations` shape to accept a `wrap: (C) => ImpersonatedAdapter(C)` helper, OR inline the adapter per-component? The former is cleaner for the pattern; the latter is less UDL surgery.

## 8. Scope Guards (Reiterated)

- No backend changes in 18.C.1 — boundary findings (§4) explicitly flagged for 18.C.2.
- No dormant deletion — `AdminViewAsWrapper`, `UnifiedAdminRoutes`, `MasterDetailLayout`, `AdminClientManagementView` V1, `ClientsManagementSection` untouched.
- No route-tree rewrite — adding adapter wrappers inside existing `roleConfigurations` shape is the max structural change.
- No AdminViewAsWrapper repurpose.
- No write-through / audit schema / JWT swap.

## 9. Boundary Report (Sean's Explicit Instruction)

Sean's words: *"If the surface walk reveals that reads cannot work without backend changes, stop and report that as a boundary finding instead of coding around it."*

**Finding:** Yes. Categories D-backend (components #10 MessagingPage and #14 ClientRewardsPage at minimum — likely more under §6.3 hook audit) cannot be swapped from frontend alone. Their request paths don't carry an identity param; the backend uses `req.user.id`. Any "fix" in 18.C.1 for those components would be a lie (admin sees own data, banner says impersonating).

**Reported, not coded around.** Sean decides §7.1 scope.

---

**Next step:** Sean reviews §6 swap file list + §7 decisions. On approval, 18.C.1 code session begins with §6.3 hook audits as the first concrete task, then Category A edits, then Categories B/C/D per the decisions.

---

## 10. Addendum — Hook Audit Results + STOP RECOMMENDATION (2026-04-22)

**Sean locked §7 decisions.** Hook audit executed immediately per his decision #3.

### 10.1 Hook audit results

| Hook | Endpoint hit | Identity-carrying? | Status |
|------|-------------|--------------------|--------|
| `useGamificationData` ([hooks/gamification/useGamificationData.ts:257](frontend/src/hooks/gamification/useGamificationData.ts#L257)) | `GET /api/v1/gamification/profile` | **No** — no userId in URL, query, or body. Backend resolves via JWT. The `{ userId }` option only changes React Query's cache key (line 241, 245); it does NOT pass userId to the request. **Misleading API.** | **Backend-resolved** |
| `useWorkoutSessions` ([hooks/useDashboardQueries.ts:156](frontend/src/hooks/useDashboardQueries.ts#L156)) | `GET /api/workout/sessions` | **No** — params are `limit`, `page` only. Backend resolves via JWT. | **Backend-resolved** |
| `useMacroSummary` ([hooks/useMacroSummary.ts:39](frontend/src/hooks/useMacroSummary.ts#L39)) | Via `authAxios` (signature accepts `date?: string` only, no userId param) | **No** | **Backend-resolved** |
| `useSubscription` (NutritionWorkspace:83) | Returns admin-scoped subscription flags (isPro/isElite/isTrial) | Self-only by design | **Correct — don't swap (admin's subscription is the right read)** |
| `AvatarHomePage` direct fetches ([:131,145,159,173](frontend/src/components/AvatarHome/AvatarHomePage.tsx)) | `/api/avatar-home`, `/api/gamification/profile`, `/api/avatar-home/minimalist-mode`, `/api/avatar-home/room` | **No** — all JWT-resolved | **Backend-resolved** |
| `VirtualOlympicsPage` direct fetches ([:425,438,458,478,491](frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx)) | `/api/olympics/events`, `/api/olympics/leaderboard/*`, `/api/olympics/submit`, `/api/olympics/recovery-status`, `/api/olympics/recovery-day` | **No** — all JWT-resolved | **Backend-resolved** |
| `ClientRewardsPage` fetch ([:190](frontend/src/components/DashBoard/Pages/client-dashboard/ClientRewardsPage.tsx)) | `GET /api/v1/gamification/dashboard` | **No** — JWT-resolved | **Backend-resolved** |
| `ClientProfilePage` fetch ([:214](frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx)) | `GET /api/profile` | **No** — JWT-resolved | **Backend-resolved** |

### 10.2 Revised final tab counts

| Count | Category | Tabs |
|-------|----------|------|
| **5** | **Supported in 18.C.1** (frontend swap works — userId is explicit in URL path/prop) | #3 WorkoutLogger, #4 ClientProgressDashboardPage, #5 ClientProgressWrapper, #15 BodyMap, #17 SwanCoachAssistantPage |
| **10** | **Blocked — require 18.C.2 backend `?viewAs=` middleware** | #1 ClientHomeTab, #2 ClientMyWorkoutsPage, #7 NutritionWorkspace, #8 UniversalSchedule (inferred), #10 MessagingPage, #13 ClientProfilePage, #14 ClientRewardsPage, #16 AvatarHomePage, #18 VirtualOlympicsPage, + MessagingPage hook |
| **4** | **Leave-as-is (correct current behavior under impersonation)** | #6 AiConsentScreen (self-only consent is coherent), #9 ClientCommunityPage (social feed — public-ish), #11 LiveStreamingView (display), #12 CreatorEconomyView (display) |

### 10.3 STOP RECOMMENDATION (per Sean's instruction)

Sean's escape clause: *"If the hook audit shows most core tabs require backend /me fixes, stop again and recommend moving 18.C.2 backend read-override ahead of broader 18.C.1 rollout."*

**This condition is triggered.**

- **10 of 15 non-E tabs (67%) are backend-blocked.**
- The core user-facing READ surfaces — Home, My Workouts, Profile, Rewards, Nutrition, Avatar Home, Virtual Olympics — are ALL blocked.
- Only WRITE/prop-pattern surfaces work without backend changes (Log Workout, Body Map) + one explicit-URL surface (Progress Dashboard / ProgressWrapper) + one already-URL-param surface (Swan Coach).

**Shipping 18.C.1 as scoped would leave admins with:**
- A "View As" CTA that takes them to `/dashboard/client/overview` (ClientHomeTab — blocked).
- 10 of 18 client-tab nav items showing the "not yet supported" panel per §7.1 decision.
- 5 of 18 tabs actually working as impersonation.
- A product experience that is more "blocked panels" than "view as client".

### 10.4 Recommendation: reorder Phase 18.C

**Proposed new sequencing:**

1. **Phase 18.C.1 NEW (backend first, narrow):** Ship the backend `?viewAs=` middleware + per-endpoint audit. Only GET/read endpoints. Admin-only gate. Middleware intercepts `req.query.viewAs` on admin-authenticated requests, swaps `req.user.id` → target id for the duration of the request handler, leaves writes to return 403. 3-6 files backend + tests.
2. **Phase 18.C.2 NEW (frontend scaffolding):** What was previously planned as 18.C.1 — the AdminImpersonationContext, useEffectiveClientId, ImpersonationBanner, route adapters. Now it's "second" because the backend is ready to serve target-client reads.
3. **Phase 18.C.3 NEW (per-tab enablement):** One-by-one, each tab gets its frontend call migrated to honor the impersonation context. The backend already supports it, so each tab's enablement is a small change.
4. **Phase 18.C.4 NEW (live smoke + production validation):** Unchanged in spirit.

**Why this order is correct:**
- The backend middleware is small (~150 LoC + tests) compared to the full frontend scaffolding (several new files, banner, context, write-disable pass, route adapters).
- Once the middleware ships, EVERY one of the 10 blocked tabs becomes unblockable just by ensuring the frontend call includes `?viewAs=` (which can happen via a request interceptor or explicit in the call).
- Admin sees a real experience: navigate to any tab under impersonation, see target data. No "not yet supported" panels proliferating across the UI.

**Why the original order was wrong:**
- The receipt (§2–§4) showed that the most common identity pattern in live client components is **backend-resolved**. A frontend-only impersonation layer cannot serve these.
- Shipping the frontend layer first would paint the product into a corner where 67% of tabs show blocking panels — a bad UX to ship and a harder story to undo in review.

### 10.5 What I'm NOT Doing (pending Sean's direction)

- NOT writing code for either old-18.C.1 or new-18.C.1.
- NOT enumerating write-button disables for supported tabs (that's scope for the NEW-18.C.2 frontend phase, after backend is ready).
- NOT starting a new backend planning doc (that's your call — I can draft if authorized).
- NOT touching the Phase 18.B commit at `91a936820` / origin at `f867d3db0`.

### 10.6 Decisions Needed From Sean (revised)

1. **Accept the stop recommendation and reorder.** Phase 18.C becomes: (a) backend `?viewAs=` middleware first, (b) frontend scaffolding second, (c) per-tab enablement third.
2. **OR override and ship 5-tab partial 18.C.1 frontend anyway**, with "not yet supported" panels on the other 10 tabs. I'll execute if directed.
3. **OR scope 18.C.1 even narrower** — e.g. ship ONLY the context + banner + SwanCoachAssistantPage interop (which already works). Skip WorkoutLogger/BodyMap adapters for now. Minimum-viable-banner. Admins get a URL-param flag that does almost nothing yet.
4. **OR park Phase 18.C entirely** until later and move the session to dormant-file deletion / Phase 19.C / other backlog.

### 10.7 What would change in the OLD-18.C.1 planning doc if (1) is accepted

- `PHASE-18C-PLANNING-ADMIN-IMPERSONATION-2026-04-22.md` §11.x gets renumbered into Phase 18.C.2 (new).
- New planning doc for Phase 18.C.1-backend (backend middleware + per-endpoint audit) needs to be written.
- §10 decision log in the old doc stays accurate (decisions still apply; phase numbering shifts).

---

**Stopped. Recommendation provided. Await Sean's call on §10.6.**