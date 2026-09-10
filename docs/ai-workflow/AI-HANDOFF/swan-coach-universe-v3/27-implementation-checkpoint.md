# Swan Coach — Astra implementation checkpoint,2026-09-06

## Plain-English Summary

Astra continued the owned implementation lane and completed two local trust
slices: atomic workout/proposal saving and strict semantic read-back. Independent
hostile reviews found and helped repair three additional defects beyond the
initial gates. All scoped final checks below passed. Nothing was committed,
pushed, deployed or migrated in production.

The complete Coach upgrade is still IN PROGRESS. Session Desk/Floor Mode and
broader dashboard connections have not been built by this continuation. The
original127-entry dashboard inventory and24-domain contracts remain the blueprint.
Do not mistake helper proofs or the existing wireframe for completed product UX.

## Technical Summary

Builder: Astra, explicitly authorized by Sean to take over and implement.
Owned worktree:
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906
Branch codex/swan-coach-astra-owned-20260906; HEAD b88dd9e5c894908d9f193411fe66117294d190ef.
Locally observed origin/main remains53120649f356c3efccee32872b530096d386642f.
This is uncommitted local source. The earlier universe worktree is preserved;
node_modules still junction to its installed dependencies. Clean current-main
reconciliation and clean dependency installation remain release gates.

Read11 for the full contract,24 for earlier takeover evidence,25 for the atomic
save implementation/sequence diagram,26 for semantic proof, then13/14 for next work.
Do not transfer implementation to Luna unless Sean requests it.

## What now exists

1. Mounted proposal approval delegates workout saving into the existing canonical
   writer. Proposal claim, actual form/session/log writes, existing credit/plan/
   attendance effects and APPLIED result share one transaction.
2. Proposal, client and trainer-assignment rows are locked in a consistent order.
   Current access and review expiry/material are checked after lock waits.
3. Precommit failure rolls back all those records. Unknown COMMIT returns503
   WORKOUT_COMMIT_UNKNOWN and never overwrites actual APPLIED with FAILED.
4. Intake publication runs explicitly after writer success, avoiding installed
   Sequelize's finally-based afterCommit hook hazard. Earnings/challenge/XP/PR
   failures are individually contained after save; the original billing/source
   policy is preserved.
5. Workout review tokens bind encrypted proposal material. Changed ciphertext,
   IV, authentication tag or key identifier requires a fresh detail review.
6. New schemaVersion2 footprints use real UUIDs, owner/date and canonical exercise
   identity/instance/unit/set values. No fabricated model revision or display-name
   authority. Malformed alternate IDs cannot disappear behind a valid ID.
7. Read-back uses the actual models and one PostgreSQL read-only repeatable-read
   transaction. It checks every log row as a counted projection, including repeated
   exercises and arbitrary SQL ordering. It refuses missing, extra or altered data.
8. A real stored v2 footprint plus this reader can promote an existing real intent
   via the prior authorized reconciliation CAS exactly once. The full authoring
   path creating that intent before proposal review is still unfinished.

## Final scoped verification

| Suite | Passed | Evidence under packet evidence/ |
|---|---|---|
| Atomic real PostgreSQL models, transaction failures and races | 13/13 | astra-atomic-postgres-green-2.log |
| Semantic real PostgreSQL models/snapshot/reconciliation | 15/15 | astra-semantic-postgres-final.log |
| Legacy PostgreSQL receipt/reconciliation compatibility | 8/8 | astra-semantic-legacy-proof-postgres.log |
| Existing billing/payload/scheduling/proposal/access regressions | 79/79 | astra-atomic-regression-final.log |
| Registered backend Node suites | 225/225 | astra-semantic-node-final.log |
| Atomic immutable gate | 24/24 | astra-atomic-gate-2.log |
| Stronger semantic immutable gate | 76/76 | astra-semantic-gate-2.log |
| Root rerun of atomic hostile review | 13/13 | astra-atomic-hostile-root-2.log |
| Root rerun of expanded semantic hostile review | 80/80 | astra-semantic-hostile-root-final.log |
| Packet runtime/planning | 50/50 and9/9 | astra-semantic-packet.log |

Counts overlap and must not be summed into a coverage percentage. Frontend was
unchanged in this continuation; its prior build/typecheck evidence remains in24,
not rerun or upgraded into authenticated browser acceptance.
Original/final gate/source hashes are in25/26 and their evidence manifests.
Both slices received scoped APPROVE after two dry hostile rounds. Full release
approval is not implied. New paid model/provider reviews were not run.

## Exact continuation

1. Finish S3/S4 intent integration using the transaction hooks now present:
   create/bind the durable intent before review; one proposal maps to one intent;
   lock intent before proposal; commit proposal, workout and intent together.
   Retain the existing review-token protocol, not a second confirmation ceremony.
2. Keep reviewed-input binding distinct from post-save semantic fingerprint.
   expectedHash must represent actual created UUIDs and normalized persisted data.
   Do not activate the incoming commitCoachIntent compatibility helper as a
   complete v2 coordinator. No forged result.state or fake version can certify it.
3. Prove canonical exercise resolution and log/chart unit convention. The new
   reader checks stored semantics; it does not authorize mixed-unit conversion or
   turn unresolved exercise names into library IDs.
4. Complete shared provenance/stored confirmation policy, target-generation guards
   and terminal/unknown recovery. Existing useCoachCommand still defaults missing
   inputMode to text; that S1/S2 gap remains.
5. Build Session Desk B and Floor Mode from14 with shared in-memory draft identity,
   actual receipt timeline, Talk/Workout/Results, canonical Logger handoff and
   source-driven progress invalidation. Never use event ACK or HTTP approved as
   verified-save evidence.
6. Connect the24 domain adapters from19 using role/target/entity authority and the
   complete nested workspace inventory21. Reconcile CoachFact authority before
   memory schema work. Continue provider boundary/voice/training/memory/check-ins.
7. Complete S11 current-main, DB/Redis failure, authenticated all-role/browser,
   provider evaluation under an authorized budget and explicit release approval.

## Resuming tests and preserving work

Disposable PostgreSQL was a separately owned cached postgres:17-alpine container,
label com.swan.test=coach-atomic-20260906, fixed synthetic database and user, published
only on127.0.0.1. Recreate an owned container and set SWAN_COACH_TEST_PORT to its
current port. Never load app .env for these tests. Dedicated configs are
backend/tests/helpers/coachWorkout{Atomic,Readback}.postgres.config.mjs;
run npx vitest run --config <config> from backend. Legacy receipt tests use
--import ./tests/helpers/registerCoachTestDatabase.mjs with node --test.

Preserved original sources: tmp/coach-atomic-before-20260906 and
tmp/coach-semantic-before-20260906. Prior108-file isolation snapshot and117-file
takeover manifest remain historical. Do not overwrite them to claim new hashes.
New evidence: astra-atomic-manifest.json and astra-semantic-manifest.json.
No cleanup, deletion or continuity closeout was performed. Coordination lane and
review queue hold scoped state; recheck them before subsequent edits.
