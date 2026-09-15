# Frontend remaining-boundary hostile audit

Date: 2026-09-13 local artifact date. Reviewer: Astra frontend audit subagent. Status: **SOURCE AUDIT COMPLETE; IMPLEMENTATION/REGRESSION TESTS NOT RUN BY THIS SUBAGENT.**

## Baseline and authority

This supplement extends [the primary frontend audit](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/tmp/rolodex-audit-evidence/frontend-audit.md). It does not replace or repeat F1–F11. Artifact-only writing was explicitly authorized; no application files were changed.

The primary inspection used the existing read-only worktree at C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/store-upgrade-20260913. This remaining-boundary inspection used the dedicated repair lane C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913 and verified HEAD with git rev-parse HEAD: **c0cbe538d8ed2ca519bb494cdf3282bf43b76699**. Source links below refer to that dedicated lane. These are current-main findings; old f8815a0b1 evidence is not used to assert current behavior.

The parent reported **627 frontend tests passing across 124 files** on this baseline. That is parent-owned test evidence, not a suite rerun by this subagent. Existing test source was inspected where identified below. No browser, DB, network/provider call, package installation, full application launch, or application mutation was performed in this supplement.

## Priority summary

| ID | Priority | Current mounted defect | Repair boundary |
| --- | --- | --- | --- |
| B1 | P1 | Blend converts real UUID plan IDs to numbers, so valid plans cannot be blended | Preserve opaque ID strings across frontend/API |
| B2 | P1 | Context chip invents other clients' missing-plan status from selected-client-only data and can switch the editor to them | Scope advice to known client data |
| B3 | P1 | Leaving and returning to Run restarts the class; any new bootcamp object also resets the timer | Stable run session ownership above presentation |
| B4 | P2 | Pause after overdue frame deadlines records the wrong segment and replays elapsed work on resume | Reconcile absolute time before commands |
| B5 | P2 | Wake-lock acquisition can finish after cleanup and leak; capability failures are silent | Run-generation ownership and truthful capabilities |
| B6 | P2 | Generated-plan rearrange/Undo can overwrite a same-batch edit | Atomic state/version guard inside updater |

Prior F1 has additional independent consumers in backup and Coach events. They are documented as coverage extensions, not new root findings.

## B1 — P1 — Blend serializes UUID plan IDs as integers

**Evidence:** `WorkoutPlannerBlendDialog.tsx:218` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.tsx:218` — not committed; machine-local evidence) and line 219 apply parseInt to planAId/planBId. The authoritative `normalizer:13` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/services/workoutPlanRouteHelpers.mjs:13` — not committed; machine-local evidence) accepts only UUID strings. The mounted `blend route:385` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/workoutPlanRoutes.mjs:385` — not committed; machine-local evidence) rejects either invalid ID before access middleware or the service runs. WorkoutPlan IDs are UUIDs in `the model:49` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/WorkoutPlan.mjs:49` — not committed; machine-local evidence).

**Failure:** A valid UUID starting with a digit becomes a truncated integer; one starting with a letter becomes NaN and serializes as null. Both are rejected with 400. This is a deterministic frontend/backend contract mismatch, not a backend availability condition.

**Coverage blind spot:** `WorkoutPlannerBlendDialog.test.tsx:23` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.test.tsx:23` — not committed; machine-local evidence) uses fake IDs '11' and '22', then `line 68` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.test.tsx:68` — not committed; machine-local evidence) explicitly expects numeric IDs. The existing green component test encodes the defect. The backend UUID contract test already rejects numeric-looking IDs.

**Repair contract:** Treat plan IDs as opaque UUID strings in saved-plan summaries, selects, blend bodies, callback results and backup references. Preserve selected UUIDs verbatim, or apply the same deliberate string normalization as the server. Do not coerce IDs to numbers to satisfy old mocks. Keep server ownership/distinct-source validation.

**Acceptance tests:**

- B1-T1: Two distinct valid UUID fixtures, one beginning with a letter and one with a digit; submit sends exact string values and the full per-week pick list.
- B1-T2: Exercise the frontend body against the pure backend normalizer or shared contract fixture. Both IDs remain valid; numeric, missing and same-ID sources are rejected before mutation.
- B1-T3: Changing client or closing/reopening the modal during a pending blend must not let the old callback close a new modal, reload another client's plans or erase another draft. This extends F1 epoch coverage.
- B1-T4: Rejected blend retains choices and title and makes retry possible; successful blend refreshes only its originating client context.

