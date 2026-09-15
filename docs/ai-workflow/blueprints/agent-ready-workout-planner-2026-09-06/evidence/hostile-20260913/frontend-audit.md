# Frontend hostile audit — Rolodex, Bootcamp, Workout Planner, Sprint Planner

- Advisory verdict: **REVISE current main**
- Inspection baseline: **c0cbe538d8ed2ca519bb494cdf3282bf43b76699**
- Actual read-only inspection checkout: C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/store-upgrade-20260913
- Artifact and source-link checkout: C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913
- Link checkout HEAD verified identical to the inspection baseline before this artifact was written.
- Audit method: source inspection and route/consumer/model tracing. No app execution, DB, provider, network, or application-file changes.
- Test evidence supplied by parent: **627 frontend tests PASS across 124 files** in the dedicated repair lane. This audit did not independently execute those tests.
- The previous reviews were based on f8815a0b1, a materially diverged checkout. Their failures and implementation claims must not be applied to current main without revalidation.
- User-selected product direction: **Training Studio with optional Program Map**. Preserve existing roles, routes, advanced controls, and the current V2 mobile library sheet. No broad theme rewrite.

## Plain-English Summary

Current main already implements several things the earlier reviews said were missing: Bootcamp class logging/history, manual/hybrid equipment-profile plumbing, regeneration exclusions, and logger library-load errors. The old client workout planner has been removed and replaced by role redirects.

The highest-risk surviving defects concern saved data and asynchronous ownership. Old client responses can populate a different selected client's planner; manual intensity reloads as 70%; conflict handling can retry stale content with a fresh revision; and activating a plan can falsely mark unsaved edits saved. Bootcamp equipment constraints briefly disappear during profile loading, and exported PDFs mix alternate boards into main instructions. Sprint request failures can leave generation stuck.

## Canonical Surface Receipt

### Mounted frontend

- Admin planner, Bootcamp, and Sprint definitions: `UniversalDashboardLayout.routes.tsx:153` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:153` — not committed; machine-local evidence); trainer counterparts at lines 198–208.
- Those definitions are mapped into routes at `UniversalDashboardLayout.shellPieces.tsx:96` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:96` — not committed; machine-local evidence), with actual JSX mounting of Component at line 108.
- The shell is mounted by `UniversalDashboardLayout.tsx:192` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:192` — not committed; machine-local evidence); it passes the role-filtered route list.
- Planner entry `WorkoutPlannerPage.tsx:14` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:14` — not committed; machine-local evidence) mounts WorkoutPlannerProvider and WorkoutPlannerPageLayout.
- `useWorkoutPlannerOrchestration.ts:68` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/useWorkoutPlannerOrchestration.ts:68` — not committed; machine-local evidence) wires Rolodex; generation at 85; client state at 103; saved plans at 122; save actions at 134; load actions at 157.
- `BootcampBuilderPage.tsx:25` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx:25` — not committed; machine-local evidence) owns class state; side panels and ClassPreviewPanel are mounted at lines 225–282.
- `SprintPlannerPage.tsx:48` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerPage.tsx:48` — not committed; machine-local evidence) owns sprint selection and generation; CreateSprintModal and SlotDetailPanel are actual child mounts.
- The old pages/workout client planner is absent. `main-routes.tsx:310` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/routes/main-routes.tsx:310` — not committed; machine-local evidence) explains the excision and implements role-specific LegacyWorkoutRedirect.

### Consumer APIs and backend matches

