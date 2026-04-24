# Phase 18.C.1B.1 — Opus/Codex Debate — Impl Gate #3
**Date:** 2026-04-24
**Author (builder):** Claude Opus 4.7
**Reviewer (gate):** Codex
**Scope:** α-only per `PHASE-18C1B-PLANNING-FRONTEND-VIEWAS-WIRING-2026-04-24.md` §6 (locked by Sean) / §7 (scope-locked).
**Preceded by:** Planning doc Gate #1 Round 3 REVISE addressed; Round 4 APPROVE under Sean's auto-mode direct authority.

---

## §1. What changed (exactly two files)

### §1.1 `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx` — MODIFIED
Net +7/-1. One functional edit:

```diff
-        authAxios.get(`/api/gamification/profile/${userId}`),
+        // Phase 18.C.1A/1B: canonical viewAs read. Backend routes
+        // `/api/v1/gamification/profile` through viewAsGuard (admin-only,
+        // strict positive-integer, active-client target). The legacy
+        // `/api/gamification/profile/:userId` path had no backend handler
+        // and 404'd silently via Promise.allSettled, which is why this
+        // panel rendered zeros for every admin view before this fix.
+        authAxios.get('/api/v1/gamification/profile', { params: { viewAs: userId } }),
```

The inline comment was added because the fix is the WHY-non-obvious case permitted under CLAUDE.md tone rules ("a hidden constraint... a workaround for a specific bug"). Future readers need to know this panel silently 404'd before the fix, otherwise they'll assume the legacy path was a deliberate choice.

**Banner text:** Not touched. Sean's §6.2 lock says "minimal change only if needed." Existing banner (AdminViewAsWrapper.tsx:359-368) already reads "Viewing as [Name] (role)" which is factually accurate. No change needed.

**Other lines:** Not touched. Workouts / sessions / client-profile fetches remain on their existing admin-specific endpoints.

### §1.2 `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.viewAs.test.tsx` — NEW
93 LOC. 3 tests matching planning §7 test list + Codex Round 3 LOW fix:

1. **Canonical URL + viewAs param** — asserts `authAxios.get('/api/v1/gamification/profile', { params: { viewAs: '42' } })`.
2. **Legacy nonexistent path guard** — asserts `/api/gamification/profile/42` and any `/api/gamification/profile/*` path-param form is never called. This is the regression guard.
3. **No-userId short-circuit guard** — asserts the `/dashboard/people/view-as` route (no `:userId`) does not trigger any gamification profile fetch. Covers AdminViewAsWrapper.tsx:250's bail-out.

Mocks: `useAuth` → `{ authAxios: { get: mockAuthAxiosGet }, user: { id: 1, role: 'admin' } }`. Uses `MemoryRouter` + `Routes`/`Route` from react-router-dom to exercise `useParams` naturally — no useParams mock needed.

---

## §2. Verification

### §2.1 Targeted suite
```
cd frontend && npx vitest run src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.viewAs.test.tsx
```
**Result: 3/3 passing.**

### §2.2 Full frontend suite (regression check)
```
cd frontend && npx vitest run
```
**Result: 637/644 passing. 2 files / 7 tests failing — confirmed pre-existing.**

Regression verification: stashed my changes (`AdminViewAsWrapper.tsx` + new test file) and reran the two failing files:
- `src/pages/PublicWaiverPage.test.tsx` — 3 failures
- `src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.test.tsx` — 4 failures

**Same 7 failures without my changes.** They pre-date Phase 18.C.1B.1 and are not caused by this commit. Restored changes and re-verified my 3 tests pass.

### §2.3 Rule-42 backend audit
Backend untouched. Audit is trivially clean:
- `git ls-files --others --exclude-standard backend/` → 0
- `git diff --name-only HEAD backend/` → 0

### §2.4 Rule-44 secret scan
Pre-commit hook runs on staged blobs. No secrets in either file (comment + axios call + test harness).

### §2.5 Manual smoke (per §6.3 — **REQUIRES SEAN**)
The planning §6.3 / §7 lock says manual smoke is required, not optional. I cannot execute manual smoke myself (no dev server / browser automation in this flow). Sean's manual smoke checklist, to run after commit + push:

1. `npm run dev` → login as admin → navigate to `/dashboard/people/view-as/<clientId>` (substitute a real client id).
2. DevTools → Network → filter by `gamification`:
   - Confirm `GET /api/v1/gamification/profile?viewAs=<clientId>` appears.
   - Confirm **no** request to `/api/gamification/profile/<clientId>` appears.