## B2 — P1 — Context advice makes a false cross-client claim

**Evidence:** `WorkoutPlannerCommandPanelV2.tsx:132` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanelV2.tsx:132` — not committed; machine-local evidence) supplies the entire clients roster to the next-action resolver whenever any client is selected. Lines 135–138 map the selected client's saved plans to that selectedClientId. `resolveNextBestAction.ts:18` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerLogic/resolveNextBestAction.ts:18` — not committed; machine-local evidence) then finds the first roster client without an active plan in that incomplete list. `resolveNbaPresentation.ts:35` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerLogic/resolveNbaPresentation.ts:35` — not committed; machine-local evidence) turns absence into the claim that those initials have no active plan. `The chip action:149` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanelV2.tsx:149` — not committed; machine-local evidence) changes the selected client and can also change scope to multi-week.

**Failure:** With client B selected and B's plans loaded, earlier roster client A appears to have no plan even though A's plans were not loaded. The adjacent client picker and advice name different people. Clicking the advice silently retargets editing to A. A selected client's failed/loading plan list also cannot establish that they have no active plan.

The parent reported a read-only live screenshot with exactly this picker/chip disagreement. This subagent did not inspect that screenshot independently. The source establishes the mismatch independently. The global sidebar selector is not read by this resolver; blaming stale global selector state is rejected for this specific chip.

**Repair contract:** In the current selected-client workflow, pass only the selected client's roster entry and its correctly scoped, successfully loaded plan list. Unknown/loading/error is distinct from empty. Cross-roster advice requires independently complete roster plan data and an explicitly labeled switch-client action; do not infer absence from unqueried records. A context chip must not bypass the existing dirty-draft transition guard.

**Acceptance tests:**

- B2-T1: Roster A/B, B selected with active plan. The context chip never claims A has no plan and does not offer an A-targeting action.
- B2-T2: B selected with successfully loaded empty plans: chip names B, and its action preserves B.
- B2-T3: Loading, denied, failed and stale previous-client responses do not display a definitive missing-plan claim.
- B2-T4: If roster-wide recommendations remain in the product, click copy explicitly identifies the different client and the existing discard/keep-draft flow runs before switching.
- B2-T5: Component-level render tests cover the real command panel inputs. Pure resolver tests alone cannot detect this integration defect.

## B3 — P1 — Live class timer is owned by a replaceable view

**Mounted path:** `ClassPreviewPanel.tsx:76` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx:76` — not committed; machine-local evidence) returns BootcampDemoMode only in floorMode. `BootcampDemoMode.tsx:147` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoMode.tsx:147` — not committed; machine-local evidence) mounts BootcampRunnerClock; `BootcampRunnerClock.tsx:41` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampRunnerClock.tsx:41` — not committed; machine-local evidence) calls useBootcampRunner. `useBootcampWorkflowStage.ts:18` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampWorkflowStage.ts:18` — not committed; machine-local evidence) changes floorMode with stage.

