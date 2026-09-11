# G09 build evidence — 2026-09-11

## Reconciliation (contract-mandated first step)
Adopted exactly commit 21ed0554ba's new files (model, migration, service, 3
test files) from feat/coach-facts-s1 per contract 32 ("use the existing
CoachFact/service from its actual integration branch; do not duplicate it
locally"). Not a branch merge, not a duplicate store. The shared
coachContextTableNames.test.mjs gained only S1's additive block (diff
verified purely additive).

## Changes
1. NEW migration 20260911000000-add-coach-fact-forget-purge.cjs: forgottenAt,
   purgeAfterAt, conflictMetadata (idempotent describeTable guards).
2. models/CoachFact.mjs: the three columns declared (schema cross-check: names
   match the migration exactly).
3. NEW services/coachFactMemoryPolicy.mjs (121 lines):
   - T35 forgetFact: adopted-service conditional invalidate -> tombstone
     timestamps -> purgeAfterAt = +24h -> invalidateCoachContextCache for the
     client in the SAME call (stale cache cannot resurrect).
   - purgeDueFacts: hard-destroys only rows past their purge deadline
     (normal invalidations without forget never purge).
   - T36 proposeFactsFromTask: private tasks = zero durable writes;
     getMemoryForTask: strict target-client scoping, explicit private-empty.
   - T37 detectFactConflicts: pure conflict report resolving to the
     authoritative record; no row mutation.

## Slice-internal hostile review — findings fixed
- F1 invented non-Sequelize where-clause in the purge query — replaced with
  findAll/destroy + { lte } (fake harness extended to match).
- F2 test seed envelope lacked the cache contract's `state` field — fixed.
- F3 disclosed: forgetFact actor authorization is upstream (same trust model
  as the adopted approveFact/invalidateFact); ciphertext-at-rest is not
  implemented — purge is row destruction within the 24h clock, backup
  retention disclosed separately per contract.
