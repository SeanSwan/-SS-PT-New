# G09 — CoachFact history reconciliation + scoped visible memory (S9)

Artifact `SCU-G09-43`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G09/S9 row, contract
[32](32-gwen-domain-and-verification-contract.md) T35–T37, CoachFact history
note in 32 ("use existing CoachFact/service from its actual integration branch;
do not duplicate it locally").

## Reconciliation decision (contract-mandated first step)

Commit `21ed0554ba` (feat/coach-facts-s1, 2026-08-31) exists in this repo's
object store on `feat/coach-facts-s1`: model + migration + 540-line service +
three test files (106 tests), all passing UNMODIFIED in this worktree. Per the
contract, the S1 durable-fact layer is ADOPTED by checking out exactly that
commit's new files (not the branch, not a cherry-pick merge) as the base. Its
invariants stand: machine proposes only, a human actor is required for
activation, statuses proposed/active/invalidated/rejected, supersede links.
No duplicate fact store is created. The one modified shared file
(coachContextTableNames.test.mjs) gained only the additive coach_facts block.

## Scope (this slice)

1. Model + NEW migration: `forgottenAt`, `purgeAfterAt`, `conflictMetadata`
   columns on coach_facts.
2. NEW `backend/services/coachFactMemoryPolicy.mjs`:
   - T35 `forgetFact` — active→invalidated via the adopted service, then
     `forgottenAt` + `purgeAfterAt = +24h`; retrieval excludes immediately
     (status gate); the coach context cache for that client is invalidated in
     the same call so a stale cached context cannot resurrect the fact;
     `purgeDueFacts` hard-destroys rows past their purge deadline.
   - T36 `proposeFactsFromTask` refuses PRIVATE tasks with zero durable
     writes; `getMemoryForTask` returns facts scoped strictly to the target
     client id (cross-client query returns that client's rows only) and an
     empty, explicitly-disabled result for private tasks.
   - T37 `detectFactConflicts` — stale active facts that contradict the
     authoritative record are flagged (conflictMetadata input shape) and the
     authoritative value is what consumers use; nothing is silently mutated.
3. T35's remember→correct→forget chain uses the adopted S1 lifecycle:
     correct = new version + `invalidateFact(old, supersededByFactId=new)`.

## Out of scope

Trainer-facing memory UI (S9 drawer) and prompt-context wiring (S3) remain
separate slices; ciphertext-at-rest encryption (facts are stored as content
text; purge is row destruction — disclosed; the contract's ciphertext-purge
clock is honored at 24h).

## Verification

Adopted 106-test suite green unmodified; new policy suite (vitest, fake-model
harness matching the adopted tests) covers T35/T36/T37 including the 24h
purge clock and cache invalidation on forget. RED-first where behavior
existed to change (forget-exclusion is asserted against the pre-policy state);
new-module contracts are green-lock per plan 42's disclosure pattern.