**Evidence:** `useBootcampRunner.ts:18` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampRunner.ts:18` — not committed; machine-local evidence) derives segments from the entire bootcamp object, creates fresh local state on mount at line 19, and `lines 23–25` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampRunner.ts:23` — not committed; machine-local evidence) restart it whenever segments change. `createRunnerState:93` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampRunner.logic.ts:93` — not committed; machine-local evidence) always begins at segment zero and begins running. No mounted checkpoint/session owner intervenes.

**Failure:** Run → Preflight → Run loses elapsed progress and starts the class again. Replacing bootcamp with a new object, including a metadata-only edit that preserves the timeline, also restarts the running clock. Thus presentation navigation and data object identity determine class continuity. There is no explicit resume/restart decision at those boundaries.

The separate ConsoleView/AudienceView/checkpoint modules do not cure this: the no-test importer inventory below found them dormant. This finding does not authorize a broad audience-system rollout as a prerequisite to a focused repair.

**Repair contract:** Put one run-session owner above stage-specific presentation. Bind a frozen runnable snapshot to an explicit run ID/plan version; metadata updates must not recreate the timer. Define return-to-preflight semantics visibly: suspend or keep running, with Resume preserving that chosen state. Starting a different plan or restarting an active session must be deliberate. If refresh persistence is implemented, save/recover one validated checkpoint containing coherent plan snapshot, timing state, run identity and version. Checkpoint failure must not silently claim recovery exists.

**Acceptance tests:**

- B3-T1: Start a synthetic three-segment class, advance into segment two, switch Run → Preflight → Run. Segment, elapsed position and paused/running behavior follow the declared contract; they do not return to zero.
- B3-T2: Rerender with a new bootcamp object whose name/media changes but timeline identity is unchanged. Current deadline and segment remain intact.
- B3-T3: Editing the timeline while a run exists offers a deliberate next-run/restart transition; the current run uses its frozen snapshot.
- B3-T4: If persistence is in scope, remount from a valid checkpoint, reject mismatched/corrupt/missing snapshots, and test storage denial without an unhandled exception or false resume offer.
- B3-T5: Run ownership is proved through the mounted ClassPreviewPanel/clock composition, not only pure runner helpers.

**Existing coverage limit:** useBootcampWorkflowStage.test.tsx checks acquisition, floorMode and release on unmount. Its `return-to-Preflight test:38` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampWorkflowStage.test.tsx:38` — not committed; machine-local evidence) never mounts a clock or re-enters Run. Pure runner tests cannot demonstrate continuity across view mounts.

## B4 — P2 — Pause can freeze an expired segment instead of the current segment

**Evidence:** `useBootcampRunner.ts:41` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampRunner.ts:41` — not committed; machine-local evidence) directly calls pauseRunnerState with current stored state. `pauseRunnerState:140` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampRunner.logic.ts:140` — not committed; machine-local evidence) clamps remaining time to zero but never advances segmentIndex. By contrast, `advanceRunnerState:108` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampRunner.logic.ts:108` — not committed; machine-local evidence) correctly reconciles multiple overdue deadlines.

**Concrete source-level reproduction:** Three 1-second segments start at t=0. No animation-frame reconciliation occurs before Pause at t=2500. Pause records segment zero with 0ms, although segment two should have 500ms left. Resume at t=3000 sets segment zero's deadline to t=3000. The next advance moves only into segment one with a new deadline of t=4000, replaying elapsed intervals. This can occur at a missed foreground frame boundary or after background/throttled rendering.

**Repair contract:** Before pause, skip, restart or any timing mutation, reconcile the running state against one captured current time and the frozen segments. Then apply the command. Preserve intentional paused semantics for navigation controls and state the result in their labels. Do not make elapsed-time correctness depend on a previous animation frame.

**Acceptance tests:**

- B4-T1: The synthetic timestamps above must pause segment two with 500ms remaining and resume it with deadline t=3500.
- B4-T2: Pause exactly on a segment boundary, after several boundaries and after full completion. No negative duration, replay, extra cue or resurrection of a completed class.
- B4-T3: Simulate a delayed RAF in the mounted hook; user commands reconcile independently of paints.
- B4-T4: Freeze clock display while paused, but projected finishing-time presentation must either update with wall time or state that it is paused. Current projected time is only recalculated on renders.

No dynamic reproduction was executed by this subagent; the calculation follows the inspected pure functions.

## B5 — P2 — Asynchronous capability ownership is not tied to Run lifetime

**Evidence:** `defaultWakeLock:45` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/bootcampRunAcquisition.ts:45` — not committed; machine-local evidence) assigns the global activeWakeLock only after awaiting navigator.wakeLock.request. `releaseBootcampWakeLock:132` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/bootcampRunAcquisition.ts:132` — not committed; machine-local evidence) releases only the sentinel currently assigned. `useBootcampWorkflowStage.ts:18` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampWorkflowStage.ts:18` — not committed; machine-local evidence) starts acquisition with void, then releases on leaving Run/unmount without awaiting or invalidating that acquisition. It discards the capability result and supplies no error callback.

