# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-Y.md
**Tokens (Ollama):** 5031 in / 1486 out | **Wall:** 29.1s | **done_reason:** stop

---
## VERDICT
APPROVE — The code correctly implements the synchronous-miss invariant, handles the "corpse" replay scenario via snapshot truth, and safely isolates cleanup failures from the critical retention path.

## BLOCKERS
None.

## ATTACKS
- **Correctness:**
    - **Thenable Collision (P2):** The guard `typeof held.then === 'function'` (composeReplay.mjs:42) is a duck-typing check. If a future stub object accidentally includes a `then` property (e.g., via a spread of a Promise-like object or a library dependency), it will be treated as a live claim. `resolveReplay` will attempt `await pending`. If `pending` is not a real Promise but a plain object with a `then` function that doesn't resolve/reject as expected, or if it resolves to `undefined`, the logic falls through to `judge(undefined, ...)`. `judge` handles `undefined` correctly (returns null, deletes key), so it degrades to a miss rather than a crash. However, if the `then` function throws synchronously, `resolveReplay`'s `try/catch` catches it, deletes the key, and returns null. This is safe, but it silently converts a valid cached stub into a miss if the stub is malformed.
    - **Stale Clock in Prune (P2):** In `startLocalBatch`, the prune loop uses `clock ? clock() : undefined`. If `clock` is provided, it is called *after* the `batches.prune` check has already determined what to prune (presumably using its own internal time or the passed time). If `clock` is a high-resolution timer that has advanced significantly since the batch was created, the prune might delete a stub that `replayIfFresh` would have considered fresh (if `replayIfFresh` used a different clock instance). However, the document states `replayIfFresh` uses `Date.now()` by default. If `startLocalBatch` passes a `clock` that is *ahead* of `Date.now()`, it might prune a key that `replayIfFresh` (using `Date.now()`) would still serve. This is a race condition between the prune step and the replay check. Given the "single operator" context and the fact that `BATCH_TTL_MS` is likely large (hours), this window is negligible.
    - **Snapshot Drift (P1 - Mitigated):** The code uses `batches.getBatch(batch.id, req.userId)` to get the snapshot. If the batch status changes between the `finally` block entry and the `getBatch` call, the snapshot might be stale. However, `runLocalBatch` is the only writer to this batch's terminal state, and it has already settled (triggering the `finally`). The `getBatch` call is synchronous and reads the current state. The risk is if another process (e.g., a manual admin reset) changes the status between the settle and the get. This is an operational edge case, not a code defect.

- **Security:**
    - **IDOR:** `batches.getBatch(batch.id, req.userId)` enforces ownership. `store` is keyed by `u${userId}:${sha(idempotencyKey)}`, preventing cross-tenant access.
    - **Injection:** No string interpolation into SQL or shell commands.
    - **DoS:** The store is in-memory. The prune loop iterates over `batches.prune` results. If `batches.prune` returns a massive list, this could be a CPU spike. However, `prune` is expected to return only expired items.

- **Data-truth / schema drift:**
    - **Cost Calculation:** `chargedUsd: (Number(accepted.cost?.unitUsd) || 0) * snap.stills.length`. This correctly calculates cost based on *delivered* stills, not requested. This aligns with the "outcome-truth" invariant.
    - **Status Mapping:** `status: snap.status` is used for the replay stub. This ensures the client sees the final status (e.g., 'completed', 'failed', 'partial'), not the initial 'queued'.

## HIGHEST RISK
**Thenable Duck-Typing Fragility.**
The distinction between a "live claim" (Promise) and a "settled stub" (Object) relies entirely on the presence of a `then` function. While safe today, it is a brittle invariant. If a stub object ever acquires a `then` property (e.g., through a future field addition or a library change), it will be misinterpreted as a live claim.
**De-risk:** Use a Symbol or a specific property name (e.g., `_isPromise: true`) to mark live claims, or check `held instanceof Promise` if the environment supports it. Alternatively, wrap the promise in a specific object type that is distinguishable from a plain stub.

## CONFIDENCE
I could not verify the behavior of `batches.prune` and whether it uses the same `clock` instance as `replayIfFresh`. If they use different clocks, there is a potential race window where a key is pruned by `startLocalBatch` but would have been considered fresh by `replayIfFresh` (or vice versa). However, given the TTL is likely large and the system is single-operator, this is low risk. I also could not verify if `store` is a standard Map or a custom implementation with different `has/get` semantics, but the code assumes standard Map-like behavior.

## RECOMMENDATIONS
1. **Explicit Promise Marking:** Replace the `typeof held.then === 'function'` check with a more robust identifier. For example, store live claims as `{ type: 'promise', value: promise }` and settled stubs as `{ type: 'stub', value: object }`. This eliminates the risk of accidental thenable collision.
2. **Clock Consistency:** Ensure `batches.prune` and `replayIfFresh` use the same clock source. If `startLocalBatch` passes a `clock`, pass it to `replayIfFresh` as well, or ensure `batches.prune` uses `Date.now()` consistently.
3. **Test for Thenable Collision:** Add a test case where a stub object has a `then` property (e.g., `{ then: () => {}, replayExpiresAt: ... }`) and verify that `replayIfFresh` treats it as a stub (miss) rather than a live claim (await).
4. **Observability:** Log when a key is pruned by `startLocalBatch` but would have been replayed (i.e., if the prune happens just before a replay check). This can help detect clock drift or TTL misconfiguration.
5. **Documentation:** Clearly document the invariant that "live claims are Promises and settled stubs are plain objects without a `then` property" in the code comments, as this is a critical assumption.
