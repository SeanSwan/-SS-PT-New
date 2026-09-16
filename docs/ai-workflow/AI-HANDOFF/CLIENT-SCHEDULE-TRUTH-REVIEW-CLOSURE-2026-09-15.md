# Client Schedule Truth — Review Closure (2026-09-15)

**Verdict: APPROVE** — the landed client-dashboard schedule fix passes the
formal review its queue entry requested on 2026-09-12. No code changes
required. This record closes the OPEN review request for commit
`fbca1bb2b` / landed cherry-pick `7ac853007e`.

## What was reviewed

The client-dashboard schedule fix ("surface schedule truth — waiver wall +
role-user RBAC"), authored 2026-09-12 after Sean's live report that the
client dashboard showed no schedule while admin/trainer dashboards
rendered. Root causes (probe-verified, read-only):
waiver-gate 403 swallowed into a silent empty list; role-`user` RBAC
returning `[]` for the User model's default role; dishonest empty-state
copy over past-only session data.

## Landing chain (what actually shipped)

| Step | Commit | Note |
| --- | --- | --- |
| Original slice | `fbca1bb2b` | 11 files, +516/−20, on `wip/comms-notifications-2026-07-05` |
| Pushed to origin | — | by a later agent (author did not push) |
| Cherry-pick | `7ac853007e` | identical message, onto `land/dashboard-truth-fixes-20260915` |
| Typecheck repair | `47d9d15a5` | typed axios-error view; dropped unused `return action` |
| Merge to main | PR #124 (`3bff1d742`) | via `land/tooling-fleet-20260915` |

This review adjudicates the union of `7ac853007e` + `47d9d15a5` against
current `origin/main` tip `bccce72c8` (which includes 94 further merged
commits), in an isolated worktree.

## Delta between reviewed and landed code

- `universal-master-schedule-service.ts` — waiver 403 check now reads the
  axios error through a typed view (`httpError`) instead of `any`
  narrowing. Runtime checks identical (`response?.status === 403 &&
  response?.data?.code === 'WAIVER_REQUIRED'`).
- `useCalendarData.ts` — removed `return action` after the
  rejected-action inspection; `loadSessions` is `Promise<void>`
  (no caller consumed the return value). Behavior identical.
- `ClientTimeline.tsx` (main's own evolution) — `now` moved inside the
  `useMemo` (fresher timestamps per recompute). Benign improvement.
- `unifiedSessionClientAvailability.test.mjs` (main's own evolution) —
  mock gains `getDailyWorkoutForm` for main's newer model import.
- `WaiverRequiredNotice.tsx` + `clientScheduleTruth.rbac.test.mjs` —
  byte-identical to the reviewed originals (verified by diff).

## Reviewer-scope questions from the 2026-09-12 queue entry — adjudicated

1. **Role-`user` own-session scope (product line).** APPROVE. Landed main
   scopes role `user` strictly to `filter.userId = user.id`, with no
   bookable available-slot branch and client-limited trainer attributes
   (no email/phone). Social-role accounts see their own history; booking
   remains client-only. Pinned by behavioral test
   (`unifiedSessionClientAvailability.test.mjs`).
2. **Circuit-breaker sees the waiver 403 as success.** APPROVE as-shipped.
   The breaker wraps the dispatch (which resolves via `rejectWithValue`);
   the waiver match/throw happens after the breaker returns, so the
   failure counter resets and the notice stays stable across retries
   instead of tripping the breaker's backoff. Deliberate and correct for a
   deterministic gate.
3. **Object-payload rejection backwards compatibility.** APPROVE. On
   current main the only `fetchEvents.rejected` / `selectScheduleError`
   consumers are the slice's own reducer (string-guarded) and
   `useCalendarData`. The former `FullCalendar` consumer no longer exists
   on main; `scheduleError` remains a string in all cases.
4. **WaiverRequiredNotice visual/radius at 320/414/2560.** Code-level
   PASS (token colors with fallbacks, 44px+ CTA, 12px button / 20px card
   radii per design.md §7, focus-visible ring, prefers-reduced-motion
   guard, `min-width: min(260px, 100%)` mobile safety).
   **[UNVERIFIED] live rendering** — needs an authenticated browser pass;
   queued with the live acceptance check below.
5. **Dormant `enhancedClientDashboardService` silent catch.** Confirmed
   still dormant on main (`useEnhancedClientDashboard` has zero
   non-test consumers). Correctly untouched; flagged for any future
   consumer.

## Verification evidence (on `bccce72c8`, fresh worktree install)

- Backend focused: `clientScheduleTruth.rbac.test.mjs` +
  `unifiedSessionClientAvailability.test.mjs` +
  `sessionsRoutesOwnershipGuard.test.mjs` → **22/22 pass**.
- Frontend focused: `clientScheduleTruth.contract.test.ts` + Schedule
  wrapper suites → **15/15 pass**.
- `tsc --noEmit` (frontend, whole project) → **clean** on the newest main.
- Post-landing touches to the 11 slice files: only `47d9d15a5` and PR #92
  (cancellation-pricing hunks in `applyServerDerivedChargeAmount`, a
  different function). No interference with the RBAC branch.

## Deploy state

`origin/main` carries the fix (PR #124) and auto-deploys to Render.
Production deploy status was not directly observable from this
environment — **[LIKELY] live**. Acceptance check: log in as a
waiver-less client and open `/dashboard/client/schedule`; the expected
render is the "Your schedule is waiting on your waiver" panel with the
Sign-your-waiver CTA (deep-linking into `/waiver` with `returnUrl`),
not a silent "No Upcoming Sessions."

## Residual items (non-blocking)

- Live authenticated visual pass at 414px/QHD with a waiver-less test
  client (covers residual item 4 end-to-end).
- `enhancedClientDashboardService.getSessions` (`/api/schedule`) still
  silently catches; surface it if that service ever gains a consumer.
- Rollback: revert the merge commit of PR #124 on main (content is
  additive; the role-`user` RBAC branch is the only behavior change on
  the backend and is covered by the re-pinned behavioral test).
