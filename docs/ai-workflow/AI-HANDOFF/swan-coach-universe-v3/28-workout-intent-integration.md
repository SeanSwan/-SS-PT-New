# S3/S4 — versioned workout intent integration

Status: IMPLEMENTED LOCALLY; independent scoped APPROVE. Astra owns the worktree in29.
This extends the verified atomic writer25 and semantic reader26. Neither helper
alone constitutes this product integration. Prior manifests remain snapshots.

## Product contract

The same Coach proposal review creates, approves and observes one durable workout
intent. Existing reviewToken remains the only approval ceremony. The canonical
daily-form writer retains billing, attendance and plan semantics.

New drafts enter this path only when the server's
COACH_VERIFIED_WORKOUTS_ENABLED is exactly true. Default is off. Stored proposal
schema_version coach-workout-v2 determines protocol on later reads and retries;
model-authored payload/schema markers cannot opt themselves in. Turning entry
off does not erase receipts or allow v2 proposals to execute via legacy fallback.

1. Resolve current access and exercises before persisting the preview. Reuse the
   actual Exercise table behind /api/exercises/library. Match an explicit UUID,
   exercise key, or unique exact name; supplied identifiers must agree. Unknown,
   inactive, ambiguous or malformed identities refuse without a domain write.
2. Require exact repetitions, load and unit; create missing instance IDs once on
   the server. Accept lb and explicit zero bodyweight. Reject kg with
   UNIT_MAPPING_REQUIRED until chart conversion is implemented. Preserve inputs.
3. Insert encrypted immutable proposal and drafted intent in one transaction.
   requestHash binds actor, target and the complete normalized reviewed payload;
   expectedHash remains empty until actual persisted workout identities exist.
4. Detail review locks intent then proposal, rechecks current access and immutable
   input binding, records awaiting_approval, and mints the existing review token.
5. Approval locks intent then proposal then current access/domain rows. Recheck
   signed review after waits, canonical library eligibility and immutable input.
   All claim/domain/proposal/receipt mutations share the writer transaction.
6. Construct expected semantic footprint using reviewed values and actual IDs;
   compare persisted form values before committing. Store actual form/session
   references, exact count and expected hash. Never accept request result/proof.
7. Publish only after successful commit. Authorized independent read-back may
   promote the intent. Missing/read failure yields committed_unverified, never a
   false save failure. Unknown COMMIT exposes the intent lookup identity.
8. Repeated approval of an APPLIED v2 proposal reads the same receipt without any
   domain dispatch. Rejection locks the same records and atomically cancels only
   still-pending intent/proposal. Recheck current access on every receipt result.

## Canonical source receipt and schema

Existing mounted approval chain is recorded with file:line evidence in20 and25:
dashboard routes -> mounted CoachPage/Transcript/ProposalCard ->
coachProposalService POST /api/coach/proposals/:id/approve -> core/routes mount ->
coachProposalRoutes -> coachActionProposalApprovalService -> canonical writer.
No new route or second workout store is introduced.

Exercise library: backend/routes/exerciseRoutes.mjs:480 uses getExercise():483,
getLibraryAttributes/getLibraryWhere at496-497 and formatLibraryExercise at510.
backend/models/index.mjs:149 resolves getModel('Exercise'). Authoritative
backend/models/Exercise.mjs fields: id UUID:16, name STRING:22, isActive BOOLEAN:204,
exercise_key STRING(255):234. No model columns are changed in this slice.
Library key maps to exerciseKey in backend/services/exerciseLibraryContract.mjs.
No fallback to static variation-registry or generated UI row IDs grants identity.

WorkoutLoggerTypes.ts:81 declares weight in lbs; real progress consumers
ClientProgressCharts.tsx:590/609 and ProgressSummaryCards.tsx:142/165 label saved
weight totals and lift values in lbs. Therefore kg cannot be passed through as
if it were pounds. Strict read-back26 preserves units but does not convert them.

## Verification plan

