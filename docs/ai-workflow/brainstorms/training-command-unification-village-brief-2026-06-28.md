# Training Command Unification - AI Village Brief

Date: 2026-06-28
Owner: Codex
Scope: planning brief only; no client PII; use client IDs and role concepts only.

## User Goal

Sean needs SwanStudios to become a single practical training command workflow for real personal-training clients. He wants to onboard and manage clients quickly by voice, generate workouts and long-horizon plans, choose generated workouts directly from the logger, and backfill missed historical workouts in a lower-intensity/regressed way that tells a believable progression story.

The target workflow must not gate active coaching. A client can be partially onboarded and still have workouts logged. Missing information should become reviewable gaps/questions, not a blocker.

## Current Evidence From The Tree

### Mounted Client Training Surface

- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:20-33` lazy-loads WorkoutPlanBuilder, WorkoutLogger, and HistoricalWorkoutImportPanel.
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:82` renders WorkoutPlanBuilder.
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:105` renders WorkoutLogger.
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:116` renders HistoricalWorkoutImportPanel.

Conclusion: Architect/generation, logger, and history import are already colocated in the Training tab, but the workflows remain segmented.

### Generated Plan And Today Assignment Flow

- `backend/routes/workoutPlanRoutes.mjs:137` exposes `GET /api/workout-plans/client/:userId` for the client plan catalog/current state.
- `backend/routes/workoutPlanRoutes.mjs:241` exposes `POST /api/workout-plans` to save generated plans.
- `backend/routes/workoutPlanRoutes.mjs:406` exposes primary-plan selection.
- `backend/routes/workoutPlanRoutes.mjs:598` exposes plan activation.
- `backend/routes/workoutPlanRoutes.mjs:690` exposes plan advance.
- `backend/routes/clientWorkoutRoutes.mjs:57` exposes `GET /api/workouts/:userId/current`.
- `backend/routes/clientWorkoutRoutes.mjs:109-139` returns `todayAssignment` and `trainingPlanCatalog` along with current plan/session data.
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts:66` calls `/api/workouts/${effectiveClientId}/current`.
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts:99-124` stores `plannedAssignment` and preloads exercises from the current/today assignment.
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx:1007` renders ActivePlanContextStrip.

Conclusion: the logger has a reliable current-assignment load path, but not an in-logger chooser for every generated plan/day.

### History Import Flow

- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel.tsx:95` posts upload data to `/api/workout-logs/history-preview`.
- `backend/routes/workoutLogUploadRoutes.mjs:209` handles `POST /history-preview` under workout-log upload routes.
- `backend/routes/workoutLogUploadRoutes.mjs:257-260` returns draft-only preview data and missing draft requests.
- `backend/services/historicalWorkoutImportService.mjs:174-194` returns `draftOnly: true`, parsed drafts, and missing draft requests; it does not persist workouts.
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel.tsx:172` routes to Coach Assistant with `intent=historical_import`.
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.routeContext.ts:243` tells Coach to prepare editable historical workout-log drafts, treat Move Fitness/external import work as free-tracking, avoid paid-session deduction, mark estimates as historical filler, and keep writes review-gated.

Conclusion: history import correctly avoids bulk writes, but there is no direct path to prefill the Workout Logger from a preview/missing draft.

### Coach Proposal And Approval Flow

- `backend/services/ai/coachActionProposalClassifier.mjs:35` supports `workout_log` proposals.
- `backend/services/ai/coachActionProposalClassifier.mjs:72` defines the legacy `import_workout_log` action shape for workout-log proposals.
- `backend/services/ai/coachActionProposalApprovalService.mjs:189` approves workout-log proposals by calling `submitAiWorkoutLogAsDailyForm`.
- `backend/services/ai/coachActionProposalApprovalService.mjs:197` passes `plannedAssignment` into the AI daily-form service.
- `backend/services/workout/aiWorkoutDailyFormService.mjs:50` is the canonical AI workout-log write adapter.
- `backend/services/workout/aiWorkoutDailyFormService.mjs:9` states it writes DailyWorkoutForm, WorkoutSession, WorkoutLog, and applies paid-session deduction policy.
- `backend/services/workout/aiWorkoutDailyFormService.mjs:122-133` resolves planned assignments and non-billable planned-assignment policy.
- `backend/services/workout/aiWorkoutDailyFormService.mjs:220-221` records whether paid credits were deducted or not deducted.

Conclusion: Coach historical-import instructions say no paid-session deduction, but the backend approval path currently lacks a first-class historical source flag in the call to `submitAiWorkoutLogAsDailyForm`.

### Existing Historical HTTP Logging Safeguard

- `backend/controllers/adminWorkoutLoggerController.mjs:73` treats `historical_import` and `move_fitness_historical_import` as historical sources.
- `backend/controllers/adminWorkoutLoggerController.mjs:87` passes `suppressEngagementSideEffects` for those sources.
- `backend/services/workout/workoutLogService.mjs:256` accepts `suppressEngagementSideEffects`.
- `backend/services/workout/workoutLogService.mjs:366` skips XP/social side effects when suppression is true.

Conclusion: the manual/admin logging path has a historical source concept. The AI daily-form path should get the same source contract rather than creating a separate backfill writer.

