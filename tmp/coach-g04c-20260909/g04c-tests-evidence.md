# G04c test evidence (hash-bound)

Scope digest: `c917c7562cc5f77f890ab60f59c6bdd850901056deb15f9c6eb47fabd8fead96`
(contract `c0b3753a275f4e3b2384225ae1d496c71797e3fa1b6e0be37a49028f9d935e6b`, schema-4 override, slice G04c, index 3)

## Baselines (pre-edit, this slice)

- FE coach-assistant baseline: **156/156 PASS, exit 0** (`/tmp/g04c-baseline-fe.log`, 11 files)
- Card compatibility suites: **53/53 PASS, exit 0** (`/tmp/g04c-compat-baseline.log`, 4 files)

## Post-implementation results (this freeze)

| Gate | Command (WSL Node 22.23.2, worktree frontend/) | Result | Log |
|---|---|---|---|
| Scoped G04c suite | `node node_modules/vitest/vitest.mjs run --reporter=verbose CoachContextStatus.test.tsx CoachIntentTimeline.test.tsx CoachWorkoutDraft.test.tsx CoachSessionDesk.test.tsx CoachSessionDeskGate.test.tsx CoachSessionDesk.floorMode.test.tsx CoachCommandCenterPage.deskMount.test.tsx` | **42/42 PASS, exit 0** | `/tmp/g04c-suite6.log` |
| Card compatibility re-run | `node node_modules/vitest/vitest.mjs run --reporter=verbose CoachActionProposalCard.test.tsx CoachActionProposalCard.g01.test.tsx CoachActionProposalCard.astraHostile.test.tsx CoachActionProposalCard.publication.test.tsx` | **53/53 PASS, exit 0** | `/tmp/g04c-compat-post.log` |
| TypeScript no-emit | `NODE_OPTIONS=--max-old-space-size=12288 node node_modules/typescript/bin/tsc --noEmit` | **TSC_EXIT=0** (default-heap runs OOM under 9p; 12 GB heap is the stable command) | `/tmp/g04c-tsc5.log` |

## Convergence history (RED -> GREEN, honest)

- Suite round 1: 41/48 (7 failures) — 2 component bugs found and repaired by the tests:
  1. `validateDraftForDesk` (CoachWorkoutDraft.tsx) returned `ok: !allowIncomplete` in its error
     branch, so a thrown `REPS_REQUIRED`/`WEIGHT_REQUIRED` in review mode was reported as
     `ok: true` and the component (which renders errors only on `!ok`) showed nothing.
     Repaired to `ok: false`; incomplete rows still return through the success path with
     `errors: []` in draft mode (probe-verified before repair).
  2. `CoachIntentTimeline` visible cap `Math.min(visibleCount, pageSize)` permanently capped
     "Show more" at one page; repaired to `Math.min(visibleCount, bounded.length)`.
- Test-fidelity repairs (no behavior change): explicit `cleanup()` between multiple renders in
  one test (RTL renders into a fresh div per call; auto-cleanup only runs between tests),
  `act()`-wrapped clicks for the timeline's controlled `openEntryId` (stateful parent wrapper
  plays the desk-owned open state), gate test now passes `targetUserId={42}` so the token
  assertion is meaningful, floor-mode row selectors scope to the exercise `li` (name/unit
  inputs share the `coach-workout-exercise-` prefix).
- Round 2: 37/42 -> Round 3: 41/42 -> Round 4: 41/42 (stateful wrapper fixed the invalid-hook
  call) -> Round 5: 41/42 (Close is a detail-panel control, not a state action — assertion
  corrected) -> **Round 6: 42/42, exit 0**.

## Environment notes

- Disposable loopback Postgres `swan-g01-disposable-pg-20260906` (port 15433) alive; no
  provider spend, no outbound calls — all G04c tests mock owner hooks
  (`useCoachSessionDraft`, `useCoachSurfaceContext`, `useCoachWorkoutDraftSubmit`) via the
  repo's hoisted `vi.mock` + module-state idiom.
- `CoachCommandCenterPage.deskMount.test.tsx` exercises the real page shell + real
  `CoachSessionDraftProvider` (harness mirrors the layout-level provider) with a 15 s timeout;
  two harmless `act(...)` warnings from router future-flag effects are suppressed in
  `src/test/setup.ts`.
