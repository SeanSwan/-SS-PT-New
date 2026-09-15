# Frontend repair contract — Planner, Rolodex, Bootcamp and Sprint

Artifact: SWAN-AGENT-PLANNER-20260906-FRONTEND-14  
Version: 1.0 · Effective: 2026-09-13 · Owner: Sean · Architecture/adjudication: Astra  
Status: **CHOSEN TECHNICAL CONTRACT; IMPLEMENTATION NOT STARTED; REVIEW-CADENCE DECISION PENDING.**

This is the canonical frontend elaboration of [12-hostile-reconciliation-and-repair.md](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/12-hostile-reconciliation-and-repair.md). It supersedes that document's broad S2 frontend grouping and its tentative two-slice budget rationale. It does not change reviewer authority in [11-build-workflow.md](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/11-build-workflow.md), authorize a provider call, or supersede the backend contracts. [frontend-audit.md](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/tmp/rolodex-audit-evidence/frontend-audit.md) and [frontend-boundaries.md](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/tmp/rolodex-audit-evidence/frontend-boundaries.md) remain the preserved finding evidence, including rejected historical claims.

## 1. Baseline, preservation and scope

- Worktree: C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913; branch codex/rolodex-bootcamp-planner-20260913; source baseline c0cbe538d8ed2ca519bb494cdf3282bf43b76699.
- The primary audit inspected the store-upgrade worktree at the same commit; the supplemental audit and this contract inspect this repair lane. Old f8815a0b1 is historical only.
- Parent-owned baseline evidence in document 12 reports 124 frontend files / 627 tests PASS and 36 backend files / 369 tests PASS. This documentation task did not rerun application tests.
- At this task's inspection, git status showed the copied canonical blueprint directory untracked. No application changes were present. This file was absent and is being created, not overwriting an earlier version. Document 12 records verified preservation of the original packet. Parent must include this new contract in the next packet snapshot/manifest. Before the traceability correction, a local pre-edit copy was verified at tmp/rolodex-audit-evidence/14-frontend-repair-contract.pre-traceability.md with matching SHA-256 B8ADFAD097AD018795FF0B0F87286FA0BF783FFBC1A6940D984BA25FEBD85078; this is local artifact preservation only.
- The repo lane digest returned “not a git repository — no ledger” despite git commands resolving the linked worktree. This is a lane-tool limitation, not a clean-ledger receipt. The parent explicitly assigned this one file; no other agent-owned artifact is edited. Native hook execution is unverified.
- Preserve mounted admin/trainer Planner, Bootcamp and Sprint routes, current role gates, styled-components/world tokens, advanced controls, taught/history UI and saved-plan lifecycle. No resurrection of removed client planner code; no new API family or canonical writer.
- Product choice remains **Training Studio**, with **Program Map optional**. The map selects the same existing plan/day editor. This repair does not activate dormant multi-window audience code or introduce a broad theme redesign.
- No browser/private records, DB, provider, production, deployment, commit or push work is authorized by this documentation task.

## 2. Chosen ownership model: small identity owner, existing data hooks

A wholesale planner reducer migration is rejected. It is unnecessary for these fixes and would increase integration risk. Keep the existing orchestration and hooks as data owners. Add one small session/operation identity hook, proposed `usePlannerOperationContext.ts` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/usePlannerOperationContext.ts` — not committed; machine-local evidence), mounted once in [plannerContexts/useWorkoutPlannerOrchestration.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/useWorkoutPlannerOrchestration.ts). Its pure comparisons/types live in proposed `plannerOperationContext.ts` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerOperationContext.ts` — not committed; machine-local evidence).

The hook owns only identity/counters and pending-operation tickets. It does not own exercise arrays, generated plans, selected-client UI data, library cache, network clients or a second copy of the draft.

Conceptual contract:

~~~ts
type PlannerScope = {
  mountId: string;          // unique to this provider mount; never sent to a provider
  principalKey: string;     // current auth identity/role session, kept in memory
  clientId: number | null;  // positive integer when selected
  contextEpoch: number;     // accepted client/auth/route-context transition
  draftEpoch: number;       // accepted draft replacement/reset
  editVersion: number;      // semantic edit scheduled in the current draft
};

type OperationLane =
  | 'replace-draft' | 'save' | 'guided' | 'safety'
  | 'saved-list' | 'backup-read' | 'backup-write' | 'blend'
  | 'coach-edit' | 'pdf';

type OperationTicket = {
  scope: Readonly<PlannerScope>;
  lane: OperationLane;
  sequence: number;
  targetPlanId?: string;    // opaque UUID
  targetDay?: { weekNumber: number; dayNumber: number; dayIndex: number };
  expectedDay?: readonly unknown[];
};
~~~

**Decisions:**

1. Client selection remains owned by useWorkoutPlannerClientState. Its accepted selection path synchronously invalidates the identity owner **before** scheduling any React state updates. Route-driven/self-client changes use the same transition; a post-render effect is too late to be the only invalidator. Principal change and unmount invalidate every ticket.
2. A semantic local edit advances editVersion synchronously at the event/action boundary, before enqueuing existing setters. Do not increment counters from inside a React functional updater: React may replay it. Compatibility wrappers around editor setters are allowed; all mutation call sites must use those wrappers or a named guarded transaction.
3. Existing draft data stays in its present state hooks. A successful asynchronous full replacement validates the ticket against current identity and editVersion, then advances draftEpoch and applies all existing setters in one synchronous callback. No await may occur between admission and those setters. This is one guarded logical transaction, not a new state store.
4. Loads and all kinds of generation share the **replace-draft** lane, so a later load invalidates an older generation even if both target the same client. Separate lane counters prevent a list refresh from canceling an unrelated save. A newer operation in a lane supersedes the older one.
5. Read/list operations require matching mount/principal/client context and their lane sequence. Editor replacement additionally requires matching draftEpoch/editVersion. Row/day edits additionally compare the actual prev array/object inside the functional updater; an earlier queued edit cannot be overwritten.
6. A submitted save has special completion semantics in section 4: an edit made while saving can coexist with the saved response without being marked saved. Context replacement never adopts a departed save's result.
7. Begin/save admission uses an in-flight ref, not React busy state alone, to block same-tick duplicate submits. Disable the relevant UI action too. Cancellation invalidates a ticket before aborting the transport.
8. An outdated completion can finish server-side. It may invalidate an origin-keyed cache if one exists; it must not attach a loaded plan, clear busy state for a newer request, update B's list, reopen an old modal or issue a success receipt in the current context. Do not log client names or payloads to explain the discard.
9. Add an operation result union to action helpers: applied, stale, aborted, denied, failed, conflict, outcome-unknown. These are internal result categories. Product copy uses ordinary language.

### Responsibilities and adoption sites

