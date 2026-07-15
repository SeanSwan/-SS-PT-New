# 04 — Build Order (file by file)

Every file ≤300 lines (Rule 4). Blueprint header on components >100 lines. `WorkoutPlannerPage.tsx`
is AT its 300-line cap and locked by `WorkoutPlannerPageLayout.extraction.test.ts` — budget ≤6 net
new lines there (hook call + props), compact onto existing lines like the swap wiring did.

## Slice S1 — Planner Coach dock (UI + dictation + submit, chat-fallback only)
| # | File | Action | Notes |
|---|---|---|---|
| 1 | `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCoachDock.styles.ts` | NEW ≤150 | styled-components; mimic `WorkoutPlannerExercise.styles.ts` (token-with-fallback, 44px, focus-visible) |
| 2 | `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCoachDock.tsx` | NEW ≤220 | presentational dock per 02 §A/B/C; props from `useWorkoutPlannerCoachDock` return; mimic textarea/mic/submit wiring of `frontend/src/components/coach-assistant/CoachConsoleDock.tsx` (form onSubmit + Enter requestSubmit + aria) WITHOUT importing it |
| 3 | `.../useWorkoutPlannerCoachDock.ts` | NEW ≤200 | signature in 03 §3; dictation glue mimics `CoachCommandCenter.voiceCapture.ts` (`useCoachBrowserSpeechInput({ setText, onRuntimeUnavailable })` + `VoiceRecordingOverlay` fallback); submit posts via the SAME client `useCoachCommand`/`executeCommand` path the Command Center uses, body + `context: { surface: 'workout-planner', clientId }`; non-command → `fallback_to_chat` → render reply text as a receipt row (use `useAIChat.sendMessageWithConversation` exactly as `CoachCommandCenter.actions.ts:162-226` does) |
| 4 | `WorkoutPlannerPageLayout.tsx` | EDIT +6 | render `<WorkoutPlannerCoachDock …/>` below `<ThreePanel>`; thread props |
| 5 | `WorkoutPlannerPage.tsx` | EDIT ≤6 net | call the dock hook; pass through |
| 6 | `.../WorkoutPlannerCoachDock.test.tsx` | NEW | render states: collapsed default, open, mic aria-pressed, busy, error row, example-prompts empty state |

## Slice S2 — Backend planner commands
| # | File | Action | Notes |
|---|---|---|---|
| 1 | `backend/services/ai/commandRegistry/workoutCommands.mjs` | EDIT | 5 registry entries per 03 §1, placed adjacent to the logger FRONTEND_DISPATCH block |
| 2 | intent-parser table file (locate: grep `add_exercise_to_form` under `backend/services/ai/`) | EDIT | planner phrasings + `surface` disambiguation per 03 §1 |
| 3 | execute request body: `frontend/src/hooks/useCoachCommand.ts` + backend route/pipeline reader | EDIT | add optional `context.surface` field end-to-end (one field, both sides) |
| 4 | `backend/tests/unit/plannerFrontendDispatchCommands.test.mjs` | NEW | see S2 criteria in 05 |

## Slice S3 — Planner AI-event hook (real-time edits land)
| # | File | Action | Notes |
|---|---|---|---|
| 1 | `.../workoutPlannerAiEvents.types.ts` | NEW ≤60 | payload types from 03 §2 |
| 2 | `.../useWorkoutPlannerAiEvents.ts` | NEW ≤260 | mimic `frontend/src/components/WorkoutLogger/useWorkoutAiEvents.ts` listener/acknowledge shape verbatim; mutations per 03 §2 resolution rules; horizon edits via `workoutPlannerHorizonSwap.helpers.ts` exports; builder-list edits via the same setter patterns as `useWorkoutPlannerPageActions.updateExercise/removeExercise` and rolodex `addExercise` defaults (phase-derived sets/reps/tempo/rest) |
| 3 | `WorkoutPlannerPage.tsx` | EDIT ≤4 net | call hook |
| 4 | schedule-view selection exposure | EDIT | `LongHorizonScheduleView` must surface `{weekNumber, dayIndex}` of the current selection upward (callback prop `onSelectionChange` — add to `WorkoutPlannerGeneratedPlanSection` → panel → layout → page like the swap props were threaded) |
| 5 | `.../useWorkoutPlannerAiEvents.test.tsx` | NEW | see S3 criteria |

