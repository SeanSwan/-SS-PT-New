# Canonical Training Plan -> Client Home + Schedule
## Fable AI Village Upgraded Implementation Prompt

Status: REVISED PLAN - approved architecture, implementation not started
Date: 2026-07-15
Owner: Codex solo review; Sean decision gates retained
Audited baseline: `origin/main@12dd2725a`
Source: Sean's attached `pasted-text.txt`
Fable judge: `anthropic/claude-fable-5`
Scope: audit/planning only; no runtime, production, data, billing, commit, push, or deploy action

## 1. Mission and verdict

Build one canonical training-plan system: staff author once; one active plan is assigned
to a client; today's prescription appears consistently in both client Home surfaces;
the plan projects into Universal Master Schedule (UMS) without fake appointments;
completion history survives plan changes; and a secure revision-aware PDF derivative
is maintained.

Do not merge the two Home compositions. Mount one shared `TodayTrainingModule` in
both verified hosts. This document supersedes the source brief.

**Fable verdict: REVISE the source plan; approve this corrected architecture for a
staged build.**

## 2. Non-negotiable outcomes

1. One authoritative active `WorkoutPlan` per client using the existing unique index.
2. `WorkoutPlan.planData` remains the public aggregate; normalized `WorkoutDay` and
   `WorkoutExercise` rows stay synchronized.
3. Each prescribed-content change produces deterministic `contentRevision` and
   SHA-256 `contentHash`.
4. Completion stores assignment identity, prescribed revision/hash, and a compact
   immutable prescription snapshot; history never silently rewrites.
5. Plan PDFs are server-owned derivatives. Browser save never creates a second copy.
6. A manual custom PDF is never silently overwritten.
7. Plan dates use the client's validated IANA timezone, not server UTC slicing.
8. UMS projections are read-model objects, never synthetic `Session` rows.
9. AI may draft/suggest; only an explicit authorized action mutates an active plan.
10. Release is flagged, observable, reversible, and sends zero PII to AI models.

## 3. Audit corrections to the source plan

- `/user-dashboard` does not use `useCurrentClientWorkout`; canonical `HomeTab`
  uses `useWorkoutSessions` and `HomeTrainingCommandStrip`.
- `/dashboard/client/overview` is a second canonical Home host and
  `ClientDashboardHomeTab` does use `useCurrentClientWorkout`.
- Server create/update already regenerates a PDF, while the browser generates and
  uploads again. The defect is a double-write/race, not missing auto-generation.
- Existing upload already enforces 20 MB, PDF MIME, `.pdf` filename, and `%PDF-`
  magic. Preserve it; malware quarantine is an optional enhancement.
- The stack is PostgreSQL + Sequelize, not MySQL. Reject MySQL migration syntax.
- Shared persistence already writes aggregate `planData` plus normalized rows.
- Current status is active/paused/completed/draft; "archive" currently drifts between
  completed and paused-plus-metadata.

## 4. Canonical Surface Receipt