- `useExerciseSearch.ts:102` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/useExerciseSearch.ts:102` — not committed; machine-local evidence): GET /api/exercises/library.
- `exerciseRoutes.mjs:480` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/exerciseRoutes.mjs:480` — not committed; machine-local evidence): authenticated library route; Exercise findAll and media formatting at lines 493–515.
- `useBootcampAPI.ts:79` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useBootcampAPI.ts:79` — not committed; machine-local evidence): POST /api/bootcamp/generate.
- `useBootcampAPI.ts:86` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useBootcampAPI.ts:86` — not committed; machine-local evidence): POST /api/bootcamp/save.
- `useBootcampAPI.ts:107` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useBootcampAPI.ts:107` — not committed; machine-local evidence): logClass API; useBootcampTaughtLog invokes logClass and getHistory.
- `bootcampRoutes.mjs:61` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/bootcampRoutes.mjs:61` — not committed; machine-local evidence): generation; save at 130; log at 162; history at 284.
- `useSprintAPI.ts:256` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useSprintAPI.ts:256` — not committed; machine-local evidence): POST /api/bootcamp/sprints/:id/generate; reconnect GET at 234.
- `sprintRoutes.mjs:127` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/sprintRoutes.mjs:127` — not committed; machine-local evidence): generation; reconnect stream at 177; slot confirmation at 243; regeneration at 256.
- `useWorkoutPlannerSaveActions.ts:98` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSaveActions.ts:98` — not committed; machine-local evidence): POST /api/workout-plans; PUT loaded plan at 129; activation at 161.
- `useWorkoutPlannerLoadPlanActions.ts:190` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerLoadPlanActions.ts:190` — not committed; machine-local evidence): GET /api/workout-plans/:id.
- `workoutPlanRoutes.mjs:294` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/workoutPlanRoutes.mjs:294` — not committed; machine-local evidence): detail; create at 468; update at 557.
- Mount order: `backend/core/routes.mjs:409` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/core/routes.mjs:409` — not committed; machine-local evidence) mounts workout plans; 439 mounts Bootcamp; 440 mounts Sprint; 767 mounts exercise routes. The inspected Bootcamp exact paths do not shadow Sprint generation paths. This was a narrow touched-route walk, not a whole-application shadow audit.

### Authoritative model fields inspected