## Slice S4 — Logger dictation
| # | File | Action | Notes |
|---|---|---|---|
| 1 | `frontend/src/components/WorkoutLogger/useWorkoutLoggerDictation.ts` | NEW ≤200 | 03 §3 signature; dictation glue same as S1; send → command lane `context:{surface:'workout-logger', clientId}`; the resulting `frontend_dispatch` events are ALREADY consumed by `useWorkoutAiEvents` — do not add listeners |
| 2 | `frontend/src/components/WorkoutLogger/LoggerDictationStrip.tsx` (+`.styles.ts`) | NEW ≤180 | strip per 02 §D |
| 3 | `WorkoutLogger.tsx` | EDIT ≤10 net | mount hook + strip + mic button in the action bar; CHECK the 875-line ratchet (`wc -l` budget noted in source-contract tests — extend those tests the way D1-D3 did: they concat shell+hooks as one surface) |
| 4 | tests | NEW | see S4 criteria |

## Slice S5 — Last-weight suggestions
| # | File | Action | Notes |
|---|---|---|---|
| 1 | `backend/services/workoutLastWeightService.mjs` | NEW ≤150 | query per 03 §4; mimic query bounding of `exerciseFamiliarityService.mjs` (sessions LIMIT 300 → logs by sessionId, name-normalized map) |
| 2 | mount route in the EXISTING workout-logs route file (grep `workout-logs` mounts in `backend/core/routes.mjs` or server routes index; do NOT create a new mount) | EDIT | `GET /last-weights` + RBAC per 03 §4 |
| 3 | `frontend/src/components/WorkoutLogger/useLastWeightSuggestions.ts` | NEW ≤120 | fetch-once per plan load; returns `Map<normalizedName,{weight,reps,at}>`; fail-silent |
| 4 | set-row weight input host (`ExerciseCardComponent.tsx` / `ExerciseSetRow.styles.ts` area) | EDIT | placeholder + chip per 02 §E; chip fills input via existing set-update handler |
| 5 | tests backend + frontend | NEW | see S5 criteria |

## Slice S6 — Sync hardening + end-to-end verification + audit record
| # | File | Action | Notes |
|---|---|---|---|
| 1 | planner "Open in Logger" affordance | VERIFY/EDIT | confirm a visible button uses `buildWorkoutPlannerLoggerRoute` for the selected client after Save/Activate; if absent add one next to `BuilderCreatePdfAction` in `WorkoutPlannerBuilderPanel.sections.tsx` — label `Log in Workout Logger` |
| 2 | regression test: plan→logger prefill | NEW | drive `useWorkoutPlanLoading` with a mocked `/api/workouts/:id/current` returning a 2-exercise plan; assert `ExerciseEntry[]` shape and weight=0 defaults |
| 3 | PDF auto-attach verification note | DOC | assert POST /api/workout-plans response `plan.metadata.planPdf` present in an api test (route already does this — test pins it) |
| 4 | Rule 48 audit record `docs/ai-workflow/AI-HANDOFF/DICTATION-PLANNER-LOGGER-SYNC-AUDIT-RECORD-<date>.md` | NEW | per rule 48 section list; include checkpoint log |

## In-repo examples to mimic (copy the pattern, not the file)
- Event listener + acknowledge: `frontend/src/components/WorkoutLogger/useWorkoutAiEvents.ts`
- Dictation glue: `frontend/src/components/coach-assistant/CoachCommandCenter.voiceCapture.ts`
- Dock form/mic markup: `frontend/src/components/coach-assistant/CoachConsoleDock.tsx`
- FRONTEND_DISPATCH registry entries: `backend/services/ai/commandRegistry/workoutCommands.mjs` (~222-314)
- Bounded history query: `backend/services/exerciseFamiliarityService.mjs`
- Prop threading through the planner layers: this week's swap wiring
  (`swapTarget/onBeginSwap/onBeginHorizonSwap` across Page → Layout → BuilderPanel → Section → View)
