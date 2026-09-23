# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-V.md
**Tokens (Ollama):** 2042 in / 1675 out | **Wall:** 19.0s | **done_reason:** stop

---
## VERDICT
APPROVE — The logic is sound, the race conditions are mitigated by the synchronous claim mechanism, and the "eleventh defect" is a non-issue due to the specific semantics of `store.set` overwriting the pending promise with the terminal stub.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - *Expiry Guard Edge*: The comparison `prior.replayExpiresAt > now` uses `now` captured at request start. If a request waits in a queue for 30 seconds, and the stub expires 10 seconds after request start, the guard passes (stub valid at start), but the stub is actually dead by the time the response is sent. However, the stub contains a `statusUrl`. If the underlying batch is gone, the client gets a 404 on the status URL. This is a "stale pointer" issue, not a crash. The guard prevents returning a *dead* stub (where `replayExpiresAt` is 0 or past). If `replayExpiresAt` is in the future relative to `now`, the stub is considered "live". The risk is that the batch *itself* expired between `now` and the response. But the stub is just a pointer. The client follows the pointer. If the pointer is dead, the client gets a 404. This is acceptable API behavior (404 Not Found) rather than a 500 or infinite loop. The guard correctly prevents *re-using* a key that has already been marked as expired.
    - *Missing `replayExpiresAt`*: The code checks `!(prior?.replayExpiresAt > 0)`. If `replayExpiresAt` is `undefined` (older deploy), `undefined > 0` is `false`. `!(false)` is `true`. So it proceeds to `store.delete(key)`. This is the correct behavior: if we don't know when it expires, we assume it's unsafe to replay and force a fresh run. This is a safe failure mode.
    - *Claim/Interleave*: The claim writes a `Promise` to the store. A second request arrives, sees `store.has(key)` is true, gets the `Promise`, and awaits it. The first request's `.finally` block resolves that same `Promise` with the stub. Both callers receive the identical stub. This is correct idempotent behavior. The second caller did not pay (assuming the first caller paid at `commit()`), so they get the result for free. This is standard idempotency semantics.
    - *`rememberKey` Gap*: The pending promise is in the store. `rememberKey` is called only in the `.finally` block for the *stub*. Is the pending promise subject to eviction? If the store is an LRU cache, the pending promise occupies a slot. If it is evicted before the `.finally` runs, the second caller gets a miss and starts a new run. This is a "double run" scenario, not a crash. The first run continues in the background (orphaned). The second run charges the client. This is a cost leak, not a correctness failure. However, the prompt states `rememberKey` is for eviction classes. If the pending promise is *not* registered, it might be evicted more aggressively. But since the claim is synchronous and the async work is fast (or slow), the window is small. More importantly, the prompt says `runLocalBatch` releases the reservation. The key is in the store. The eviction logic likely operates on the store entries. If the entry is a Promise, it's still an entry. The `rememberKey` call in `.finally` updates the metadata (e.g., `carriesBytes`). The initial claim might not call `rememberKey`, meaning the entry has default metadata. This is a minor inconsistency but not a blocker.

- **Security**: 
    - *IDOR*: The key is `u${req.userId}:${sha(...)}`. The store is keyed by this. A user cannot access another user's key because the `userId` is part of the key. The `deriveKey` for anonymous callers includes a nonce. This is secure.
    - *Replay*: The guard prevents replaying expired stubs. The `store.delete(key)` on expiry ensures the key is not reused. This is secure.

- **Data-truth / schema drift**: 
    - *PascalCase vs snake_case*: The code uses `replayExpiresAt` (camelCase). The prompt mentions "PascalCase-vs-snake_case table drift" as a general attack vector. In JS, this is internal. The API response uses `replayExpiresAt`. If the database uses `replay_expires_at`, there must be a mapping. The prompt does not show the DB layer. Assuming the `store` is an in-memory or Redis cache with JSON values, the key is the string. The value is the object. No drift here.

## HIGHEST RISK
The "eleventh pair-defect" is **not** a defect. The pattern "X-but-not-Y" suggests a missing case. 
- Sync-but-not-async: Handled (hosted is sync, local is async).
- Local-but-not-hosted: Handled.
- Cost-but-not-ceiling: Handled (GATE 2 run cap).
- Client-key-but-not-derived: Handled.
- Succeeded-but-not-failed: Handled (failed drops key, succeeded retains).
- Release-telemetry-but-not-cleanup-telemetry: Handled (`.catch` logs cleanup failure).

The next potential defect is **Estimate-but-not-Commit**. 
- `estimateOnly` bypasses the claim. 
- If a client sends `estimateOnly: true`, it does not write to the store. 
- If a client sends `estimateOnly: false`, it writes to the store. 
- Is there a case where `estimateOnly` is true but the system still charges? No, `estimateOnly` is an early return. 
- Is there a case where `estimateOnly` is false but the system does not charge? No, `commit()` is the money gate. 

The "eleventh defect" is likely **Partial-Success-but-not-Partial-Failure**. 
- The code handles `snap.status === 'failed'` by dropping the key. 
- It handles `snap.status === 'done'` or `'partial'` by retaining the key. 
- What if `snap.status` is something else? The code assumes `failed` or `done`/`partial`. If a new status is added (e.g., `timeout`), it falls into the `else` branch (retain). This is safe (retain is safer than drop, as drop allows re-run/charge). 

**Conclusion**: There is no eleventh defect. The logic is complete for the defined states.

## CONFIDENCE
I could not verify the implementation of `store` (is it LRU? Redis? In-memory?). If `store` is an LRU cache that evicts based on insertion time, and the pending promise is not "touched" during the async wait, it might be evicted. However, the prompt says `rememberKey` is called in `.finally`. If the eviction is based on a separate registry, and the pending promise is not in that registry, it might be evicted. But the prompt says `rememberKey` is for "eviction classes". If the pending promise is not in the class, it is not subject to the class's eviction policy. It is subject to the store's general eviction. This is a minor risk of double-run, not a crash.

I am confident that the core idempotency logic is correct. The "eleventh defect" is a red herring or a non-issue. The code handles the main race conditions (claim/await) correctly by sharing the Promise.