- `WorkoutPlan.mjs:54` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/WorkoutPlan.mjs:54` — not committed; machine-local evidence): userId is the assigned client; trainerId at 60; planData JSONB at 137; contentRevision at 144.
- `BootcampTemplate.mjs:29` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/BootcampTemplate.mjs:29` — not committed; machine-local evidence): trainerId, name, classFormat, targetDurationMin, demoDurationMin, clearDurationMin, equipmentProfileId, participant capacities.
- `BootcampClassLog.mjs:23` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/BootcampClassLog.mjs:23` — not committed; machine-local evidence): classDate, actualParticipants, overflowActivated, exercisesUsed.
- `SprintClassSlot.mjs:22` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/SprintClassSlot.mjs:22` — not committed; machine-local evidence): sprintId, scheduledDate, classFormat, status, wasUsed, usedDate, exerciseKeys, generatedClassData.
- `BootcampSprint.mjs:18` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/models/BootcampSprint.mjs:18` — not committed; machine-local evidence): trainerId; sprint status at 63.

## Technical Summary — Findings, Contracts, Acceptance Tests

All findings below are verified from current-main source. None is claimed as reproduced through an authenticated browser or live database. Test cases are required additions, not completed results.

### F1 — P1: A previous client's asynchronous result can populate the newly selected client's planner

**Evidence**

- Client selector remains usable during requests: `WorkoutPlannerCommandPanel.sections.tsx:214` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanel.sections.tsx:214` — not committed; machine-local evidence).
- Client change clears displayed exercises and loaded identity but does not invalidate requests: `useWorkoutPlannerClientState.ts:105` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerClientState.ts:105` — not committed; machine-local evidence).
- Generation applies results without checking current client or draft identity: `useWorkoutPlannerGenerationActions.ts:167` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerGenerationActions.ts:167` — not committed; machine-local evidence), also plan application at 218–219.
- Saved-plan loading applies an awaited response unconditionally: `useWorkoutPlannerLoadPlanActions.ts:188` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerLoadPlanActions.ts:188` — not committed; machine-local evidence).
- Save completion writes snapshot and loaded plan identity after awaiting server work: `useWorkoutPlannerSaveActions.ts:168` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSaveActions.ts:168` — not committed; machine-local evidence).
- Guided candidates likewise apply responses without a context guard: `useWorkoutPlannerGuidedCandidateActions.ts:84` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerGuidedCandidateActions.ts:84` — not committed; machine-local evidence).

**Trigger and consequence**

Start generation/load for client A, switch to B, then resolve A. A's prescription appears under B's selected identity. A late save can restore A's loaded plan ID while B is selected, causing the next update to target the wrong plan. The same ownership issue reaches old guided options and pending safety-review retries.

**Repair contract**

Introduce a shared planner context identity/epoch across load, generation, guided candidates, safety-review state, save completion, and list refresh. UI mutations apply only when originating client and draft identity still match. Same-client competing loads/generations must be latest-request-wins. Preserve completed server saves, but do not attach their result to a different UI context. Do not rely only on disabling one dropdown: route changes and other context writers also exist.

**Acceptance tests**

- F1-T1: Deferred A generation → select B → resolve A; B exercises, phase, status, and identity unchanged.
- F1-T2: Deferred A saved-plan load → B selection → resolve A; B draft and loaded plan ID unchanged.
- F1-T3: Deferred A save → B selection → resolve A; server save may succeed, but no A loaded ID, saved snapshot, status, or list attaches to B.
- F1-T4: Same-client load 1 then load 2; resolve 2 before 1; load 2 remains.
- F1-T5: Client change invalidates guided candidates and safety-review acknowledgements from the previous context.
- F1-T6: Late old-context 409/list refresh does not replace the new client's list.

### F2 — P1: Manual plan loading silently changes prescribed intensity to 70%

**Evidence**

`planDataBuilder.ts:133` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/planDataBuilder.ts:133` — not committed; machine-local evidence) saves intensityGuideline from intensityPercent. `workoutPlannerLoadPlanHydration.ts:131` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerLoadPlanHydration.ts:131` — not committed; machine-local evidence) unconditionally restores intensityPercent as 70.

Hydration also replaces exercise metadata with synthetic defaults at lines 121–125: compound, Full Body, empty muscles, and difficulty 300.

**Trigger and consequence**

A saved 40% or 85% prescription reloads as 70%; a normal update overwrites the original prescription. The fallback metadata also misrepresents the restored exercise rather than preserving known catalog identity.

**Repair contract**

Persist a typed prescription and stable exercise identity; hydrate every supported prescription field losslessly. Parse existing intensityGuideline values through a bounded compatibility parser. Do not invent metadata when unknown. Catalog enrichment must preserve the saved prescription and should not rewrite old plans merely because catalog data changed.

**Acceptance tests**

- F2-T1: Manual save → load → save preserves 40%, 70%, and 85% semantically.
- F2-T2: Preserve zero rest, tempo, notes, sets, reps, stable IDs, and optional media.
- F2-T3: Legacy guideline parsing handles known percent format and malformed/missing values without pretending an authoritative value existed.
- F2-T4: Reloaded UI, save payload, and PDF display the same prescription.

### F3 — P1: Conflict handling advances the revision token without updating the stale draft

**Evidence**

`useWorkoutPlannerOrchestration.ts:139` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/useWorkoutPlannerOrchestration.ts:139` — not committed; machine-local evidence) derives loadedPlanRevision from the current saved-plan list. `useWorkoutPlannerSaveActions.ts:191` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSaveActions.ts:191` — not committed; machine-local evidence) refreshes that list on 409 while retaining the old draft. An ordinary retry then submits the refreshed revision with stale content.

Backend update correctly receives expectedRevision at `workoutPlanRoutes.mjs:577` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/backend/routes/workoutPlanRoutes.mjs:577` — not committed; machine-local evidence). The frontend bypasses that protection on its next attempt.

**Repair contract**

Capture revision with the actual loaded content snapshot. A list refresh must never advance the draft's revision baseline. Conflict state must preserve the local draft and require explicit reload/compare resolution before canonical replacement. Saving the local work as a separate draft is a valid preservation action.