| Existing owner | Repair responsibility |
| --- | --- |
| [useWorkoutPlannerClientState.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerClientState.ts) | Accepted client transition invokes context invalidation; keep existing roster/access logic |
| [useWorkoutPlannerPlanContentState.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerPlanContentState.ts) | Immutable loaded baseline, dirty signature and conflict state; no library/list ownership |
| [useWorkoutPlannerLoadPlanActions.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerLoadPlanActions.ts), [useWorkoutPlannerRoutePlanLoad.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRoutePlanLoad.ts) | Decode before replacement, context admission, route and manual load share confirmation contract |
| [useWorkoutPlannerGenerationActions.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerGenerationActions.ts), [useWorkoutPlannerGuidedCandidateActions.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerGuidedCandidateActions.ts), [workoutPlannerDebateResultHydration.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerDebateResultHydration.ts) | Guard every await/candidate/safety retry and all metadata/explanation writes, not just exercise arrays |
| [useWorkoutPlannerSavedPlansState.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSavedPlansState.ts), [WorkoutPlannerBackupPanel.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBackupPanel.tsx), [WorkoutPlannerBlendDialog.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.tsx) | Origin-keyed reads/mutations, immutable editor baseline, stale modal callback suppression |
| [useWorkoutPlannerAiEvents.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerAiEvents.ts), [useWorkoutPlannerSequenceEvents.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSequenceEvents.ts), [useWorkoutPlannerCoachSurface.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerCoachSurface.ts) | Capture client/plan/day identity; compare actual prev state at commit; scope receipt actions |
| [plannerContexts/WorkoutPlannerProvider.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/WorkoutPlannerProvider.tsx) and context types | Thread the small operation interface through existing contexts; do not expose unguarded new writers |

The inventory is part of acceptance: every asynchronous editor writer in these paths must be classified as full replacement, row/day mutation, baseline adoption, list read or origin-only receipt. A test of the identity helper alone does not close F1.

## 3. Immutable loaded revision and lossless prescription contract

Replace independently mutable loaded ID/name/signature state with a single immutable baseline value in the existing plan-content hook:

~~~ts
type LoadedPlanBaseline = Readonly<{
  clientId: number;
  planId: string;
  title: string;
  contentRevision: number;
  persistedContent: Readonly<Record<string, unknown>>;
  contentSignature: string;
}> | null;
~~~

The baseline is adopted only by successful admitted load, a successful admitted save response, or explicit successful conflict reload. A saved-list response, rename summary, activation, PDF completion, backup verdict or 409 currentRevision never updates it. Remove the orchestration fallback that reads revision from savedPlans or defaults it to 1.

Use the existing GET /api/workout-plans/:id record and POST/PUT response record. The decoder requires a valid opaque UUID, a positive integer contentRevision, matching authoritative userId/client ownership, and a supported planData shape. Missing revision means “Saved version could not be verified”; update stays unavailable until a fresh valid detail fetch. Do not invent revision 1. A legacy record can remain inspectable without allowing a blind overwrite.

Existing [workoutPlannerLoadPlanHydration.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerLoadPlanHydration.ts) remains the hydration boundary; [planDataBuilder.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/planDataBuilder.ts) remains the persistence builder. Proposed [workoutPlannerPrescription.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerPrescription.ts) centralizes only compatibility decoding/encoding. Do not fetch a separate catalog to guess what was saved.

### Field decisions

| Field | Chosen round-trip rule |
| --- | --- |
| exercise identity | Preserve saved exerciseId/exerciseKey as provided by the canonical library contract; distinguish local row/occurrence ID from exercise ID |
| sets/reps | Preserve supported numeric/string semantics; do not derive and overwrite one from display-only setScheme |
| rest | Zero is valid; use nullish/validated handling, never logical-OR fallback |
| tempo/notes | Preserve exact supported saved values through hydrate/edit/save; privacy sanitizers still run |
| intensity | Write optional typed intensityPercent and compatible intensityGuideline; finite values must satisfy existing accepted input bounds. Do not invent a new training prescription range |
| legacy intensity | Parse only the known complete percentage form, such as 85% 1RM; preserve unparsed original text in intensityGuideline, with numeric editor value unset |
| unknown intensity UI | Blank numeric input plus “Saved intensity: [original text]” or “Intensity not specified”; choosing a number is an explicit edit. New exercise defaults may still use existing phase defaults |
| exercise metadata/media | Preserve known saved fields; optionally enrich missing display fields by verified stable library ID. Unknown type/muscles/difficulty stay unknown, not compound/full-body/300 |
| generated programs | Preserve all supported weeks, day identity, prescription fields, rationale/known metadata and assignment semantics; do not collapse to one manual day |

Widen [WorkoutPlannerTypes.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes.ts) and hydration/encoding types where necessary to represent unset numeric intensity. Preserve compatibility in generation/guided/Coach helpers that intentionally create new prescriptions. A missing source value is not an error requiring 70%.

**Dirty signature:** derive from a deterministic normalized persistence projection, reusing the payload builder and privacy sanitizer. Include goal/category/phase/duration and every editable field actually persisted, including generated tempo/rest/intensity/notes, order and the empty-draft transition. Exclude server IDs/revision/timestamps, UI selection, request status, derived PDF metadata and catalog-only transient display enrichments. Freeze initial pristine signature for a new draft; deleting a previously saved final exercise is dirty even if that draft is not saveable. A server-sanitized round trip must not create perpetual false dirty state.

## 4. Save, copy, activation and load confirmation

### Existing API choices

| Intent | Request | UI adoption |
| --- | --- | --- |
| Create draft / save as copy | POST /api/workout-plans | Decode returned plan; adopt only for same client/draft; server forces draft |
| Update loaded | PUT /api/workout-plans/:uuid with expectedRevision from loaded baseline | Adopt returned record/revision; never guess increment |
| Activate saved version | POST /api/workout-plans/:uuid/status with action: activate | Update status/list only; baseline prescription and dirty state unchanged |
| Read/reload | GET /api/workout-plans/:uuid | Stage validated record, then replace only after confirmation/admission |
| Blend | POST /api/workout-plans/blend with UUID strings, picks and optional title | Refresh origin list; do not auto-load result over current draft |
| Promote backup | POST /api/workout-plans/:uuid/promote-backup | Refresh origin verdict/list; no implicit content save |
| Attach PDF | Existing protected per-plan PDF endpoint | Derivative status only, never evidence that current unsaved edits were saved |

Continue existing auth clients/role gates. Do not add a /v2 endpoint or direct DB writer. The server already returns the canonical plan from create/update. Expand [useWorkoutPlannerSaveActions.types.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSaveActions.types.ts) to decode those fields instead of dropping contentRevision and planData.

### Exact save transaction in the UI

1. Validate saveability and required identity. Capture ticket, selected client, loaded baseline, exact sanitized payload and submitted content signature. Capture immutable PDF input from that payload/returned record.
2. Submit once. Local edits may continue. Disable duplicate save operations for this draft until this one reaches a settled or outcome-unknown state.
3. If save succeeds with a valid returned record and same draft/client context, adopt that returned baseline. **Do not replace newer local editor content.** If editVersion advanced after submit, show “Saved earlier changes; newer edits remain unsaved” and compare current signature with the new baseline. This applies to a new draft created while the user kept editing too.
4. If the draft/client context changed, do not adopt the returned ID/revision/signature or status. Server success is not undone. An origin-scoped refresh must not call a current-client list setter.
5. Treat optional activation and PDF derivation as later suboperations. If create/update succeeded but activation failed, retain the saved ID/baseline and show “Saved as draft; could not make current.” Retry activation only; never repeat create. If PDF fails, show saved success with “PDF unavailable — Retry PDF,” scoped to the saved revision.
6. A response missing a valid saved record/revision is not permission to synthesize one. Use a bounded detail GET for the known returned ID. If verification fails, mark outcome-unknown and keep local work; no repeat POST is automatic.
7. A network failure after POST may hide a committed create. Show “Save outcome unknown — check Saved Plans” and refresh origin records. Do not claim unsaved, retry a create automatically, or use a matching title as proof of the exact save. Backend idempotency is a separate extension if automatic safe retries are desired.

### Conflict

