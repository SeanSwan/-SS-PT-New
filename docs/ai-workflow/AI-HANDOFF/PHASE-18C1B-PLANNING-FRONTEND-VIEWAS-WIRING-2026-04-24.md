# Phase 18.C.1B — Planning Doc — Frontend viewAs wiring (admin → client gamification read)
**Date:** 2026-04-24
**Author:** Claude Opus 4.7
**Preceded by:** Impl #1 `586aa4bfb` + Impl #2 `c69a2743c` (Phase 18.C.1A backend) on origin/main.
**Status:** Planning draft — awaiting Sean + Codex Gate #1 (planning) review before pre-code receipts.

---

## §1. Canonical Surface Receipt (rules 26, 27)

### §1.1 Admin "view-as-client" entry point

**CANONICAL:** `/dashboard/people/view-as/:userId` → `AdminViewAsWrapper`
- Route mount: `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx:211`
  ```tsx
  <Route path="view-as/:userId" element={<S><AdminViewAsWrapper /></S>} />
  ```
- Component: `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx:241-454` (JSX mount verified, not just lazy import)
- Reads `userId` from route params (line 242: `const { userId } = useParams<{ userId: string }>();`)

### §1.2 Gamification read consumer call sites

**Canonical hook path (used by client self-view):**
- `frontend/src/hooks/gamification/useGamificationData.ts:257`
  - `authAxios.get('/api/v1/gamification/profile')` — hits backend E1, no userId param (implicit `req.user.id`)
  - Options interface (line 223-225) has `userId?: string` but it's only used in queryKey at line 245, **NOT in the URL**
  - Consumers: `ClientProgressDashboardPage`, `ClientHomeTab`, `client-gamification-view-enhanced.tsx`

**Admin aggregator direct call (the one in AdminViewAsWrapper):**
- `AdminViewAsWrapper.tsx:260`
  - `authAxios.get(`/api/gamification/profile/${userId}`)`
  - **⚠ This endpoint does not exist.** No handler registered for `/profile/:userId` in any gamification router (verified: `gamificationV1Routes.mjs` only has `/profile` and `/users/:userId/profile`). 404 is swallowed by `Promise.allSettled` on line 256, so gamification section shows default/zero values for every admin view today. Pre-existing surface drift, not caused by 18.C.1A.

**Dashboard hook path:**
- `useGamificationData` does NOT call `/dashboard` (E2) today. Only `/profile` (E1), `/achievements`, `/rewards`, `/leaderboard`. Dashboard endpoint is reached via other hooks in the gamification dashboard components (not yet audited — out of scope for this plan if we only wire E1).

### §1.3 Competing / legacy / dormant surfaces (rule 27)

| Surface | Status | File:line | Notes |
|---|---|---|---|
| `AdminViewAsWrapper` at `/dashboard/people/view-as/:userId` | **CANONICAL** | UnifiedAdminRoutes.tsx:211 | Only verifiable live admin "view as" route |
| `AdminViewAsBar` | supporting sub-component | AdminViewAsWrapper includes it | User selector dropdown, not separately routed |
| `ViewAsBanner` | **LEGACY/DORMANT** for impersonation | `components/DashBoard/components/ViewAsBanner.tsx` | Role-switch banner; unrelated to the query-param viewAs this phase introduces |
| `ClientManagementDashboard` | competing nav hub | `admin-clients/ClientManagementDashboard.tsx` | References stale route `/dashboard/admin/client-details` — not the canonical view-as entry |
| `admin-gamification-view` | **DORMANT** for this scope | `admin-gamification/` dir | Admin's own gamification settings panel; not a client-impersonation view |

### §1.4 AuthContext / axios surface

- `AuthContext` provides `authAxios: AxiosInstance` consumed throughout (`src/context/AuthContext.tsx`).
- No existing axios interceptor for query params.
- No existing React context for "currently impersonated user id."

---

## §2. Problem statement

The backend now supports `?viewAs=<clientId>` on `/api/v1/gamification/profile` (E1) and `/api/v1/gamification/dashboard` (E2). The frontend is not yet passing it.

Two distinct admin read paths land on gamification today, and they require different fixes:

