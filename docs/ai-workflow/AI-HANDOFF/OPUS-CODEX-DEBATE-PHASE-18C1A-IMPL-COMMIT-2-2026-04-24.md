# Phase 18.C.1A — Opus/Codex Debate — Impl Commit #2 Gate #3
**Date:** 2026-04-24
**Author (builder):** Claude Opus 4.7
**Reviewer (gate):** Codex
**Scope:** E1 (`/profile`) + E2 (`/dashboard`) gamification route conversions + API integration tests.
**Preceded by:** Impl #1 landed as `586aa4bfb` on origin/main (middleware + helper + manifest + unit tests, 48/48 targeted, 1725/1725 full backend).

---

## §1. What changed

Exactly two files, strictly within the approved Phase 18.C.1A plan §10.1 and pre-code receipts §3.3.

### §1.1 `backend/routes/gamificationV1Routes.mjs` — MODIFIED
Net +12/-4. Four functional edits:

1. **Added imports:**
   ```js
   import { viewAsGuard } from '../middleware/viewAsGuard.mjs';
   import { getEffectiveReadUserId } from '../utils/viewAs/getEffectiveReadUserId.mjs';
   ```

2. **E1 `/profile` route** — mount `viewAsGuard` after `authenticate, requireUser`; switch identity resolution from `req.user.id` to `getEffectiveReadUserId(req)`:
   ```diff
   -router.get('/profile', authenticate, requireUser, (req, res) => {
   -  req.params.userId = req.user.id;
   +router.get('/profile', authenticate, requireUser, viewAsGuard, (req, res) => {
   +  req.params.userId = getEffectiveReadUserId(req);
      return gamificationController.getUserProfile(req, res);
    });
   ```

3. **E2 `/dashboard` route** — same pattern:
   ```diff
   -router.get('/dashboard', authenticate, requireUser, async (req, res) => {
   +router.get('/dashboard', authenticate, requireUser, viewAsGuard, async (req, res) => {
      try {
   -    const dashboard = await getDashboardData(req.user.id);
   +    const dashboard = await getDashboardData(getEffectiveReadUserId(req));
   ```

