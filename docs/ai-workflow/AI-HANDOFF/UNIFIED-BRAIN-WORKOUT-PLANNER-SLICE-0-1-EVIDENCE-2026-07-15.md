# Unified Swan Brain + Workout Planner — Slice 0–1 Evidence

**Date:** 2026-07-15
**Branch:** `codex/unified-brain-20260715`
**Baseline:** `origin/main@df08bd556`
**Status:** evidence and reproduction gate; no product behavior changed
**Fable ruling:** `LOCK-WITH-CHANGES`; canonical route and failing boundary must be proven before implementation

## 1. Goal and evidence limitations

Sean reported that a Workout Planner command asking Swan Coach to rearrange a workout produced a wall of text instead of rearranging the plan. He also clarified that the same Swan brain appears in the Coach Command Center and must be aware of its host surface.

The promised previous-agent chat transcript and the exact verbatim failing command/output were not pasted into this task. The repository contains the previous implementation blueprint and audit record, which are used as the prior-build record:

- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/00-README.md`
- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/01-architecture.md`
- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/03-contracts.md`
- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/05-slices.md`
- `docs/ai-workflow/AI-HANDOFF/DICTATION-PLANNER-LOGGER-SYNC-AUDIT-RECORD-2026-07-14.md`

The representative reproduction phrase for the structural failure class is:

> Rearrange this workout into the best order for this client.

This is not represented as Sean's verbatim historical command. If the exact interaction is later supplied, it must be added as a regression fixture without replacing the structural fixture.

## 2. Hypothesis ledger

| ID | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H1 | Rearrangement is not a supported typed Planner mutation, so it falls through to chat and renders prose. | **Confirmed structurally** | `workoutCommands.mjs:318-421` registers only add, swap, remove, update, and generate. `aiCommandRoutes.mjs:184-194` returns `fallbackToChat: true` for chat/clarification. `useWorkoutPlannerCoachDock.ts:133-145` sends that fallback through chat and pushes its content as a receipt. |
| H2 | Two plan-edit pipelines exist and are competing. | **Confirmed** | Planner draft mutations use `/api/ai-command/execute` → `FRONTEND_DISPATCH` → browser `AI_PLANNER_*` events. Saved-plan edits use chat-authored `plan_edit` proposals → `/api/coach/proposals/:id/approve` → `coachPlanEditApprovalService.mjs`. They do not share one typed outcome/executor contract. |
| H3 | Parser/provider failures can silently become chat prose. | **Confirmed** | `intentClassifier.mjs:201-252` normalizes empty, invalid, or unparseable classifier output to `intent: 'chat'`; `aiCommandRoutes.mjs:184-194` then marks the turn as a chat fallback. |
| H4 | Planner generation ignores command-specific rearrangement/programming instructions and calls the current generic generation action. | **Confirmed** | `useWorkoutPlannerAiEvents.ts:254-257` acknowledges `AI_PLANNER_GENERATE`, shows “Generating a fresh workout…”, and invokes `onGenerate()` without consuming event detail. `WorkoutPlannerPage.tsx:169-173` binds it to the existing selected-client generation action. |
| H5 | The saved-plan `plan_edit` path is already a usable answer to the Planner problem. | **Killed** | `coachPlanEditApprovalService.mjs:84-92` requires `approvedItemIds`; `CoachActionProposalCard.tsx:118-125` calls `approveCoachProposal(proposal.id, reviewToken)`; `coachProposalService.ts:105-113` sends only `reviewToken`. No mounted plan-edit per-item selection was found. |
| H6 | Surface awareness is fully server-authoritative today. | **Killed** | `useCoachCommand.ts:110-118` sends a client-authored surface hint. `aiCommandRoutes.mjs:68-111` sanitizes only `source`, `intent`, and `surface`; it derives role from `req.user` but has no server capability envelope, plan entity, or plan version. |
| H7 | The existing Planner success receipt proves a saved mutation. | **Killed** | Planner event handlers mutate browser state and push application copy. The blueprint explicitly keeps Save/Update human-triggered. There is no persist → refetch → diff receipt in the Planner command path. |