**Path α — AdminViewAsWrapper bespoke aggregator page** (the existing "view as" route):
- Currently calls a non-existent `/api/gamification/profile/:userId` path-param endpoint.
- Returns no data (silently 404s → null).
- Fix: point it at `/api/v1/gamification/profile?viewAs=<userId>`.

**Path β — Client dashboard under admin impersonation** (aspirational "I see exactly what the client sees"):
- `useGamificationData` at line 257 fetches the canonical E1 with no `viewAs` param.
- No admin route yet mounts the client dashboard shell with an impersonation context.
- Fix: add a `viewAs?: string | number` option to the hook → appends `?viewAs=` when present; create/extend an admin route that renders the client dashboard under that option.

These are distinct product features. α is a 1-line bug fix wrapped with viewAs wiring. β is a new admin surface.

---

## §3. Option matrix

### Option A — narrow (α only): fix AdminViewAsWrapper's broken gamification call
**Scope:** Change AdminViewAsWrapper.tsx:260 from
```tsx
authAxios.get(`/api/gamification/profile/${userId}`)
```
to
```tsx
authAxios.get(`/api/v1/gamification/profile`, { params: { viewAs: userId } })
```
Plus: a small visual indicator (or reuse the existing impersonation banner at AdminViewAsWrapper.tsx:359-368) reflecting that the data is pulled via viewAs.

**Tests:** component test that stubs authAxios and asserts the URL + `params.viewAs` match the route's `:userId`. Optionally an MSW-backed integration test.

**Pros:**
- Fixes the silent bug in the existing admin aggregator.
- Exercises the Phase 18.C.1A backend surface from the real live path.
- Small, reversible, low-blast-radius.

**Cons:**
- Doesn't give admins a "see exactly what the client sees" view. AdminViewAsWrapper is a bespoke aggregator with its own shape — it's not the client dashboard.

---

### Option B — broad (β only): enable client-dashboard impersonation via useGamificationData
**Scope:**
1. Add `viewAs?: string | number` to `UseGamificationDataOptions` in `useGamificationData.ts`.
2. At line 257 (and any other canonical endpoints in the hook that landed on viewAs-wired routes — profile for sure; dashboard if we decide to bring E2 in), append the param when present.
3. Add a new admin route (e.g. `/dashboard/admin/client-view/:userId/*`) that mounts the client dashboard shell with `viewAs={userId}` threaded through context or prop.
4. Keep L1 write-block contract honored at UI level — hide/disable mutating controls in impersonation context to avoid 403s the user can't explain.

**Tests:** unit test on the hook for param passthrough + absence; component test on the new admin shell route that asserts an impersonation banner renders, mutating controls are hidden/disabled, and fetch URLs include `?viewAs=`.

**Pros:**
- True "view as client" — admins see exactly what the client sees for gamification.
- Scales: the same pattern extends to other backend-resolved admin tabs as we wire more endpoints (18.C.1C+).
- Matches the original 18.C Canonical Surface Walk goal (10/15 backend-resolved tabs).

**Cons:**
- Larger blast radius — touches client dashboard components and introduces an impersonation context.
- Does not, by itself, fix AdminViewAsWrapper's broken gamification line (still silently 404s) unless we also do A.
- Risk of surprising UI behavior if mutating controls aren't fully audited.

---

### Option C — both (A + B), sequenced
**Scope:** A first in one commit (the bug fix, immediate value, one line + tests), then B in a follow-up commit (the new admin shell surface).

**Pros:** Each commit stays small + reviewable under rule 46. Bug gets fixed fast. Impersonation-shell work is isolated from the bug fix.

**Cons:** Two commits instead of one. (Not really a con — this is the default good pattern.)

---

## §4. Recommendation

**Option C, sequenced.**

- **18.C.1B.1 — Option A** first (narrow, 1-line + test). Clear win: fixes a silent production bug AND validates the Phase 18.C.1A backend surface from a live caller. 30-min scope.
- **18.C.1B.2 — Option B** second. Larger planning surface because it touches an admin shell route and a client-dashboard context. Deserves its own planning doc and gates.