| Contract | Evidence |
|---|---|
| `/user-dashboard` route | `frontend/src/routes/main-routes.tsx:733-752` |
| User dashboard mount | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:124,170` -> `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:146` |
| User Home consumers | `frontend/src/components/UserDashboard/components/HomeTab.tsx:17,24,99,210` |
| Second Home route | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:194-195` |
| Second Home consumer | `frontend/src/components/UserDashboard/components/ClientDashboardHomeTab.tsx:53,88` |
| Client Hub route | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:108` |
| Client Hub chain | `frontend/src/components/DashBoard/workspaces/ClientsWorkspaceTabs.tsx:17,60` -> `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabContent.tsx:267` -> `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:24-25,90` |
| Exact plan-list path | `frontend/src/components/DashBoard/workspaces/clients-team/tabs/ClientWorkoutPlansPanel.tsx:190`: `/api/workout-plans/client/${safeClientId}` |
| Planner routes/mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:144,174`; `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:64` |
| UMS route/mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:126`; `frontend/src/components/Schedule/UniversalSchedule.tsx:61-64` |
| UMS appointment path | `frontend/src/services/universal-master-schedule-service.ts:91-105`: `/api/sessions` |
| Plan route mounts | `backend/core/routes.mjs:353-361,536,644` |
| Canonical handlers/model | `backend/routes/workoutPlanRoutes.mjs:375-490`; `backend/models/WorkoutPlan.mjs:46-150` |
| Assignment/completion | `backend/services/clientTrainingReadModelService.mjs:223-245`; `backend/services/clientTrainingAssignmentCompletionService.mjs:39-59` |
| Protected PDF content | `backend/services/workoutPlanPdfContentService.mjs:86-113` |

## 5. Surface classification

| Surface | Classification | Evidence-based role |
|---|---|---|
| `HomeTab` | canonical | Mounted by `/user-dashboard` |
| `ClientDashboardHomeTab` | canonical, competing behavior | Mounted by `/dashboard/client/overview` |
| `ClientObservatoryHome` | dormant/legacy for this slice | Not in either verified Home chain |
| Admin `WorkoutPlannerPage` | canonical | Mounted admin/trainer planner |
| `components/Admin/WorkoutPlanBuilder` | legacy | Not verified planner mount |
| `WorkoutManagement/WorkoutPlanBuilder` | active secondary | Client Hub architect |
| `UniversalSchedule` | canonical | Verified UMS wrapper |
| `useCalendarData-SAFE-BACKUP` | QA/backup orphan candidate | Not canonical; no cleanup here |

If route evidence changes, stop and update the receipt/classification before coding.

## 6. Locked domain contract

### Plan identity, lifecycle, revision

- Preserve/test the existing one-active-plan-per-user unique index. UI "Primary" means
  active; do not add a second primary flag.
- Add explicit archived lifecycle plus `archivedAt`/`archivedBy`. Inspect the live
  PostgreSQL enum/type first. Use a forward-safe type swap or status-table migration;
  rollback is an app flag/read-path rollback, not a destructive enum-down. Archive
  preserves completions and the last valid derivative.
- Target `workout_plans`: `content_revision INTEGER NOT NULL DEFAULT 1` and
  `content_hash CHAR(64) NOT NULL`. Expand nullable first, backfill, verify, then enforce.
- Hash prescribed content only: stable keys, normalized arrays/numbers, no volatile
  metadata. Title/branding changes do not revise prescription; they produce a distinct
  PDF `renderHash` and derivative request.
- Prescribed mutations require `expectedRevision`; stale writes return
  `409 REVISION_CONFLICT`, never silent auto-merge.
- Backfill in bounded batches, verify hash determinism twice, and use a dual-read/
  dual-write rollout until parity passes.

### Assignment, completion, timezone

Assignment key:
`planId + dayKey + scheduledDate + occurrenceIndex + prescribedRevision`.

Completion stores plan/day/assignment IDs, client-local scheduled date, prescribed
revision/hash, compact exercise prescription snapshot, idempotency key, and timestamp.
Never copy client names/PII into model prompts, generic metadata, or logs.

Add a validated IANA client timezone. Plan dates are anchored to that zone. Appointment
times remain anchored to their stored session zone and may display in viewer-local time
with an explicit label. Trainer timezone never changes client plan date. Backfill from
an approved account default; never guess from server location. Remove UTC date identity
from `backend/services/clientTrainingReadModelService.mjs:25,29` and
`clientWorkoutRoutes.mjs:50,67`.

## 7. PDF derivative state machine

Create `workout_plan_pdf_derivatives` with plan ID, source revision/hash, render hash,
source type (generated/manual), state (pending/rendering/ready/failed/superseded),
idempotency key, safe error code, storage key, byte size/checksum, audit fields, and
optional `needs_review`.

Rules:

1. Commit plan first; in the transaction record a durable derivative/outbox request.
2. Worker renders post-commit and promotes only when revision/content/render hash
   and lifecycle still match. Archive/new revision supersedes the result.
3. Generated idempotency key:
   `planId:contentRevision:renderHash:rendererVersion`.
4. Retain the last ready generated file until replacement is ready.
5. Manual PDF remains current after edits; show "Custom upload - review after plan
   changes" and "Generate Current PDF".
6. Client receives protected view/content only, never storage object key.
7. Preserve size/MIME/extension/magic controls. Add malware quarantine only with an
   approved policy and failure UX.
8. Use bounded retry/backoff. Failed is never an archive state.
9. Remove browser generation/upload from
   `frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerSaveActions.ts:100-121,143,161,191-192` only after server tests
   are green.

## 8. Writer consolidation matrix

| Writer | Current defect | Target |
|---|---|---|
| Canonical POST/PUT | Server refresh + browser duplicate | Domain mutation + one post-commit request |
| Duplicate `backend/routes/workoutPlanRoutes.mjs:807-846` | Clears PDF; draft | Revision/hash; defer PDF until activate/explicit generate |
| `aiDataWriteService.mjs:625-651` | Direct write + PDF side effect | Domain mutation; enqueue after commit |
| AI generation/approve | Plan write, no PDF | Domain mutation; enqueue on activation/approval |
| Backup create/refresh | No PDF | Draft-safe; generate on activation/request |
| Blend | No PDF | Draft-safe; generate on activation/request |
| Backup promotion `backend/services/backupPlanService.mjs:177-229` | Lifecycle drift/no repair | Atomic activate + ensure derivative |
| Legacy `workoutService.createWorkoutPlan` | Old-looking contract | Prove mounted caller before adapt/retire |

After the domain service lands, prescribed content has no direct route/service writes.
A repo-wide writer contract test enforces the boundary.

## 9. API and UMS contracts

- `POST /api/workout-plans`: validated draft/create; returns revision/hash and
  derivative summary.
- `PUT /api/workout-plans/:id`: prescribed changes require `expectedRevision`;
  conflict returns 409.
- `POST /api/workout-plans/:id/status`: explicit activate/pause/archive/complete
  transition with authorization and audit receipt.
- `POST /api/workout-plans/:id/pdf/generate`: idempotent recovery/explicit generate.
- Existing protected PDF content remains the view/download boundary.
- Add top-level `GET /api/training-plan-projections`; do not nest under broad
  workout mounts or `/:id`.
- Require bounded `from`/`to` (maximum 90 days). Staff may request authorized
  client IDs; client requests self only.
- Projection returns assignment key, labels, client-local date, revision/hash,
  completion, and conflict annotations. It is read-only.
- Render projections as a distinct UMS layer beside appointments. Same-day objects
  may group visually but never merge identity, edit, billing, or drag/drop behavior.
- Persistent skip/miss/reschedule/replace override ledger is a later phase; until
  approved, projections remain honestly read-only.

Before route code, list every matching `app.use` and router handler in mount order
for the touched and revealed overlapping paths.

Staff plan cards are non-interactive containers; use explicit 44 px View Plan, Edit in
Planner (with return path), View PDF, and Generate Current PDF actions. Never nest
buttons/links inside a card-wide button. Show current, generating, failed, stale, and
custom-review PDF states with honest recovery.

## 10. Client Home design gate

One `TodayTrainingModule` serves both Home hosts and covers today/rest/recovery/
loading/error/empty/completed states; plan/day label; concise exercises; revision/PDF
truth; and 44 px actions for Log Workout, View Plan, View Schedule.

Before UI code, Sean chooses or combines Swan-routed directions:

A. **Training Command Strip** - compact priority card, progress pulse, detail drawer.
B. **Plan Arc Console** - today-first card plus restrained seven-day arc.
C. **Calendar Twin Lane** - today card with separate appointment/planned lanes.

External-reference receipt: `[MOBBIN UNAVAILABLE]` unless connector is live. Swan
docs govern; Fable palette ideas are non-authoritative. Use Crystalline tokens,
styled-components, Victory, dark-first, Dual-Button Glow, WCAG, reduced motion, and
no hover-only/pointer loops. Verify 320, 375, 414, 768, 1440, 2560x1440, 3840x2160.

## 11. Safe build sequence

0. Clean-baseline reconciliation: isolated current `origin/main` worktree; repeat
   surface receipt and writer grep because shared tree is dirty.
1. Contract locks: failing tests for writers, unique active plan, revision conflict,
   hash, timezone, double-write, completion snapshot.
2. Domain mutation: one aggregate+normalized transaction; migrate canonical writers
   without UI behavior change.
3. Revision/hash migration: additive fields, batch backfill, parity telemetry,
   enforcement after clean dual-read/write.
4. PDF state machine: durable request, worker, provenance/manual preservation,
   browser double-write removal, recovery/backfill.
5. Staff actions: lifecycle/conflict/PDF UX; hold Sean design checkpoint.
6. Shared Today module: one read model, two verified mounts, feature flag/fallback.
7. Schedule projections: bounded endpoint plus separate UMS layer.
8. Override ledger only after product semantics/audit ownership approval.
9. AI suggestions: zero PII, draft/suggest, explicit human approval.
10. Release: hostile review, migration rehearsal, responsive QA, canary, rollback drill.

Each phase deploys/reverts independently. Do not combine schema, writer consolidation,
PDF cutover, two Home mounts, and UMS projection in one push.

## 12. Required evidence

- RED-first unit/API/integration tests for each contract.
- Stable hash, revision/lifecycle, derivative retry/idempotency, archive/render race.
- Self/staff authorization, cross-client denial, 90-day bound, 409 conflict, protected
  PDF content.
- Every Section 8 writer synchronizes aggregate/rows and emits correct derivative intent.
- DST spring/fall, UTC boundary, trainer/client zones, invalid zone.
- Old completion renders original prescription after plan edit.
- Both Home hosts use the shared module with all honest states and no request loop.
- UMS appointments/projections coexist without identity/edit/billing leakage.
- Keyboard/screen reader/focus/44 px/4.5:1 plus full responsive browser receipts.
- Fresh type-check/build, targeted frontend/backend tests, proportional full suites,
  Rule 42 backend drift checks, secret scan, repeated surface/route-shadow receipts.

## 13. Rollout, observability, rollback

Flags: `TRAINING_PLAN_REVISION_WRITES`, `TRAINING_PLAN_PDF_DERIVATIVES`,
`CLIENT_TODAY_TRAINING_MODULE`, `TRAINING_PLAN_SCHEDULE_PROJECTIONS`.

Validate baseline, then gate on: PDF terminal failures <=1% over last 100 jobs; oldest
pending/rendering <5 minutes; projection p95 <500 ms for bounded production-like
windows; zero unauthorized cross-client responses; zero aggregate/normalized hash
mismatches; no duplicate current derivative per plan revision/render hash.

Flags disable new paths without dropping columns/rows. Keep old reads until parity.
No destructive down migration during an incident. Alerts use IDs/safe codes, no names
or plan content.

## 14. Explicit blind spots and deferrals

- Notification copy/frequency for activate/revise/archive/PDF-ready needs a product
  decision; no spam by default.
- Appointment/projection conflicts remain distinct, grouped by day.
- Offline mutation is deferred; completion accepts client-generated idempotency key.
- Define account-deletion retention/cascade for derivatives/snapshots/audit receipts.
- Worker rechecks revision/content/render hash and lifecycle before ready promotion.
- Manual PDF is preserved and marked review-recommended after plan changes.
- Projections/completions never create, deduct, refund, or settle paid sessions.
- Defer persistent override ledger, offline-first editing, malware vendor, notification
  policy, and AI drafting until their decisions are approved.

## 15. Definition of Done

Complete only when both Home routes share the revision-aware Today contract; every
writer uses one domain boundary; one save creates at most one current derivative
request; manual PDFs survive; old completion proves original prescription; timezone
and DST tests pass; UMS has no fake/billable session; migrations rehearse against
production-like PostgreSQL; flags/metrics/alerts/rollback work; and hostile review has
no unresolved critical/high defect.

## 16. Fable receipt

- Authenticated panel: 10 successful phase-one analysts plus design consensus.
- Synthesis: 12 local inputs; 64,147 input tokens; 11,893 output; finish `stop`.
- Fable synthesis cost: $1.2361 under $2.00 cap. Total actual cost: $1.6350.
- Raw: `C:/tmp/sspt-fable-training-plan-review-20260715-wt/AI-Village-Documentation/validation-prompts/latest/fable-final-synthesis.md`
- Audit: `C:/tmp/sspt-fable-training-plan-review-20260715-wt/docs/ai-workflow/AI-HANDOFF/FABLE-CANONICAL-TRAINING-PLAN-AUDIT-PACKET-2026-07-15.md`

Two initial attempts exposed a launcher defect: it preferred a stale backend
OpenRouter credential over the valid root credential. No value was printed or copied.
Fix that launcher separately before the next Village run.