**Acceptance tests**

- F3-T1: Load revision 1; server advances to 2; update receives 409; list refreshes to 2; retry remains blocked or sends 1.
- F3-T2: Only explicit resolution adopts revision 2; canceled review preserves local draft.
- F3-T3: Unrelated list refresh/rename must not silently change loaded content baseline.
- F3-T4: After successful save, revision is taken from the returned saved content, not a guessed increment.

### F4 — P1: Activating a saved plan falsely marks unsaved builder edits as saved

**Evidence**

`useWorkoutPlannerSavedPlansState.ts:87` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSavedPlansState.ts:87` — not committed; machine-local evidence) sends only a status activation; lines 93–95 set the saved snapshot to current draft content when IDs match.

**Trigger and consequence**

Load a plan, edit prescriptions, then activate the saved-plan card. The editor becomes clean even though its prescription edits were never persisted, weakening subsequent discard protection.

**Repair contract**

Status-only mutations must never alter the content baseline. Make Current may activate the saved version while the editor remains dirty; the UI must describe that distinction.

**Acceptance tests**

- F4-T1: Edit loaded prescription → activate saved card → isDirty stays true.
- F4-T2: Loading another plan still prompts about those unsaved edits.
- F4-T3: Status activation payload contains no implicit prescription update.
- F4-T4: Already clean activation remains clean without changing the snapshot.

### F5 — P1: Selected Bootcamp equipment constraints are bypassed during profile loading and settled matching is too permissive

**Evidence**

`ExerciseRolodexPanel.tsx:124` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx:124` — not committed; machine-local evidence) filters only when profileEquipmentLoading is false. While the selected profile request is pending, the full library remains selectable. At line 273 the list receives only library loading state. The add handler does not reject additions while profile truth is unavailable.

`BootcampEquipmentProfileFilter.ts:65` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampEquipmentProfileFilter.ts:65` — not committed; machine-local evidence) uses any matching equipment requirement. Lines 36–39 also classify any list containing bodyweight/none as bodyweight-only.

**Trigger and consequence**

A dumbbell-only environment accepts a bench+dumbbell exercise. During profile loading, an exercise requiring unavailable equipment may be added before filtering catches up. A bodyweight+band requirement passes as no equipment needed.

**Repair contract**

Loading or failed equipment truth must prevent profile-dependent additions and provide an actionable explanation. Require all mandatory equipment after canonical normalization. Represent alternative/optional equipment explicitly rather than deriving it from substring matches. Preserve the now-working manual/hybrid profile prop plumbing.

**Acceptance tests**

- F5-T1: Pending selected-profile request never allows an unverified addition.
- F5-T2: Profile failure is visible and retryable; no silent unrestricted mode.
- F5-T3: Profile A → B race cannot apply A's tokens to B.
- F5-T4: Dumbbell-only excludes bench+dumbbell.
- F5-T5: Bodyweight+band still requires band.
- F5-T6: Canonical singular/plural aliases work; genuine no-equipment movement passes.
- F5-T7: Add callback independently enforces constraint state, not only presentation filtering.

### F6 — P1: Bootcamp PDF prints alternate boards as additional main exercises

**Evidence**

`pdfExportService.ts:371` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/services/pdfExportService.ts:371` — not committed; machine-local evidence) groups every exercise by station without filtering board. `BootcampBoardViews.ts:17` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBoardViews.ts:17` — not committed; machine-local evidence) correctly distinguishes main, alternative, and lowImpact in the UI. PDF finishers are included in station grouping and printed again at line 407.

`BootcampBuilderPdfExport.ts:4` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPdfExport.ts:4` — not committed; machine-local evidence) forwards stored totals; the new ClassRail uses compiled runtime through `BootcampClassRail.logic.ts:79` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampClassRail.logic.ts:79` — not committed; machine-local evidence).

**Trigger and consequence**

A class with alternatives exports them as additional required station exercises, inflating the apparent workout. The floor PDF can disagree with Preflight/Run about exercise roles and timing.

**Repair contract**

Use the same board model and compiled timing as Preflight/Run. Print alternatives as source-linked substitutions, never extra required volume. Render finishers once. Expose rounds and preserve station sort order. Do not independently rederive a competing schedule inside PDF layout code.

**Acceptance tests**

- F6-T1: Main exercise, joint-friendly substitute, low-impact substitute, finisher appear only in intended sections.
- F6-T2: Substitution preserves source-exercise linkage.
- F6-T3: Compiled runtime equals exported runtime.
- F6-T4: Station order and within-station sort order match the UI.
- F6-T5: Render actual PDF fixture and inspect wrapped names, page breaks, and substitution labels.

### F7 — P1: Failed Sprint generation can leave the UI permanently Generating

**Evidence**

`useSprintAPI.ts:256` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useSprintAPI.ts:256` — not committed; machine-local evidence) passes the initial response to readStream without checking response status/content type. A 401/409/429/500 JSON response produces no SSE event. Empty body or clean EOF before a terminal event behaves similarly.