A 409 enters conflict state tied to baseline planId/revision and local draft epoch. Ordinary Update and Update & Activate are disabled for that conflict. The server's currentRevision is advisory information only. Background list refresh is allowed but cannot advance the baseline.

Offer **Keep editing**, **Load saved version**, and **Save as copy**. There is no force-overwrite/“retry with latest revision” button in this repair. A comparison may show prescription differences, but an auto-merge is not required.

**Save as copy:** use the current local sanitized payload in POST /api/workout-plans, with the current origin client, status draft, a visible editable title defaulting to “[existing title] (copy),” existing authorship/assignment metadata, and no submitted plan ID/expectedRevision/primary-plan flags/PDF metadata. This saves current local edits; POST /:id/duplicate would copy the older server version and is deliberately not used. Successful copy adopts the new UUID/revision only if the same draft context still exists; later edits remain dirty. It does not activate, replace, delete or modify the conflicted original.

**Load saved version:** the confirmation names the loaded plan and states that local unsaved changes will be replaced. Fetch and validate before discarding anything. If the fetch fails/denies/malforms, the prior editor and baseline remain. At response arrival, if editVersion changed after confirmation, retain the candidate and ask again against the new edits; do not apply an old consent to new work. Only accepted replacement adopts the new record/revision and clears conflict.

### One guarded transition path

Extend [useWorkoutPlannerPageActions.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerPageActions.ts) and [WorkoutPlannerConfirmDialog.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerConfirmDialog.tsx) rather than adding browser confirm calls. All destructive entry points use a pending intent containing originating scope/version and exact target, not a closure that later reads “whichever client is current.”

| Trigger | Concrete choice and cancellation |
| --- | --- |
| Load card, route planId, backup Load | Name target plan. Dirty: Load plan / Keep editing. Fetch failure preserves old draft. Route changes cannot bypass the same gate |
| Client change / cross-client recommendation | Name target client in the existing private UI. Change client / Keep editing. Cancel preserves selected-client control value and draft |
| Single ↔ multi-week scope | Explain whether current content cannot be retained. Change scope / Keep editing. Apply scope + content reset together only after approval |
| Generate over existing draft | Confirm Replace after generation / Keep current. Keep current draft visible while pending. New local edits invalidate replacement admission |
| Return navigation | Use the existing planner navigation/confirmation path for unsaved draft; preserve role-safe returnTo validation |
| Conflict reload | Load saved version / Keep editing; separate Save as copy action |
| Stale confirmation | Close/invalidate it or require fresh confirmation; never execute an old target action in a new scope |

Loading the already loaded plan still requires confirmation when dirty. Selecting a day or opening Program Map is nondestructive and preserves the draft; it still invalidates any day-targeted action that lacks a matching captured target.

## 5. Generation, backup, blend, NBA and Coach decisions

- Capture generation overrides before changing UI defaults. The request input, displayed pending summary and accepted result refer to that same client/draft and same phase/equipment configuration.
- Guided candidates, safety-review acknowledgement and debate hydration carry origin tickets. Opening a candidate card after client/draft replacement shows “This suggestion belongs to the previous draft” with no Apply action. Never recycle an old safety acknowledgement for another request.
- Backup panel verdict state is keyed by client + read sequence. A loading/error verdict cannot support promotion or Load. Resetting the panel on client change is necessary but not sufficient: stale completions must be rejected.
- Blend IDs are opaque UUID strings, including the request, select values, result ID and fixtures. Keep week-count request cancellation. Reset choices only on an intentional new modal session or invalidated client identity, not every savedPlans array refresh. Freeze sources/picks for submission. A late success cannot close a newer modal session.
- NBA uses **only the selected client's roster entry and successfully loaded plans for that client**. While loading/failed/unknown, show “Checking saved plan” or “Saved plans unavailable.” This repair does not create roster-wide next-action recommendations or synchronize the global sidebar selector.
- Coach Add/Swap captures client, draft, exact selected day and editVersion before exercise lookup. Resolve exercise outside state update; validate identity then compare prev target rows inside the updater. A cleared plan or missing day yields a no-op failure receipt, not a non-null assertion or unhandled rejection.
- Rearrange/Undo uses the same actual-prev reference guard in generated days as in manual builder arrays. Undo is scoped to client/plan/day plus before/after row references. A same-batch edit invalidates it. Do not announce applied success until the state transition's accepted result is established; keep updaters pure.
- Extend [useWorkoutPlannerCoachSurface.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerCoachSurface.ts) receipt actions with origin context. At the planner boundary, stale receipts remain read-only history or are cleared; they cannot dispatch an actionable unscoped event. [CoachDock/useSurfaceCoachDock.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/CoachDock/useSurfaceCoachDock.ts) may accept an optional contextKey to reset/invalidate only the scoped consumer; preserve other surfaces' behavior. No global event-bus rewrite.
- Revalidate permissions on the backend as before. Frontend tickets prevent accidental misapplication; they are not authorization credentials and must never be presented as server security.

## 6. Rolodex and equipment

### Search

Keep [useExerciseSearch.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/useExerciseSearch.ts) as the public hook and /api/exercises/library as source. Keep cache local to the existing scope; do not introduce a persistent cross-account singleton.

Separate fetch from query: one initial catalog request per mounted consumer, plus explicit/staleness refresh; keystrokes do not recreate fetch callbacks. Track fetch sequence and catalogRevision. Search reacts to catalogRevision/query/category. Worker cache/search/results carry catalogRevision and searchSequence; ignore mismatches.

