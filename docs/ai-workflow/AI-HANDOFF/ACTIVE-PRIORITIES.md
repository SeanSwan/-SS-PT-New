# ACTIVE PRIORITIES

**Purpose:** Stable current priority board for SwanStudios production stability and the next implementation slices.
**Status:** Evergreen file. Update this when production priorities shift.
**Read after:** `CLAUDE.md`, `ACTIVE-INDEX.md`
**Last updated:** 2026-04-14 (post Phase 9 — Coach Assistant transcript intake)

---

## Purpose

This file is the canonical "what matters now" tracker.

- Use this for current production priorities and next-slice sequencing.
- Do not treat `CURRENT-TASK.md` as the live priority board; it is historical context.
- Keep `CLAUDE.md` compact and use this file for the active backlog.

---

## Current Production State

- Workout Logger, Workout Planner, and Clients & Team all have recent production hotfixes for live issues.
- Canonical `/dashboard/client/progress` and `/dashboard/client/progress/detailed` truth-restoration work is landed and regression-locked.
- BodyMeasurement read/write backing for Body Composition is verified and regression-locked.
- PLAUD strategy is now explicit:
  - Swan is the primary workflow.
  - PLAUD Desktop is optional.
  - Existing-account PLAUD cloud sync is not a production dependency.
- Remaining major risk before transcript-first rollout is stability drift, route drift, and transcript intake orchestration, not chart truth.

---

## Priority Stack

1. **P0 - Proactive frontend TDZ scan** ✅ **DONE** (Phase 9, 2026-04-14)
   - Scanned `coach-assistant/`, `admin-clients/`, `admin-workout-planner/`, `admin-dashboard/`, `workspaces/clients-team/`, `WorkoutLogger/`.
   - 150+ files, 180+ `useCallback`/`useMemo` declarations, **zero violations found**.
   - Both prior fixes (`WorkoutPlannerPage.tsx:240/268`, `WorkoutLogger.tsx:197/202`) re-verified intact.
   - Result: safe to touch Coach Assistant for transcript wire-up — done in same pass.

2. **P1 - `/dashboard/people/*` dead-route cleanup** (still open)
   - 41 total references across `frontend/src`, ~10 operational files.
   - Only one fix landed so far: sidebar entry in commit `19931c25`.
   - Each remaining ref is a silent-redirect-to-Coach-Assistant trap.
   - **Now the next priority** since transcript intake is unblocked.

3. **P1 - Swan-first Coach Assistant transcript intake** ✅ **DONE** (Phase 9, 2026-04-14)
   - Coach Assistant accepts transcript-class file attachments (audio + text + pdf).
   - 50MB cap aligned with `backend/routes/workoutLogUploadRoutes.mjs:54`.
   - Routes through `POST /api/workout-logs/upload` → review card → confirm → `POST /api/admin/clients/:clientId/workouts`.
   - Selected-client requirement enforced before upload.
   - Failure path preserves review state for retry.
   - Text-only Coach Assistant sends behave unchanged.
   - 63/63 coach-assistant tests passing; 1471/1471 backend; 105/105 frontend scoped.
   - Files added: `parsedWorkoutToLogPayload.ts`, `useTranscriptIntake.ts`, plus tests.
   - Files modified: `useFileAttachment.ts`, `useCoachAssistant.ts`, `CoachMessage.tsx`, `SwanCoachTypes.ts`, `SwanCoachAssistantPage.tsx`.

4. **P2 - Writer-side default-value fix**
   - Fix `formRating`, `set.rpe`, and `overallIntensity` default-value persistence so charts reflect explicit interaction instead of seeded neutral defaults.

5. **P3 - Optional unofficial PLAUD bridge**
   - Only behind an internal feature flag.
   - Not a production-critical dependency.

6. **Later - Official PLAUD OAuth/webhook integration**
   - Only when public and stable.

---

## Blocked / Deferred

- Official PLAUD existing-account sync is still private beta / in-progress, so it is not a near-term dependency.
- The unofficial PLAUD web/API bridge is useful only as an optional adapter after the Swan-first workflow is stable.
- `CURRENT-TASK.md` remains historical and should not be revived as the live priority board.

---

## PLAUD / Swan Intake Decision

The platform decision is locked:

- Swan is the primary workflow.
- Coach Assistant is the intended primary intake surface.
- PLAUD Desktop is optional.
- Existing-account PLAUD cloud sync is not a production dependency.
- Near-term implementation should assume:
  - direct Swan audio upload
  - pasted transcript text
  - manual PLAUD export upload
- Treat the unofficial PLAUD bridge as a later internal connector, not the foundation.

---

## Latest Verified Commits

- `0f5d8fe4` - fix(workout-logger): hoist loadClientData wrapper to fix TDZ crash on every mount
- `19931c25` - fix(admin-nav): point Clients & Team sidebar to canonical client-management route
- `1c039619` - fix(workout-planner): hoist addExercise above ExerciseRowRenderer to fix TDZ crash
- `8d5ab1aa` - test(progress-detailed): lock writer-default-value read behavior
- `dd5a223c` - test(progress-detailed): lock BodyMeasurement writer chain
- `12634b01` - fix(progress-detailed): restore canonical client analytics truth

## Phase 9 Slice — Coach Assistant Transcript Intake (2026-04-14, unstaged)

Pre-commit state. Files added:
- `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.test.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useTranscriptIntake.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFileAttachment.test.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.transcriptIntake.test.ts`

Files modified:
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFileAttachment.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachTypes.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`

---

## Next Claude Prompt Source

Future sessions should start with:

1. `CLAUDE.md`
2. `ACTIVE-INDEX.md`
3. `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
4. Relevant continuity handoff docs

Use this file as the current source of truth for sequencing the next bug-fix or implementation slice.