`SprintPlannerPage.tsx:81` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerPage.tsx:81` — not committed; machine-local evidence) clears generating only for complete/error events. The cancel closure returned by the click handler is not retained as effect cleanup. An old generation callback can reload its sprint after the user navigates back or selects another.

**Repair contract**

Validate initial HTTP status and stream content type. Require a terminal event or surface interruption. Own cancellation in a ref/effect and scope callbacks to the current sprint. Reconnect only eligible interrupted streams; never automatically repeat the generation POST. Preserve server job truth separately from whether the current page is observing it.

**Acceptance tests**

- F7-T1: Initial 409 JSON displays a recoverable error and clears busy state.
- F7-T2: 401, 429, 500, empty body, and EOF-before-terminal settle honestly.
- F7-T3: Split chunks and malformed events do not lose a valid terminal event.
- F7-T4: Unmount/back/A→B navigation releases observation; old events cannot reopen A.
- F7-T5: Retry/reconnect policy issues exactly one generation POST.
- F7-T6: Reconnect 404/401 displays its error, rather than silently reloading.

### F8 — P2: Active library queries can fail to run after initial loading or refresh

**Evidence**

`useExerciseSearch.ts:88` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/useExerciseSearch.ts:88` — not committed; machine-local evidence) captures query and changes identity on every keystroke, potentially starting several initial fetches. The effect at lines 205–219 skips search when cache is empty and does not depend on loaded-cache revision. Filling the cache does not rerun the active query. An earlier empty-query fetch can later overwrite results with the entire catalog.

Worker failure at lines 75–78 only nulls the worker ref; it neither replays the pending search nor clears busy state. Messages at lines 69–72 apply without request identity.

**Repair contract**

Separate catalog loading from query state. Search whenever catalog revision, query, or category changes. Guard fetch and worker results with latest request identity. On worker failure immediately complete the current search through the synchronous path. Share one ranking definition across worker and fallback.

**Acceptance tests**

- F8-T1: User types before first fetch resolves; final results reflect that query.
- F8-T2: User selects category before first load; result respects category.
- F8-T3: Refresh with nonempty query reruns search on the refreshed catalog.
- F8-T4: Out-of-order refresh responses and worker messages cannot regress results.
- F8-T5: Worker error during search produces matching fallback results and clears busy state.
- F8-T6: Worker/fallback parity fixtures cover names, initials, types, muscles, and empty query.

### F9 — P2: Library failure visibility is fixed only in the logger consumer

**Evidence**

Current useExerciseSearch exposes loadError and refresh, and NASMExerciseRolodex renders error/retry. `Bootcamp's consumer:77` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx:77` — not committed; machine-local evidence) and `planner's consumer:59` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRolodexState.tsx:59` — not committed; machine-local evidence) discard those fields. Their lists report no matches after a failed initial load.

