# ACTIVE PRIORITIES

**Purpose:** Stable current priority board for SwanStudios production stability and the next implementation slices.
**Status:** Evergreen file. Update this when production priorities shift.
**Read after:** `CLAUDE.md`, `ACTIVE-INDEX.md`
**Last updated:** 2026-04-14 (post Phase 10 — Gemini-first parser rewrite unblocks Gemini-only local transcript intake; 20MB upload cap aligned across frontend/multer/Gemini)

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

3. **P1 - Swan-first Coach Assistant transcript intake** ✅ **DONE** (Phase 9, 2026-04-14) + ⚠ **HOTFIXED** (Phase 9.1, 2026-04-14)
   - Coach Assistant accepts transcript-class file attachments (audio + text + pdf).
   - 50MB cap aligned with `backend/routes/workoutLogUploadRoutes.mjs:54`.
   - Routes through `POST /api/workout-logs/upload` → review card → confirm → `POST /api/admin/clients/:clientId/workouts`.
   - Selected-client requirement enforced before upload.
   - Failure path preserves review state for retry.
   - Text-only Coach Assistant sends behave unchanged.
   - Phase 9 tests: 63/63 coach-assistant; 1471/1471 backend; 105/105 frontend scoped.
   - **Phase 9.1 (2026-04-14): local smoke test surfaced 3 real bugs + 1 UX defect, all fixed in-place on local commit `4d0e445b` (not yet re-committed):**
     - **BLOCKER-A**: `transcriptReviewsRef` ids not captured on no-client / upload-failure paths → Cancel and Apply buttons no-oped. **Fixed** by using new `appendTranscriptError` helper and storing error-entry ids in the same ref map.
     - **BLOCKER-B**: Client hydration bail-out when `GlobalClientProvider` loaded BEFORE Coach Assistant mounted. The `clientListFetchStartedRef` gate never flipped in the pre-loaded case, so `activeClient` was never adopted into `selectedClient`, and the picker showed "Select a client..." while the left rail correctly showed the real client. **Fixed** by adding state D: flip the ref when `clientList.length > 0` AND `!loadingClients` (implicit confirmation a fetch completed before mount).
     - **HIGH-A**: Validation / upload errors rendered as fake review cards with "0 parsed" and an active Apply button. **Fixed** by adding a new `transcriptError` metadata type and a dedicated `TranscriptErrorCard` render branch in `CoachMessage` — dismissible only, no fake Apply.
     - **HIGH-B**: `ContextChipBar` rendered as interactive buttons despite being perceived as dead controls. **Fixed** by redesigning as informational capability taxonomy — section heading "What Swan Coach Can Help With", list semantics (ul/li), no onClick, no button element, default cursor.
   - Phase 9.1 tests: 92/92 coach-assistant (+29 new); 134/134 frontend scoped; 1471/1471 backend.
   - **Next blocker (NOT fixed this pass, flagged as P2):** `backend/services/workoutLogParserService.mjs:11,28-30` hard-requires `OPENAI_API_KEY`. User's `.env` has only Gemini. After the Phase 9.1 UI fixes land, the smoke test will fail at the parser step with "OPENAI_API_KEY not configured". Requires parser-provider rewrite (OpenAI → Gemini) + backend tests. Scoped as next slice.

4. **P2 - Parser-provider rewrite** ✅ **DONE** (Phase 10, 2026-04-14)
   - `backend/services/workoutLogParserService.mjs` rewritten as Gemini-first with optional OpenAI fallback.
   - Local/dev users with only `GOOGLE_API_KEY`/`GEMINI_API_KEY` can now parse transcripts end-to-end without `OPENAI_API_KEY`.
   - Uses direct fetch to `generativelanguage.googleapis.com` matching the proven `voiceTranscriptionService.mjs` pattern (NOT the `geminiAdapter.mjs` in the provider router — that adapter is purpose-built for workout-draft generation and reusing it would require restructuring into `AiGenerationContext` shape, wider than this slice warranted).
   - Enforces `responseMimeType: 'application/json'` in Gemini generationConfig.
   - Defensive JSON extraction (`extractJson`) handles fenced markdown / leading commentary / nested braces as a safety net.
   - Fallback order: Gemini first → OpenAI fallback ONLY when `OPENAI_API_KEY` exists AND Gemini failed. Inverted from Phase 9, which required OpenAI.
   - **20MB size-limit mismatch aligned**: frontend picker (`useFileAttachment.ts:63`), multer (`workoutLogUploadRoutes.mjs:55`), and Gemini inline-data cap (`voiceTranscriptionService.mjs:16`) are now all 20MB. Previously frontend+multer allowed 50MB and silently failed at the Gemini upload step.
   - New test file: `backend/tests/unit/workoutLogParserService.test.mjs` — 30/30 passing. Covers provider chain routing, JSON extraction edge cases, error paths, output contract preservation, key-resolution priority.
   - Test results: backend full 1501/1501 (+30); frontend coach-assistant 98/98 (+0 net — 3 tests updated from 50MB → 20MB assertions but count unchanged).
   - **Narrow claim:** transcript intake is now locally smoke-testable with a Gemini-only env. This does NOT make transcript intake production-ready — it removes the parser-provider blocker and nothing more. The next real blocker is unknown until Sean reruns the local smoke test against `bc21a4ab` + Phase 10 changes.

5. **P3 - Writer-side default-value fix**
   - Fix `formRating`, `set.rpe`, and `overallIntensity` default-value persistence so charts reflect explicit interaction instead of seeded neutral defaults.

6. **P4 - Optional unofficial PLAUD bridge**
   - Only behind an internal feature flag.
   - Not a production-critical dependency.

7. **Later — Official PLAUD OAuth/webhook integration**

8. **Later — Gemini File Upload API for transcripts > 20MB**
   - Current cap is 20MB (Gemini inline-data limit), enforced at all 3 layers.
   - Real Plaud exports of long sessions can exceed this.
   - Requires swapping `voiceTranscriptionService.mjs` inline-data path for the Gemini File Upload API with two-step upload + reference. Separate slice.
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