## 3. Canonical Surface Receipt

### 3.1 Workout Planner mount and consumer chain

| Required link | Canonical evidence |
|---|---|
| Route component import | `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:64` lazy-loads `./Pages/admin-workout-planner/WorkoutPlannerPage`. |
| Admin mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:144` maps `/workout-planner` to `WorkoutPlannerPage`. |
| Trainer mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:174` maps `/workout-planner` to the same page. |
| Mounted JSX | `WorkoutPlannerPage.tsx:266-293` returns `WorkoutPlannerPageLayout`; `WorkoutPlannerPageLayout.tsx:201` mounts `WorkoutPlannerCoachDock`. |
| Command consumer | `WorkoutPlannerPage.tsx:171-172` mounts `useWorkoutPlannerCoachDock` and `useWorkoutPlannerAiEvents`. |
| Frontend API literal | `frontend/src/hooks/useCoachCommand.ts:110` posts to `/api/ai-command/execute`. |
| Command fallback | `useWorkoutPlannerCoachDock.ts:111-145` executes the command, dispatches typed frontend actions, or calls chat and renders chat content. |
| Backend mount | `backend/core/routes.mjs:651` mounts `aiCommandRoutes` at `/api/ai-command`. |
| Backend handler | `backend/routes/aiCommandRoutes.mjs:119` handles `POST /execute`. |
| Classifier/parser | `backend/services/ai/intentClassifier.mjs:106-187` classifies; `:201-252` contains chat fallbacks for parse failures. |
| Dispatcher | `backend/services/ai/commandExecutor.mjs:267` applies surface remapping; `:533-537` returns `not_wired` for `FRONTEND_DISPATCH`. |
| Planner event executor | `useWorkoutPlannerAiEvents.ts:79-272` applies add/swap/remove/update/generate to current browser state. |
| Save/persist consumer | `WorkoutPlannerPage.tsx:195-216` mounts the extracted save actions; persistence remains separate from the AI event. |

### 3.2 Coach Command Center mount and proposal chain

| Required link | Canonical evidence |
|---|---|
| Route component import | `UniversalDashboardLayout.routeComponents.tsx:68` lazy-loads `CoachCommandCenterPage`. |
| Admin/trainer/client mounts | `UniversalDashboardLayout.routes.tsx:103`, `:187`, and `:213` mount the same page at `/coach-assistant`. |
| Command-first/chat-fallback consumer | `coach-assistant/hooks/useCoachAssistant.ts:88-155` sends command candidates through `executeCommand`, then uses AI chat on `fallback_to_chat`. |
| Proposal API literals | `frontend/src/services/coachProposalService.ts:98`, `:111`, `:126`, and `:137`. |
| Backend proposal mount | `backend/core/routes.mjs:385` mounts `coachProposalRoutes` at `/api/coach/proposals`. |
| Backend proposal handlers | `backend/routes/coachProposalRoutes.mjs:20-55` exposes detail, approve, clarification-answer, and reject. |
| Saved-plan executor | `backend/services/ai/coachPlanEditApprovalService.mjs:75-139` validates approved item IDs, loads a client-owned saved plan, applies the approved subset, and updates `planData`. |

### 3.3 Authoritative WorkoutPlan fields

`backend/models/WorkoutPlan.mjs:47-150` declares:

`id`, `userId`, `trainerId`, `title`, `description`, `nasmPhase`, `startDate`, `endDate`, `durationWeeks`, `status`, `currentWeek`, `currentDay`, `planData`, `progressNotes`, `createdBy`, `metadata`.

Sequelize timestamps are enabled at `WorkoutPlan.mjs:151-163`, so `updatedAt` exists as a persistence-generated version candidate even though no explicit version column is declared.

## 4. Surface classification

