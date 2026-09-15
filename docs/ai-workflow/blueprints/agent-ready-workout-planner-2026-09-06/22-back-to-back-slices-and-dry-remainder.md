# Back-to-back slices after receipt 21, and the dry remainder

Date: 2026-09-13 (session). Order: "do all slices back to back, then hostile review until we run dry."
Worktree: `tmp/worktrees/rolodex-bootcamp-planner-20260913` · branch `codex/rolodex-bootcamp-planner-20260913`
Base: `c0cbe538d…` — still **no commit**; everything remains working-tree only, layered on receipts 19–21.

## Slices landed this round

### S1 — F04: the week prescription reaches generation (P1, RED→GREEN)

Contract restored from base (`git show c0cbe538d:backend/services/bootcamp/sprintGenerator.mjs`),
not invented: explicit `week.intensityModifier` wins > deload default 0.7 > `PROGRESSION` strategy
fallback (linear ramp ≤1.5, undulating [1.0,0.85,1.1], block 0.9/1.0/1.1/1.05, random 0.85–1.15).

- `sprintGenerator.mjs`: `weekPrescription()` is the single decision, exported via `__testing__`;
  `generationInput()` now sends `prescriptionIntensity` per slot; `regenerateSlot()` loads the slot's
  week and applies the same prescription (a regenerate must obey the same contract as the full run).
- `bootcampGenerator.mjs`: `prescribedWorkSec()` (exported, normalized [0.5,2], interval clamped
  [10,120]) scales per-exercise WORK seconds at ONE seam — `format.durationSec` — so full-group,
  stations, finishers and the persisted `exerciseDurationSec` echo all inherit it. A truthful
  `prescription` explanation is emitted when the value actually changes. Rest, stations, structure
  and targetDuration are untouched (a deload is less work per interval, not fewer stations).
- Deliberately NOT restored: base's `intensityCategoryFromModifier` bridge. The current generator's
  `scoreExerciseForIntensity` has no cases for base's `low/moderate/high/max` vocabulary — threading
  them would score everything 0 while printing "intensity category applied" to the coach. A lie was
  not restored; the volume reader was.
- Tests: new `sprintPrescription.test.mjs` (4: per-slot [0.7, 1, 1.05, 1.2], deload-fallback-0.7,
  regenerate obeys the week, pure decision function) + scaler contract in
  `bootcampGenerationSemantics.test.mjs` (11 cases incl. clamps and type tolerance). Observed RED
  (missing option / missing `__testing__`) before implementation; GREEN after; adjacent
  `sprintRepair` suite still green.

### S2 — F07: rotation history is 7 SESSIONS, not 7 keys (P2, RED→GREEN)

`workoutBuilderService.mjs` pushed every session's keys into one flat array and consumed
`slice(-7)` — with 6-8 keys per session that window was roughly the PREVIOUS SINGLE SESSION, so the
documented "no repeat across the last 7 sessions" never held. New pure helper
`unionOfRecentSessions(batches, windowSize = 7)` in `workoutBuilderAllocation.mjs`; the populator now
pushes per-session batches and both consumers (day constraints + rotation-fallback set) read the
union. Tests in `workoutBuilderAllocation.test.mjs` prove a 9-sessions-ago exercise is free again
while everything inside the 7-session window is excluded, and empty batches are tolerated.

### S3 — F06: 428/400/409 are decidable before SSE headers (P2)

`sprintGenerationClaim.mjs` now exports `validateGenerationRequest()` (the same 428/400 checks
`claimSprint` enforces, which still re-validates under the lock). `sprintRoutes.mjs` POST
`/sprints/:id/generate` runs it BEFORE `writeHead(200)`, plus a best-effort
`sprintClaimIsLive(authorizedSprint, Date.now())` pre-check → 409 JSON. The read-only pre-check is
documented as TOCTOU-bounded: the locked claim check inside `claimSprint` stays authoritative and a
lost race degrades to the pre-F06 opaque frame, never to a wrong success. Validator locked RED→GREEN
in `sprintGenerationClaimLease.test.mjs` (9 tests). Still open by design: the in-memory job map is
not restart-safe (server restart loses replayable events); that needs DB-backed events or job
persistence — its own slice.

### S4 — H24: capability honesty (P2, RED→GREEN, lie proven live first)