**Failure:** Enter Run, leave or unmount before the wake-lock promise resolves, then let it resolve. Cleanup already saw null, so the late sentinel remains held by a stage that no longer owns it. Rapid reacquisition can overwrite the one global sentinel. The mounted code has no release-event/visibility reacquisition path, and capability denials never reach a run-status control. Fullscreen may be reported true when document exists but requestFullscreen is absent, because the default function resolves undefined and settleCapability treats it as success.

**Repair contract:** Associate acquisition with a run generation; any late resolution after cancellation immediately releases its own sentinel. A released/hidden session must reacquire only while the same run remains active, subject to browser support and gesture constraints. Track unsupported/denied/active capability states without blocking the timer for optional capabilities. Handle synchronous throws as well as rejected promises. Expose a compact truthful run-tools status and recovery action.

**Acceptance tests:**

- B5-T1: Deferred wake request resolves after stage exit/unmount: its sentinel is released exactly once and never becomes current.
- B5-T2: Two overlapping acquire requests resolve out of order; only the active generation retains its sentinel and all others release.
- B5-T3: Browser denial, missing API and synchronous throw remain visible as capability state while the timer stays usable.
- B5-T4: Release/visibility transitions reacquire only for the current run, and no listeners/locks survive final run termination.
- B5-T5: Mounted stage integration observes capability results. Existing `bootcampRunAcquisition.test.ts:30` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/bootcampRunAcquisition.test.ts:30` — not committed; machine-local evidence) only verifies an injected error callback, not that the real caller consumes it.

## B6 — P2 — Horizon sequencing omits its own atomic stale-edit guard

**Evidence:** `useWorkoutPlannerSequenceEvents.ts:99` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.ts:99` — not committed; machine-local evidence) computes a horizon proposal from stateRef.current. Line 104 replaces the selected day's exercises in a functional updater without checking that the previous state's day still matches the proposal's source. The single-workout `builder branch:119` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.ts:119` — not committed; machine-local evidence) explicitly guards prev === sequencedRows. Likewise Undo checks references before enqueueing the update at line 138, then `horizon line 150` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.ts:150` — not committed; machine-local evidence) unconditionally restores old rows inside the updater, unlike the guarded builder line 147.

**Failure:** An edit queued earlier in the same React batch has not yet updated stateRef.current. Horizon rearrange or Undo passes its external check and then overwrites that newly applied edit when React evaluates the queued state updates. It also issues an affirmative receipt before proving a mutation was accepted. This is a same-client lost-update defect, separate from F1's client/request-epoch problem.

**Repair contract:** Compare the actual previous plan identity/version and exact target-day references inside the functional update or central reducer. Reject stale rearrange/Undo atomically, leave newer changes intact, and report an expired/unapplied action. Bind undo to plan, client, day and the exact applied version. Preserve other days and metadata.

**Acceptance tests:**

- B6-T1: In one act/batch, queue a generated-plan day edit and then rearrange. The edit survives; a stale proposal cannot replace the day.
- B6-T2: Rearrange first, then in one batch queue a new day edit followed by Undo. The new edit survives and Undo expires truthfully.
- B6-T3: Switch selected day/plan between receipt creation and action; only the original still-valid target is eligible.
- B6-T4: Successful Undo restores exact prior references/order without removing later independent changes in other days.
- B6-T5: Extend the actual hook harness to expose setPlan. `Existing tests:51` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.test.tsx:51` — not committed; machine-local evidence) expose setRows only; stale-Undo coverage `at line 115` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.test.tsx:115` — not committed; machine-local evidence) exercises builder edits across separate completed act calls, while horizon coverage only checks happy-path selected-day ordering.

## F1 coverage extensions — do not close F1 after fixing only the page hook

### Backup panel

`WorkoutPlannerBackupPanel.tsx:118` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBackupPanel.tsx:118` — not committed; machine-local evidence) owns its own verdict request and state without a request-generation guard. A late verdict for A after selecting B can restore A's backup. Generate awaits its captured loadVerdict and callbacks; `promotion:160` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBackupPanel.tsx:160` — not committed; machine-local evidence) operates on the verdict's backup ID, and the load action uses that same stored ID. Resetting state when props change does not prevent a later completion restoring old state.

Required F1 scenarios: A/B reversed verdict completion; generate/promote then client switch; close/reopen confirmation before completion; old success/failure must not replace B's verdict, confirmation or status. A legitimately submitted A mutation may finish server-side, but its result must be scoped to A and cannot target or refresh B's editor.

