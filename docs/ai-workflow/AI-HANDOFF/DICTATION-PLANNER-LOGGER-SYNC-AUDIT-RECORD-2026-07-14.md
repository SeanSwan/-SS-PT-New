# DICTATION-PLANNER-LOGGER-SYNC — Phase Completion Audit Record (Rule 48)

## 1. Phase header
- **Phase:** Dictation-first Planner ↔ Logger sync + Swan Coach real-time plan editing
  (build package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/`)
- **Scope:** S1 planner Coach dock · S2 backend `planner_*` FRONTEND_DISPATCH commands +
  deterministic surface disambiguation · S3 planner AI-event hook (real-time dictated edits) ·
  S4 logger dictation over the five existing `AI_*` commands · S5 last-weight suggestions ·
  S6 sync hardening + verification.
- **Dates:** 2026-07-14 (single session, isolated worktree `C:/tmp/ss-dictation-20260714`,
  branch `claude/dictation-planner-logger-20260714` off `origin/main@756fef2bc`).
- **Builder + architect:** Fable 5 (the package's own architect ran every checkpoint — Final
  Decider chain). Codex input: none this session (isolated lanes; no lock conflicts).
- **Verdict:** BUILT + ALL CHECKPOINTS PASS — pending Sean's manual QA on the four
  PENDING-SEAN items (§10) and deploy verification.

## 2. Files involved
**Frontend — planner (new):**
- `admin-workout-planner/WorkoutPlannerCoachDock.styles.ts` (149) — dock styles, token+fallback, 44px, reduced-motion.
- `admin-workout-planner/WorkoutPlannerCoachDock.tsx` (145) — presentational dock (collapsed/open/no-client/busy/error/empty states).
- `admin-workout-planner/useWorkoutPlannerCoachDock.ts` (169) — dock state + dictation glue + command submit + chat fallback + shared receipt sink `pushWorkoutPlannerCoachReceipt`.
- `admin-workout-planner/useWorkoutPlannerAiEvents.ts` (~258) — AI_PLANNER_* listeners → existing setters/helpers; exact-first name matching; honest acks + receipts.
- `admin-workout-planner/workoutPlannerAiEvents.types.ts` (48) — payload types + `PlannerHorizonSelection`.
- Tests: `WorkoutPlannerCoachDock.test.tsx` (9), `useWorkoutPlannerAiEvents.test.tsx` (13).

**Frontend — planner (edited):**
- `WorkoutPlannerPage.tsx` — exactly 300 lines (extraction lock green); dock + AI-events hook calls compacted in.
- `WorkoutPlannerPageLayout.tsx` (+4) — dock mounted below `<ThreePanel>`, above Saved Plans.
- `WorkoutPlannerBuilderPanel.tsx` / `WorkoutPlannerGeneratedPlanSection.tsx` / `LongHorizonScheduleView.tsx` — `onSelectionChange`/`onHorizonSelectionChange` threading (selected week/day → dictated-edit targeting).
- `useWorkoutPlannerRolodexState.tsx` — headless `searchExercises` (sync worker search, no UI state touched).
- `workoutPlannerHorizonSwap.helpers.ts` — additive `addHorizonExercise` + `updateHorizonExerciseFields` (one source of truth for horizon mutations).

**Frontend — logger (new):**
- `WorkoutLogger/useWorkoutLoggerDictation.ts` — mic state + command-lane submit (`surface:'workout-logger'`), command-or-honest-failure only.
- `WorkoutLogger/LoggerDictationStrip.tsx` + `.styles.ts` — 02 §D strip (hint, review input, Stop/Send 44px, receipt line).
- `WorkoutLogger/useLastWeightSuggestions.ts` — fetch-once map of last logged weights, fail-silent.
- Tests: `useWorkoutLoggerDictation.test.tsx` (6), `useLastWeightSuggestions.test.tsx` (7), `WorkoutLogger.planPrefill.regression.test.ts` (1).

**Frontend — logger (edited):**
- `WorkoutLogger.tsx` — 861 lines (< 875 ratchet): Dictate mic button (reuses RolodexTrigger), strip mount, two hook calls.
- `ExerciseSetRowComponent.tsx` / `ExerciseSetRow.styles.ts` / `ExerciseCardComponent.tsx` — last-weight placeholder + 44px tap-to-fill chip (mirrors OverloadSuggestion pattern).

**Frontend — shared (edited):**
- `utils/aiWorkoutEvents.ts` — additive AI_PLANNER_* names + dispatcher-map registration (logger AI_* family untouched).
- `hooks/useCoachCommand.ts` — optional `surface` opt riding the EXISTING allowlisted `routeContext` token channel; planner honesty receipt ("No Workout Planner is open. The plan was not changed.").

**Backend (new):**
- `services/ai/surfaceIntentRemap.mjs` — deterministic planner↔logger command-family remap keyed off `routeContext.surface`.
- `services/workoutLastWeightService.mjs` — bounded (300 sessions → 5000 logs) last-weight read model, fail-soft.
- Tests: `plannerFrontendDispatchCommands.test.mjs` (12), `workoutLastWeightRoute.test.mjs` (8), `workoutPlanPdfAutoAttach.test.mjs` (2).

**Backend (edited):**
- `services/ai/commandRegistry/workoutCommands.mjs` — five `planner_*` FRONTEND_DISPATCH entries (admin/trainer only).
- `services/ai/commandExecutor.mjs` — 2-line remap wire-in after classification.
- `routes/workoutLogUploadRoutes.mjs` — `GET /last-weights` (protect + assertAssignmentOrAdmin).
- `tests/unit/commandRegistryCoverage.test.mjs`, `tests/unit/workoutLogUploadRoutes.test.mjs` — surface locks extended additively.

## 3. Architecture & runtime flow
```
dictate in planner dock ─→ useCoachBrowserSpeechInput (finals→text, interim=hint)
  └ Send → POST /api/ai-command/execute { message, selectedClientId, routeContext:{surface:'workout-planner'} }
      ├ sanitize → PHI scan → classifyIntent (LLM) → applySurfaceIntentRemap (DETERMINISTIC)
      ├ registry planner_* (FRONTEND_DISPATCH, requiresConfirmation:false, admin/trainer)
      ├ stepExecute → not_wired → route relabels → { type:'frontend_dispatch', event:'AI_PLANNER_*', payload }
      └ useCoachCommand → dispatchAIWorkoutEvent → useWorkoutPlannerAiEvents
          ├ builder list → setPlanExercises (phase-default programming)
          ├ generated plan → applyHorizonSwap / addHorizonExercise / removeHorizonExercise /
          │                  updateHorizonExerciseFields on the SELECTED Detailed-Schedule day
          └ pushWorkoutPlannerCoachReceipt → dock feed ("Swapped Leg Press → Box Squat (Week 1 · Day 2)")
persistence: NONE server-side — dirty-state lights up, human clicks Save/Update (proven by content-signature test)

logger dictation: mic → strip → same lane with surface:'workout-logger' → existing AI_* events
  → existing useWorkoutAiEvents mutates sets — zero changes to the event consumers.

planner → logger sync: Save/Activate → "Log current plan" link (?loadPlan=today&source=workout-planner)
  → GET /api/workouts/:id/current → plannedExerciseToEntry (weight=0)
  → GET /api/workout-logs/last-weights?clientId&names=… → placeholder + tap-to-fill chip.
```

## 4. Security logic & posture
- **RBAC on `planner_*` commands** — `roleRequired:['admin','trainer']`; WHAT: blocks clients from editing trainer plans by voice; WHY: trainer-indispensability doctrine; BREAKS IF: a future registry edit adds 'client' — pinned by test.
- **Server never writes plans from dictation** — FRONTEND_DISPATCH only (`commandExecutor.mjs:531` untouched); WHAT: no silent server-side plan mutation; BREAKS IF: someone gives `planner_*` a dispatcher — grep `dispatch(ctx.command.type` stays gated on method.
- **Surface token allowlist** — `surface` rides `normalizeRouteContext`'s existing `^[a-z0-9_-]{1,80}$` token filter (`aiCommandRoutes.mjs:68`); free text cannot enter the classifier through this field.
- **`GET /last-weights`** — `protect` + `assertAssignmentOrAdmin` (admin any, trainer active-assignment fail-closed, client/user self-only), 400 on malformed input, names capped at 50, queries bounded (300/5000), fail-soft to empty map (never leaks errors); 403 per package contract (house 404-preference noted at checkpoint 5).
- **Privacy (Rule 8)** — dictated text goes only to lanes already approved for LLM traffic; command context carries IDs + structural tokens; client names render client-side only. PHI scanner remains in the pipeline ahead of classification.
- **No new transport** — no socket/WebRTC/chat lane; command lane + existing chat fallback only (ban 1 honored).

## 5. Best practices applied
Rules 1/2/3/6 (styled-components, 44px, dark-first, tokens+fallbacks), 4 (all new files ≤300 and within package budgets), 5 (blueprint headers), 8 (IDs-only to LLM), 17/61 (hostile pass per slice), 18 (existing-pattern-first: registry shape, voice glue, OverloadSuggestion chip, familiarity-service bounding), 19/51 (evidence pasted per checkpoint), 20 (sibling locks extended: registry lanes, route surface), 42 (pre-push audit), 43 (`css` helper on shared fragments), 58 (WorkoutLog columns verified before the read model), Rule 62 (loop: log → progress proof → next action; dictation cuts logging clicks), OWASP A01 (fail-closed assignment checks).

## 6. Known limitations / non-goals (deliberate)
- Planner dock exists on the Workout Planner only; the Coach Command Center issuing `planner_*` with no planner open gets the honest "No Workout Planner is open" receipt.
- `planner_update_exercise` targets the selected day only (its payload carries no week/day — 03 §2 contract).
- Async library resolution acks acceptance sync; outcome honesty lives in receipts (CustomEvent ack is synchronous by design — checkpoint 3 note b).
- `planner_generate_workout` params (category/goal/phase) are advisory; generation uses the page's current settings (03 §3 signature gives only `onGenerate()`).
- Last-weight chips: Full-Mode set rows only (QuickLogMode/Mobile untouched — 04's named host).
- Logger dictation has NO chat fallback by design (ban 8).
- Voice runtime support = browser Web Speech + recorder overlay fallback (planner dock); logger strip is typed-fallback when speech is unavailable.

## 7. Performance & UX considerations
- Dictated edit round trip = one POST + in-browser state mutation; no polling, no socket.
- Exercise resolution runs on the already-cached in-memory library (sync worker search) — zero extra network per edit.
- Last-weight fetch: ONE bounded query pair per loaded plan (deduped by name-set key), fail-silent.
- Clicks removed: swap via voice = 0 clicks vs 3+ (swap button → search → pick); weight entry = 1 tap (chip) vs type-per-set; logger set update by voice = 0 field-focus taps.
- A11y: aria-expanded/pressed/live throughout; interim NEVER enters editable values; reduced-motion honored; 44px everywhere.

## 8. Test coverage summary
- 58 new tests across 8 new suites (all listed in §2), plus 4 existing lock suites extended additively.
- Final counts this session: backend `tests/unit tests/api` **5328/5328**; frontend planner folder **262/262**, logger folder **429/429**; `tsc --noEmit` exit 0.
- NOT tested (and why): real microphone capture (browser API, no mic in CI — covered by the Coach voice hook's own suites), Render deploy behavior, real-DB last-weight values (env access denied in build session — §10).

## 9. Rollback plan
- Single revert: `git revert <push-merge-sha>` (slices are 7 commits `567818956..<final>`; reverting the merge/push range removes docks, commands, and route additively — no migrations, no schema changes, no data writes to undo).
- Partial kill without deploy: the planner dock renders only on the planner page — reverting the two `WorkoutPlannerPageLayout.tsx`/`WorkoutPlannerPage.tsx` hunks hides the whole S1-S3 surface; removing the 5 registry entries disables planner commands server-side (client dock then receives `fallback_to_chat`).
- `GET /last-weights` is read-only; worst case remove the route block — the frontend hook fail-silences.

## 10. Future review hooks (act on these)
1. **PENDING-SEAN manual QA:** (a) 1440px + 375px dock screenshots; (b) live dictation "swap leg press for box squat" end-to-end demo (checkpoint 3's demo criterion); (c) logger voice update "leg press set two ninety pounds eleven reps"; (d) last-weight chips against client 84's real history after deploy.
2. Re-check the LLM classifier's planner-phrase quality after 2 weeks of live use — the deterministic remap covers add/update twins; swap/remove/generate rely on the registry patterns steering the LLM. If misroutes appear, extend `surfaceIntentRemap` tables.
3. `workoutCommands.mjs` is now ~430 lines (was already >300 pre-slice); split the registry file in a hygiene pass.
4. Audit `pushWorkoutPlannerCoachReceipt` if a second planner surface ever mounts concurrently (module-level listener set assumes one active planner).
5. Consider surfacing last-weight chips in QuickLogMode + MobileWorkoutLogger (deliberately out of scope here).
6. 03 §4 chose 403 for foreign-client last-weights; the house IDOR posture elsewhere is 404-not-403 — align in a future security pass if enumeration risk matters for this endpoint.
7. Verify the `/last-weights` LIMIT bounds still hold once clients exceed ~300 sessions (oldest history falls out of the suggestion window by design).

## 11. Codex / AI review log
| Round | Reviewer | Verdict | Notes |
|---|---|---|---|
| S1–S6 checkpoints | Fable 5 (architect, per 07-checkpoints.md protocol: "Fable, or the strongest available Claude") | 6× PASS | Full log with drift notes lives in `BLUEPRINT-dictation-planner-logger-sync-2026-07-14/07-checkpoints.md` |
| R1 recursive hostile review (Sean-ordered) | Fable 5 | 5 fixes @ `3edc20fc9` | (1) server errors pass through dock/strip verbatim (`commandErrorReceiptText`); (2) dock hidden for client self-planner viewers + logger Dictate gated to admin/trainer; (3) swap/add re-match the plan post-await (deferred-search race regression test); (4) `planner_generate_workout` patterns planner-flavored so bare "generate a workout" stays with `build_workout_plan`; (5) dead as-prop cleanup. Gates: frontend 696/696, backend 5328/5328, tsc 0. |
| R2 recursive hostile review | Fable 5 | 2 fixes | Audit-record sign-off placeholder filled; ESM test `require()` → static imports. Code re-read of R1 hunks: clean. Merged `origin/main` (4 social/groups commits, zero file overlap with this feature); merged-tree gates: backend 5362/5362, tsc 0. |
| R3 recursive hostile review | Fable 5 | 1 fix | Root-caused the recurring combined-run failures properly: five heavy full-WorkoutLogger mount suites run ~3s isolated and tipped over vitest's 5s default under parallel-pool load (my two extra mount hooks nudged already-marginal tests). `vi.setConfig({ testTimeout: 15000 })` headroom added to those five files — latency hardening, not behavior masking; proven by two consecutive green 696/696 combined runs + build clean on the merged tree. |
| Post-deploy live-prod recursive review PD-R1→PD-R5 (2026-07-15, Sean-ordered) | Fable 5 | 5 fixes, all shipped main | Live QA in Sean's authenticated session exposed a PRODUCTION-WIDE Coach command outage (pre-existing, all client-less commands falling to the chat fallback) and walked the full chain: **PD-R1** `b9052cfff` ClassifiedIntentSchema rejected the literal `clientRef:null` the classifier prompt itself teaches — `.nullable()` + incident-payload regression suite (+ defused the adminPasswordSetupLinkService mocked-clock-vs-real-Date.now test time bomb); **PD-R2** `13452fcbd` `z.coerce` on 51 LLM-fed numeric fields ("sets":"3"), ScheduledSessionId string contract deliberately preserved; **PD-R3** `5cb24201a` classifier summary now appends `[params: ...]` from each zod shape — the model had been copying `{exercise}` pattern placeholders as param keys; **PD-R4** `5818003a5` dictated plurals resolve against singular library names; **PD-R5** `12dd2725a` same singularize fallback for IN-PLAN matching (PD-R4's own sibling-sweep miss, caught by the next live round). LIVE-VERIFIED at PD-R4 chunk: typed "add goblet squats, three sets of twelve" → `✓ Added Goblet Squat — 3×12` + Save lit. PD-R5 deployed (chunk `BBbbOlDB` serving, behavior test-pinned); interactive swap re-check owed by Sean. Diagnosis chain: fallback timing signature → `/api/ai-chat/diagnostics` → authenticated `/commands` → local replay of the real `classifyIntent` (env loaded in-script, never echoed). |
| Codex (rule 46) | — | not run | Isolated worktree session; Codex hostile review can be requested via review-queue before/after deploy. Gap recorded per rule 46 amendment (Fable is Final Decider; Codex input advisory). |

## 12. Sign-off
- **Commits:** S1 `567818956` · S2 `ce00205e3` · S3 `05e566228` · S4 `b039e1172` · S5 `e8c339cd3` · S6 `08042a5e0` · R1 `3edc20fc9` + R2 doc/test fixes — batch-pushed per Rule 70; Sean authorized the main push after the recursive hostile review ran dry.
- **Sean's sign-off:** PENDING — this record ships with the batch; Sean closes the phase after the §10.1 manual QA.
- **Next action pointer:** push → Render deploy → Sean runs §10.1 → optionally queue Codex hostile review via `.ai-workflow/coordination/review-queue.md`.