### Existing Generation Engines

- `frontend/src/services/aiWorkoutService.ts:228` generates a single workout draft.
- `frontend/src/services/aiWorkoutService.ts:238` approves a single workout draft.
- `frontend/src/services/aiWorkoutService.ts:261` generates long-horizon drafts.
- `frontend/src/services/aiWorkoutService.ts:277` approves long-horizon drafts.
- `backend/routes/workoutBuilderRoutes.mjs:159` exposes `POST /api/workout-builder/generate`.
- `backend/routes/workoutBuilderRoutes.mjs:220` exposes `POST /api/workout-builder/plan`.
- `frontend/src/components/WorkoutManagement/useWorkoutPlanBuilderController.ts` manages the main plan builder generation/save flow.

Conclusion: do not add a fourth generation engine. The UX can be fused while retaining existing internals.

## Design Principle

Do not delete Architect, Co-Pilot, Plan Vault, History Import, or Logger. Fuse them through a Training Command workflow:

- Architect and Co-Pilot remain generation/recommendation engines.
- Plan Vault remains plan catalog and activation authority.
- Workout Logger becomes execution surface: log today, load any generated day, and stage historical backfill.
- History Import remains draft-only ingestion, then hands drafts/questions into Coach or Logger.
- Coach Command remains voice-first conversational entry, but every write must be review-gated and route through the canonical log approval path.

## Product Requirements To Preserve

1. The trainer can keep logging real workouts even if onboarding is incomplete.
2. The logger must choose from generated plans/days without leaving the logger.
3. Backfilled historical workouts must be visibly marked as AI-estimated or imported historical filler until reviewed.
4. Backfilled historical workouts should generally be lower/regressed relative to current training and show progression toward current ability.
5. Historical backfills must not deduct paid-session credits unless Sean explicitly chooses to mark one as a paid fulfilled session.
6. Historical backfills must not trigger XP/social celebration side effects as if a client just trained today.
7. Plan advancement should only happen for current planned assignments, not arbitrary historical imports.
8. Voice/dictation should be first-class but every AI-generated write must have human review/approval.
9. No PII should be sent to LLMs. Client names/details must stay client-side or be proxied/sanitized per existing privacy rules.

## Candidate Architecture Options

### Option A: Logger Plan-Day Picker First

Add an in-logger generated-workout picker that consumes the existing current workout/plan catalog response or `/api/workout-plans/client/:userId`, then lets trainer load a selected plan/day into WorkoutLogger.

Pros:
- Directly closes the known product gap.
- Smallest frontend slice.
- No new generation engine.

Cons:
- Does not solve historical backfill safety alone.
- Needs a stable assignment key for non-current plan/day loads or a read-only prefill mode that does not advance plan cursor.

### Option B: Historical Backfill Safety First

Extend `workout_log` proposal payloads and `submitAiWorkoutLogAsDailyForm` with a historical source/backfill flag. The flag suppresses paid-session deduction, plan advancement, and engagement side effects, then add tests proving historical Coach approvals cannot bill or advance plans.

Pros:
- Protects money/data truth before making backfill easier.
- Aligns Coach historical route instructions with backend enforcement.
- Reuses canonical AI daily-form write path.

Cons:
- Backend-sensitive; requires careful tests.
- Still needs UI handoff to make it easy.

### Option C: History Preview To Logger Prefill

Add a `Backfill in Logger` action from HistoricalWorkoutImportPanel preview drafts/missing draft requests. Store a review-gated draft in sessionStorage or route state, open the Training tab logger mode with date/source/exercises/notes prefilled, and require human save.

Pros:
- Gives Sean the practical fast workflow.
- Keeps history preview draft-only and review-gated.
- Can share the same historical source contract as Option B.

Cons:
- Requires logger support for date/source/prefill metadata.
- Needs duplicate-date and client mismatch guards.

### Option D: Full Training Command Workspace

Refactor the Training tab into a unified mode shell: Log Today, Choose Generated, Generate Plan, Backfill History, History/Charts. Keep existing child components internally but make user flow feel single.

Pros:
- Best long-term product UX.
- Resolves fragmentation at the top level.

Cons:
- Larger UI blast radius.
- Risky before backend historical safety is hard-locked.

## Initial Codex Recommendation Before Village

Build in this order:

1. Historical backfill safety contract in the AI daily-form approval path.
2. History preview to logger prefill for reviewed/manual backfill.
3. In-logger generated plan/day picker.
4. Unified Training Command shell after data/write contracts are safe.

This order avoids making unsafe writes easier before billing/progression/engagement side effects are controlled.

## Questions For AI Village

1. Is the staged order above correct, or should the generated-plan picker ship before historical backfill safety?
2. What is the safest data contract for a non-current generated plan/day selected inside WorkoutLogger?
3. Should historical backfill use the AI daily-form service, adminWorkoutLoggerController/logWorkoutForClient, or a new adapter that delegates to one canonical service?
4. Which source fields are needed to enforce no paid-session deduction, no engagement side effects, and no plan advancement for historical imports?
5. What UI flow gives Sean the fastest voice-first backfill without increasing accidental billing/data-truth risk?
6. What tests are mandatory before shipping the first slice?
7. What should remain explicitly out of scope for the first implementation slice?
