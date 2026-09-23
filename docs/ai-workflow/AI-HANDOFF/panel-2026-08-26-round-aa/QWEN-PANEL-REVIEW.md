# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-AA.md
**Tokens (Ollama):** 3450 in / 1118 out | **Wall:** 20.6s | **done_reason:** stop

---
## VERDICT
APPROVE — The core concurrency invariants (synchronous miss, conditional claim, bounded contention) are correctly implemented and the "blind tail write" defect from Round Z is genuinely fixed.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - **Race Condition (Coalescing)**: In `claimOrCoalesce`, if `claimIfAbsent` fails, the code calls `replayIfFresh`. If the stored value is a *rejected* promise, `replayIfFresh` returns a promise that resolves to `null` (via `resolveReplay`'s catch). The code then does `if (body) return...`. Since `body` is `null`, it falls through to the next loop iteration. This is correct.
    - **Stale State**: `judge` checks `prior?.replayExpiresAt > 0 && prior.replayExpiresAt <= clock()`. If `replayExpiresAt` is `0` or `undefined`, `expired` is `false`. This assumes `0`/`undefined` means "no expiry" or "valid". Given the context (TTL is `finishedAt + BATCH_TTL_MS`), `0` is a valid "never expires" or "invalid" sentinel. If `replayExpiresAt` is `0`, it is treated as fresh. This is consistent with the "settled stub" logic where `replayExpiresAt` is bookkeeping.
    - **Null/Undefined**: `judge` handles `prior` being `null`/`undefined` by falling through to `store.delete(key)` and returning `null`. This is correct.
    - **Type Mismatch**: `held.then` check correctly distinguishes promises from plain objects.
- **Security**: 
    - **IDOR**: The key is `u${userId}:${sha(idempotencyKey)}`. This is scoped to the user. No cross-tenant leak.
    - **Replay**: The `replayed: true` flag is set in `judge`. The caller returns this body. This is correct.
    - **Secret Handling**: No secrets in the code.
- **Data-truth / schema drift**: 
    - `replayExpiresAt` is stripped from the response body in `judge` (`const { replayExpiresAt, ...body } = prior;`). This prevents leaking internal TTL logic to the client. Good.
    - `replayed: true` is added. This is a new field. If the frontend expects a specific shape, this might be a drift. However, the prompt says "frontend response-shape drift" is a concern. If the frontend does not expect `replayed`, it might break. But typically, additive fields are safe.

## HIGHEST RISK
The risk is not in the code, but in the **assumption that `replayIfFresh` returning a promise that resolves to `null` is the only way `claimOrCoalesce` can fail to coalesce**. If `replayIfFresh` throws (which it shouldn't, but if `store.get` throws), `claimOrCoalesce` would crash. However, `store.get` is assumed to be safe.

The cheapest way to de-risk: Add a try-catch around `replayIfFresh` in `claimOrCoalesce` to treat any error as "coalesce failed, try again".

## CONFIDENCE
I cannot verify the behavior of `store` (e.g., does `store.has` and `store.get` have a race condition between them?). The code assumes `store` is a synchronous, atomic in-memory map. If `store` is a distributed cache, `has` and `get` are not atomic, and the "synchronous miss" invariant breaks. The prompt says "in-memory store", so I assume atomicity.

I also cannot verify if `ComposeError` is correctly defined and imported. The prompt says it is imported from `./composeLimits.mjs`.

I am confident in the logic of `claimOrCoalesce` and `replayIfFresh` given the assumptions.

## RECOMMENDATIONS
1. **Add a try-catch in `claimOrCoalesce` around `replayIfFresh`**:
   ```js
   let theirs;
   try {
     theirs = replayIfFresh(store, key, clock);
   } catch (e) {
     // Treat as coalesce failure, retry
     continue;
   }
   ```
2. **Log the contention**: When `claimOrCoalesce` throws `E_REPLAY_CONTENTION`, log the key and attempts. This helps debug contention issues.
3. **Test the "rejected promise" path**: Ensure that if a promise in the store rejects, `claimOrCoalesce` correctly retries and does not crash.
4. **Consider a `WeakMap` for `store`**: If `store` is a global map, using a `WeakMap` could help with garbage collection of stale entries. However, `store.delete` is already called, so this is less critical.
5. **Document the `replayExpiresAt` sentinel**: Clarify in the JSDoc that `0`/`undefined` means "no expiry" or "valid".
