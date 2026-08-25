# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASYNC-STILLS-REVIEW-PACKET-2026-08-25.md
**Tokens (Ollama):** 1935 in / 1779 out | **Wall:** 25.9s | **done_reason:** stop

---
## VERDICT
REJECT — The system violates the "durable state" expectation for a production SaaS by relying on a volatile in-memory Map that silently loses user data (assets) upon restart, and the polling architecture creates a race condition where the client can receive a 404 while assets exist on disk, breaking the "asset id present before a poll can see it" guarantee.

## BLOCKERS
1. **P0: Data Loss & State Inconsistency on Restart.**
   - **Scenario:** User initiates a 4-frame batch. Frame 1 renders and is persisted to disk (asset ID generated). Process crashes or restarts before Frame 2. The `batchStore` (in-memory Map) is wiped. User polls `GET /stills/:batchId`.
   - **Failure:** Server returns `404` (batch not found). User assumes the entire batch failed. However, Frame 1 exists on disk as an orphaned asset. The UI likely clears the "in-flight" state, leaving the user with no record of the partial success and no way to retrieve the already-persisted asset. This violates the "tri-state honesty" constraint and creates silent data loss.
   - **Evidence:** §2 "Store: ... process-local Map ... a restart loses in-flight batches and reports them by 404." §1 "each still is persisted the moment it renders".

2. **P0: Race Condition in Idempotency/Replay Logic.**
   - **Scenario:** Client sends `POST /stills` (Request A). Server accepts, returns `202` with `batchId`. Client network hiccups, client retries `POST /stills` (Request B) before the first request fully settles in the store or before the client processes the response.
   - **Failure:** If `store.has(key)` check happens *before* the promise is resolved/set, or if the key is derived from a non-unique client-side token, Request B may create a *second* batch or return a stale `batchId` that is already `running`. More critically, if the idempotency key is based on request payload hash, and the payload includes a timestamp (common for cache-busting), the idempotency fails entirely, leading to double GPU reservation attempts. If it relies on a client-generated ID, a client bug (reusing ID) causes a 409 or silent overwrite. The document does not specify the idempotency key structure, making this a critical undefined behavior.
   - **Evidence:** §2 "Idempotency coalesces to one batch ... `store.has(key)` → same `batchId`". No definition of `key`.

3. **P1: GPU Reservation Leak on Unhandled Exceptions.**
   - **Scenario:** `reserveGpu()` succeeds. `admission()` succeeds. `renderStill()` throws an uncaught exception *outside* the try/catch block that calls `release()`.
   - **Failure:** The GPU reservation is never released. The system enters a "zombie" state where `E_LOCAL_BUSY` is returned for all subsequent requests until server restart. The document claims "Reservation released on every path," but `try/finally` is the only robust pattern, and the document does not explicitly confirm `finally` usage, only "try AND catch".
   - **Evidence:** §2 "Reservation released on every path ... `release()`". §3 "No cancel endpoint".

## ATTACKS
- **Correctness:**
  - **Stale State:** The `batchStore` is a `Map`. If the server restarts, the Map is empty. If a client is polling, it gets 404. But the *assets* are on disk. The UI has no mechanism to reconcile "404 batch" with "existing assets on disk". This is a fundamental state mismatch.
  - **Polling Race:** Client polls at 3s. Batch finishes at 2m 59s. Client polls at 2m 58s (sees `running`). Batch finishes at 2m 59s. Client polls at 3m 01s. If `prune()` runs at 3m 00s (unlikely but possible if clock skew or aggressive pruning), the batch is gone. More likely: The 404 is returned, but the client has already rendered the "success" state based on the previous `done` response? No, the client waits for `terminal`. If it gets 404 after `running`, it must treat it as `failed`. But the assets exist. This is a UX disaster.
  - **Idempotency Key Ambiguity:** Without a defined key (e.g., `userId + payloadHash + nonce`), idempotency is not guaranteed. If the key is just `userId`, all batches for a user collide. If it's `payloadHash`, identical payloads always collide, preventing legitimate re-renders.

- **Security:**
  - **IDOR:** `GET /stills/:batchId` is owner-scoped. Good. But if `batchId` is predictable (e.g., sequential integer), an attacker could brute-force IDs. The document specifies `/^[0-9a-f-]{36}$/` (UUID), which is good.
  - **DoS:** Polling every 3s for 2 minutes is ~40 requests. If a client is buggy and polls every 100ms, it could DoS the server. No rate-limiting on the poll endpoint is mentioned. `Retry-After` is only mentioned for 409 (busy), not for rate limiting.
  - **Secret Handling:** None mentioned, but ensure `batchId` is not logged with PII.

- **Data-truth / schema drift:**
  - **Asset ID vs Batch ID:** The `stills[]` array contains `assetId`. The batch contains `batchId`. If the batch is lost (404), the client has no way to know which `assetId`s were generated. The client must store the `assetId`s locally as they are received? No, the client only gets the batch snapshot. If the batch is 404, the client has *zero* asset IDs. This is a critical data truth failure.

## HIGHEST RISK
**The "404-by-absence" strategy for in-flight batches is a P0 data loss bug.** The cheapest way to de-risk this is to **persist the batch metadata (status, asset IDs) to a durable store (e.g., SQLite or Redis) immediately upon creation and upon each frame completion**, rather than relying on an in-memory Map. If the server restarts, the batch metadata survives, and the client can poll and see `partial` or `done` with the correct asset IDs. If durable storage is not an option, the client must be instructed to **store the `assetId`s locally in `localStorage` as they are received in the poll response**, so that even if the batch 404s, the client can still display the assets. However, the current design does not expose `assetId`s until the batch is `done` or `partial`? No, §2 says "every still the poll sees already has its asset id". So the client *can* store them. But the document does not mandate this client-side behavior. The server must guarantee that the batch ID is durable enough to be polled, or the client must be resilient to 404s by having cached asset IDs. Given the "hostile review" context, the server-side lack of durability is the primary failure.

## CONFIDENCE
I cannot verify the **idempotency key generation logic** from the document. I assume it is `userId + payloadHash`, but if it is `userId + timestamp`, idempotency is broken. I also cannot verify if the client-side code actually caches `assetId`s from the poll response, as the document only describes the backend contract. I am confident that the in-memory Map is a P0 issue for a production SaaS, as it violates basic durability expectations for user-generated content. I am also confident that the lack of a cancel endpoint is a P2 for a solo operator, but a P1 for a multi-user SaaS, though the document specifies "solo operator" in §4.5.