**Repair contract**

Propagate library state through all consumers. Distinguish loading, failed catalog, truly empty catalog, and filtered-empty results. Retry must preserve the current query and filters.

**Acceptance tests**

- F9-T1: Initial HTTP error in all three surfaces shows error and retry.
- F9-T2: Successful retry restores the current filter/query.
- F9-T3: Empty catalog and zero filtered matches have distinct copy.
- F9-T4: A stale usable cache with failed refresh is identified as stale, rather than silently certified current.

### F10 — P2: Draft replacement and dirty-state contracts are incomplete

**Evidence**

`BootcampBuilderPage.tsx:166` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx:166` — not committed; machine-local evidence) clears the current class before generation succeeds; initialization seeds an empty class while the request runs. Failure loses prior work. Structure changes at 208–209 also clear the entire class immediately.

`useWorkoutPlannerPageActions.ts:78` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerPageActions.ts:78` — not committed; machine-local evidence) clears both plan forms on duration changes without using its existing confirmation mechanism. `planDataBuilder.ts:151` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/planDataBuilder.ts:151` — not committed; machine-local evidence) omits persisted goal/category/phase from content signatures; generated signatures omit tempo/rest/intensity/notes. `useWorkoutPlannerPlanContentState.ts:123` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerPlanContentState.ts:123` — not committed; machine-local evidence) treats deleting the final exercise as clean.

**Repair contract**

Keep the last draft until a replacement succeeds. Structural changes that discard work require concrete confirmation or a reliable undo path. Compute dirty state from normalized persisted content, including a transition to an empty draft. Current Training Studio controls should preserve user intent rather than resetting the editor as a side effect.

**Acceptance tests**

- F10-T1: Failed/canceled regeneration preserves prior class.
- F10-T2: Canceling a structure/duration change preserves draft and control values.
- F10-T3: Goal/category/phase-only edits are dirty when they affect persisted content.
- F10-T4: Removing the final exercise is dirty and triggers discard protection.
- F10-T5: Persisted generated-plan prescription changes are included in the signature.

### F11 — P2: Sprint cards/slots are pointer-only, and Sprint dialogs lack modal keyboard lifecycle

**Evidence**

`SprintPlannerPage.tsx:131` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerPage.tsx:131` — not committed; machine-local evidence) renders a clickable SprintCard. The timeline SlotPill at 229 is a styled div with only onClick. `SprintPlannerStyles.ts:276` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerStyles.ts:276` — not committed; machine-local evidence) confirms the div element.

`CreateSprintModal.tsx:88` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/CreateSprintModal.tsx:88` — not committed; machine-local evidence) and `SlotDetailPanel.tsx:141` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SlotDetailPanel.tsx:141` — not committed; machine-local evidence) claim modal dialog semantics without focus containment/restoration, Escape handling, or accessible title association. Day/focus toggles do not expose pressed state.

**Repair contract**

Use native buttons for selectable cards/slots. Reuse the established dialog lifecycle rather than introducing another bespoke overlay. Dialogs need accessible titles, focus entry/containment/restoration, Escape, and clear busy/error behavior. Toggles need selected-state semantics.

**Acceptance tests**

- F11-T1: Keyboard-only create → select sprint → select slot → confirm → close journey.
- F11-T2: Focus remains within dialog and returns to the invoking control.
- F11-T3: Escape closes without triggering mutation.
- F11-T4: Accessible names and pressed/selected states are asserted.
- F11-T5: Browser checks at 414px, desktop, QHD, and 4K; 44px targets and no clipped slot actions.

## Prior-Claim Disposition

