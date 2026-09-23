---
artifact_id: SWAN-CHART-KG1C1-MOUNTED-CONTRACT
version: 3.3
status: FROZEN LEAD IMPLEMENTATION CONTRACT; NOT RELEASE APPROVAL
owner: lead architecture and hostile verification; Luna implementation
---

# KG1c1 — Identity-safe workout-history editing

## Scope, decisions and evidence

Implement the actual WorkoutHistoryPanel GET/PATCH path proven in24, not legacy
WorkoutHistoryTimeline. Runtime root is `tmp/worktrees/chart-experience-v3-20260904`,
branch `codex/chart-experience-v3-20260904`, base53120649f356c3efccee32872b530096d386642f.
Shared checkout holds these plans only. Decisions23 (Sean's **1B/2A**) are binding:
new/changed weight requires explicit lb/kg; untouched unknown pairs remain unknown;
source-entry pair is storage truth; conversion/toggle is display-only. Reuse25's parser
and draft implementation unchanged unless a reproduced defect is escalated to lead.

This is NOT all charts, a country-settings launch, new logger/AI/import support, or
production activation. No deployment, default database import in tests, existing data
backfill, model/migration rewrite, new provider packet or billable review.

Source findings supplement24: current editor PATCH destroys all rows; daily form
`dailyWorkoutFormRoutes.mjs:729-731` and AI service lock User before replacing a session;
both update parent before destroy. Existing single-log DELETE does not scope its parent
to client and does not share the transaction protocol: leave its routing/access unchanged,
record separate release debt, and do not claim a repo-wide writer guarantee.

## Design-router receipt

Surface: shared admin/trainer history data card, not a marketing hero. Approved direction:
Sapphire Ledger. C12 low-motion data fields; existing typography, CSS variables, chrome,
focus discipline and 44px controls. Signature decision: **visible source-entry provenance**
beside a separate viewing-unit control. No new theme, tokens, imagery, animation or library.
No new ideation vote: Sean approved this visual direction; this is bounded form integration.
UI-UX libraries are reference-only, subordinate to Swan. Graphify graph absent in both
checkouts: direct source/caller tracing used, no graph build or network installation.

## Exact v1 wire

GET retains existing response envelope/pagination and session fields, adds `editRevision`.
Every log retains actual id and all existing fields, including enteredWeight/unit, circuit
tuple, setType, isometricHoldSeconds and timestamps. DECIMAL SQL string is decoded at the
DTO boundary to finite 0..999999.999999 numeric value only after strict decimal validation.
Null/null means unknown. Missing, malformed, partial or invalid explicit pairs MUST NOT
become zero or a valid unknown row: mark invalid and block editing that session.
Legacy responses missing editRevision remain readable but cannot save v1; show refresh hint.
Exact metadata names: log `weightStatus:'known'|'unknown-unit'|'invalid'`, session
`editable:boolean`. Invalid status is sticky through frontend mapping even if backend
sanitizes malformed pair to null/null. Missing status on older raw DTO may be derived from
the actual pair; inconsistent claimed status/pair is invalid. Never recompute invalid into
unknown. Session editable:false dominates and blocks start/save. No parallel `weightPairStatus`
wire name. Frontend may retain pair null/null ONLY with invalid status and blocked editor.

PATCH body has exactly these keys:

```ts
{
  weightContractVersion: 1,
  baseRevision: string, // /^h1:[a-f0-9]{64}$/
  rows: Array<{
    id: number | null, // existing positive safe integer; null for new
    anchorLogId?: number, // REQUIRED for new, forbidden on existing
    weightOperation:
      | {mode:'preserve-recorded', logId:number}
      | {mode:'enter', enteredWeight:number, enteredWeightUnit:'lb'|'kg'},
    changes: {reps?:number, tempo?:string|null, rest?:number|null,
      rpe?:number|null, notes?:string|null, exerciseNote?:string|null}
  }>,
  deletedLogIds: number[]
}
```

Negative IDs are UI-only and NEVER sent. Existing row `id` must equal preserve `logId`.
Existing weight operation may be enter; new may only enter. Rows min1/max1000; current
session >1000 rows is not editable here. Max1000 deletes. Existing IDs in rows and deletes
are disjoint, unique and form an EXACT partition of current persisted IDs. Omission is NOT
deletion. Foreign/missing IDs, duplicate IDs, repeated preserve IDs, invalid operation,
unknown/extraneous keys, mixed legacy payload, malformed revision: reject with zero writes.

Only changed ordinary fields go in `changes`. Do not rewrite untouched notes, number fields,
legacy Coach markers or metadata. New rows require reps (integer0..100000); existing reps
same bound. rest integer0..86400|null; rpe integer1..10|null; tempo <=20chars|null;
notes/exerciseNote <=10000chars|null. Values must have correct JSON types, no coercion.
Empty string is deliberate text, not implicitly null. Server never accepts client metadata
or a replacement numeric `weight` property. No session field changes in v1.

New row anchor must be an existing row in this same baseline, NOT deleted; copy its
exerciseName, circuitName, circuitOrder, exerciseRole, setType, isometricHoldSeconds,
exerciseNote. Do not copy set-specific notes/tempo/rest/rpe; those default null unless
explicit changes. Set number is max of its exact circuit/exercise tuple +1, assigning
sequentially for multiple inserts. Existing set numbers and IDs never renumber.
Anchor metadata is copied from the locked BASELINE, not an ORM instance already mutated
earlier in the request. Thus reordering existing/new operations cannot change provenance.
Frontend can explicitly include a changed group exerciseNote on its new row if needed.
If no retained anchor exists, UI must not offer a guessed group; API rejects.

## Revision and transaction

`editRevision = 'h1:' + SHA256(stable canonical JSON)` is freshness, NOT authorization.
Hash whitelist all WorkoutSession schema values (excluding association objects) and all
WorkoutLog schema fields, logs sorted by numeric ID. Canonicalize Dates to ISO, database
DECIMAL to consistent fixed-six representation, nulls explicitly, object keys sorted.
Hash includes updatedAt, source pairs, all noneditable metadata, rows and session identity.
GET and locked PATCH MUST use the same helper. No new DB revision column.

Authorize using protect + admin/trainer + ensureClientAccess first; then managed transaction
on the configured production ORM in runtime (verified injected same-handle ORM in tests).
Acquire User row UPDATE lock, then scoped session UPDATE lock (`id AND userId`), then
all its logs UPDATE lock in ascending ID order. User lock matches the two legacy replacement
writers; session/log locks support concurrent edits. Compute revision from locked rows.
Compare before any mutation, including session aggregates. Stale =>409, transaction rollback.
Do not trust caller's logId for ownership or rely on hash for access control.

Reconcile in place: preserve leaves weight/enteredWeight/enteredWeightUnit EXACTLY untouched;
enter stores original pair and derives old compatibility `weight` in lb using KG0 converter.
Update only actual changed columns; unchanged rows keep updatedAt and IDs. Explicit deletes
are scoped by session+ID. Inserts use authoritative anchor. All operations and aggregate
updates in ONE transaction; injected mid-save failure must restore every value and ID.
Keep old totalWeight as compatibility numeric aggregate; it is NOT verified physical volume
when unknown rows remain. Frontend history suppresses/lists unknown-unit aggregate rather
than labels it lb. KG3 analytics normalization remains open.

Build success DTO/revision from final rows inside transaction, then return after commit.
Do not perform fallible fetch after commit and attempt rollback of committed transaction.
Duplicate submit with old revision =>409 if previous save changed data; true no-op remains
same revision and is allowed. In-flight frontend duplicate save is prevented synchronously.

Legacy PATCH bodies with `exercises` are rejected426 `WEIGHT_CONTRACT_REQUIRED`, rather than
falling into destructive replacement; unsupported version rejected422. Existing session-only
legacy edits may remain only if unchanged by this slice and they take session lock; else reject
426 consistently. Do not retain a second unguarded replacement branch. Legacy Timeline is
unmounted by current source search; do not migrate it incidentally.

Narrow replacement safety: before the daily/AI service destroys any existing logs, acquire
the parent session lock and check for any non-null enteredWeight OR enteredWeightUnit in
that transaction. Reject409 `EXPLICIT_WEIGHT_REPLACEMENT_BLOCKED` and rollback all earlier
transaction writes if present. Unknown-only legacy writes retain behavior. No conversion,
unit inference, request rewrite, billing change or broader refactor. A race with v1 must
serialize on User/session locks. These guards do not make those writers unit-ready.

## Route repair (exactly GET/PATCH)

Add dependency-injected `createWorkoutHistoryRouter({protect,authorize,getClientWorkouts,
editWorkout})`; it registers ONLY `/clients/:clientId/workouts` GET and
`/clients/:clientId/workouts/:sessionId` PATCH, with per-route middleware, never router.use.
Mount it under `/api/admin` BEFORE core's first adminRoutes mount (old498). Wire actual
protect and authorize(['admin','trainer']) plus actual controllers from core. Remove those
two registrations/import names from old adminWorkoutLoggerRoutes; leave POST/backfill and
DELETE there. No flag edits. Unknown paths fall through unchanged. Do not move the whole
old router early or relax global admin guards. Existing client access helper stays unchanged.

Responses: 400 invalid route ID;403 unauthorized/assignment denied;404 owned session absent;
409 `WORKOUT_EDIT_CONFLICT`;422 `INVALID_WORKOUT_EDIT`;426 legacy contract required;
500 generic failure (no raw SQL/value leakage). Errors contain success:false, code, message.
Preserve ensureClientAccess's existing403/404 behavior and validate UUID session path beforeSQL.

```mermaid
sequenceDiagram
  participant UI as Mounted history editor
  participant API as Early GET/PATCH router
  participant TX as One transaction
  UI->>API: GET client workouts
  API-->>UI: IDs + source pairs + h1 revision
  UI->>UI: View conversion / explicit entry / tracked removal
  UI->>API: v1 baseline + exact ID partition
  API->>API: Protect, role, client assignment
  API->>TX: Lock User then owned session then logs
  TX->>TX: Validate current revision and full partition
  alt stale or invalid
    TX-->>UI: rollback;409/422; keep draft
  else valid
    TX->>TX: In-place updates + explicit inserts/deletes + totals
    TX-->>UI: commit;200 + authoritative new DTO/revision
  end
```

## Mounted UI and wireframe

Reuse KG1c0 draft per row. Separate server baseline from editable fields, never mutatebaseline.
Unit selector always visible when editing; unselected new entries say “Choose unit”. Unknown
historic value says “Recorded value · unit unknown”, including zero (never automatically BW).
Selecting lb/kg alone does NOT confirm an unknown value; require explicit “Use this value in
[unit]” action or a numeric edit. Known toggles derive display from source and preserve it.
Source caption: “Entered: 100 kg”; converted display never changes that source unless edited.
Validation is inline and Save disabled while invalid. Never round converted text into source.

```text
Workout history                  [View lb | kg]
Bench press · Circuit A · working
Set 1   Reps [8 ]   Weight [100        ] [kg v]
                    Entered: 100 kg
Set 2   Reps [8 ]   Recorded value: 80 · unit unknown
                    [Choose unit v] [Use this value in kg]
                    or enter a new value above
[Add set to Bench press · Circuit A]       [Remove set 2]
Changes stay on this workout.              [Cancel] [Save changes]
```

Desktop uses grouped table; narrow phone uses labelled stacked row fields, no squeezed
44px target or hidden horizontal controls. Group identity is exact tuple
`[exerciseName,circuitName,circuitOrder,exerciseRole]`, not name alone. Controls/notes/add
target that group; anchors use actual retained positive row IDs. Preserve setType/holdmetadata.
Removing all rows is blocked here; deletion of entire workouts is not this editor's job.
Known e1RM uses KG0 conversion and visible unit; unknown e1RM absent. History session volume
must be “unit unknown” when any row unknown/invalid; don't display mixed raw aggregate aslb.

Save conflicts/errors retain all drafts and visible error.409 says “This workout changed.
Your edits are still here. Reload latest to review before saving.” Reload is explicit and
doesn't auto-rebase. Client/session switch invalidates pending callbacks; stale response cannot
clear next client's draft. Saving disables all row mutation/cancel/reload; use ref-based lock
to prevent duplicate calls before React renders. Successful save may close+refetch, but failed
refetch after committed save is a refresh error, not a retry of original write.

## Test matrix and file ownership

| Gate | Required evidence |
|---|---|
| C1 DTO | decimal strings valid; malformed/partial rejected; IDs/revision/metadata retained |
| C2 no-op | known+unknown preserve, IDs/timestamps/source exact; no fake lb/BW |
| C3 edits | explicit kg/lb numeric entry; source survives 100 toggles; six-decimal boundary |
| C4 partition | added/removed, duplicate/foreign/omitted IDs, negative IDs, wrongpreserveID |
| C5 transaction | real PostgreSQL rollback after injected failure; two edits same baseline one409 |
| C6 safety | real guard against replacement after unit edit; unknown-only legacy stillworks |
| C7 auth | mounted Express admin+assignedtrainer allowed; client/unassigned rejected; no unrelated early handlers; MCP catch-all can't shadow |
| C8 UI | render actual panel: edit unknown/known, unit change, validation, grouped anchor, conflict retained, switched client stale response, doubleclick |
| C9 regressions | prior KG0/KG1c0 gates and existing editor/notes/DTO suites; actual tscnoEmit |
| C10 visual | actual mounted synthetic panel desktop/mobile controls/focus/overflow; fullreleaseviewportmatrix stillrequired |

Luna backend write allowance (isolated root): new `backend/services/workout/workoutHistoryEdit*.mjs`
(parser/revision/DTO/service), new `backend/routes/workoutHistoryRoutes.mjs`, narrow changes
to adminWorkoutLoggerController.mjs, adminWorkoutLoggerRoutes.mjs, core/routes.mjs,
dailyWorkoutFormRoutes.mjs, services/workout/aiWorkoutDailyFormService.mjs, plus scoped tests
and synthetic test fixture/config. No other application files without asking lead.
Luna frontend: hooks/analytics useWorkoutAnalytics.types.ts + workoutAnalyticsData.ts; actual
admin-clients/components WorkoutHistoryPanel/editor/session/table/footer/group helpers,
new unit field/payload helpers and tests, scoped styles. Do not change legacy Timeline,
charts, global theme, logger/AI writers or KG1c0 implementation. Keep new files <300lines.
Lead owns this packet and independent gates. Workers never edit leadgates, docs or eachotherfiles.

Required sequence: observe red behavior before patch; implement; run focused unit/component
tests; notify lead synthetic DB tests prepared; lead alone starts/stops exact owned PG55439;
real adapter proof; hostile review; fixes and fresh retest. Do not import backend/database.mjs
in tests without fail-closed mock binding exact verified ORM BEFORE actual model/controller.
No ORM sync-all, default environment, production auth/browser or migrations runner.
If schema/interface/auth behavior cannot meet this exact contract, STOP and ask lead;
do not broaden, silently simplify or report proof from copied logic/mocks.

## Preservation and release boundary

Before edits: all45 sealed packet files plus seal copied,46 hashes verified,2sample restores.
Snapshot manifest SHA d7a531bd591839226681844eb2e710fa5d67552364a959b92ae41be59fae2e66.
Offrepo `before-kg1c1-full`; automatic heuristic snapshot onlyfound4, soexplicitfullcopyused.
Prior packet45 seal7300bd3c582dfbc107bf081f72653752d00af625f5bd068a39e49f02cb521f89.
No originals overwritten by preservation. Approved preview remains byte-identical.
Receipt28 must distinguish realDB, mockednetwork component, Express chain and sourceproof.
Schema-first activation from21/22 remains mandatory; source edits are not productionreadiness.
