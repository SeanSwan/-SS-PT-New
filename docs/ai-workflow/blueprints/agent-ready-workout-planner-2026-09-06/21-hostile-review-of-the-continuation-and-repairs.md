# Hostile review of the continuation (R1–R15), and round-3 repairs

Reviewed: 2026-09-13 (session date), against handoff `20-handoff-for-hostile-review-of-continuation.md`.
Reviewer: independent hostile-review pass (ZCode/GLM 5.3) requested by Sean:
"falsify this work, then make the suggested upgrades and fixes."
Worktree: `tmp/worktrees/rolodex-bootcamp-planner-20260913` · branch `codex/rolodex-bootcamp-planner-20260913`
Base: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699` — **still no commit; everything remains working-tree only.**
Supersedes nothing; receipt `19` and handoff `20` are preserved, not rewritten.

## Method

The identity traps (1–3) were consumed first: the real worktree was located via `git worktree list`
(the parent `Desktop\quick-pt\SS-PT` is not itself a repo; the worktrees are registered to the
`@Everything` clone), HEAD and the 91-dirty-entry state were confirmed to match the handoff, and no
probe files were found. All seven baseline scopes were then re-run **in isolation** before any code
was read, and every number in receipt `19`'s verification table reproduced exactly:

| Scope | Result |
|---|---|
| Planner (`admin-workout-planner`) | 87 files / 457 tests passed |
| BootcampBuilder | 39 files / 212 tests passed |
| Hooks + SprintPlanner | 63 files / 277 tests passed |
| `tsc --noEmit` at 16384 MB | exit 0, 0 errors |
| Backend 14-suite repair group | 14 files / 76 tests passed |
| Server RED (tmp config) | 4 files / 23 tests passed |
| Server RED (packet config) | 4 files / 23 tests passed |

## Verdicts on C1–C12

Every verdict below carries file:line evidence. REAL DEFECT = repair landed this round.
NOT A DEFECT = the attack was executed and the claim held.

- **C1 — NOT A DEFECT (verified independently).** Reproduced the parse proof with the project's own
  esbuild from `frontend/`: `PARSE OK`. The `controller.abort()` in `reconnect`
  (`useSprintAPI.ts:279`) is the correct handle, is scoped to the fetch that owns this reader chain,
  and is a no-op once settled — the in-code comment states exactly that, so it does not oversell.
  Strengthened anyway (R21b below): the reconnect GET now sends `cache: 'no-store'`, closing lane E's
  suspected cached-404 replay, which was the one live weakness left in this path.
- **C2 — HOLDS, with the documented caveat.** 0 errors at 16384 MB reproduced. The repo script still
  pins 8192 (`frontend/package.json:11`) and still OOMs on this machine. I attempted the one-line
  heap bump and **reverted it** — see R20 below. R3's `typeof` guard was audited for the "dropped
  legitimate revision" attack: revisions reach `useWorkoutPlannerSaveActions.ts:172` either from
  `mapSavedPlan` (number) or from the load path, which normalizes to a positive safe integer or 1
  (`useWorkoutPlannerLoadPlanActions.ts:94`), so no legitimate revision can fail the guard; the
  change restored a type gate only.
- **C3 — NOT A DEFECT.** The `setLoadedPlanRevision` prop
  (`useWorkoutPlannerOrchestration.ts:156,177`) matches the file's established pattern —
  `setPhaseNumber`, `setGoal`, `setCategory` are injected the same way — so this is not a papered-over
  design fault. For "other missing-prop hooks": the whole-repo `tsc --noEmit` at 16 GB exits 0, which
  type-checks every one of those call sites; the R2 class of bug survives only in files tsc cannot
  see, and there are none of that class left in the orchestration graph.
- **C4 — CONFIRMED weakness, now repaired (R18).** The test's local predicate matched the component's
  expression at review time (`WorkoutPlannerCommandPanelV2.tsx:148-151` vs the test copy), but the
  drift hazard was real. The `savedPlansError` reset paths were attacked and held: every state write
  is fenced by `requestId === savedPlansRequestRef.current`
  (`useWorkoutPlannerSavedPlansState.ts:70,74,76`), the start-of-fetch reset clears error before any
  await (`:66`), and the null-client path clears all four fields (`:61-64`). Rapid A→B→A and
  superseded-mid-flight both land on the newest request's outcome. A stale `true` can therefore only
  exist while its own failed request is the newest one — the safe direction (suppress, never misreport).
  Repair: the predicate is now a single exported helper both the component and the tests import.
- **C5 — LATENT, NOT LIVE; hardened anyway (R17).** The handoff's hazard was traced through the real
  parents: `floorMode === (workflowStage === 'run')` exactly (`useBootcampWorkflowStage.ts`), and
  during the Run stage every `setBootcamp` writer is unmountable — Left/Right panels require
  `workflowStage === 'build'`, the CoachDock requires `workflowStage !== 'run'`, the mount effect is
  guarded by `if (bootcamp) return`, and station-count changes null the class first
  (`BootcampBuilderPage.tsx:213-214`). An identity flip while the runner is mounted is therefore not
  reachable today. The residual mechanism is real, though: on an identity change the restore reads the
  WeakMap under the NEW key, misses, and calls `createRunnerState` — a silent restart from segment 0
  with the clock running, not a paused restore (the handoff's description was slightly wrong about
  which loss occurs). R17 narrows the write surface and documents the parent contract in the hook.
- **C6 — NOT A DEFECT.** The two-winner attack was executed against the code, not mocks. A live
  generator with missing claim metadata is structurally impossible: `claimSprint` writes
  `status='generating'` and the claim in one atomic row update under the lock
  (`sprintGenerationClaim.mjs:72-73`), and a repo-wide sweep finds exactly three metadata writers —
  claim (`:72`), renew (`:88`), finish (`sprintGenerator.mjs:63`) — all claim-guarded and
  spread-preserving. `withSprintClaim` re-verifies operationId + version + expiry on every write path
  (`commitSlot`, `finish`, `rebuildMemory`), so the only overlap scenario (a process alive but
  stalled >90s so its 120s lease lapses, successor reclaims) wastes work but cannot dual-commit: the
  takeover bumps `generationVersion`, and the stale generator's next claim-checked step throws
  "claim lost"; its error-path `finish` is swallowed by design (`runOwned`'s `catch { }`).
- **C7 — NOT A DEFECT (re-verified independently).** `req.user.role` is DB-derived:
  `authMiddleware.mjs:320` does `User.findByPk(decoded.id)` and builds `req.user` from that row
  (`:356`), so the admin bypass cannot be JWT-forged. The profile row is locked
  (`lock: transaction.LOCK.UPDATE`) inside the same transaction before the ownership decision — and
  dropping `trainerId` from the WHERE is strictly better for race safety: previously a foreign-owner
  row matched nothing and was never locked; now the real target row serializes. The 403/404 bodies
  are constant strings (`bootcampCrud.mjs` — 'Profile not found or not authorized'), no enumeration
  oracle.
- **C8 — NOT A DEFECT.** `saveBootcampTemplate` has exactly one production caller
  (`bootcampRoutes.mjs:165`); the sprint path persists generated classes into
  `slot.generatedClassData`, a different table with no profile columns. No logging/telemetry consumer
  spreads the generated object with the two new fields in a way that leaks beyond the trainer who
  already supplied the ids.
- **C9 — REAL DEFECT, repaired (R16).** The handoff's suspicion is confirmed with a concrete input:
  `adminClientController.mjs:1610` destructured `exerciseCount` from `req.body` with no coercion, so
  an admin posting `{"exerciseCount": 6.5}` reached `distributeExerciseCount` and took the new
  `TypeError` as a 500. The trainer route clamps (`workoutBuilderRoutes.mjs:189`); the admin route now
  clamps identically (R16). The third suspect path (`workoutBuilderService.mjs:1270`,
  `recoveryOverride?.exerciseCount ?? 6`) feeds `selectExercises`, not the allocator — no throw risk.
- **C10 — NOT A DEFECT, strengthened (R21a).** The relaxed assertion still pins the route and the
  `apiService.post` prefix — the invariant the line protects (regenerate goes through the central
  authenticated client) is intact, and the no-argument pin was stale against H04's required body. The
  body itself is now asserted too, so the relaxed pin cannot quietly rot further.
- **C11 — HOLDS, gap filled (R19).** The PostgreSQL fail-closed cases are not tautological: the real
  service runs against real PostgreSQL with real seeded profile tables and the assertions count actual
  rows. The `expect.soft` flag is overstated — soft assertions accumulate and still fail the test;
  they defer reporting, they do not swallow. The missing admin case at the PG level was real and is
  now covered: 23 → 25 tests, both configs green.
- **C12 — NOT A DEFECT (weak).** The only formatting contract is the ≤300-line count
  (`useWorkoutPlannerSavedPlansState.extraction.test.ts:30`); nothing asserts the previous
  formatting. The compressed block is dense but reviewable. No repair.

## The three backend `tests/unit` failures — attribution verified

`backend/node_modules/@swan` does not exist in this worktree; `packages/swan-schemas/` (source) does;
commit `2acd891fa` ("feat(support): one validation contract, both ends — @swan/schemas (EX-5)") added
the `file:` dependency plus a `postinstall` that installs it. `supportIssueRoutes.mjs:12` imports it,
and the failing tests (`supportIssueSharedSchema`, `supportIssueIdempotencyContract`, plus the
transitive loader) die on resolution before any assertion. **Pre-existing environment gap, not caused
by R1–R15** — the handoff's attribution stands. A `npm --prefix ../packages/swan-schemas ci` +
`npm install` in `backend/` would likely clear it; that installs packages and was out of scope for a
no-commit review pass.

## StrictMode flake — not reproduced; mechanism analysis

Three consecutive combined runs (`BootcampBuilder + hooks + planner`, `--pool forks --maxWorkers 1`)
on this machine: attempt 1 green 946/946; attempts 2–3 green except a failure **my own R20 edit
caused** (see below) — the StrictMode test itself never failed. Static analysis of the current code
supports the lane F result: with the `lastPlanRef` guard plus per-test fresh `plan()` objects, a
paused checkpoint cannot be visible to the StrictMode test (the initializer runs before any effect
writes one, and the restore effect bails on identical identities). The round-2 failure most plausibly
executed against an intermediate R12 state or a stale module registry. Recorded as **unresolved-
but-not-reproduced**, downgraded from "determinism defect" to "not reproducible in 6 total combined
runs across two sessions".

## Repairs landed in this round (R16–R21)

- **R16 (P2, C9)** — `backend/controllers/adminClientController.mjs:1619`: clamp+coerce
  `exerciseCount` to a safe integer 1–20 with the exact pattern the trainer route uses
  (`parseInt(x,10) || 6`, clamped), pass `safeExerciseCount` to `generateWorkout`. The allocator's
  strict-throw contract is untouched; the unvalidated boundary was the defect. *No RED test: the
  controller has no existing unit/API harness and standing one up requires mocking `ensureModels`,
  `User`, and the lazy service import — a fixture larger than the fix; the clamp expression is the
  already-proven route pattern, and `workoutBuilderAllocation.test.mjs` pins the allocator side.*
- **R17 (hardening, C5)** — `frontend/src/components/BootcampBuilder/useBootcampRunner.ts`: the
  checkpoint effect no longer depends on `state`. A no-deps `stateRef` effect carries freshness to
  the cleanup, so the paused snapshot is written only at the two moments it is read again (stage exit
  via unmount, plan change) instead of ~10×/second on every rAF tick; the parent-identity contract is
  now documented at the top of the hook. Restore semantics, StrictMode behavior, and the
  pause-on-exit contract are unchanged — all 212 BootcampBuilder tests pass.
- **R18 (gap, C4)** — new `plannerLogic/planDataKnown.ts` exports `derivePlanDataKnown`;
  `WorkoutPlannerCommandPanelV2.tsx` imports it, and the lifecycle test now exercises the **same**
  imported predicate instead of its drifted-prone local copy. One source of truth; tsc pins the shape.
- **R19 (gap, C11)** — `tmp/rolodex-audit-evidence/server-red/bootcamp-template-postgres.red.integration.test.mjs`:
  two new real-PostgreSQL cases — an admin may reuse another trainer's **active** equipment profile
  (persists, id round-trips), and an **archived** profile is refused even for an admin (zero rows).
  Server RED: 4 files / 25 tests, both configs.
- **R20 (attempted, REVERTED)** — the `type-check` heap bump 8192→16384 in `frontend/package.json`
  tripped `plannerIaV2.rolodex.test.ts:67` ("adds zero new dependencies (package.json untracked-diff
  = 0)"), which deliberately fails on ANY package.json drift in this worktree. I reverted the bump
  rather than relax a guard test to admit my convenience fix. TRAP 3 stands as documented: operators
  must run tsc with `--max-old-space-size=16384` until a slice explicitly authorized to touch
  package.json changes the pin.
- **R21 (strengthening, C10 + lane E P2)** — `BootcampSprintAuthPipeline.truth.test.ts` now also
  pins the H04 body (`expectedGenerationVersion, operationId: crypto.randomUUID()`); the reconnect
  GET in `useSprintAPI.ts` sends `cache: 'no-store'`.

Sibling sweeps for the repairs: no other inline copy of the plan-data predicate exists (grep
`savedPlansClientId ===` — only the shared helper); `exerciseCount` has exactly two entry points into
`generateWorkout` (route: clamped before this round; admin controller: clamped now); the third
`recoveryOverride` site never reaches the allocator. No probe files were created; scratch logs live
outside the repo at `C:/tmp/rolodex-review-20260913/`.

## Verification after this round's repairs (all isolated, per TRAP 4)

| Scope | Result |
|---|---|
| Planner | 87 files / 457 tests passed |
| BootcampBuilder | 39 files / 212 tests passed |
| Hooks + SprintPlanner | 63 files / 277 tests passed |
| `tsc --noEmit` at 16384 MB | exit 0, 0 errors |
| Backend 14-suite repair group | 14 files / 76 tests passed |
| Server RED (tmp config) | 4 files / **25** tests passed |
| Server RED (packet config) | 4 files / **25** tests passed |
| esbuild parse of `useSprintAPI.ts` (post-edit) | PARSE OK |
| Combined 3-scope run ×3 (flake probe) | 946/946, then 945/946 ×2 — the only failure was R20's package.json contract, since reverted and re-verified green above |

## Readiness gate + handoff question

The decision NOT to regenerate the stale hashes in `audit-readiness.json` was correct and is
maintained: refreshing them would green the gate without changing a fact. `structurallyReady: false`
on "Open or unspecified blockers" remains the honest verdict for this packet.

## Label

**HOSTILE REVIEW COMPLETE: 12/12 claims adjudicated — 1 REAL DEFECT found and repaired (C9), 2
confirmed weaknesses hardened (C4, C11), 1 latent hazard narrowed and documented (C5), 8 claims held
under attack. Six prior verification-table rows reproduced exactly before any edit; full battery green
after repairs. NOT DRY (F04, the severe-pain generation gate, and the type-check heap pin remain open
by design), NOT DEPLOYED, no commit, no push, no migration, no paid provider call.**

## Next slice

The highest-value next move is **F04's own slice**: write the failing acceptance test for a deload
week first (a week flagged `isDeloadWeek` with `intensityModifier: 0.7` must generate reduced volume),
then restore the reader that folds `intensityModifier`/`progressionStrategy` into generated work
durations — precisely as receipt `19` scoped it. The severe-pain 422 gate stays untouched pending
Sean's product decision on H07.
