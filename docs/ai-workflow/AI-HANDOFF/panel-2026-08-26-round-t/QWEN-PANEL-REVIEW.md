# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-T.md
**Tokens (Ollama):** 1997 in / 1408 out | **Wall:** 26.9s | **done_reason:** stop

---
## VERDICT
REVISE — The core logic fixes are sound, but the idempotency replay mechanism introduces a critical data-truth violation (stale status) and a potential multi-tenant scope leak (IDOR) that violates the binding house rules and breaks client contracts.

## BLOCKERS
1. **P0 — IDOR / Multi-tenant Scope Leak in Replay**: In Fix 2, the replay logic returns `{ ...stored, replayed:true }` where `stored` is the 202 stub. The stub contains `batchId`. If the client retries with the same `idempotencyKey` but a *different* `userId` (or if the key derivation for anonymous callers is weak against cross-tenant collision despite the nonce claim, or if a key is shared/leaked), the system returns the batch ID of the *original* tenant. More critically, if the `store` is global/shared and the key is client-provided, a malicious client can replay another tenant's key (if keys are predictable or leaked) to access their batch status. The document states "userId IS in the derived key hash," but if the client *supplies* the idempotency key (as implied by "client idempotency key"), the server must verify that the `userId` in the request matches the `userId` associated with that key in the store. The code snippet `store.set(key, ...)` does not show this authorization check. If the key is purely client-generated and stored globally, this is a P0 IDOR.
2. **P0 — Data-Truth / Schema Drift (Stale Status)**: In Fix 2, the replay returns `status:'queued'` even if the batch has completed. The document asks if this is acceptable. It is not. Clients relying on `status` for UI state (e.g., showing a spinner) will hang indefinitely or misreport state. The `statusUrl` is authoritative, but returning a contradictory `status` field in the same payload is a schema drift violation. Clients that do not implement polling on `statusUrl` (a common pattern) will be broken. This violates the "Data-truth" house rule.
3. **P1 — Unhandled Error Path in `releaseWhenSettled`**: In Fix 1, `work.catch(() => {}).finally(() => { clearTimeout(timer); releaseOnce(); });` is called. If `work` is a Promise that rejects, `.catch` handles it. However, if `work` is *not* a Promise (e.g., a synchronous function that throws), the code path `if (!work || typeof work.then !== 'function') { releaseOnce(); return; }` handles it. But what if `work` is a thenable that throws synchronously in `.then`? The `.catch` handles it. The risk is low, but the `releaseOnce` inside `.finally` is correct. The real P1 is: if `reservation.release()` throws *again* in a subsequent call (e.g., if `releaseOnce` is called twice due to a race between the timer and the finally), the second call is guarded by `if (released) return;`. This is correct. However, the `try/catch` inside `releaseOnce` swallows the error. If the reservation release fails due to a network error (hosted lane), the GPU card might remain reserved, leading to resource exhaustion. The error is swallowed, so no alert is raised. This is a P1 operational risk.

## ATTACKS
- **Correctness**: 
  - Fix 1: `GPU_RELEASE_GRACE_MS = 90_000`. If a frame takes >90s (e.g., complex scene, slow GPU), the reservation is released while the work is still in flight. The runner checks the abort flag, but if the abort flag is not set by the release, the work continues. The document says "the runner checks its abort flag between frames," but if the release does *not* set the abort flag, the work continues, and the GPU card is released, leading to a race condition where another batch might start on the same GPU, causing corruption or failure. The `releaseWhenSettled` function does not show it setting an abort flag. It only calls `reservation.release()`. If `reservation.release()` does not signal the runner to abort, this is a critical correctness flaw.
  - Fix 2: The `finally` block in `runLocalBatch` executes after the batch is terminal. If the batch fails, `accepted` is still the 202 stub. The replay returns `status:'queued'` even for a failed batch. This is a lie.
- **Security**: 
  - IDOR: As noted in Blockers, the replay does not verify tenant ownership of the idempotency key.
  - Replay/Idempotency: The client key is retained, but the batch row might be pruned. The document asks if this is a path to a 404. If the batch row is pruned, the `statusUrl` returns 404. The replay returns `status:'queued'` and a `statusUrl` that 404s. This is a broken state.
- **Data-truth / schema drift**: 
  - Stale `status` field in replay (P0).
  - `carriesBytes:false` exemption: The stub carries no image payload, so it is exempt from the byte budget. This is correct. However, if the client expects the replay to contain the full result (e.g., image URLs), it will be missing. The stub only contains metadata. This is a schema drift if the client expects the full result.

## HIGHEST RISK
The IDOR in the idempotency replay (Blocker 1). The cheapest way to de-risk is to add a tenant check in the replay path: verify that the `userId` in the current request matches the `userId` associated with the idempotency key in the store. If they do not match, return 403.

## CONFIDENCE
I could not verify whether `reservation.release()` sets an abort flag on the runner. If it does not, Fix 1 is critically flawed. I could not verify the authorization check for the idempotency key in the replay path. I could not verify whether the client expects the full result or just the stub in the replay. I am confident that the stale `status` field is a P0 data-truth violation. I am confident that the IDOR is a P0 security violation if the key is client-provided and not tenant-scoped in the store.