Share scoring/tokenization through a single pure core in [exerciseSearchWorker.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/exerciseSearchWorker.ts) or proposed `exerciseSearchCore.ts` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/exerciseSearchCore.ts` — not committed; machine-local evidence), used by worker and fallback. A worker crash terminates it and replays the newest query synchronously against the current catalog, settling busy state once. Do not silently reset search/category on load/retry. If an earlier cache exists and refresh fails, keep filtered cached results with a stale-data notice.

Public state may add loadState = loading | ready | empty | error | stale and refreshError. Propagate it through [useWorkoutPlannerRolodexState.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRolodexState.tsx), [WorkoutPlannerRolodexPanel.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerRolodexPanel.tsx), [ExerciseRolodexPanel.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx) and existing [NASMExerciseRolodex.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx). Distinguish catalog empty from filter empty. “No demo” is a short thumbnail-state badge in [ExerciseMediaPreview.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/WorkoutLogger/ExerciseMediaPreview.tsx); upload guidance stays in expanded detail.

### Equipment

Use explicit states:

~~~ts
type EquipmentAvailability =
  | { kind: 'unrestricted' }  // no selected profile; visible Open gym mode
  | { kind: 'loading'; profileId: number }
  | { kind: 'unavailable'; profileId: number; retryable: boolean }
  | { kind: 'verified'; profileId: number; availableTokens: ReadonlySet<string> };
type EquipmentRequirement = { anyOf: readonly string[] }[];
// Every group is required; at least one token in each group satisfies it.
~~~

Verified empty tokens means bodyweight-only equipment availability, not unrestricted. Bodyweight alongside band does not erase band. Bench + dumbbell is two required groups; an explicitly recorded dumbbell-or-kettlebell is one alternative group. Use exact normalized aliases from the shared backend vocabulary contract in document 12; no substring “ball” or “machine” compatibility.

[BootcampEquipmentProfileFilter.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampEquipmentProfileFilter.ts) consumes that normalized contract. While a selected profile loads/fails, browsing/details remain available but all profile-dependent Add/Generate/Apply mutations are blocked with reason and Retry. Manual/hybrid/Coach/drag or keyboard insertion converge on a guard in the parent addition/application path; filtering the visible list alone is insufficient. Existing draft remains visible with “Equipment needs recheck” until revalidated. Profile A→B invalidates old responses and old eligibility. Do not silently drop constraints on library/bridge fallback.

Shared normalization/API representation is a backend integration dependency, not permission for frontend builders to invent a contradictory token table. Typed synthetic fixtures can establish the frontend contract before that producer lands.

## 7. Bootcamp draft, live run and floor PDF

### Draft replacement and structure

[BootcampBuilderPage.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx) keeps the current class during generation. Store pending request/status separately; do not setBootcamp(null) before success. A result replaces only the originating draft/version after acceptance. Failure/cancel preserves exercises, metadata and selected controls.

For destructive station/slot/round/format changes, stage the requested configuration and show the exact consequence before clearing. Cancel restores both controls and draft. Non-destructive name/media changes do not alter run identity. A generation error does not trigger the empty-class initialization effect as recovery.

### Chosen Run lifetime

Move invocation/ownership of [useBootcampRunner.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampRunner.ts) above conditional Build/Preflight/Run presentation in BootcampBuilderPage. Pass its state/actions into [BootcampRunnerClock.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampRunnerClock.tsx) through [ClassPreviewPanel.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx) and [BootcampDemoMode.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampDemoMode.tsx). The hook can be adapted to accept a nullable explicit run snapshot; it must not auto-start because a view mounted.

A run snapshot contains an in-memory runId, frozen compiled segments, source draft identity/timeline fingerprint, startedAt, status, current segment/deadline and paused remaining duration. The existing adapter/timing core stays authoritative.

**Chosen semantics:**

- Start Class on valid Preflight creates one run. Repeated clicks while that run exists do not create another.
- Leaving Run for Preflight or Build **pauses the run at the exact command time** and releases screen wake lock. The compact class rail says “Class paused — Resume.”
- Returning to Run with an existing run is Resume, preserving the frozen snapshot. It does not restart.
- Draft changes while paused are for the next run. If timing/exercise structure differs, show “Current class uses the earlier plan.” Offer Resume current class and Restart with edited plan; restart requires a concrete confirmation.
- Metadata/media changes do not reset elapsed state. Prefer presenting media that belongs to the frozen run's occurrence identity; a replacement exercise in the editing draft cannot silently change the exercise being coached mid-run.
- Reconcile advanceRunnerState against one captured now before pause, skip or restart. When paused, Skip moves to the next segment **still paused** with its full remaining duration; Restart resets the current segment **still paused**. When running, those commands remain running. Completed is terminal until an explicit new run.
- Audio cues occur only for an accepted running segment transition; no duplicate cue due to rerender/checkpoint/view return, and no work cue during a paused edit.
- Refresh/route-remount recovery is **not claimed or added** in this surgical repair. No new localStorage persistence of class/client details. Leaving the page ends this in-memory timer and cleans capabilities; the Run UI states that limitation, with a native beforeunload warning while an unfinished run exists. In-page stage navigation is resumable. A durable restore/multi-window audience capability is a separate approved extension.
- Dormant runner/ConsoleView, AudienceView, runnerChannel, runnerCheckpoint and runnerActivation remain unmounted. Do not wire them merely to appear to satisfy a checkpoint test. Their identity/schema gaps are recorded in the supplement.

### Capability acquisition

[bootcampRunAcquisition.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/bootcampRunAcquisition.ts) returns run-generation-owned capability handles/status. Call optional browser acquisitions from the Start/Resume gesture, attach completion to that runId, and release every late sentinel whose generation was canceled. Do not overwrite a global sentinel and lose its owner. Use active/unsupported/denied/pending states, handle synchronous throws, and display a compact tools status with retry.

Visibility/release listeners reacquire only while the same run is still running and visible; otherwise do nothing. Cleanup removes listeners and releases owned resources exactly once. [useBootcampWorkflowStage.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/useBootcampWorkflowStage.ts) consumes capability status rather than voiding it. Fullscreen absence is unsupported, not successful acquisition. Timer operation remains available if optional capabilities fail.

### Media and PDF identity

The same exercise may occur more than once. Preserve distinct slot occurrence identity and catalog exercise identity. Preview error state includes the actual preview URL/version so replacing media retries it. Close/rebind an open video when its occurrence is removed/replaced; never relabel old video as the replacement movement.

Introduce a pure floor-script projection, proposed `BootcampFloorScript.ts` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampFloorScript.ts` — not committed; machine-local evidence), using [BootcampBoardViews.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBoardViews.ts), [BootcampBuilderPlacement.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPlacement.ts) and [BootcampClassPlanAdapter.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampClassPlanAdapter.ts). It supplies:
- main stations and sort order, declared rounds, per-slot work/rest and compiled runtime;
- one separate finisher section, if present;
- alternative and low-impact substitutions grouped under their linked source occurrence;
- unresolved media/equipment labels that do not certify readiness.

[BootcampBuilderPdfExport.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/BootcampBuilder/BootcampBuilderPdfExport.ts) forwards that projection; the Bootcamp path in [pdfExportService.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/services/pdfExportService.ts) renders it without reinterpreting exercise boards or recomputing time. Draft export is labeled as draft; an active run export uses its frozen plan and is labeled current class. No finishers duplicated into main stations. Unlinked legacy substitutions appear under “Unlinked alternatives — verify source,” not as extra required volume or guessed links.

## 8. Sprint transport, UI and cancellation