Rationale:
1. Rule 19 (no speculative success language) — A gives us a real, verifiable caller path today. B is aspirational until we design the admin shell.
2. Rule 17 (dual-pass) — smaller commits are easier to hostile-review.
3. Rule 46 (Codex gate) — small diffs minimize review burden and false-positives.

If Sean wants Option A only (stopping here), 18.C.1B.2 can be punted to 18.C.1C after feedback on the bug-fix in prod.

If Sean wants to do both inside 18.C.1B, I'd still split into 2 commits behind the same planning umbrella.

---

## §5. Proposed 18.C.1B.1 scope (Option A — to be built if approved)

### §5.1 Files touched

1. **`frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx`** (MODIFIED, ~3 lines net)
   - Replace line 260 call with the canonical + viewAs form.
   - Optionally: add a short comment pointer to Phase 18.C.1A backend surface.

2. **`frontend/src/components/DashBoard/Pages/admin-clients/components/__tests__/AdminViewAsWrapper.viewAs.test.tsx`** (NEW)
   - Unit test: stub `useAuth` → mocked `authAxios`, render `AdminViewAsWrapper` with `useParams` returning `{ userId: '42' }`, assert `authAxios.get` was called with `'/api/v1/gamification/profile'` AND `{ params: { viewAs: '42' } }`.
   - Negative test: if no `userId` in params, no call is made (line 250 already short-circuits).

No backend changes. No other consumers affected.

### §5.2 Non-goals
- Not touching `useGamificationData`.
- Not adding an impersonation React context.
- Not wiring other tabs on AdminViewAsWrapper (workouts, sessions — those call admin-specific endpoints that are not viewAs-gated).
- Not adding an axios interceptor.
- Not changing the admin route tree.

### §5.3 Verification plan
- Frontend unit: new test file green.
- Frontend suite: no regressions (`cd frontend && npx vitest run`).
- Backend unchanged: rule-42 audit will be trivially clean (backend untouched).
- Manual smoke: **required per §6.3** (not optional). `npm run dev` → login as admin → navigate to `/dashboard/people/view-as/<clientId>` → DevTools network tab shows `GET /api/v1/gamification/profile?viewAs=<clientId>` → response 200 with target client's profile → panel shows non-zero values. Exact 4-point checklist is in §6.3.

---

## §6. Decisions (LOCKED by Sean, 2026-04-24)

1. **Scope: Option C sequenced. 18.C.1B.1 is α only.**
   AdminViewAsWrapper bespoke aggregator fix. β (client-dashboard-under-admin-impersonation) is NOT in this slice — it is a new surface/workflow requiring its own planning gate.

2. **Banner text: minimal, factual, narrow.**
   Keep existing admin view-as banner semantics. If copy changes at all, exactly: "Viewing client data as admin." No marketing or explanatory text.

3. **Manual smoke: REQUIRED after implementation.**
   - Navigate to `/dashboard/people/view-as/:userId`.
   - Confirm gamification profile request uses canonical `/api/v1/gamification/profile?viewAs=:userId`.
   - Confirm **no** request to nonexistent `/api/gamification/profile/:userId`.
   - Confirm non-gamification sections (client profile, workouts, sessions) still render as before.
   - Confirm console/network has no swallowed 404 for gamification profile.

4. **Endpoint: canonical `/api/v1/gamification/profile?viewAs=${userId}` only.**
   No legacy alias use in new frontend wiring. Backend legacy alias stays for compatibility but is not used here.

---

## §7. Scope-locked summary (supersedes §3-§5 for 18.C.1B.1)

Per §6 locks, 18.C.1B.1 implements **Option A narrow (α only)**:

**Files touched:**
1. `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx` — MODIFIED, ~1-3 lines net.
   - Line 260 replacement: `authAxios.get(`/api/v1/gamification/profile`, { params: { viewAs: userId } })`.
   - Banner text at lines 359-368: only change if strictly needed; if touched, exactly "Viewing client data as admin."
2. `frontend/src/components/DashBoard/Pages/admin-clients/components/__tests__/AdminViewAsWrapper.viewAs.test.tsx` — NEW.
   - Asserts canonical URL + `{ params: { viewAs: userId } }`.
   - Asserts the nonexistent path `/api/gamification/profile/${userId}` is NOT called.
   - Asserts missing route `userId` (useParams returns `{}`) does not call gamification profile — short-circuit guard from AdminViewAsWrapper.tsx:250.
   - Guards against regression.