### Coach command, event and receipt pipeline

`useWorkoutPlannerCoachSurface.ts:44` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerCoachSurface.ts:44` — not committed; machine-local evidence) sends selectedClientId into the dock, but the mutation hook receives no client identity. `useWorkoutPlannerAiEvents.ts:143` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerAiEvents.ts:143` — not committed; machine-local evidence) resolves an exercise asynchronously and then reads fresh stateRef.current; Add can target the newly selected plan/day. Swap captures a scope before resolution but applies against fresh generatedPlan afterward; if the new plan is null, the non-null cast does not prevent the helper's plan.weeks dereference from throwing. Event cleanup removes listeners but does not invalidate tasks already awaiting lookup.

`useSurfaceCoachDock.ts:37` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/CoachDock/useSurfaceCoachDock.ts:37` — not committed; machine-local evidence) scopes receipt sinks by surface string, not client/run identity. Old receipts and their follow-up actions can survive context changes. The receipt dispatcher is not a substitute for client/plan/day mutation authority.

Required F1 scenarios: deferred lookup A, switch B, resolve; deferred lookup for day one then select day two; clear plan before Swap resolution; navigate away while lookup waits; click old receipt action after switching clients. No stale mutation, unhandled rejection or misleading success receipt. Capture client/plan/day/request-version together before await and verify again atomically when applying. Already submitted server operations need origin-scoped receipts rather than silent transfer to the current editor.

## Audience/checkpoint/media/PDF disposition

### Dormant runner modules are not mounted runtime evidence

A frontend-wide rg for ConsoleView, AudienceView, runnerCheckpoint, runnerChannel and runnerActivation, excluding test files, found only declarations/self references and runner-internal imports. No page/router/shell importer mounts these modules. Actual Run is the ClassPreviewPanel → BootcampDemoMode → BootcampRunnerClock path documented in B3.

The following are **preactivation contract gaps**, not additional claims of live defects or an instruction to activate dormant features:

- `runnerChannel.ts:19` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/runner/runnerChannel.ts:19` — not committed; machine-local evidence) uses one global broadcast channel. Receiver ordering `at line 84` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/runner/runnerChannel.ts:84` — not committed; machine-local evidence) is only a monotonic seq, with no reset keyed by run/plan identity. A new run restarting at seq 1 can be dropped after a prior run's higher sequence; state-without-plan followed by same-sequence state-with-plan can also be discarded. Commands are not routed by session identity. Validate complete nested message shapes before using them, not just top-level v/kind.
- `runnerCheckpoint.ts:23` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/runner/runnerCheckpoint.ts:23` — not committed; machine-local evidence) has two global storage keys and separate state/plan writes. Matching planId alone does not guarantee matching plan revision. The loader validates neither full timing state nor snapshot schema, and clearCheckpoint inside catch may itself throw when storage is denied.
- `BootcampClassPlanAdapter.ts:137` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampClassPlanAdapter.ts:137` — not committed; machine-local evidence) builds a plan for timeline use but does not pass planId, createdAt or a frozen snapshot. `Shared createClassPlan:48` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/shared/bootcamp-core/classPlan.mjs:48` — not committed; machine-local evidence) consequently defaults planId to null. The adapter assigns occurrence slot IDs and exerciseRef, but does not populate mediaRef. A portable audience/checkpoint implementation cannot assume this live adapter already delivers those contracts.
- Before any activation, test two concurrent run identities, new run seq reset, late hello/plan hydration, malformed nested messages, mismatched revisions, denied storage, and duplicate exercise occurrences. One console writes; audience/floor consumers derive from that same explicit session snapshot.

### Media identity

Inspected BootcampClassPlanAdapter, BootcampDemoMode, BootcampDemoVideoModal, BootcampDemoMode.media.test and the shared ClassPlan constructors. The live board derives media from each BootcampExercise; the portable adapter currently carries exercise identity but no mediaRef. Distinguish occurrence identity (slot) from catalog exercise identity when implementing audience/media lookups.

