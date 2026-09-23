# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-AB.md
**Tokens (Ollama):** 3864 in / 973 out | **Wall:** 11.3s | **done_reason:** stop

---
## VERDICT
APPROVE — The core concurrency and identity-checking logic is sound, all mutations are conditional, and the "synchronous miss" invariant holds for both absent and expired paths.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - **Race Condition (Microtask Drain)**: The `claimOrCoalesce` loop relies on `claimIfAbsent` succeeding synchronously. If `store.set` were asynchronous (e.g., Redis), the `for` loop would spin, and multiple callers could pass `claimIfAbsent` (all seeing `false` or `true` inconsistently) before any `set` commits. However, the docstring explicitly states this is for an in-memory store where `set` is synchronous. The code is correct *for the stated constraint*.
    - **Stale State**: `replayIfFresh` correctly distinguishes between a `Promise` (live claim) and a plain object (settled stub). The `judge` function correctly handles the case where `prior` is `null` (absent) or expired. The `dropIfStillOurs` check ensures we don't delete a key that has been re-claimed by a new owner.
    - **Unhandled Error Paths**: `resolveReplay` catches rejections from `await pending`. If the pending promise rejects, it drops the key (if still ours) and returns `null`, allowing the caller to retry. This is correct.
- **Security**:
    - **IDOR**: The key is `u${userId}:${sha(idempotencyKey)}`. This is scoped to the user. No cross-tenant leak.
    - **Replay/Idempotency**: The system correctly prevents duplicate renders by coalescing onto live claims or replaying fresh stubs. The `E_REPLAY_CONTENTION` error prevents a "double-spend" of GPU resources if ownership cannot be established.
- **Data-truth / schema drift**:
    - **`replayExpiresAt`**: The `judge` function strips `replayExpiresAt` from the response body. This is correct; it is internal bookkeeping.
    - **`REPLAY_NEVER_EXPIRES`**: Defined as `Number.POSITIVE_INFINITY`. The `judge` function checks `deadline > 0`. `Infinity > 0` is true. `Infinity <= clock()` is false. So it correctly treats it as never expired.

## HIGHEST RISK
The assumption that `store.set` and `store.get` are synchronous and atomic. If the underlying store implementation changes to an async backend (e.g., Redis, DynamoDB) without updating `claimIfAbsent` to be async and use a lock, the entire concurrency model collapses. The current code is safe *only* because it is in-memory.

**Cheapest de-risk**: Add a runtime assertion or documentation comment in `claimIfAbsent` that explicitly forbids async stores. Alternatively, if an async store is planned, refactor `claimIfAbsent` to use `SET NX` (Redis) or equivalent atomic compare-and-swap.

## CONFIDENCE
I cannot verify the behavior of `store` if it is not a simple in-memory Map. The code assumes `store.has`, `store.get`, `store.set`, and `store.delete` are synchronous and atomic. If `store` is a wrapper around an async database, this code is broken. The docstring says "in-memory store," so I am confident in the current implementation, but not in future-proofing.

## RECOMMENDATIONS
1. **Explicit Store Contract**: Define an interface for `store` that explicitly requires synchronous, atomic operations. This prevents accidental use of async stores.
2. **Observability**: Add metrics for `E_REPLAY_CONTENTION` errors. High rates indicate either a bug in the concurrency logic or a client-side retry storm.
3. **Test for Microtask Drain**: Write a test that simulates multiple concurrent `claimOrCoalesce` calls with a rejected promise. Verify that only one caller succeeds in claiming the key after the rejection, and the others either coalesce or throw `E_REPLAY_CONTENTION`.
4. **Clarify `REPLAY_NEVER_EXPIRES`**: Consider using a named constant like `REPLAY_EXPIRATION_NEVER` instead of `Infinity` to make the intent clearer. `Infinity` is a valid number, but it can be confusing in comparisons.
5. **Error Message Clarity**: The `E_REPLAY_CONTENTION` error message is good, but consider adding a hint about the idempotency key format to help clients debug.
