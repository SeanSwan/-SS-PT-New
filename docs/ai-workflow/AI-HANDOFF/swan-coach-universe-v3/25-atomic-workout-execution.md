# Coach atomic workout/proposal execution — 2026-09-06

Owner: Astra. Status: VERIFIED LOCALLY for this slice; not release acceptance. Continues 24.
Source: tmp/worktrees/swan-coach-astra-owned-20260906, HEAD b88dd9e5c.
No deployment or production database access. Original touched files are preserved
under tmp/coach-atomic-before-20260906 with SHA256 manifest.

## Pre-edit receipt and scope

Canonical mounted chain remains the receipt in 20: role routes 109/211/238 →
shell JSX 133/shellPieces108 → CoachCommandCenterPage180 → transcript145 →
CoachCommandLogEntry192 → CoachActionProposalCard → coachProposalService111
POST /api/coach/proposals/:id/approve. Backend core/routes443 mounts the router;
coachProposalRoutes30 executes approveCoachActionProposal. Its middleware18
permits admin/trainer only. Intake442 and ai-command715 do not overlap this path.
GET /:id, POST clarification-answer and reject cannot shadow POST /:id/approve.

Approval service225 claims PENDING in autocommit; writer227 starts its own
transaction; approval244 subsequently writes APPLIED in autocommit. The canonical
writer104 owns the transaction; commit269 precedes fallible secondary effects;
its catch377 currently attempts rollback even after commit.

Authoritative columns rechecked: DailyWorkoutForm199 id UUID,205 sessionId UUID,
215 clientId INTEGER,225 trainerId INTEGER,235 date DATEONLY,241 formData JSONB,
247 sessionDeducted BOOLEAN. WorkoutSession25 id UUID,30 userId INTEGER,44 date
DATE,50 clientRequestId STRING64. WorkoutLog8 id INTEGER,14 sessionId UUID,
22 exerciseName STRING,40 setNumber INTEGER,44 reps INTEGER,51 weight FLOAT.
No model columns change in this slice. No invented integer revision or canonical
exercise/unit columns are introduced.

Surface classification: this approval route and shared writer are canonical;
coachWorkoutReadbackService remains staged/dormant for final v2 activation.
Manual logger/admin logger, generic dispatcher and historical imports also use
the shared writer: optional hooks must preserve their omitted-hook behavior.
Relevant local origin/main-only history search found no changes under these AI
and workout service directories. This is not a complete branch reconciliation.

## Executable contract

1. Writer owns one transaction. An optional internal beforeWrite callback runs
   before User/domain locks and writes; it reloads the owned proposal FOR UPDATE,
   validates the review token against current material, checks current access and
   atomically claims PENDING. Existing rejection CAS shares the proposal row lock.
2. A beforeCommit callback receives actual form/session/log rows, normalized
   exercises and the core workout result. It stores APPLIED and that result in
   the same transaction. Any missing CAS/update or callback error rolls back all.
3. No autocommit FAILED update after a rolled-back workout. Pending remains
   reviewable; uncertain commit errors require history lookup, not automatic retry.
4. Intake status/event work runs explicitly after the writer returns successful
   commit and catches errors. Never use Sequelize afterCommit for this guarantee.
   Earnings, challenge, XP and PR work are individually guarded so each can run
   even if another fails; fixed warning codes describe missing secondary results.
5. Workout review tokens bind current cipher/iv/tag/key id, proposal identity,
   actor and type. Changed encrypted payload requires a fresh detail review.
   Non-workout token compatibility is preserved.
6. Regression gates execute real services with transaction-aware doubles; actual
   PostgreSQL tests separately exercise domain rows, rollback and races. Existing
   billing/source/planned/scheduled fixtures must remain green.

## Deliberate boundary

This slice removes the proposal/domain transaction gap; it does not activate the
unfinished proofVersion2 intent coordinator. S3/S4 still requires a durable intent
before preview and a semantic footprint at commit. The reviewed proposal digest
and final effect fingerprint are distinct: proposal material authorizes input;
expectedHash proves persisted UUIDs and canonical values after save. They must
not be conflated by inventing version:1. Session Desk and the 24 domain adapters
follow the completed trust contracts; helper passes do not count as mounted UX.

## Final implementation and hostile-review repairs

Parent approval delegates workouts to coachWorkoutProposalApprovalService. Writer
hooks lock/revalidate/claim, then store APPLIED plus actual core result before
commit. Optional transaction propagation is additive in persistence and
utils/clientAccess; 39 existing access call sites were found and their two-argument
behavior is preserved. Transactional access locks User then active assignment,
after proposal and before existing domain writes. Real assignment columns are
ClientTrainerAssignment68 clientId,73 trainerId,88 status; table135 is
client_trainer_assignments. No assignment/model schema changed.

