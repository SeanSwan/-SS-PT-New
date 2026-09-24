# Coach semantic read-back — execution contract

Owner Astra,2026-09-06. VERIFIED LOCALLY after atomic slice25. Source is the same isolated
owned worktree at b88dd9e5c. Nothing deployed. Independent gate authoring precedes
runtime edits. S4c in13 and real model/source receipt20 govern this slice.

The current readCoachWorkoutFootprint is staged/dormant; the caller sweep found
no production caller after removing unused writer imports in25. Its two test
fixtures use invented numeric form IDs and version1; these are not schema evidence.
Existing legacy verifyCoachWorkoutReadback and intent hashes stay compatible.

New discriminator: footprint.schemaVersion=2. UUID form/session IDs and positive
actor/client IDs, exact calendar date, exercise instance plus canonical ID/key,
explicit unit and ordered exact set values define semantic identity. No fabricated
integer model revision. New builder returns only this schema. Legacy verifier/hash
decoding remains explicit for footprints without schemaVersion.

The read adapter must use one read-only REPEATABLE READ database transaction for
form, session and logs, with a consistent registered Sequelize instance. Missing
snapshot capability returns unavailable. Observed IDs, owner, date and exercises
come only from rows. Session DATE is interpreted as a real date, compared against
form DATEONLY. Logs are compared as counted numeric/name projections, preserving
duplicates and detecting missing/extra/altered rows; no positional sort assumption.
Canonical exercise identity/unit lives in form JSON, never invented on log columns.
No domain write, model call, retry, copied expected content or inferred timestamp.

Semantic hash uses normalized fields and stable serialization; arbitrary display
name/notes/timestamps cannot influence it. Changing instance, canonical identity,
unit, set ordinal/reps/load or record linkage must invalidate the proof.
Reconciliation consumes this schema through the existing stored-footprint/hash
boundary, retaining authorization and revision CAS from24.

Tests: immutable independent gate plus real-model PostgreSQL snapshot, date,
multi-exercise/duplicate projection, tampering and unavailable-snapshot cases.
This still does not activate strict v2 proposal authoring or certify chart units.
Mixed-unit authoring remains blocked until the canonical progress adapter's
unit convention is established. Session Desk follows the trust foundation.

## Implemented contract

coachWorkoutSemanticFootprint validates every present canonical identity field,
unique instance identity, explicit unit and exact set values. Provided invalid
exerciseId cannot disappear behind a valid exerciseKey (or vice versa).
buildCoachWorkoutFootprint now emits schemaVersion2 with UUID identities, never
fabricated version1. Legacy comparator/hash encoding remains byte-compatible for
footprints with no explicit schema. Unknown explicit schemas fail closed.

readCoachWorkoutFootprint requires all three models share one database, starts
REPEATABLE READ, explicitly executes SET TRANSACTION READ ONLY, then reads actual
rows with one transaction. It bounds logs to20001 (strict maximum20000 plus one),
rejects duplicate log IDs and consumes a counted name/ordinal/reps/load projection.
Repeating an exercise or changing SQL row order no longer causes a false mismatch.
Observed metadata never comes from the caller's expected exercises or timestamps.

Actual PostgreSQL testing found readOnly:true alone leaves transaction_read_only
off in installed Sequelize. The implementation therefore issues the SQL setting;
SHOW now confirms on and repeatable read. A concurrent log edit between form and
log reads cannot mix snapshots; a later read detects the change.

## Pre-build gate amendment

The first gate's fake database lacked query(), so it could only inspect readOnly
options and could not test real SQL establishment. Before runtime construction,
the validator preserved that original gate/fixture and authored a new versioned
gate with all73 prior checks plus3 stronger SQL establishment/fail-closed checks.
No frozen file was edited or removed. This corrects the test contract after an
independently observed installed-API discrepancy; it does not weaken acceptance.
The original gate is historical, not claimed to pass final runtime.

Original SHA256 af14c2bdff584661700ab9be5c699d94bd6c97d4bd6200ca674fcfd149bd3757.
Acceptance gate .ai-workflow/gates/coach-semantic-readback-astra-20260906-v2/gate.mjs:
ff06de76fcea0a65c180d89e442a0582c2ac45456ff6b9d84d2cae15f7d4c69e.
Both authoring/final hashes were checked unchanged. The amendment is recorded
in that new gate directory's gate-contract-amendment.md.

## Evidence and remaining work

| Check | Result | evidence/ filename |
|---|---|---|
| Correct real-model baseline | 6pass/5fail | astra-semantic-postgres-red.log |
| PostgreSQL actual models, snapshot state, tampering, real receipt promotion | 15/15 | astra-semantic-postgres-final.log |
| Existing legacy PostgreSQL receipt/reconciliation | 8/8 | astra-semantic-legacy-proof-postgres.log |
| Frozen stronger acceptance gate, first/final runs | 76/76 | astra-semantic-gate-1.log, astra-semantic-gate-2.log |
| Registered Node tests after identity repair | 225/225 | astra-semantic-node-final.log |
| Packet runtime/planning | 50/50 and9/9 | astra-semantic-packet.log |
| Root reproduction of independent hostile probes | 66/66 then80/80 | astra-semantic-hostile-root.log, astra-semantic-hostile-root-final.log |

The independent hostile pass first found17 failing checks around malformed
alternate canonical identities. Presence-based validation fixed them, with
20 direct assertions and3 real PostgreSQL JSON tamper cases added. Final
independent second dry pass reached80/80. Verdict APPROVE is scoped to the four
semantic helper/reader files. Exact source hashes and review limits are in
tmp/coach-semantic-hostile/hostile-verdict.md. Root reran the expanded80 checks
and independently checked all four hashes. Both immutable gate hashes remain
unchanged. This is two dry hostile rounds, not independent provider corroboration.

Actual model tests now connect a stored semantic footprint to the snapshot
reader and the existing reconciliation CAS, promoting a real receipt once.
This is NOT a mounted proposal-to-v2-intent integration. Proposal approvals are
atomic after25; durable draft/review/commit intent hooks still need activation.
Receipt list/detail remain the existing read APIs; no new public verification
endpoint or role permission was added here. Session Desk/Floor Mode, all24-domain
connections and authenticated dashboard QA are still outstanding.

Staged test changes: one builder test and two read-back fixtures now use actual
UUIDs, schemaVersion2, exercise instances and snapshot-capable mocks. Legacy
verifier cases remain intact. Added a legacy-adapter refusal check; no tests skipped
or deleted. No model columns or migrations changed in this slice.

Hygiene:5 original files preserved under tmp/coach-semantic-before-20260906;
new scoped semantic module, actual-model tests/config, immutable versioned gates,
diagnostics, evidence logs and this execution card. No root clutter or cleanup.