```mermaid
sequenceDiagram
  actor Trainer
  participant Review as Existing Coach proposal card
  participant Intent as Durable intent coordinator
  participant Writer as Canonical daily-form writer
  participant DB as PostgreSQL
  participant Proof as Authorized snapshot reader
  Intent->>DB: Transaction: encrypted proposal + drafted intent
  Trainer->>Review: Open details
  Review->>Intent: Current authority + immutable input check
  Intent->>DB: Awaiting approval and expiry
  Intent-->>Review: Existing signed reviewToken
  Trainer->>Review: Approve
  Review->>Writer: Existing approve endpoint
  Writer->>DB: BEGIN; lock intent then proposal and authority
  Writer->>DB: Recheck token, input and library; start intent
  Writer->>DB: Form/session/log + billing + APPLIED + intent proof
  Writer->>DB: COMMIT
  alt Commit acknowledged
    Writer->>Proof: Independent authorized read
    Proof->>DB: Read-only repeatable-read snapshot
    Proof->>DB: CAS committed_unverified to verified if all match
    Proof-->>Review: Bounded receipt with real references
  else Commit acknowledgement lost
    Writer-->>Review: Unknown outcome + same intent lookup ID
    Review->>Intent: Check result; never resend the workout
  end
```

Independent frozen gate before implementation. Actual loopback PostgreSQL models
and proposal/intent migrations: creation atomicity, review/input binding, one
intent per proposal, canonical identity/unit refusals, 20 concurrent approvals,
receipt-update rollback, cancel race, lost COMMIT response, access revocation,
flag rollback, duplicate read-only recovery and real semantic reconciliation.
Existing v1 atomic13 and regression79 cases remain required. No app .env, provider
calls, production migrations or deploy. Two hostile dry rounds after repairs.

## Remaining

Session Desk/Floor Mode,
provenance, stored confirmation policy, full24-domain/dashboard adapters and S11
release gates remain governed by11/13/14/19. Keep the entry flag off until those
product/release gates are satisfied. This implementation has not been deployed.

## Current-main and memory authority observation

Local origin/main53120649f has27 commits absent from this branch. The three-dot
diff shows no main-only changes to Coach proposal/workout services, library
contract/route or the Coach/Logger surfaces inspected for this slice. It does
change backend/frontend dependencies, test configuration, shared UI primitives,
startup reconciliation and model registration (RenewalAlert). Preserve those
changes in the eventual current-main candidate; clean install/boot is still open.
This is a local ref comparison, not a fresh fetch or production-state assertion.

Commit21ed0554ba exists on feat/coach-facts-s1, not this owned branch or the locally
observed main. Its CoachFact model/migration/service are a separate unintegrated
lane; there is no active CoachFact model in this checkout. Reuse and adjudicate
that schema when memory integration starts; do not create a second fact store.
No schema/branch merge was performed during this read-only comparison.

## Implemented files and verified behavior

| File under backend/services | Responsibility |
|---|---|
| ai/coachWorkoutIntentDraftService.mjs | Shared encrypted proposal persistence, server protocol selection, strict preview normalization, atomic drafted intent |
| workout/coachWorkoutLibraryResolver.mjs | Current canonical library identity, all supplied aliases, explicit unit/set validation and eligibility share locks |
| ai/coachWorkoutIntentReviewService.mjs | Existing detail/reject protocol plus transactional intent transition and current access |
| ai/coachWorkoutIntentService.mjs | Immutable input binding, execution/commit callbacks, actual semantic receipt, authorized recovery and guarded promotion |
| ai/coachWorkoutProposalApprovalService.mjs | Existing canonical writer with opt-in v2 callbacks and honest saved/unknown reporting |
| ai/coachActionProposalService.mjs | Both direct and AI-response draft callers use the extracted persistence path; file reduced332 to281 lines |
| ai/coachActionProposalApprovalService.mjs | Dispatches stored v2 schema before legacy pending-state logic, enabling receipt-only retries |
| ai/coachActionProposalPersistenceService.mjs | Selects authoritative schema_version in the existing owned-row query |
| ai/coachProposalReviewTokenService.mjs | Exposes existing TTL for one approval policy; signature format retained |
| workout/coachWorkoutReadbackService.mjs | Exports existing pure DATE/log comparison helpers for use before commit; reader semantics retained |

The request hash includes authenticated actor, target and full normalized reviewed
payload. Session duration/intensity are normalized before preview; booleans refuse.
All provided exercise display aliases must agree with the current canonical row.
Pounds/bodyweight semantics are explicit; kilograms refuse without conversion.