**Non-goals (explicit):**
- No changes to `useGamificationData` hook.
- No new admin shell route for client-dashboard impersonation.
- No React context for impersonated user id.
- No axios interceptor.
- No changes to workouts/sessions calls on AdminViewAsWrapper.
- No backend changes.

**Verification:**
- Unit test file green.
- Frontend suite no regressions.
- **Manual smoke (per §6.3) required before closing this slice.**
- Rule-42 backend audit trivially clean (backend untouched).

---

## §8. Round log

### Round 1 — Claude → Sean (2026-04-24)
Planning doc v1 submitted with open questions §6.

### Round 2 — Sean → Claude (2026-04-24)
§6 locked verbatim into §6-locked above. §7 added to summarize scope under the locks. Ready for Codex Gate #1 review.

### Round 3 — Codex → Claude (2026-04-24) — REVISE
Two small findings, both applied in-place:
- **MEDIUM:** §5.3 was stale ("optional, Sean's call") vs. §6.3/§7 required. Fixed — §5.3 now explicitly says "required per §6.3" and points to the 4-point checklist.
- **LOW:** §7 test list omitted the no-`userId` short-circuit guard from §5.1. Fixed — added bullet: "Asserts missing route `userId` (useParams returns `{}`) does not call gamification profile — short-circuit guard from AdminViewAsWrapper.tsx:250."

Substantive design confirmed sound by Codex: canonical surface receipt is narrow, α vs β separation is clear, file list is small, no backend changes, canonical path is correct.

### Round 4 — Claude → Codex (2026-04-24)
Both fixes applied. Planning doc locked. Proposed verdict: APPROVE. Proceeding autonomously under auto-mode with Sean's direct authority to pre-code receipts (Gate #2).

---

## §9. Correction — Canonical Surface Receipt in §1 was wrong (added 2026-04-24)

Production Playwright smoke on 2026-04-24 revealed that the Canonical Surface Receipt in §1.1 was **incorrect**:

- The doc claimed `/dashboard/people/view-as/:userId` was a live canonical mount with JSX evidence at `UnifiedAdminRoutes.tsx:211`.
- That was **nested-Route JSX evidence only**. I failed to walk UP the tree to verify that `UnifiedAdminRoutes` itself was mounted in the live route tree. Per the Phase 19 cleanup receipt (`PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md:50`, committed 2026-04-21), `UnifiedAdminRoutes` was unmounted from the live tree, and any `/dashboard/people/*` URL silently redirects to `/dashboard/admin/${defaultPath}` via the catch-all at `UniversalDashboardLayout.tsx:869/874`.
- `AdminViewAsWrapper` was therefore **orphaned** — the file existed but no live route rendered it.
- This is exactly the failure mode CLAUDE.md rule 26 warns against: "a lazy `import()` declaration is NOT proof of mount, JSX usage is" — and a synthesized MemoryRouter mount in a test is not proof either.

**Framing correction:**
- The 3-commit stack `74bfbc82c` + `961d38920` + `01c555d35` applied correct display-layer drift fixes, but they were applied to an **orphaned aggregator**, NOT to a live admin surface. The commits were NOT "admin view-as canonical surface patched" in the production workflow sense.
- Accurate framing: **"schema / response-shape / display-label drift fixes applied to an orphaned admin aggregator; admin workflow remains non-functional until the aggregator is canonically re-mounted."**

**Recovery:** Phase 18.C.1B.1R (see `PHASE-18C1B1R-RECOVERY-RECEIPT-2026-04-24.md`) re-mounts `AdminViewAsWrapper` at the canonical `/dashboard/admin/client-management/view-as/:userId` via `UniversalDashboardLayout roleConfigurations`, adds a live "View As" CTA in `ClientsWorkspace`, and adds a source-text route guard test to prevent another synthesized-mount regression. 18.C.1B.1 is not considered production-fixed until the 18.C.1B.1R production Playwright smoke passes on the new canonical path AND from the live Client Hub CTA entry point.