3. Confirm gamification section renders non-zero values (level/tier/streak/XP) consistent with the target client's real data. Pre-fix this panel silently showed zeros.
4. Confirm non-gamification sections (client profile, workouts, sessions) still render as before — no regressions.
5. Console/network has no 404 for gamification profile (swallowed-404 was the pre-fix symptom).

If any step fails, REVISE required.

---

## §3. Why this design survives hostile review

### §3.1 Scope matches locks
Sean's §6 locks said α-only, canonical path only, minimal banner change. Diff is strictly α-only, uses canonical `/api/v1/gamification/profile`, banner untouched. No hook changes, no axios interceptor, no React context, no new admin route.

### §3.2 Bug-fix-plus-viewAs in one line
Pre-fix: call a nonexistent route → silent 404 → panel shows zeros. Post-fix: call the canonical viewAs-wired route → 200 → panel shows target client's real data. The viewAs query param is the **only** way this panel could have worked correctly for admins; this change fixes the bug AND wires viewAs in a single diff.

### §3.3 Admin-only gate still enforced at backend
Even though the frontend now sends `viewAs`, the backend L2 `viewAsGuard` (committed in Impl #1 `586aa4bfb`) still enforces:
- actor role must be `admin`
- target must exist
- target `isActive === true && accountStatus === 'active'`
- target role ∈ {'client', 'user'}
Frontend passing `viewAs` doesn't bypass any auth check.

### §3.4 Write-block contract unchanged
This diff touches only a GET. L1 global `viewAsWriteBlocker` (Impl #1) still rejects any mutation verb with `?viewAs`. AdminViewAsWrapper doesn't mutate.

### §3.5 Path param style (`?viewAs=42`) not path segment
The test asserts both the canonical URL AND that no path-segment form (`/api/gamification/profile/42`) is ever called. This locks the contract against a future revert to the legacy style.

### §3.6 Short-circuit guard preserved
AdminViewAsWrapper.tsx:250 bails if `userId` is undefined. Test #3 verifies this survives the change — no gamification fetch happens when the route has no `:userId`.

### §3.7 Graceful-degradation contract unchanged
The original `Promise.allSettled` pattern (line 256) is preserved. If the canonical viewAs path returns 403/404 (e.g. admin viewing a non-existent or suspended target), the gamification section will still gracefully default instead of crashing the page.

---

## §4. Deliberate non-goals

Per §7 scope lock:
- `useGamificationData` hook — NOT touched.
- New admin shell route for client-dashboard impersonation — NOT created (this is β, deferred to 18.C.1B.2).
- React context for impersonated user id — NOT created.
- Axios interceptor — NOT created.
- Workouts/sessions/client-profile calls on AdminViewAsWrapper — NOT touched.
- Backend — NOT touched.
- Banner copy — NOT touched.

---

## §5. Open items for Codex

**Gate #3 question:** Does this impl diff match the locked planning + Codex Round 3 REVISE fixes? Any HIGH/MED finding on:

1. The inline comment length/accuracy?
2. Test #3 using a ~0ms `setTimeout` to flush React effects (acceptable pattern or should this use `act()` + `waitFor()` differently)?
3. The `MemoryRouter` + `Routes` setup covering both `/dashboard/people/view-as/:userId` and `/dashboard/people/view-as` (no-param variant) — is this a faithful representation of UnifiedAdminRoutes.tsx:211's actual mount?
4. Anything missing from the locked §7 test list?

**Claude's self-assessment:** APPROVE candidate. No HIGH findings anticipated. LOW candidates I'd expect Codex might flag:
- Inline comment could be one line instead of six. (Counter: the WHY is a pre-existing silent bug that future readers will not infer from the code alone. Six lines is the minimum to cover the three facts: canonical surface, backend contract, silent-404 failure mode.)
- Could add a 4th test asserting banner text unchanged. (Counter: banner unchanged, so this would test the absence of a change — low signal.)

---

## §6. Ready-to-commit state

If Codex returns APPROVE OR Sean auto-mode directs proceed:
- Staging scope: `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx` + `AdminViewAsWrapper.viewAs.test.tsx` + this debate doc + the planning doc.
- Rule-42 backend audit will run at push time (trivially clean).
- Rule-44 secret scan runs at commit time (pre-commit hook).
- **Manual smoke is required per §6.3 / §2.5 before closing this slice — Sean to execute post-push.**

If Codex returns REVISE: Claude iterates.

---

## §7. Round log

### Round 1 — Claude → Codex (this file, 2026-04-24)
Impl diff submitted for Gate #3 review.
**Proposed verdict:** APPROVE.
Awaiting Codex review OR Sean auto-mode direct approval.