No new P1 media-identity defect was established in this bounded pass. Two concrete follow-up checks remain: failed-preview state is keyed by station/sortOrder/name `at BootcampDemoMode.tsx:209` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoMode.tsx:209` — not committed; machine-local evidence), so replacement media at the same tile identity should invalidate failure state; activeVideo stores title/URL rather than occurrence identity `at line 116` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoMode.tsx:116` — not committed; machine-local evidence), so replacement or removal of that occurrence should close/rebind the modal deliberately. These are source observations, not live playback results. URL playback, remote media availability, upload authorization, transcoding, duplicate-name backend matching and catalog join correctness were not exercised.

BootcampDemoVideoModal does implement initial focus, Tab trapping, Escape and focus return `at line 33` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoVideoModal.tsx:33` — not committed; machine-local evidence); do not generalize Sprint's modal defect in F11 to this component.

### PDF

Inspected `BootcampBuilderPdfExport.ts:4` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPdfExport.ts:4` — not committed; machine-local evidence) and its mounted import/caller in BootcampBuilderPage, with the export service already reviewed in F6. The wrapper forwards all exercise boards and stored aggregate totals; it does not pass the full compiled timing/slot snapshot. This extends F6's proof boundary and is not a duplicate new finding. No PDF was generated or visually rendered here. Client planner PDF/download authorization and persistence details remain parent/backend audit ownership.

## Product polish tied to these boundaries

Preserve Training Studio, optional Program Map, current roles/routes and advanced controls.

- Make the context strip authoritative: selected client, plan, saved/draft state and one scoped next action. Loading/unavailable data should say so. Any roster-wide suggestion belongs in a clearly separate client-work queue with an explicit switch label.
- Show a persistent compact run-session status above Build/Preflight/Run: paused/running, current segment and Resume. Keep capability tools compact and truthful; audio or screen-lock failure should not compete with the large timer.
- In narrow exercise rails, use a short **No demo** badge and stable image/icon placeholder. `ExerciseMediaPreview.tsx:73` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/ExerciseMediaPreview.tsx:73` — not committed; machine-local evidence) currently emits two lines of promotional placeholder copy regardless of thumbnail mode. Parent observed that copy wrapping into tiny unreadable columns in the live rail; this source pass confirms why the thumbnail variant cannot simplify it. Keep explanatory upload guidance in the expanded inspector.
- The Program Map should visualize the same plan/day identity used by mutation guards. Highlight the active day and preserve scroll/selection across successful saves and background list refreshes. Do not let visual navigation silently retarget outstanding Coach actions.

## Inspection and verification ledger

| Boundary | Inspected in source | Executed by this subagent | Limit |
| --- | --- | --- | --- |
| Backup/blend | Panel, dialog, week-count loading, callbacks, UUID normalizer/route/model seam; BlendDialog test | No | No network/server mutation |
| Coach mutation | Surface adapter, dock registration/submit path, add/swap/update/remove/generate listeners, sequence/Undo hooks and tests | No | Command-provider/backend execution and conversation creation not exercised |
| Context chip | CommandPanelV2, next-action resolver, presentation mapper, resolver tests | No | Parent screenshot observation attributed; no independent UI session |
| Mounted Run | WorkflowStage, ClassPreviewPanel, DemoMode, clock hook, pure runner timing, capability acquisition, relevant tests | No | No RAF/device/audio/fullscreen/wake-lock runtime |
| Dormant audience/console | Importer inventory, channel, protocol/checkpoint relationship, Console/Audience modules | No | Not mounted; no multi-window proof |
| Class/media | Adapter, shared constructors, DemoMode resolution/state, modal, media helper tests | No | No media download/playback/upload/catalog DB |
| PDF | Wrapper and caller; earlier F6 service inspection retained | No | No PDF generation or render |
| Repository baseline | git rev-parse HEAD | Yes | c0cbe538d8ed2ca519bb494cdf3282bf43b76699 |
| Baseline frontend tests | Parent's reported 627/124 result | Parent only | Not proof of newly specified regressions |
| Artifact writes | Primary report + this supplement | Yes | No application files edited |

All acceptance tests above are **PROPOSED / NOT RUN** in this subagent pass. No claim of deployed correctness, complete regression coverage, browser conformance, DB authorization or provider behavior is made. The bounded supplemental audit stops here; the parent owns prioritization, canonical addendum, implementation, RED→GREEN evidence and release decisions.