| Surface/pipeline | Classification | Reason |
|---|---|---|
| `admin-workout-planner/WorkoutPlannerPage` at admin/trainer `/workout-planner` | **canonical** | Proven route mount and JSX chain above. |
| `/api/ai-command/execute` → Planner `FRONTEND_DISPATCH` → `AI_PLANNER_*` | **canonical for open Planner draft edits** | Mounted consumer; changes browser state; no direct persistence. |
| `/coach-assistant` → AI chat → `plan_edit` proposal → proposal approval API | **canonical but incomplete for saved-plan proposals** | Mounted command-center path and deterministic backend executor exist, but the mounted frontend omits required per-item approval IDs. |
| The two plan mutation paths considered as one brain | **competing/ambiguous** | They use different model contracts, context, executors, persistence semantics, and receipts. They must converge behind one server-derived outcome contract while retaining surface-specific capabilities. |
| `workout-design-lab` | **active runtime, separate product surface** | A visual style-lab route; not a plan-mutation consumer. Excluded from this goal. |
| Trainer `build-plan` / Forge routes | **active runtime, separate workflow** | Related workout creation surface, but the reported dock and typed Planner commands mount on canonical Workout Planner. No edits authorized until a caller requires it. |

## 5. Backend route ownership and shadow audit

For `POST /api/ai-command/execute`, mount order in `backend/core/routes.mjs` is:

1. `/api/ai` at `:644`
2. `/api/ai-chat/stream-spike` at `:649`
3. `/api/ai-chat` at `:650`
4. `/api/ai-command` at `:651` — owns the touched path
5. `/api` credits router at `:681`
6. generic `/api` router at `:765`

The sibling `/api/ai` mount does not match `/api/ai-command` under Express segment-boundary matching. Both `/api` mounts could prefix-match the URL, but they are later in mount order and are not the canonical owner because the `/api/ai-command` handler terminates the response.

For saved plan persistence, `backend/core/routes.mjs:353-356` mounts `/api/workout-plans`, legacy `/api/workout/plans`, `/api/workout`, and `/api/workout/sessions`. Any Slice-5 persistence change must enumerate the exact touched route and overlapping matches before editing it.

## 6. Non-destructive hygiene scan

The clean isolated worktree root contains the expected runtime directories (`backend`, `frontend`, `scripts`, `docs`, configuration, package files) plus tracked operational documents. No task-created screenshot, log, build output, or temporary root artifact exists.

Competing workout surfaces were inventoried with `rg` across frontend routes, backend services/routes, and active handoff docs. No file is moved, archived, or deleted in this goal. The shared checkout already contains an untracked dated hygiene inventory, so this scoped inventory is embedded here to avoid overwriting another agent/user artifact.

## 7. Slice 1 reproduction boundary

The structural reproduction is:

1. On the canonical Planner surface, submit a rearrangement mutation phrase.
2. The registered command vocabulary has no reorder/rearrange/restructure plan action.
3. Classifier `chat`, invalid output, or provider failure all resolve to the chat lane.
4. `aiCommandRoutes` returns `fallbackToChat: true`.
5. `useWorkoutPlannerCoachDock` calls the chat endpoint and renders the answer as text.
6. No `AI_PLANNER_*` event is dispatched, no plan state changes, and no saved plan is refetched.

The failing boundary is therefore **typed intent/outcome coverage before dispatch**, amplified by a **silent parser-to-chat fallback** and by the absence of a server-derived active-plan context envelope.

## 8. Slice 0–1 exit decision

- C1 dual-path hypothesis: **confirmed**.
- Wall-of-text mechanism: **confirmed structurally**.
- Canonical Planner path: **confirmed**.
- Exact historical provider response: **not available**; no claim is made about its wording.
- First RED fixture: must assert that a rearrangement request on `workout-planner` cannot resolve to chat/prose and must produce a typed plan-mutation outcome.
- First implementation act after RED: consolidate intent/outcome routing behind the shared command gateway; do not patch chat prose or add a forked Planner-only brain.

Hostile review round 1 found one receipt omission: the earlier route-shadow list omitted the intermediate `/api` credits mount at `core/routes.mjs:681`. The list above now includes every overlapping mount found for the touched command URL. Re-run of the cited `rg` evidence found no remaining inaccurate line reference or unsupported canonical-path claim.

No design/UI work is authorized by this receipt. No production data has been read or mutated.
