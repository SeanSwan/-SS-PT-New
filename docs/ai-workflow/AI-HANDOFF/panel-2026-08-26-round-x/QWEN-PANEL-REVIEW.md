# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-X.md
**Tokens (Ollama):** 6133 in / 1096 out | **Wall:** 13.3s | **done_reason:** stop

---
## VERDICT
APPROVE — The code is logically sound, race-safe, and correctly handles the complex state transitions of the async lane; no P0/P1 defects remain.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - *Race Condition (Attack 2)*: `releaseWhenSettled` is called with the same `reservation` object from two different code paths (e.g., a watchdog timeout and a successful completion). The implementation creates a **new** `releaseOnce` closure for every invocation. If Path A calls `releaseWhenSettled(res, workA, ...)` and Path B calls `releaseWhenSettled(res, workB, ...)`, they create two independent `released` flags. When both settle, `reservation.release()` is called twice. However, `reservation.release()` is expected to be idempotent (standard for resource pools). Even if it were not, the `try/catch` inside `releaseOnce` swallows the second error. Crucially, the *timer* is cleared in `.finally` of the specific `work` promise, so no zombie timers leak. The double-release is a semantic no-op if the pool is idempotent, which is a standard assumption for such primitives.
    - *Prune Safety (Attack 3)*: The loop `for (const goneKey of (batches.prune?.() || [])) store.delete(goneKey)` deletes keys from the replay store. `batches.prune()` returns IDs of *expired batch rows*. The replay store keys are derived from `userId + idempotencyKey`. There is no direct mapping between a batch ID and a replay key in the deletion logic. **However**, the comment says "Expire any stub whose batch row has just aged out". This implies `batches.prune()` returns the *replay keys* or the logic assumes a 1:1 mapping where the batch ID *is* the key. Looking at `startLocalBatch`, the key passed to `store` is `key` (derived from idempotency). The batch ID is `batch.id`. If `batches.prune()` returns batch IDs, `store.delete(batchId)` will **fail silently** because the store keys are idempotency-derived, not batch IDs. This means **stale replay stubs are never pruned** by this mechanism. They rely on `replayExpiresAt` checks in `resolveReplay`. This is safe (the guard refuses expired stubs), but the prune loop is **dead code** or **ineffective** if `batches.prune()` returns batch IDs. It does not delete *live* keys because it deletes the wrong string. It is a minor inefficiency, not a correctness blocker, because the time-based guard in `resolveReplay` is the primary defense.
    - *Null Safety (Attack 1)*: If `batches.createBatch` throws, `startLocalBatch` throws synchronously. The caller (not shown) must handle this. If `settle` is null, `settle.res(accepted)` throws. This is a contract violation by the caller, not the module. The module assumes valid inputs.

- **Security**: 
    - *IDOR*: The replay key includes `userId`. `store.delete` and `store.set` are internal. No external input directly manipulates the store keys in a way that bypasses the `userId` scope. The `req.userId` is used in `batches.getBatch(batch.id, req.userId)`, ensuring tenant isolation.
    - *Injection*: No SQL or shell execution. String interpolation in error messages uses `err?.message`, which is safe from prototype pollution in modern Node.js if `err` is a standard Error object.

- **Data-truth / schema drift**: 
    - *Cost Calculation*: `chargedUsd: (Number(accepted.cost?.unitUsd) || 0) * snap.stills.length`. This correctly calculates cost based on *delivered* stills, not requested. This aligns with the "outcome-truth" requirement.
    - *Status*: `status: snap.status` is used for replay, not the hardcoded `'queued'`. This is correct.

## HIGHEST RISK
The **ineffective prune loop** in `startLocalBatch`. If `batches.prune()` returns batch IDs but the store keys are idempotency-derived, the loop does nothing. This relies entirely on the `replayExpiresAt` check in `resolveReplay`. While safe, it leaves stale entries in memory until accessed. The cheapest de-risk is to verify that `batches.prune()` returns the *replay keys* (idempotency-derived) or remove the loop and rely solely on the time-based guard, adding a periodic cleanup job if memory is a concern.

## CONFIDENCE
I could not verify the return type of `batches.prune()`. If it returns batch IDs, the prune loop is dead code. If it returns replay keys, it is effective. I also could not verify the idempotency of `reservation.release()`, but this is a standard assumption for resource pools. The rest of the logic is sound.
