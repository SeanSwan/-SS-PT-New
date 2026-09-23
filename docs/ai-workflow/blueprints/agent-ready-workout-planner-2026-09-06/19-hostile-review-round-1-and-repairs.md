# Hostile review round 1 and repairs

Continuation date: 2026-09-14
Canonical worktree: `tmp/worktrees/rolodex-bootcamp-planner-20260913`
Branch: `codex/rolodex-bootcamp-planner-20260913`
Base: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`
Supersedes the review-status rows in `17` and `18`; the original audit `12`–`16` is preserved, not rewritten.

## Why this round exists

`18-luna-astra-successor-handoff.md` recorded that the Astra hostile-review runner was
interrupted without a final report, and that the packet therefore claimed no
certification and no dry status. This round performs that missing review against the
exact tested source state, then repairs what it found.

## Method

Four independent adversarial reviewers ran in parallel with non-overlapping scopes
(backend Bootcamp/Sprint; frontend Planner; Runner/Search/PDF; test integrity and
falsifiability). Each was instructed to produce file:line evidence, to separate REAL
defect from SUSPECTED, to run the suites itself, and to edit no application source —
reports only. Every accepted finding below was then re-verified by the parent against
the source before any repair, because subagent output is a hypothesis, not a root cause.

Lane reports (unmodified, as written by each reviewer):

- `tmp/rolodex-audit-evidence/hostile-round1/A-backend-bootcamp-sprint.md`
- `tmp/rolodex-audit-evidence/hostile-round1/B-planner-frontend.md`
- `tmp/rolodex-audit-evidence/hostile-round1/C-runner-search-pdf.md`
- `tmp/rolodex-audit-evidence/hostile-round1/D-test-integrity-traceability.md`

## Repairs made in this continuation

### R1 — Production build break (P1, found independently by lanes A, B and C)

`frontend/src/hooks/useSprintAPI.ts:273` read
`if (terminal || cancelled) { await reader.cancel(); break; }` inside the `reconnect`
arrow. `reader` is scoped to `readStream` and `break` sat outside any loop, so the module
could not be parsed at all. Proven by transforming the file with the project's own
esbuild: `ERROR: Cannot use "break" here`. `vite build` therefore failed and the
`/sprint-planner` lazy chunk could not load, which also made the H15 repair dead code.
Repaired to abort the request that owns this scope (`controller.abort()`, a no-op once
the fetch settled). esbuild now reports OK for the file.

### R2 — Load-plan crashed on the default-mounted surface (P1, parent-found)

`useWorkoutPlannerOrchestration.ts` called `useWorkoutPlannerLoadPlanActions({...})`
without `setLoadedPlanRevision`, while `useWorkoutPlannerLoadPlanActions.ts:94`
dereferences it unconditionally. `WorkoutPlannerProvider.tsx:72` mounts that
orchestration, so loading a saved plan threw
`TypeError: setLoadedPlanRevision is not a function`. It survived review because ten
`*.extraction.test.ts` files only `readFileSync` the orchestration source. The prop is
now passed.

### R3 — Save-action revision typing (P2, parent-found)

`useWorkoutPlannerSaveActions.ts:172` narrowed `planRevision` with
`Number.isSafeInteger`, which TypeScript does not treat as a type guard (`TS18048` /
`TS2345`). Runtime behaviour was already correct; the explicit `typeof === 'number'`
check restores the type gate.

### R4 — H22 unknown plan data reported as "no plan" (P1, lane B; requirement was claimed closed)

`plannerLogic/resolveNextBestAction.ts` returned `missing_plan` for any roster client
when `plans` was empty. An empty list is ambiguous — it means either "no plans" or "the
plan request has not resolved". Receipt `17` recorded H22 as implemented with focused
tests passing; the file was unmodified from base and its only test pinned the defect.
Two corrections: the resolver now takes a **required** `planDataKnown` input (required
rather than defaulted, so a new call site cannot silently reintroduce the misreport),
and `WorkoutPlannerCommandPanelV2.tsx` derives it as
`selectedClientId !== null && savedPlansClientId === selectedClientId && !savedPlansLoading`.
Two regression tests added, including a control proving a genuinely empty known list
still reports `missing_plan`.

**Scope correction (Rule 27/28).** `WorkoutPlannerCommandPanelV2` is the only consumer
of this resolver and is gated by `iaV2 = isPlannerIaV2Enabled() && plannerV2Enabled`,
true only when `VITE_ENABLE_PLANNER_IA_V2 === 'true'`. The panel **ships dark**, so H22
had no mounted implementation at all: the claim in `17` is unsupported on the default
tree and the defect is latent-until-flag-flip, not live. The requirement is now met in
code and tested, but until the flag is enabled the only mounted advice surface is the
V1 panel, which does not implement H22.

### R5 — H23 leaving the Run stage fast-forwarded the class (P1, lane C)

`useBootcampRunner.ts` checkpointed the live state unchanged on stage exit, so a runner
that was `running` was restored as `running` with its original absolute `segmentEndsAt`.
`advanceRunnerState` drains every segment whose deadline has passed
(`while (nowMs >= segmentEndsAt)`), so all wall-clock time spent on another stage was
consumed as class time and the coach could return to a later segment or to `DONE`.
The checkpoint is now reconciled and paused at the moment of exit, which satisfies the
contract's "leaving Run pauses the run at the exact command time". Two hook-level
regression tests added; the pre-fix behaviour would report `complete` after the
one-hour absence those tests simulate.

### R6 — H23 skip/restart silently un-paused a paused class (P2, lane C)

`skipRunnerSegment` and `restartRunnerSegment` forced `status: 'running'`. Skip/restart
act on the command, not the play state, so a paused class started its clock again without
Resume. Both now preserve `paused` (with `segmentEndsAt: null`). Three logic tests added,
including a control that a genuinely running class still advances.

### R7 — H10 backup verdict could land under the wrong client (P1, lane B)

`WorkoutPlannerBackupPanel.tsx` cleared its verdict on client change but had no
request fence, so an in-flight verdict for client A could resolve after the switch and
render under client B. A request-sequence ref now invalidates stale responses and the
effect invalidates in-flight work before loading the new client.

### R8 — Profile authority broke the intentional admin bypass, and hid 403 as 500 (P2, lane A)

`bootcampCrud.mjs` scoped the profile lookup to `where: { id, trainerId }` with
`trainerId = req.user.id`. The repository already grants admins a cross-owner bypass on
the generate path — `bootcampGenerator.mjs:49-59` `assertProfileAccess()` and the
asserted invariant in `backend/tests/api/bootcampGenerateProfileIdor.test.mjs:4-5`
("Admins retain the intentional cross-owner bypass") — so an admin's generate → save
round trip failed on a profile generate had just accepted. The lookup is now by id with
ownership decided in JS using the same rule, and `bootcampRoutes.mjs` forwards
`req.user.role` and preserves the service's `statusCode` instead of collapsing every
failure to HTTP 500.

### R9 — H02 profile provenance was never persisted (P1, lane A)

`bootcampGenerator.mjs` did not include `equipmentProfileId`/`spaceProfileId` in its
return value, and `GeneratedBootcamp` did not declare them. `bootcampCrud.mjs:189`
therefore short-circuited on a null id and lines 235-236 always wrote `NULL`, so the new
authority check could never run on the real generate → save path and H02's "profile data
survives reload" failed. The generator now echoes both, and the client type declares
them. This also invalidated the earlier fixture-based confidence: the fixtures supplied
those fields by hand, so they passed while production could not.

### R10 — RED fixture modernization, isolation and portable-path repair

- `bootcamp-template-save.red.test.mjs` and `bootcamp-template-postgres.red.integration.test.mjs`
  predated the profile-authority control and mocked `models/index.mjs` without
  `getEquipmentProfile`, so the suite died on a missing-mock error rather than on its
  assertions. Both now expose the real accessors, and the PostgreSQL fixture gained real
  `audit_equipment_profiles` / `audit_space_profiles` tables so the control is exercised
  against real PostgreSQL. New cases prove fail-closed behaviour: a foreign trainer's
  equipment profile, an archived profile, a foreign space profile and a non-existent id
  each leave ZERO rows; an owned active profile persists; an admin may reuse a foreign
  profile; an archived profile is refused even for an admin.
- `bootcamp-template-read.red.test.mjs` did not mock `backend/database.mjs`, so it loaded
  real `.env` configuration and printed live `swanstudios` connection parameters. The
  module edge is now stubbed, which makes the packet's "no database was used" claim true
  for this fixture. It was one lazy call away from the real dev database.
- `evidence/hostile-20260913/server-red/vitest.config.mjs` hard-coded
  `../../../backend`, which resolves inside the preserved packet and does not exist, so
  the suite could not start from its preserved location. It now locates the repository
  root by walking up to `backend/package.json` + `frontend/package.json` and runs the
  canonical fixtures. Two Windows-specific traps were fixed while doing so: `include`
  globs must use forward slashes (backslashes are treated as escapes and the runner hung
  with no output), and the vitest import must be resolved from the discovered root.

### R11 — Pre-existing repo test broken by the change (found by the parent)

`frontend/src/hooks/BootcampSprintAuthPipeline.truth.test.ts:69` asserted the
no-argument form `apiService.post(\`.../regenerate\`)`. At base that call took no body;
this change added the H04-required `{ expectedGenerationVersion, operationId }`, so the
assertion failed. The change is correct and required (stable operation identity across
retries); the assertion was stale. It now asserts the call still routes through
`apiService` (the contract the line protects) without pinning the argument list. Note
that this test is **outside every suite the packet ran**, which is why the packet's own
evidence never saw it.

### R12 — R5's own repair broke a fresh run under StrictMode (P1, self-caught)

R5 pauses the runner from the checkpoint effect's cleanup. React StrictMode —
enabled at `frontend/src/main.jsx:79` — replays every effect as
mount → cleanup → mount, so the cleanup wrote a PAUSED snapshot and the existing
restore effect immediately read it back: a brand-new run opened as PAUSED. Neither
of R5's first two tests caught this because neither wrapped the hook in StrictMode.

The restore effect now runs only when the plan identity genuinely changes, leaving
the `useState` initializer to own the first mount. A third test renders the hook
under `StrictMode` and asserts a fresh run is `running`; that test fails against the
R5-only version.

This is recorded rather than quietly fixed because it is the clearest available
example of the review loop working: the fix for one P1 introduced another, and only
re-testing the repaired state in the real wrapper environment exposed it.

### R13 — Interrupted sprint generation deadlocked every mutation (P1, lane A; parent-verified)

`assertSprintIdle` rejected any sprint with `status === 'generating'`
unconditionally, never consulting the claim's `expiresAt`, while `claimSprint`
correctly honoured it. Once a runner died without releasing its claim,
`updateSprint`, `updateWeek`, `updateSlot`, `confirm` and `archive` threw 409
forever even though a new generation could have reclaimed the same expired claim.

The two paths now share one predicate, `sprintClaimIsLive(sprint, nowMs)`, so a
claim blocks only while its lease is unexpired. A `generating` row whose claim
metadata is missing or unparseable is also treated as dead, because
`withSprintClaim` can never match such a row — refusing every mutation would be an
unrecoverable deadlock with no legitimate owner.

`nowMs` defaults to the process clock instead of threading the DB clock through
all five call sites: at a 120-second lease a sub-second skew is immaterial, whereas
a call site that silently passed `undefined` would make the comparison fail open
and admit a *live* claim's competitor. Six regression tests added in
`backend/tests/unit/sprintGenerationClaimLease.test.mjs`, covering expired, exactly
expired, live, missing-metadata, archived and non-generating states.

### R14 — Round-2 fresh-angle repairs (P2s, lane F; parent-verified)

- **H11 zero-rest / zero-intensity corruption.** `useWorkoutPlannerRolodexState.tsx`
  built the appended exercise with `parseInt(restStr) || 60` and
  `parseInt(phase.intensity.split('-')[0]) || 70`. A prescribed rest of `0` and an
  intensity of `0` are legitimate, and `||` treated both as "missing": a 0s rest became a
  full minute and a 0% intensity became 70%. Both now fall back only on a non-numeric
  reading (`Number.isFinite`), so the zero survives — the same defect class H11 exists to
  close. Radix `10` added to all three `parseInt` calls in that block.
- **`applyVolumeDeloadPrescription(null)` threw.** `workoutPrescriptionDeload.mjs:87` used
  a default parameter, which covers `undefined` but not an explicit `null`, so the
  deload-week caller at `workoutBuilderService.mjs:1322` could throw
  "Cannot read properties of null". Now guarded with `Array.isArray`.
- **`distributeExerciseCount` silently erased every movement family.**
  `Number.isSafeInteger('6')` is false, so a numeric string from a form or route produced
  `total = 0` → `[]` → no families allocated, with no error. Numeric strings are now
  coerced and any other non-integer throws instead of quietly emptying the plan.
- **Claim lease judged against the right clock.** Following lane F's F-08, the five
  `assertSprintIdle` call sites now pass the DB `now` they already receive from
  `withLockedSprint`. The process-clock default is retained deliberately: a call site that
  forgot to thread it would otherwise compare against `undefined`, which is false for
  every lease and would silently admit a competitor to a **live** claim.

### R15 — R4 was incomplete: H22 was still open across the hook boundary (P1, round 2 lane E)

Round 2 falsified R4 and it held up: `fetchSavedPlans` sets `savedPlansClientId` in a
`finally` block, so a **rejected** GET (or a 2xx `success: false` payload) leaves
`savedPlansClientId === selectedClientId` with `savedPlans: []` and no error signal. R4's
predicate therefore evaluated true and the chip still reported "no active plan" for a
client whose plans had not loaded. R4's tests could not catch this because they
hand-passed `planDataKnown: false` into the pure resolver and never crossed the hook.

`useWorkoutPlannerSavedPlansState` now exposes `savedPlansError` (set on rejection and on
a 2xx failure payload, cleared on success and at the start of each fetch), and the caller
requires `!savedPlansError`. Four hook-level regression tests were added to
`useWorkoutPlannerSavedPlansState.lifecycle.test.tsx` that evaluate the caller's real
predicate against real hook state — rejected load, 2xx failure payload, successful empty
list, and pre-settle — which is the boundary the original tests missed.

## Verification after repair

| Boundary | Command | Result |
|---|---|---|
| Planner | `vitest run src/components/DashBoard/Pages/admin-workout-planner` | 87 files / **457** tests passed |
| Bootcamp / Coach / Picker | `vitest run src/components/BootcampBuilder src/components/CoachDock/BootcampVoiceProposalTray.test.tsx src/components/Shared/SwanExercisePicker` | 45 files / **242** tests passed |
| BootcampBuilder alone | `vitest run src/components/BootcampBuilder` | 39 files / **212** tests passed |
| Sprint + hooks | `vitest run src/hooks src/components/SprintPlanner` | 63 files / **277** tests passed |
| Backend repair group | 13 named unit suites | 13 files / **70** tests passed |
| Backend `tests/unit` (whole directory) | `vitest run tests/unit` | 617 files passed / 3 failed; **5462** tests passed, 1 failed, 6 skipped. The 3 file failures are PRE-EXISTING and unrelated: `Cannot find package '@swan/schemas'` (`backend/package.json` → `file:../packages/swan-schemas`, added by `2acd891fa`). The packet's backend rows are therefore slice-clean, not baseline-clean. |
| Server RED (synthetic + real PostgreSQL) | `--config tmp/rolodex-audit-evidence/server-red/vitest.config.mjs` | 4 files / **23** tests passed |
| Server RED from the preserved packet | `--config docs/.../server-red/vitest.config.mjs` | 4 files / **23** tests passed |
| esbuild parse of `useSprintAPI.ts` | project esbuild `transformSync` | OK (was `Cannot use "break" here`) |
| Frontend type-check | `tsc --noEmit --max-old-space-size=16384` | **exit 0, 0 errors** (previously BLOCKED by heap at 8192 MB) |
| `git diff --check` | — | exit 0; only LF/CRLF normalization warnings |

The type-check result is the one that changes the packet's own record. Receipt `17`
recorded it as BLOCKED because the process exhausted an 8 GB heap before finishing; at
16 GB it completes, and doing so exposed the five real type errors fixed in R2 and R3.
"Type-check does not run" was masking "the change does not type-check". The heap figure
is a machine-dependent workaround, not a fix for the underlying graph size, and the
repo's own `type-check` script still pins 8192 MB and will still fail.

## Readiness gate

The installed skill's integrity gate was run against both machine-readable receipts:

```
node <skill>/scripts/check-readiness.mjs <packet>/readiness.json        -> structurallyReady: false, exit 1
node <skill>/scripts/check-readiness.mjs <packet>/audit-readiness.json  -> structurallyReady: false, exit 1
```

`audit-readiness.json` fails first and most importantly on **"Open or unspecified
blockers"**, which is the correct verdict for this packet and agrees with the label
below. Both also report stale reference hashes (`README.md`, `11-build-workflow.md`,
`15-audit-findings-and-fix-register.md`, `16-approved-luna-build-and-blueprint-audit.md`)
because those documents were edited during the Luna continuation after the JSON was
written. Those hashes have deliberately **not** been regenerated: refreshing them would
make the gate green without changing a single underlying fact, which is exactly the
manufactured-readiness failure the gate exists to catch.

## Findings confirmed but NOT repaired in this round

These were verified as real and remain open. They are listed so the packet is not read as
dry; each names the lane report holding the detail.

Backend (lane A): **H20 Sprint progression modifiers deleted rather than converted
(F04 — parent-verified).** Base `sprintGenerator.mjs` read them:

```
const progressionFn = PROGRESSION[sprint.progressionStrategy] || PROGRESSION.linear;
: (week.intensityModifier || progressionFn(week.weekNumber, sprint.durationWeeks));
```

In the working tree a repo-wide grep of `backend/**/*.mjs` finds `intensityModifier`
only in the model definition and in `sprintService.mjs` (write, echo, validate) and
`progressionStrategy` only in the model, the create/update allowlists and validation —
**neither has any reader on the generation path**. The columns are still persisted and
range-checked, so a coach flagging `isDeloadWeek` stores `intensityModifier: 0.7` that
nothing consumes: the week generates full volume with no warning. This is a
training-correctness regression against base and was left unrepaired deliberately — see
"Deliberately not repaired" below.

Also open: SSE 200 headers are written before `claimSprint`, collapsing the
contract's 428/409/400/422 into one opaque frame, and the stream route has no
restart-safe reconnect path (F06); the H19 rotation history keeps the last 7 exercise
keys rather than 7 sessions (F07). The interrupted-generation deadlock (F05) was
confirmed and is **fixed** — see R13.

Frontend Planner (lane B): H10 fences are still missing on the Coach add path
(`useWorkoutPlannerAiEvents.ts`) and `usePlannerAsyncScope` is wired into only 2 of ~9
async paths; a successful generation clears and replaces the draft with no shared
replace-draft lane and no "Replace/Keep current" confirmation; dirty-signature holes mean
some persisted edits are unsaveable and lost on navigate; the load path invents revision
`1`; blend picks reset on every saved-plans refresh.

Runner / search / PDF (lane C): H24 capability results are discarded and a missing
`requestFullscreen` reports success; the worker and synchronous fallback scorers disagree
(probe-proven); Sprint cards/slots are `role="button"` divs rather than native buttons and
day/focus toggles lack `aria-pressed`; the slot dialog steals focus on every parent
re-render; new 36px and unstyled retry targets violate the 44px rule.

Test integrity (lane D): H05, H06, H15 and H17 have no test that exercises real
behaviour; H02, H13 and H18 were mock-only (H02 now strengthened by R9 and the new
PostgreSQL cases); 112 of the 451 Planner tests (24.8%) never render and only grep source
text, so they cannot fail for a behavioural regression — a `*.extraction.test.ts` family
of this kind is precisely what hid R2. Lane D's false-confidence index was 55/100.

## Round 2 — falsification of the repairs, and fresh angles

Two further lanes ran against the repaired state. Lane E attacked each repair directly;
lane F hunted untouched files. Their reports:

- `tmp/rolodex-audit-evidence/hostile-round2/E-falsify-repairs.md`
- `tmp/rolodex-audit-evidence/hostile-round2/F-fresh-angles.md`

**Lane E could not falsify R2, R3, R6, R7, R8, R9, R10 or R11.** It reproduced the
real-PostgreSQL RED suite at 4 files / 23 tests green, confirmed `req.user.role` comes
from the DB row rather than a JWT claim (no forging path for the admin bypass), confirmed
the 403/404 bodies are constant strings (no profile-id enumeration oracle), and confirmed
the shared `loadedPlanRevision` setter is genuinely one owner.

**Lane E falsified R4** — fixed as R15 above. It also raised:

- **P1, deliberately unrepaired — `bootcampGenerator.mjs:765`.** Generation throws
  `422 BOOTCAMP_PAIN_REVIEW_REQUIRED` when any pain alert has `severity >= 7` with an
  unmapped region or flagged exercises. Because `applyPainAwareGating` reads the
  trainer's whole active roster, one client's severe pain blocks **every** class that
  trainer generates — including the path where gating already swapped the exercise to a
  joint-friendly alternative. This is a fail-closed safety gate whose intended strength
  cannot be settled from the register (H07 says "reveal unknown severe-pain mappings",
  which reads as surfacing rather than blocking). Narrowing a pain gate unilaterally is
  the wrong call for a review pass, so it is recorded, not changed. It also has no
  `tests/unit` coverage: the only route-level generate test stubs the gate and lives in
  `tests/api`, outside every suite this packet ran.
- **P2 — the new StrictMode test is not deterministic under load.** Run as part of
  `BootcampBuilder + hooks + planner` it failed (`expected 'paused' to be 'running'`); run
  against `src/components/BootcampBuilder` alone the same file passes, and lane F
  reproduced 216/216 green in isolation. The underlying restore path is therefore
  order-sensitive in a way neither R5 nor R12 fully explains. This is recorded as an open
  determinism defect, not a closed one.
- **P2 — reconnect GET lacks `cache: 'no-store'`**, so a cached 404 could be replayed as
  `Reconnect failed (404)` now that reconnect is the primary recovery path. Suspected;
  no caching intermediary was available to execute it.
- **P3s** — the R1 `controller.abort()` is a no-op on an already-settled fetch (harmless
  only because the server ends the stream); `getRunnerProjectedEndsAt` inflates the
  projected-end badge each tick while on schedule; `releaseAcquiredWakeLock` has zero
  production callers; R8 checks profile legitimacy rather than provenance; activating a
  loaded plan no longer refreshes the saved snapshot; `restoreRunnerState` is keyed on
  object identity; the real-PostgreSQL fixture has no admin case; and the backend
  `tests/unit` baseline is not green, so the packet's backend rows are slice-clean only.

**Lane F (0 P1, 7 P2, 3 P3)** produced R14 and left these open: `equipmentRequirementV1`
in `shared/exercise-equipment.mjs` — the strict versioned anyOf/allOf fail-closed contract
— has **zero producers repo-wide**, so the strict half of H08 is unreachable while the
register calls H07–H09 "IMPLEMENTED / parent-validated" on tests that are green over a
shape no caller builds. Also open: `encodeIntensityPrescription` is not a fixed point
(save can rewrite "RPE 8" as "80% 1RM"), a numeric/string type flip in the deload reducer,
and `usePlannerAsyncScope` creating a ref **per call site** so only 2 of ~9 async paths
are fenced and those two cannot see each other. Lane F also found the three backend
`tests/unit` failures and correctly attributed them to a pre-existing
`@swan/schemas` resolution gap (`backend/package.json` → `file:../packages/swan-schemas`,
added by `2acd891fa`), not to this change.

Two confirmed defects were left unrepaired on purpose, and neither is an oversight.

**F04 — Sprint progression.** Restoring the progression contract means re-deriving how
`intensityModifier` and `progressionStrategy` fold into generated work durations across
formats, rounds and station rotations — a prescription-semantics change whose blast
radius is the whole Sprint generator. Attempting it at the end of a review pass, without
a written contract for the intended arithmetic and without the RED test that would pin
it, would trade a known, precisely-described defect for an unknown one. It needs its own
slice: write the failing acceptance test for a deload week first, then restore the reader.

**The `bootcampGenerator.mjs:765` pain gate.** This is the opposite call from F04: the
code is arguably behaving as designed, and the question is whether the design is right.
It is a fail-closed safety gate over severe pain, and the only honest options are to keep
it or to have the product owner narrow it. Weakening a pain gate during a hostile-review
pass, on a requirement (H07) whose text can be read either way, is not a decision the
reviewer should make alone — a wrong guess here ships unsafe training prescriptions.

## Label

**IMPLEMENTATION VERIFIED at the boundaries listed above, with fifteen repairs landed on
top of the Luna/Astra work, reviewed over two hostile rounds by six independent lanes.
NOT DRY: a high-priority finding remains open (the severe-pain generation gate, which
needs a product decision), the new StrictMode test is not deterministic under combined
load, and the unrepaired items above are listed rather than hidden. NOT DEPLOYED. No
commit, push, migration, deployment, reset or paid provider call was made in this
continuation.**

Why this is not called dry, stated plainly: the packet's own definition requires that no
unresolved high-priority finding remains in the approved scope. Two independent reviewers
were asked to falsify the repairs, and one of them succeeded — R4 did not actually close
H22 until R15. A packet that has already been shown to contain an incomplete repair, and
that still holds one unrepaired P1 and one unresolved determinism defect, is not dry.
What did materially change: the change now builds, type-checks at zero errors, and its
backend authorization is proven fail-closed against real PostgreSQL rather than mocks.