4. **Nothing else changed.** Other routes on the same router (challenges, goals, points, pets, social, etc.) are untouched. The L1 global `viewAsWriteBlocker` (mounted in `backend/core/app.mjs` by Impl #1) still covers write-verb rejection on every route.

### §1.2 `backend/tests/api/gamificationViewAs.test.mjs` — NEW
~240 LOC. 20 API integration tests built on Express + supertest, mirroring the existing repo pattern at `backend/tests/api/availabilityRoutes.test.mjs:37-56`.

Parametrized across **both mount paths** (per planning §10.1: canonical + legacy alias both inherit viewAs from the shared `gamificationV1Routes` router):
- `/api/v1/gamification/*` (canonical)
- `/api/gamification/*` (legacy alias — `backend/core/routes.mjs:367-369`)

Per-path coverage (10 tests × 2 mounts = 20):
- E1 admin + valid viewAs → effective userId = target (42)
- E1 admin + no viewAs → effective userId = self (7)
- E2 admin + valid viewAs → effective userId = target (42)
- E2 admin + no viewAs → effective userId = self (7)
- Non-admin + viewAs → 403 `IMPERSONATION_ADMIN_ONLY`
- Invalid viewAs (`abc`) → 400 `IMPERSONATION_INVALID_PARAM`
- Missing target (User.findOne → null) → 404 `IMPERSONATION_TARGET_NOT_FOUND`
- `accountStatus=stub` target → 404 `IMPERSONATION_TARGET_NOT_FOUND` (hard-gate per planning §6.1, Sean's lock)
- Target role=trainer → 400 `IMPERSONATION_TARGET_INVALID_ROLE`
- **L1 write-block contract**: `POST .../record-workout?viewAs=42` → 403 `IMPERSONATION_READ_ONLY` (mounted L1 into test app to mirror prod wiring)

Mocks:
- `User.findOne` — vi.fn with `validClient` default
- `gamificationController.getUserProfile` — spy-stub that records `req.params.userId`
- `gamificationDashboardService.getDashboardData` — spy-stub that records `userId`
- `authMiddleware.protect` — Bearer-header → `req.user` mapping (`Bearer admin` → `{id:7, role:'admin'}`; `Bearer client` → `{id:99, role:'client'}`)
- Other controllers stubbed via inline Proxy factory (satisfies `vi.mock` hoisting constraint — no module-scope refs)

---

## §2. Verification

### §2.1 Targeted suite
```
cd backend && npx vitest run tests/api/gamificationViewAs.test.mjs \
  tests/unit/viewAsGuard.test.mjs \
  tests/unit/getEffectiveReadUserId.test.mjs \
  tests/unit/viewAsSupportedEndpoints.test.mjs
```
**Result: 68/68 passing** (48 from Impl #1 + 20 new API integration).

### §2.2 Full backend suite
```
cd backend && npx vitest run
```
**Result: 1745/1745 passing** (was 1725 after Impl #1 → +20 new tests, no regressions).

### §2.3 Rule-42 pre-commit audit (run before commit, not yet because gate pending)
- Untracked backend files: **0** (verified mid-task)
- Modified-uncommitted backend files: **1 currently unstaged** (`gamificationV1Routes.mjs`) + **1 new file** (`tests/api/gamificationViewAs.test.mjs`). Both are in scope of this commit.

### §2.4 Rule-44 secret scan
Pre-commit hook will run on staged blobs; trivial green expected (no secrets in either file — pure Express wiring + vi mocks).

---

## §3. Why this design survives hostile review

### §3.1 L1 write-block contract preserved
The global `viewAsWriteBlocker` mount in `backend/core/app.mjs:setupRoutes` means **any** write verb on **any** route with `?viewAs` is rejected before it reaches the handler. Adding per-route `viewAsGuard` on /profile and /dashboard only affects **GET/HEAD**. No way for a mutation verb with `?viewAs` to leak through — the test `L1 blocks POST with viewAs at any write-capable route` asserts this on `/record-workout` (a POST route that does NOT have `viewAsGuard` mounted).

### §3.2 Legacy alias coverage is automatic
`gamificationV1Routes` is imported once and `app.use`'d twice (canonical + legacy). Any middleware mounted inside the router applies to both mount paths. The test file exercises both paths explicitly via `describe.each([['canonical', '/api/v1/gamification'], ['legacy', '/api/gamification']])` to prove no accidental asymmetry.

### §3.3 `getEffectiveReadUserId` is strict
From Impl #1: it only honors `req.viewAsUserId` if it's a positive safe integer. If viewAsGuard ever failed to set `req.viewAsUserId` (it won't — it returns early on any validation failure), this helper falls back to `req.user?.id`. No path accidentally reads a garbage value.

### §3.4 `accountStatus === 'active'` hard gate
viewAsGuard's target-lookup check (`target.isActive === true && target.accountStatus === 'active'`) from Impl #1 means stub/invited targets NEVER get past viewAsGuard — neither route ever sees a stub/invited userId in `req.viewAsUserId`. Covered by both unit (viewAsGuard.test.mjs) and API (this file) layers.

### §3.5 No controller logic changed
`gamificationController.getUserProfile` already read `req.params.userId` — the `/profile` route continues to set that param. `getDashboardData(userId)` takes a user id positional arg — the `/dashboard` route continues to pass one. This is a pure identity-resolution change at the route layer.

### §3.6 requireUser / admin auth still enforced
`authenticate` runs BEFORE `viewAsGuard`. `requireUser` (which accepts `client`, `trainer`, `admin`) runs BEFORE `viewAsGuard`. This means:
- Unauthenticated → 401 from `authenticate`, never reaches viewAsGuard
- Authenticated but invalid role → 403 from `requireUser`, never reaches viewAsGuard
- Authenticated non-admin with viewAs → 403 from viewAsGuard's admin gate
- Admin → viewAsGuard's target-lookup / role / status gates

Order is correct and not reshuffled from the existing pattern.

---

## §4. Open items for Codex

**Gate #3 question:** Does this impl diff match the approved planning + pre-code receipts? Any HIGH/MED finding on:

1. Route mount order (authenticate → requireUser → viewAsGuard → handler)?
2. `getEffectiveReadUserId(req)` called **after** viewAsGuard sets `req.viewAsUserId` (ordering correct)?
3. Legacy alias coverage via shared-router mount (vs. duplicating middleware on both mount points)?
4. Test coverage for accountStatus hard-gate, trainer-target rejection, non-admin rejection, invalid-param rejection, missing target?
5. L1 write-block test on an actual POST route that does NOT have viewAsGuard (proves the global mount catches it, not the per-route guard)?
6. Anything missing from the planning §10.1 / pre-code §3.3 surface area?

**Claude's self-assessment:** APPROVE candidate. No HIGH findings anticipated. LOW candidates I'd expect Codex might flag:
- Coverage gap: HEAD verb tests. (Rationale to skip: viewAsGuard unit tests already prove HEAD works; API tests focus on the real user-agent verbs for these routes, which are GET only.)
- Coverage gap: `user` role happy-path via the API layer. (Rationale to skip: `requireUser` is already shown to pass through; the admin→client flow IS the happy path here. `user` role acceptance is covered at the unit layer in viewAsGuard.test.mjs.)

---

## §5. Ready-to-commit state

If Codex returns APPROVE:
- Staging scope: `backend/routes/gamificationV1Routes.mjs` + `backend/tests/api/gamificationViewAs.test.mjs` (2 files, +12/-4 on route, +~240 new in test) + this debate doc.
- Rule-42 backend audit will run at push time.
- Rule-44 secret scan runs at commit time (pre-commit hook).

If Codex returns REVISE: Claude iterates, appends Round N+1, cycle repeats.

---

## §6. Round log

### Round 1 — Claude → Codex (this file, 2026-04-24)
Impl diff submitted for Gate #3 review.
**Proposed verdict:** APPROVE.
Awaiting Codex review.