The hostile pass reproduced two defects missed by the first gate: installed
Sequelize Transaction.commit executes its hooks in finally even on rejected SQL;
and access could be revoked while waiting on the client lock. Both were repaired:
publication is explicit after writer success; access rows stay locked through
commit. Review expiry is checked after lock waits. COMMIT interruption returns503
WORKOUT_COMMIT_UNKNOWN without an autocommit failure or retry. Lost acknowledgement
can leave a real APPLIED result; canonical history is required to resolve it.

Core result construction and secondary effects were extracted to
aiWorkoutDailyFormResult and aiWorkoutPostCommitService. Writer is298 lines;
parent approval262. Source/billing/planned/scheduled decisions remain unchanged.
The effect footprint is still not certified by a successful HTTP response.

```mermaid
sequenceDiagram
  participant UI as Reviewed proposal
  participant P as Approval adapter
  participant W as Canonical writer
  participant DB as PostgreSQL
  UI->>P: Approve with review token
  P->>W: Trusted internal callbacks
  W->>DB: BEGIN
  W->>P: beforeWrite(transaction)
  P->>DB: Lock proposal, client, active assignment
  P->>P: Recheck owner, access, material and expiry
  P->>DB: PENDING to APPLYING
  W->>DB: Form, session, logs, credits, linked plan/session
  W->>P: beforeCommit(actual rows and result)
  P->>DB: APPLYING to APPLIED with actual IDs
  W->>DB: COMMIT
  alt Acknowledged commit
    W->>W: Guard earnings, challenges, XP, PR independently
    W-->>P: Saved core result and secondary results
    P->>DB: Guarded intake publication
    P-->>UI: Saved result
  else Commit interrupted
    P-->>UI: Unknown; inspect history, do not resend
  else Precommit failure
    W->>DB: ROLLBACK all changes
    P-->>UI: Refusal or known validation failure
  end
```

## Verification

Evidence lives in this packet's evidence directory:

| Check | Result | Log |
|---|---|---|
| Real models/proposal migration, initial correct fixtures | 3 pass /6 fail | astra-atomic-postgres-red-3.log |
| Real PostgreSQL atomic writes,20 approvals, rejection, rollback, token changes | 9/9 | astra-atomic-postgres-green-1.log |
| Added rejected/lost COMMIT, access revocation, assignment lock contention | 13/13 | astra-atomic-postgres-green-2.log |
| Immutable independent gate, first and final runtime | 24/24 each | astra-atomic-gate-1.log, astra-atomic-gate-2.log |
| Existing billing, scheduling, payload, proposal, access suites | 79/79 across9 files | astra-atomic-regression-final.log |
| Root independently reran hostile diagnostics | 13/13 | astra-atomic-hostile-root-2.log |

Gate: .ai-workflow/gates/coach-atomic-workout-astra-20260906/gate.mjs.
SHA256: 2e24bb2f92e7b00be86f3ae231aa51f651c017257932e9e4216e89c7119b572f.
Builder did not read or edit gate implementation; authoring/final hashes match.
Independent hostile initial2fail/2pass became clean8/8 then13/13.
Reviewed eight-source hash receipt: tmp/coach-atomic-hostile/review-receipt.json.
Verdict APPROVE is scoped to this atomic slice; full upgrade stays IN PROGRESS.

PostgreSQL used a new owned cached postgres17 container, loopback52735 and fixed
synthetic coach_test_20260906 database. Actual DailyWorkoutForm, WorkoutSession,
WorkoutLog and ClientTrainerAssignment models plus actual proposal migration ran.
User and unused referenced plan/session tables are explicit test fixtures.
The first two DB harness attempts needed missing FK fixture tables and corrected
cipher mock call shape; only the third run established the behavioral red baseline.

Test deltas: old approval writer double now invokes transaction hooks before its
effect marker, preserving claim-before-effect assertions. Losing-claim assertion
now checks writer entry but zero domain effect. Source guards follow the extracted
mounted adapter and retain writer/RBAC/no-direct-rows assertions. No tests removed
or skipped. The broader9-suite run initializes legacy development config without
credentials; dedicated PostgreSQL and immutable gates do not load application env.
Root's first hostile rerun omitted the diagnostic's synthetic JWT setting and
returned503 before execution. Rerunning the unchanged tests with NODE_ENV=test,
AI_COMMANDS_ENABLED=false and the documented synthetic JWT secret passed13/13.
The missing-environment run is retained; it is not a runtime repair.

Hygiene: new scoped services, tests, gate/diagnostic logs, preserved snapshot and
this execution receipt. No cleanup, deletion, stage, commit, push or deployment.
Keep 24 as historical evidence; continue from 25 and subsequent execution cards.