| Prior claim | Current-main disposition |
| --- | --- |
| No frontend Bootcamp class logging/history | **REJECTED AS STALE.** BootcampTaughtPanel/useBootcampTaughtLog call the APIs. |
| Manual/hybrid equipment profile never reaches Rolodex | **REJECTED AS STALE.** Both prop paths exist. F5 is a different surviving constraint defect. |
| Bootcamp regeneration never sends exclusions | **REJECTED AS STALE.** Current page computes and sends main-board exclusions. |
| NASM Rolodex lacks load error/retry | **REJECTED FOR LOGGER; PARTIAL SURVIVAL.** Planner and Bootcamp consumers still discard these fields. |
| Old client pages/workout/WorkoutPlanner.tsx is mounted | **REJECTED AS STALE.** The directory is absent; main-routes implements role redirects. |
| Sprint UI hides errors | **CONFIRMED.** Page/create/slot detail omit hook error; stream errors disappear when generating clears. |
| Worker and synchronous ranking differ | **CONFIRMED.** Worker uses fuzzy type/muscle scoring; fallback uses substring checks with different weights. |
| Four previously failing frontend tests remain failures | **NOT TRANSFERABLE.** Parent reports current-main baseline passing. Do not repair stale extraction expectations blindly. |
| Sprint generation/stream lacks ownership checks | **SOURCE-CONFIRMED AT ROUTE LAYER.** Parent backend audit owns complete authorization adjudication. |
| Media readiness universally mislabeled | **OLD BROAD CLAIM REJECTED.** Current floor model counts actual media fields. URL reachability/playability was not verified. |
| Large backend vocabulary/progression/roster claims from prior reports | **OUTSIDE THIS BOUNDED FRONTEND ADJUDICATION.** Parent backend audit must verify on current main. |

Current source anchors for the repaired historical claims:

- `BootcampBuilderSidePanels.tsx:104` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderSidePanels.tsx:104` — not committed; machine-local evidence): manual profile; hybrid profile at 141.
- `BootcampBuilderPage.tsx:163` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx:163` — not committed; machine-local evidence): regeneration exclusions.
- `BootcampTaughtPanel.tsx:51` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampTaughtPanel.tsx:51` — not committed; machine-local evidence): taught UI and hook.
- `NASMExerciseRolodex.tsx:266` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx:266` — not committed; machine-local evidence): load error and retry.
- `BootcampDemoMode.floorDirector.ts:25` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoMode.floorDirector.ts:25` — not committed; machine-local evidence): media field readiness.
- `main-routes.tsx:310` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/routes/main-routes.tsx:310` — not committed; machine-local evidence): old client surface removal and redirects.

## UI/UX Upgrade Direction — Training Studio, Optional Program Map

These are prioritized product improvements for the authorized repair plan, not claims of verified browser appearance. Keep advanced controls and existing routes/roles. Do not replace the current design system or revive removed client planner surfaces.

1. **Training Studio identity and save strip.** Keep client, loaded plan, draft state, and save result together. A conflict offers a prescription-level comparison between local draft and saved version, with clear reload/preserve-copy actions. Do not expose implementation terminology unless needed for the user's decision.
2. **Optional Program Map.** Keep Training Studio as the working editor. The Program Map should be an optional overview for weeks, phases, deloads, and session placement; selecting a day returns the user to its actual editor. It must not introduce another canonical writer or hide existing advanced controls.
3. **Bootcamp Build → Preflight → Run.** Preserve ClassRail and the existing stage direction. Show occupancy such as 3/4 slots, equipment verification, compiled runtime, and substitution availability as actionable facts. Clicking a failed check focuses the relevant station/control.
4. **Sprint coaching timeline.** Use native interactive day cards showing date, focus, generated/taught state, deload status, and recoverable failure. Keep generation progress and errors together. Distinguish observing/canceling observation from canceling server generation.
5. **Rolodex decision support.** Preserve compact scan cards and current mobile sheet. Show required equipment, movement pattern, prescription defaults, and real media availability. Provide a clear select/add action and focused details without duplicating filter vocabularies.
6. **Coach floor PDF.** Main stations with rounds/timing, one finisher section, and source-linked substitutions. The export should be a faithful usable floor script, not a different interpretation of the class.