Keep existing /api/bootcamp/sprints route family and server ownership checks from the backend contract. Extend [useSprintAPI.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/useSprintAPI.ts) with a typed generation observer interface (start, reconnect, stopObserving); proposed pure parser `sprintEventStream.ts` (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/hooks/sprintEventStream.ts` — not committed; machine-local evidence) owns framing.

- POST /:id/generate starts once per intentional generation attempt. Validate status before reading; parse safe JSON error messages for 401/403/404/409/429/5xx. Require text/event-stream and a body.
- Parse SSE frames across arbitrary chunks, CRLF and multi-line data fields. Decode UTF-8 tail, ignore comments, validate known event payloads, preserve Last-Event-ID only after an accepted frame. Malformed nonterminal frames do not hide a later valid terminal frame.
- Require complete or error terminal event. EOF/empty body/invalid terminal is interruption, not indefinite generating or success.
- On an interrupted observation, settle visible busy state as disconnected/unknown and offer **Reconnect progress**, using GET /:id/generate/stream with the last accepted event ID. No automatic POST replay. One explicit reconnect attempt at a time; failure remains visible.
- Start/stop/reconnect is keyed to sprintId, page epoch and attempt ID. Back/select B/unmount calls stopObserving and invalidates callbacks before abort. This does not cancel the server job.
- Product action is **Stop watching**, not Cancel generation, unless a separately authorized backend cancellation endpoint is implemented. Copy says “Generation may continue; reconnect to check progress.”
- Page/detail/list/create/slot actions have their own pending/error status, not one hook-wide loading flag that can be cleared by another call. Preserve create inputs and existing slot data on failure. A successful old slot mutation may refresh only its originating sprint.
- A terminal error stays visible after busy clears. A terminal complete triggers an origin-scoped detail refresh; failure of that refresh shows generated status plus “Could not refresh details,” not a new generation button that repeats POST blindly.
- Retry mutation buttons issue only the explicitly requested action. Taught confirmation correctness/idempotency is server-owned and must be tested at that boundary, not faked by optimistic local counts.

[SprintPlannerPage.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerPage.tsx), [CreateSprintModal.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/CreateSprintModal.tsx), [SlotDetailPanel.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SlotDetailPanel.tsx), [SprintPlannerStyles.ts](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/SprintPlannerStyles.ts) and [BootcampCalendar.tsx](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend/src/components/SprintPlanner/BootcampCalendar.tsx) use native buttons for selectable cards/slots. No nested button inside a whole-card button. Retain Timeline and Calendar. Modal lifecycle uses the existing repo dialog primitive/lifecycle pattern (Radix is already installed), with title association, initial focus, trap, Escape, return focus and body-scroll restoration. Busy mutation may keep the dialog open while allowing observation to close; never let Escape submit. Focus/day toggles expose aria-pressed or native selection semantics.

## 9. Actual Bootcamp and Sprint wireframes

These are concrete layout contracts, not screenshots or rendered proof. The parent's current HTML preview covers Planner only; it does not count as Bootcamp/Sprint validation. Preserve current world/lens tokens. Text shown in brackets is an actual control.

### Bootcamp desktop Build / Preflight, 1440px+

~~~text
+--------------------------------------------------------------------------+
| Bootcamp Class Builder                 [PDF] [Teach me] [Saved classes]   |
| Build > Preflight > Run           Draft: Thursday Circuit  [Save class]   |
+----------------------+--------------------------------+------------------+
| Generate|Manual|Hybrid| Class: Thursday Circuit        | Selected exercise|
| Room [Studio A v]     | 4 stations x 3 slots x 2 rounds| Squat            |
| Equipment verified   | Total 48:30 [Review timing]    | Demo / No demo   |
| Stations [-]4[+]      +--------------------------------+ Equipment needed |
| Slots    [-]3[+]      | Station 1  3/3  [Select station]| Form / variants |
| Rounds   [-]2[+]      | 1. Squat    40s / 15s [..]     | [Add to station]|
| [Advanced settings]  | 2. Row      40s / 15s [..]     |                  |
| Search exercises ___ | 3. Carry    40s / 15s [..]     |                  |
| [filters]            +--------------------------------+                  |
| [No demo] Name [+]   | Station 2  2/3  [Fill slot]     |                  |
| Library error [Retry]| Alternatives: source -> option |                  |
+----------------------+--------------------------------+------------------+
| Draft preserved · Generating replacement... [Cancel replacement]         |
+--------------------------------------------------------------------------+
Preflight replaces the editor center with:
  [!] Station 2 needs 1 exercise        [Go to station 2]
  [OK] Equipment verified: Studio A     [Review equipment]
  [OK] Runtime 48:30, 2 rounds          [Review timing]
  [i] 2 exercises have no demo          [Review demos]
  [Back to Build]                                  [Start Class]
~~~

No-demo is informational unless an existing product rule requires video; occupancy/equipment blockers disable Start with a reason. Keep all advanced controls accessible rather than hiding them in a new workflow.

### Bootcamp mobile Build / Preflight, 320–414px

~~~text
+--------------------------------+
| Bootcamp     Draft    [More ...]|
| [Build] [Preflight] [Run]       |
| Studio A · Equipment checking  |
| [Retry] (if check fails)       |
| [Generate] [Manual] [Hybrid]   |
| Class settings [Expand]        |
| Station 1      3/3  [v]        |
| Squat       40s / 15s   [...]   |
| Row         40s / 15s   [...]   |
| Carry       40s / 15s   [...]   |
| Station 2      2/3  [v]        |
| [Add exercise -> library sheet]|
| Unsaved changes                |
| [Save class] [Review class]     |
+--------------------------------+
Library sheet:
  Exercises                    [Close]
  Search ____________________________
  [Equipment] [Muscle] [Clear filters]
  Error: Library unavailable [Retry]
  [icon / No demo] Exercise name
  Equipment summary    [Details] [Add]
Preflight:
  1 slot missing [Go to station]
  Equipment verified / Retry
  48:30 total · 2 rounds
  [Back] [Start Class: disabled reason]
~~~

Sheet fills at most the usable viewport, scrolls internally and clears sticky actions/safe area. At 320px labels wrap before controls shrink below 44px.

### Bootcamp Run desktop and phone

~~~text
DESKTOP
+--------------------------------------------------------------------------+
| Thursday Circuit       Running · Round 1 of 2            [Pause & review]|
| WORK                         00:28                   Ends about 10:48    |
| Next: 15s rest       [Pause] [Skip segment] [Restart segment]             |
| Tools: Audio on · Screen awake · Fullscreen [Tools]                      |
+---------------------------+---------------------------+------------------+
| Station 1: Squat          | Station 2: Row            | Station 3: Carry |
| demo / No demo            | demo / No demo            | demo / No demo   |
| 40s work / 15s rest       | 40s work / 15s rest        | 40s / 15s        |
+---------------------------+---------------------------+------------------+
| [All stations] [Focus station v]         In-page review pauses the class |
+--------------------------------------------------------------------------+

PHONE
+--------------------------------+
| Thursday Circuit [Pause/review]|
| Round 1/2 · WORK               |
|             00:28             |
| Next: rest 15s                |
| [Pause] [Skip] [Restart]       |
| Station 1 [v]   [Prev] [Next]  |
| demo or No demo               |
| Squat · 40s / 15s             |
| [Tools: audio unavailable]    |
+--------------------------------+
Paused rail after review:
  Class paused at Station 1, 00:28
  [Resume current class]
  Edited plan differs [Restart...]
~~~

Timer is visually dominant. Control labels reflect paused behavior; Restart does not silently resume. Optional capability errors stay visible without replacing the clock. No auto-playing audience window is added.

### Sprint desktop, 1440px+

~~~text
+--------------------------------------------------------------------------+
| Sprint Planner                                        [+ New sprint]    |
| [Back to sprints] Strength cycle · Sep 14–Dec 6      Draft / Generating   |
| [Timeline] [Calendar]     8/24 generated · 3 taught   [Generate remaining]|
| Generating: Week 4, class 2... [Stop watching]                           |
| OR Connection interrupted. Generation may continue. [Reconnect progress]|
+----------+---------------------------------------------------------------+
| Week 1   | Mon 14                 Wed 16                  Fri 18          |
| Phase 1  | [Full body]            [Upper emphasis]        [Full body]     |
|          | Generated · 48min      Taught · Sep16          Planned         |
+----------+---------------------------------------------------------------+
| Week 2   | [date / focus / state] [date / focus / state]   [...]           |
| Deload   | Prescribed facts; do not label an unimplemented volume change |
+----------+---------------------------------------------------------------+
Slot details (dialog / right-side presentation):
  Friday Sep 18 — Full body                                       [Close]
  Planned / Generated / Taught; equipment profile; actual prescription
  [View class] [Regenerate slot...] [Mark taught...]
  Error or denied reason here; old class remains on failed regeneration.
~~~

Existing Timeline/Calendar remain switchable. Generation progress belongs to the selected sprint. Slot actions do not change another sprint after navigation.

### Sprint mobile, 320–414px

~~~text
+--------------------------------+
| Sprint Planner      [+ New]    |
| [Back] Strength cycle          |
| Sep 14–Dec 6 · 8/24 generated  |
| [Timeline] [Calendar]          |
| Generating W4 class2           |
| [Stop watching]               |
| Week 1                        |
| [Mon14 · Full body            ]|
| [Generated · 48min            ]|
| [Wed16 · Upper · Taught       ]|
| [Fri18 · Full body · Planned  ]|
| Week 2 · Deload               |
| [date · focus · status        ]|
+--------------------------------+
Slot dialog:
  Fri Sep18 · Full body   [Close]
  Class summary / empty reason
  [View class]
  [Regenerate slot]
  [Mark taught]
  Could not save; previous state
  is unchanged.          [Retry]
~~~

Create dialog on both sizes contains Sprint name, calendar-only start date, duration, frequency/day toggles, focus choices, equipment profile, and the existing advanced options. First invalid field receives focus; inputs survive submission failure. Phone uses one column; desktop may use two columns without changing reading order.

### Cross-surface states, focus and recovery

| State | Bootcamp | Sprint |
| --- | --- | --- |
| Initial loading | Stable settings and class skeleton; library/profile states separate | List skeleton with named loading status |
| Empty | No class/exercises; Add or Generate | No sprints; Create sprint; empty slot shows Planned |
| Partial | Keep prior draft; unverified equipment/media explicitly labeled | Preserve generated slots and show unresolved slot/job state |
| Success | Save identifies saved class; Run continues its snapshot | Confirm/create/generate feedback belongs to current sprint |
| Denied | No leaked class details; return to allowed view | Access error before progress/private slot detail; Back available |
| Validation | Inline named error, focus relevant control | Inline named field/toggle group error |
| Failure | Keep draft and controls; Retry exact failed action | Keep inputs/slot content; terminal error stays after busy clears |
| Cancel | Cancel replacement drops result, not old class; review pauses timer | Stop watching aborts observation only; Escape closes dialog without mutation |
| Recovery | Retry equipment/library; Resume in-page run; explicit restart | GET reconnect; no repeated generation POST; origin-scoped detail reload |

Use native button activation (Enter/Space), visible focus rings and DOM order matching reading order. Dialog: accessible heading, initial focus, Tab containment, Escape cancellation, close-button label, return focus to trigger or logical surviving parent. Announce errors once with a polite status/alert appropriate to urgency; do not read every 100ms timer tick. Timer live announcements occur at segment transitions. Use text/icons as well as color. Honor reduced motion; pause incidental motion in reduced-motion mode without changing elapsed-time calculations.

Required viewport checks: 320, 414, 1024, 1440, 2560 and 3840px, plus 200% zoom and keyboard-only flow. Horizontal overflow is permitted only inside explicitly labeled scrollable timeline/calendar regions, never for page actions or dialogs. No footer may cover the final slot/action.

## 10. State/sequence diagrams and applicability

~~~mermaid
flowchart TD
 A[Capture client draft edit version] --> B[Begin operation lane ticket]
 B --> C{Current and allowed?}
 C -->|No| D[Show blocked reason preserve draft]
 C -->|Yes| E[Fetch or mutate]
 E -->|Abort or failure| D
 E -->|409| F[Conflict keep local baseline]
 F -->|Keep editing| A
 F -->|Save as copy| G[POST new draft once]
 F -->|Load saved| H[Confirm and stage GET record]
 H -->|New edits or failed GET| D
 H -->|Accepted valid record| I[Adopt content plus exact revision]
 G -->|Success current context| I
 G -->|Outcome unknown| J[Check saved plans no auto retry]
 E -->|Success| K{Ticket still current?}
 K -->|No| L[Origin-only result no UI adoption]
 K -->|Yes| M{Edits after submitted save?}
 M -->|Yes| N[Adopt saved baseline keep newer edits dirty]
 M -->|No| I
~~~

~~~mermaid
stateDiagram-v2
 [*] --> NoRun
 NoRun --> Running: Start valid frozen snapshot
 Running --> Paused: Pause or leave Run / reconcile now
 Paused --> Running: Resume same snapshot
 Paused --> Paused: Skip or restart segment
 Running --> Running: Skip or restart segment
 Running --> Complete: Reconcile final deadline
 Complete --> NoRun: End class
 Paused --> NoRun: Confirm end or restart
 Running --> NoRun: Confirm end
 NoRun --> [*]: Unmount
 Running --> [*]: Page leaves / release owned capabilities
 Paused --> [*]: Page leaves / no durable resume claim
~~~

~~~mermaid
sequenceDiagram
 participant Page as Sprint page
 participant API as Existing Sprint API
 Page->>API: POST generate once with authorization
 alt HTTP denied or JSON error
 API-->>Page: Error before SSE
 Page->>Page: Settle error preserve data
 else SSE accepted
 API-->>Page: Valid framed events
 alt terminal complete or error
 API-->>Page: Terminal event
 Page->>Page: Settle and origin-scoped refresh
 else EOF or disconnect
 Page->>Page: Observation interrupted
 Page->>API: User reconnects GET with Last-Event-ID
 end
 end
 Page->>Page: Back/select other sprint invalidates epoch
 Page--xAPI: Abort observation only
~~~

Mermaid source is supplied; it was not rendered in this documentation-only subtask. Parent must validate/render it in the canonical packet's existing diagram preview before claiming visual readiness. Existing document 12 ERD/permission matrix remains authoritative; this frontend repair adds no DB table or role. Trust boundary: synthetic tests exercise local UI and fake HTTP streams; real authorization/persistence is backend-owned. No provider, personal-agent capability, external egress or infrastructure deployment is added. Durable checkpoint ERD/migration is N/A because durable restore is explicitly out of this repair.

## 11. Bounded implementation steps and exact file ownership

“Step” is a small build/test unit; “review checkpoint” is a complete evidence packet admitted to the selected reviewers. They are not automatically interchangeable. Tests named below are proposed additions or extensions and remain NOT RUN. Extend existing tests beside their subject; avoid source-string-only tests as behavioral proof. Existing extraction tests may need accurate updates but do not substitute for mounted-hook tests.

| Step | Bounded production scope | Required exit evidence | Findings |
| --- | --- | --- | --- |
| FE01 Identity seam | Proposed plannerOperationContext/usePlannerOperationContext; orchestration and client-state wiring; plan-content/context types only as needed. No save/search/UI rewrite | Context/auth/unmount invalidation; edit-version-before-setter; latest lane guards; existing behavior stays green | F1 foundation |
| FE02 Load admission | LoadPlanActions, RoutePlanLoad, hydration decoder, PageActions, ConfirmDialog, plan-content baseline | A→B/reversed loads; failed/malformed/denied load preserves content; edits-after-confirm re-prompt; detail revision used | F1, F3, F10 |
| FE03 Save/lifecycle | SaveActions/types, SavedPlansState/types, SavePayload, SaveBar/binding/logic, conflict view proposed as WorkoutPlannerConflictPanel | 409→list refresh cannot advance token; save-copy POST; edit-during-save stays dirty; create succeeds/activate fails retries only status | F1, F3, F4 |
| FE04 Prescription codec | Prescription helper, Types, planDataBuilder, hydration and intentional new-exercise helper call sites | 40/70/85 + unknown text + zero rest + complete generated fields round trip; empty deletion dirty; server-sanitized baseline parity | F2, F10 |
| FE05 Generation admission | GenerationActions, GuidedCandidateActions/types/helpers, DebateResultHydration, generation-apply helpers and pending safety state | Same-client load vs generate race; A→B; candidates/safety/debate stale; canceled replacement keeps old draft | F1, F10 |
| FE06 Backup/blend | BackupPanel, BlendDialog, SavedPlansSection and origin-scoped callbacks only | Deferred A/B verdict/mutation; UUID body using server normalizer fixture; late success cannot close new dialog; picks survive list refresh | F1 extension, B1 |
| FE07 Coach mutations | AiEvents, SequenceEvents, CoachSurface, planner event types; optional scoped contextKey in shared dock only | Deferred lookup/client/day switch, null plan, same-batch edit/rearrange/Undo, stale receipt action, truthful no-op receipts | F1 extension, B6 |
| FE08 Context advice | CommandPanelV2 plus resolver integration input/tests | Selected B never shows A missing-plan claim; unknown/failed list is not empty; action cannot bypass dirty transition | B2 |
| FE09 Search engine | useExerciseSearch, exerciseSearchWorker and optional pure search core | Type/filter before load, refresh query, out-of-order fetch/worker, worker crash fallback parity and settled busy | F8 |
| FE10 Library state + compact media | RolodexState/Panel, Bootcamp ExerciseRolodexPanel/List, NASMExerciseRolodex, ExerciseMediaPreview | All consumers error/retry/empty/filter-empty/stale; current query retained; thumbnail No demo readable | F9, F11-adjacent visual H18 |
| FE11 Equipment admission | BootcampEquipmentProfileFilter, ExerciseRolodexPanel/List, SidePanels and parent add/apply guard; consume shared canonical normalization | Pending/error profile blocks mutation, A→B race, bench+barbell AND, explicit OR, bodyweight+band, verified empty | F5, H08 |
| FE12 Bootcamp draft preservation | BootcampBuilderPage, existing structure/slot action integration, scoped confirmation UI | Failed/canceled generation, structural cancel and edits-while-pending preserve draft/control values | F10 |
| FE13 Run continuity/time | useBootcampRunner, Runner.logic, RunnerClock, Page, ClassPreviewPanel, DemoMode, WorkflowStage props | Mounted Run→Preflight→Run; metadata rerender; frozen snapshot; delayed pause; paused skip/restart; no duplicate cues | B3, B4 |
| FE14 Run capabilities | bootcampRunAcquisition, WorkflowStage, compact runner tools status | Deferred late sentinel release, overlapping acquisition, denied/missing/throw, visibility lifecycle and unmount cleanup | B5 |
| FE15 Sprint observer | useSprintAPI and proposed sprintEventStream; minimal page observer ownership | JSON status errors; split frames/CRLF/EOF; one POST; GET reconnect; stop/unmount/A→B; correct terminal state | F7 |
| FE16 Sprint interaction | SprintPlannerPage/Styles, CreateSprintModal, SlotDetailPanel, BootcampCalendar | Keyboard journey, focus/return/Escape, per-action persistent errors, origin-scoped slot refresh, responsive dialogs | F11, F7 UI |
| FE17 Floor-script PDF | Proposed BootcampFloorScript, PdfExport wrapper, Bootcamp PDF service path, board/timing adapter seam | Main/alternate/low-impact linkage, finisher once, sort/round/runtime parity; actual rendered synthetic PDF QA | F6 |
| FE18 Surface polish | Bootcamp ClassRail/Chrome/Styles, Sprint styles, Planner V2Shell/Rolodex layout only where verified defects require | Six viewport captures + zoom/keyboard/axe; no role/control removal; Training Studio/optional Map maintained | H18 + wireframes |

References to files in this table resolve to the exact directories and linked files in sections 2–9. New files are explicitly “proposed.” Each step's builder handoff must expand these into a literal allowlist plus tests before editing. A step cannot silently absorb another row. A type-only/shared-prop bridge may be included if listed beforehand; behavioral additions require updating the step and its review scope.

FE01 does not need all F1 consumers migrated at once to prove the identity primitive; its receipt must say which consumers remain pending. FE03 depends on FE02 and FE04's persisted-signature semantics; FE04 can run before FE03. FE05/06/07 depend on FE01 and FE02's replacement path. FE11 depends on the backend/shared equipment schema decision, and FE17 on the backend preserved board/occurrence contract. FE13 uses existing timing generation and does not depend on dormant audience code. FE14 follows FE13. FE16 follows FE15. FE18 follows functional repairs and must not expand into a theme rewrite.

### Review groups by cohesive boundary, not by arithmetic

If the workflow explicitly permits tested internal steps within one reviewed slice, the technically coherent checkpoint candidates are:
- RG1: FE01–02, client/draft identity and admitted load.
- RG2: FE04 then FE03, persisted content/revision/save lifecycle.
- RG3: FE05–08, consumers of identity/mutation authority (split further if packet/diff exceeds a reviewer's useful bounded scope).
- RG4: FE09–11, catalog and equipment truth, including the backend normalizer contract.
- RG5: FE12–14, Bootcamp draft/run/capability lifetime.
- RG6: FE15–16, Sprint observation and interaction.
- RG7: FE17, floor-script export.
- RG8: FE18, mounted responsive/keyboard polish.

These are eight checkpoint candidates, not authorization to skip intermediate reviews required by the active controller. If per-step admission is required, use eighteen. Do not call all backend work S1 and all frontend work S2 merely to obtain a nine-call equation.

## 12. Review budget feasibility and pending decision

Active policy in document 11: each implementation slice **and final combined state** gets GLM 5.3 → GLM 5.3 Flash → Astra, at most three rounds/slice, twelve calls/task, one in flight, max 8000 output tokens/call, 600s/call; no paid fallback. The user has not answered the offered change to tested Luna steps followed by combined Astra review/repair. **That proposal is pending, not active.**

Let U be previously consumed task review admissions from the controller, N the required slice/checkpoint admissions and R extra three-seat repair rounds. The strict route needs **U + 3N + 3 + 3R** total admissions. Do not use the separate guard's 11/15 observation as U; it is a different counter and must be reconciled by the parent. Do not reset consumed calls or rename one task into several to evade the cap.

| Interpretation | Minimum fresh admissions, no retries | Fits twelve? |
| --- | --- | --- |
| Eighteen frontend steps each are a reviewed slice | 18×3 + 3 = 57 | No |
| Eight cohesive review groups explicitly allowed as slices | 8×3 + 3 = 27 | No |
| Two giant slices + combined final | 2×3 + 3 = 9 | Arithmetic only; rejected as a useful bounded review plan |
| Two genuinely bounded initial slices + final for that limited increment | 9, leaving one full round if U=0 | Only that limited increment; remaining task is still pending |

Backend repair adds checkpoints beyond the frontend counts. Even if a particular counter charged only the two GLM calls and excluded native Astra, eight frontend groups require eighteen GLM calls including final, still beyond twelve. Verify actual controller accounting; neither interpretation makes full scope feasible.

**Feasible choices require explicit authority:**

1. Keep default reviewer cadence and authorize a sufficient task budget/cap for the real checkpoint count, preserving history and per-call constraints. This document does not increase it.
2. Keep default cap and intentionally deliver a named limited increment of at most the admitted bounded checkpoints, with the rest pending. This cannot be presented as completing all requested repairs.
3. If Sean chooses deferred combined Astra: Luna executes bounded steps with RED→GREEN and step receipts; Astra reviews and repairs the exact final union plus critical real-boundary evidence. Proposed review cost is one initial native final-Astra admission plus explicitly recorded repair/review passes; no GLM calls under that override. Test/architecture steps are not hidden provider reviews. Use supported controller migration preserving original counters/history and unknown served-model metadata. Until authorized, this route cannot unlock implementation.

One final Astra pass is not a promise of completion: unresolved findings require repair/tests and re-adjudication against the new diff hash. Full DB/browser/provider claims remain separately gated. A source-audit response from this agent is not a served-model attestation or controller review receipt.

## 13. Test execution contract and evidence

All named F1–F11 and B1–B6 acceptance tests in the preserved reports remain required; none is superseded away by step grouping. Add these contract IDs for gaps clarified here:

| ID | Layer / fixture / action | Observable result and forbidden effect |
| --- | --- | --- |
| FE-C01 | Hook/component, deferred A and B responses plus same-client load/generate inversion | Only current ticket applies; no cross-client data/identity/status adoption |
| FE-C02 | Save hook, revision 1 detail, 409/currentRevision 2, list refresh | Baseline remains revision 1; no PUT with forged revision 2 |
| FE-C03 | Save hook, edit after POST before response | Saved baseline advances to returned record; local newer edits remain and dirty stays true |
| FE-C04 | Save hook, create commits then activation/PDF fails | Known draft ID retained; retry emits status/PDF action only, never second create |
| FE-C05 | Load component, confirm then edit while GET pending | No loss; new edits require new replacement confirmation |
| FE-C06 | Real codec + sanitized payload roundtrip, legacy intensity and unknown fields | No invented 70%, zero rest preserved, complete semantic signature |
| FE-C07 | Hook, generated day edit and Undo in one React act | New edit survives; expired receipt cannot claim mutation |
| FE-C08 | Blend component + canonical UUID normalizer fixture | Exact UUIDs pass; fake numeric fixture no longer masks failure |
| FE-C09 | CommandPanel component, selected B plus roster A | Chip scoped to B and known data only |
| FE-C10 | Worker/hook, controlled worker crash and reordered messages | Latest query returns identical fallback ranking and settles busy |
| FE-C11 | Bootcamp integration, pending/error/empty profile, duplicate add clicks | Dependent mutations blocked; no unrestricted fallback or duplicate placement |
| FE-C12 | Mounted Bootcamp, fake time/deferred capabilities, stage cycling | Frozen segment continuity, proper pause math, no leaked late lock |
| FE-C13 | Response/ReadableStream fixture, chunked HTTP/SSE errors and cancel | One POST, explicit GET reconnect, no stuck pending or stale callback |
| FE-C14 | React Testing Library + browser keyboard, modal and cards | Native activation, trap/return focus, no Escape mutation; error remains readable |
| FE-C15 | Floor-script unit + actual jsPDF output/render from synthetic class | Exact board/finisher/order/runtime parity; no clipped source labels |
| FE-C16 | Synthetic authenticated browser harness, six widths + zoom | All controls readable/reachable, no critical/serious axe violations attributable to changes |

Run targeted Vitest tests from C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913/frontend using the installed local executable, without package installation:

~~~text
node node_modules/vitest/vitest.mjs run <explicit owned test files> --maxWorkers=2 --reporter=dot
~~~

For each step, record actual command, expected RED assertion, actual failure output, patch/source hash and GREEN output. Setup/import failures are BLOCKED, never valid RED. Deliberate unimplemented RED tests stay in separately selected contract runs rather than contaminating the normal green suite. The combined gate includes the union baseline command from document 12, changed shared-library tests, type-check and build; avoid rerunning the full union after every trivial documentation change.

Mock HTTP is necessary for races but not proof of server authorization, plan normalization, row locking, DB transactions or real browser stream behavior. Add contract tests using actual pure normalizers/decoders and synthetic server fixtures. Real integration must use a positively identified disposable DB and synthetic client records. Parent owns that environment decision; an unreachable synthetic DB used for unit tests does not prove persistence.

Use existing local browser/PDF tooling only after bounded implementation authorization and test-fixture setup. Never exercise real-client generation or save just to get a screenshot. No provider call is necessary for SSE framing, equipment, identity, save or visual fixtures.

Performance gates: one initial catalog fetch per mounted consumer; no fetch per keypress; no duplicate POST on reconnect; worker failure settles latest search; bounded rendered library rows; no timer paints above existing 10Hz target; no per-tick screen-reader announcements; no event/listener/sentinel leak after unmount. Capture measured durations before claiming a numeric speedup.

## 14. Traceability, blockers, rollout and receipt

| Findings | Requirement in document 12 | Chosen contract / steps |
| --- | --- | --- |
| F1 + backup/Coach extension | R-H10 | §§2,4,5 / FE01–07 |
| F2 | R-H11 | §3 / FE04 |
| F3, F4 | R-H12 | §§3–4 / FE02–03 |
| F5 | R-H08 | §6 / FE11 |
| F6 | R-H16 | §7 floor-script / FE17 |
| F7 | R-H15 | §8 / FE15–16 |
| F8, F9 | R-H13 | §6 / FE09–10 |
| F10 | R-H14 | §§3–4,7 / FE02,04,05,12 |
| F11 | R-H17 | §§8–9 / FE16 |
| B1 | R-H21 | §§4–5 / FE06 |
| B2 | R-H22 | §5 / FE08 |
| B3, B4 | R-H23 | §7 / FE13 |
| B5 | R-H24 | §7 / FE14 |
| B6 | R-H25 | §§2,5 / FE07 |
| Domain visual upgrades | R-H18 | §9 / FE10,16,18 |

R-H21 through R-H25 are already registered in the updated canonical document 12; the table uses those IDs directly. R-H26 through R-H30 are backend boundary contracts and remain parent/backend ownership. F/B audit aliases are retained for evidence continuity.

**Actual blockers to declaring the whole build ready:**
- Review cadence/cap cannot cover the full bounded scope under the currently documented twelve-call default. The parent completed a native metadata probe and reports strict schema-3 actor evidence BLOCKED; unavailable served-model metadata must remain unknown. The offered review-route choice is still unanswered. A supported authorized migration can change the workflow policy, but this contract does not assume that authorization.
- Backend equipment requirement-group normalization and persisted substitution/board identity must be agreed and tested before dependent frontend integration is accepted. Frontend may implement fail-closed state handling with synthetic contract fixtures in the meantime.
- Executable RED acceptance evidence, rendered Bootcamp/Sprint wireframes/diagrams, and critical synthetic browser/DB/PDF integration evidence are not yet produced for the repairs. Existing 627 green tests do not close those gaps.
- H20 progression/deload numeric policy in document 12 remains a separate unresolved programming decision. This frontend contract displays known prescribed values; it does not invent new volume, impact or medical rules.

These are not additional blockers: a new theme, replacing the planner architecture, installing providers, implementing a multi-window audience framework or adding persistent checkpoints. None is needed for this repair's chosen behavior.

**Rollout/rollback:** Land bounded reviewed increments in the isolated repair lane. Preserve all user data and existing route/role gates. Roll back code by exact owned patch/commit, never by reverting saved client records or deleting taught history. Typed prescription fields are additive in existing planData JSON; keep the legacy guideline on writes for older readers. No schema migration is required by the frontend contract itself. New run state is in memory and disappears with cleanup; no browser-storage migration. Any backend schema addition remains separately reviewed.

Operational diagnostics should expose operation category/reason code, stale-discard count, stream interruption and capability state without client names, medical content, tokens, prompts or full plan payloads. Sean owns production rollout; this document authorizes none.

**Receipt for this task:** canonical contract created; previous reports preserved; full app edits/tests/provider calls NOT RUN. Technical choices are explicit and traceable. Implementation readiness remains conditional on the stated evidence and review-policy decision. Next useful authorized planning work is parent integration of this file into the existing packet plus bounded RED tests/wireframe rendering; no new competing packet or automatic permission loop is introduced.