- `bootcampRunAcquisition.ts`: an undefined capability starter now settles FALSE — before, a browser
  without `requestFullscreen` reported `fullscreen: true` (reproduced as RED: "expected true to be
  false" BEFORE the fix). Already-fullscreen and already-running audio return an explicit resolved
  promise (true), so only genuine "no request possible" cases changed meaning.
- `useBootcampWorkflowStage.ts`: the acquisition result is kept in `runSurfaceCapabilities` state and
  returned — the hook previously threw the result away, so even a `false` was invisible. Floor-mode
  UI can now read it; rendering the banner is left for a UI slice.

### S5 — projectedEndsAt inflation: NOT A DEFECT on current code (probe, no production change)

Lane C's claim ("inflates the projected-end badge each tick while on schedule") was probed, not
assumed: two new tests in `BootcampRunner.logic.test.ts` simulate 12 on-schedule ticks and assert the
projection equals `startedAt + total` at EVERY tick, plus stability between two reads inside one
segment. Both pass against the current implementation — the algebra is anchored on absolute
deadlines. The claim likely described the pre-R12 state; the probes stay as regression locks.

### S6 — worker/fallback scorer parity (P2, RED→GREEN, divergence proven live)

The Blob worker cannot import modules, so `searchExercisesSync` hand-mirrored the worker's fuzzy
scorer and had drifted: muscle matches were fuzzy (×0.7) in the worker but substring-only (flat 200)
in the fallback, type matches fuzzy×0.5 vs flat 300 — different orders AND different match sets
depending on whether the worker booted. The fix makes the fallback mirror the worker exactly and
LOCKS parity by executing the REAL worker source (`__testing__.WORKER_CODE` evaluated with a stub
`self`) against 10 query shapes (substring, initials, type, muscle-substring, muscle-fuzzy "pecs",
fuzzy-walk "qdr", category, combined). RED showed exactly the two muscle-fuzzy queries failing;
GREEN after the fix. Future drift on either side now fails the suite.

### S7 — deload reducer type preservation (P3, RED→GREEN) + codec adjudication

`applyVolumeDeloadPrescription` flipped numeric-string prescriptions to numbers (`sets: "4"` →
`2`): the reduction now writes back the SAME type it read (string in → `"2"`, number in → `2`),
with `before/after` carrying the original. Tests prove both directions. The intensity codec
fixed-point item was ADJUDICATED, NOT A DEFECT: `decodeIntensityPrescription(83, '85% 1RM')` →
`'83% 1RM'` is the codec's stated ("typed finite number is authoritative") and TESTED precedence
contract; the rewrite only touches inconsistent persisted pairs, which are malformed by definition.
Re-litigating a deliberate tested contract in a repair pass is scope creep — recorded instead.

## Verification after S1–S7 (full battery, isolated scopes)

Recorded in the run summary: all seven scopes green — planner, BootcampBuilder, hooks+SprintPlanner,
tsc@16384MB (0 errors), backend repair group (now 15 suites with `sprintPrescription`),
server-RED both configs (25 tests). (Exact counts in the closeout message and `summary.txt`.)

## The dry remainder — why I stopped here

Every remaining open item now falls into one of three buckets; none is actionable as an honest
working-tree slice tonight:

1. **Needs a browser-verified slice** (rule 24/phone-width; I will not land a11y changes blind):
   native buttons + `aria-pressed` on Sprint cards/slots, 44px on the 36px/unstyled retry targets,
   the slot-dialog focus steal, the responsive/zoom/reduced-motion matrix, media playback.
2. **Needs its own race-mapped slice**: `usePlannerAsyncScope` wired into only 2 of ~9 async paths
   (each path needs its own cancel/supersede semantics read before wiring), the Coach-add fence
   (`useWorkoutPlannerAiEvents.ts`), dirty-signature holes, replace-draft confirmation, load-path
   revision invention, blend-pick resets, restart-safe SSE job store.
3. **Needs Sean's product decision**: the `bootcampGenerator.mjs` severe-pain 422 gate (H07
   reveal-vs-block is unreadable from the register and narrowing a pain gate unilaterally is the
   wrong call for a review pass), and whether the strict `equipmentRequirementV1` contract should get
   producers or be retired.

That is the dry boundary: nothing left in scope is both (a) safely landable without browser or
product verification I don't have, and (b) not already owned by a named future slice.

## Label

IMPLEMENTATION VERIFIED for S1–S7 at the tested boundaries, layered on receipt 21's verdicts.
NOT DRY (bucket 1–3 remain, listed above, each with an owner path), NOT DEPLOYED, no commit, no
push, no migration, no paid provider call, no probe files left behind.