Recommended execution order: F1/F3/F4 ownership and save integrity; F2 round-trip fidelity; F5 equipment truth; F7/F8/F9 request/error behavior; F6 export; F10 draft preservation; F11 and the above focused UI upgrades. Parent may combine related slices where contracts remain bounded.

## Current-Main Component Inventory Inspected

### Active runtime code

- Dashboard route definitions, layout, shell, and shellPieces; role redirect logic in main-routes.
- WorkoutPlannerPage, WorkoutPlannerV2Shell, plannerContexts/useWorkoutPlannerOrchestration.
- useWorkoutPlannerClientState, useWorkoutPlannerGenerationActions, useWorkoutPlannerGuidedCandidateActions, workoutPlannerGenerationApply.helpers.
- useWorkoutPlannerSaveActions, useWorkoutPlannerSavedPlansState, useWorkoutPlannerLoadPlanActions, workoutPlannerLoadPlanHydration.
- useWorkoutPlannerPlanContentState, planDataBuilder, workoutPlannerSavePayload, useWorkoutPlannerPageActions.
- WorkoutPlannerCommandPanel.sections, WorkoutPlannerRolodexPanel, useWorkoutPlannerRolodexState; targeted references in builder/generated-plan components.
- BootcampBuilderPage, BootcampBuilderSidePanels, BootcampBuilderPlacement, BootcampBoardViews.
- ExerciseRolodexPanel, ExerciseRolodexList, BootcampEquipmentProfileFilter.
- BootcampClassRail.logic, BootcampDemoMode.floorDirector, BootcampDemoVideoModal, bootcampVideoEmbed.
- BootcampTaughtPanel, useBootcampTaughtLog, useBootcampAPI.
- BootcampBuilderPdfExport and the Bootcamp section of pdfExportService.
- SprintPlannerPage, CreateSprintModal, SlotDetailPanel, useSprintAPI; targeted Sprint styles and calendar references.
- NASMExerciseRolodex, useExerciseSearch, exerciseSearchWorker, ExerciseMediaPreview.
- Relevant backend mounts; exercise library, workout plan detail/create/update, Bootcamp generate/save/log/history, Sprint generate/stream/slot route handlers.
- WorkoutPlan, BootcampTemplate, BootcampClassLog, SprintClassSlot, and BootcampSprint authoritative field declarations.

### Historical/reference classification

- Prior review report and pasted attachment: advisory historical evidence from a diverged baseline.
- Old client pages/workout planner: removed runtime, preserved only as redirected legacy URLs.
- Agent-ready planner blueprint: governing planning reference supplied by parent; absent from the current-main inspection checkout at the old path. Parent owns preservation/reconciliation and the canonical addendum.
- graphify-out/graph.json: absent in the initially inspected old checkout. This bounded audit used direct source tracing; no graph generation or provider fallback occurred.

## Uninspected / Unverified Boundaries

- No authenticated browser walk, screenshots, responsive rendering proof, accessibility-tree inspection, or device performance measurement.
- No live DB vocabulary or participant-roster probes.
- No real HTTP save → reload → PDF round-trip.
- No actual PDF render/visual QA.
- No exhaustive timer/runner audit, full backup/blend audit, every Coach dock mutation, or all media trust-boundary helpers.
- No media URL reachability/playability tests.
- No complete backend authorization/security audit beyond the traced routes.
- No provider inference, paid calls, deploy, push, production checks, or production claims.
- Parent-reported baseline tests were not rerun by this read-only audit agent.
- Suggested acceptance tests are NOT RUN here.

## Preservation and Artifact Notes

The audit created only this report at the parent's explicit request. No application changes or optional probes were created. All source links target the dedicated repair lane at the same inspected baseline; subsequent repairs may shift line numbers, so retain the baseline hash when interpreting evidence.

Memory was used only to locate the canonical planner route/source-contract history (MEMORY.md lines 352–354, rollout 01a078bd-f78d-7c02-8996-0ba4b29dfbb2). Current findings were independently checked against current-main source.