Precommit proof checks actual form/session IDs, ownership and dates, exercise
semantics, every actual log tuple and unique log IDs. Altered returned rows cause
rollback rather than committing and merely failing a later proof. Expiry is
checked after authority/library waits and again against the signed review token.

Recovery rechecks current proposal schema and immutable binding before and after
read-back. Verified promotion uses its own guarded receipt transaction: lock
intent -> proposal -> User/assignment, compare current version/state/hash, recheck
access and decrypted binding, then CAS. The independent domain snapshot remains
read-only. No domain write or secondary effect is replayed during receipt recovery.

After a known save, receipt infrastructure failure returns503
WORKOUT_RESULT_UNAVAILABLE with saved:true and a lookup reference, not an apply
failure or stale private receipt. Current access denial still refuses disclosure.
Unknown COMMIT returns503 WORKOUT_COMMIT_UNKNOWN and the same intent identifier.

## Executable evidence and review repairs

All files below are under evidence/ unless a tmp path is named.

| Evidence | Observed result |
|---|---|
| astra-intent-postgres-red.log |13/13 new integration cases failed before implementation |
| astra-intent-gate-1.log |49/49 frozen gate passed after initial implementation |
| astra-intent-hostile-red.log |3 reproduced failures,13 passing controls |
| astra-intent-binding-race-red.log |1 late-binding failure,22 passing controls |
| astra-intent-promotion-postgres.log |24/24 actual PostgreSQL integration cases passed |
| astra-intent-final-Atomic-postgres.log |13/13 existing atomic/billing/concurrency cases passed |
| astra-intent-final-Readback-postgres.log |15/15 semantic snapshot cases passed |
| astra-intent-regression-1.log |90/90 existing proposal/payload/scheduling/access regressions passed |
| astra-intent-node.log |225/225 registered Node tests passed |
| astra-intent-gate-promotion-final.log |49/49 unchanged integration gate passed after guarded promotion |
| astra-intent-final-gate-2.log |24/24 unchanged atomic gate passed |
| astra-intent-final-gate-3.log |76/76 unchanged semantic gate passed |
| astra-intent-packet.log |50/50 runtime +9/9 planning, diff check exit0 |

Frozen gate .ai-workflow/gates/coach-workout-intent-integration-astra-20260906/gate.mjs:
SHA256 bb28de4f8719fb9b1c6fea34b519b331605e68b913ac2af7aafa2da346a0b261.
Initial independent baseline49 checks:43 failed,6 passed. No gate/support edits by
builder; the gate pins five supporting files internally. Counts overlap.

Hostile repairs additionally cover late library-lock expiry, discarded aliases,
boolean session metadata, changed ciphertext on committed retries, and honest
lookup failure reporting. Two input-binding race boundaries were reproduced:
during read-back (also reproduced in actual PostgreSQL) and immediately before
receipt CAS. Callback-only checking repaired the first but not atomic promotion.

The final actual PostgreSQL CAS test attempts a concurrent UPDATE of proposal
ciphertext from a second connection while promotion holds the row. PostgreSQL
returns55P03 after the test's75ms lock timeout; the proposal remains unchanged and
the matching receipt commits. The validator independently reran24/24, preserving
its original synthetic autocommit reproduction and explicitly adjudicating the
now-impossible lock-ignoring interleaving. See tmp/coach-intent-hostile.

Final independent hostile rounds passed 25/25 then 27/27 (DRY-LOOP CLEAN x2).
The builder independently reran the final 27 cases, all passing, and verified
all 17 runtime SHA256 entries in tmp/coach-intent-hostile/final-review-receipt.json.
Receipt SHA256: 751a34e2325c9e34be3b551e8f325cb26630a8bbc5b5c0f054eb4f2098934bd9.
Coordinator SHA256: 5607c416a8a24377c7244c8832fb349deaf5594dbccdd6a847203c3c0884bda4.
The approval covers the service integration; it does not establish mounted UI,
provider behavior, Session Desk, broader dashboard adapters or production readiness.
See evidence/astra-intent-hostile-root-final.log and astra-intent-manifest.json.

Original source snapshot is
tmp/coach-intent-integration-before-20260906/manifest.json. Prior25/26 manifests
describe their earlier exact revisions, not the later integration edits here.
