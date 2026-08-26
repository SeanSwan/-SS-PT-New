# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r10.md
**Tokens (Ollama):** 12859 in / 1838 out | **Wall:** 30.4s | **done_reason:** stop

---
## VERDICT
REVISE — The byte-budget accounting in `slimForReplay` is broken by design: it tracks "entries retained" rather than "entries currently live," causing the budget to exhaust permanently after 12 evictions, effectively disabling the memory safety guard for the rest of the process lifetime.

## BLOCKERS
1. **P0**: **Permanent Byte Budget Exhaustion via Eviction.**
   - **Scenario**: A system outage occurs (e.g., R2 down). 12 batches fail to persist. `slimForReplay` retains bytes for all 12 (`bytesHeld` becomes 12).
   - **Trigger**: The 13th batch fails. `bytesHeld >= BYTES_RETAIN` (12 >= 12) is true. The 13th batch is returned with `bytesDropped: true`.
   - **Eviction**: As new requests arrive, `rememberKey` evicts the oldest settled entries. If it evicts one of the first 12 byte-carrying entries, `releaseBytes` is called, decrementing `bytesHeld` to 11.
   - **Failure**: The 14th batch fails. `bytesHeld` is 11. It is retained. `bytesHeld` becomes 12.
   - **Result**: The budget oscillates or stays at 12. However, the critical flaw is that `slimForReplay` increments `bytesHeld` *before* the entry is added to the store and marked as settled. If an entry is evicted *before* it is ever settled (e.g., during a burst of in-flight requests that get evicted by the `settled` set logic? No, `rememberKey` only evicts from `settled`).
   - **Actual P0**: **Race Condition in `rememberKey` Eviction Logic.**
     - `rememberKey` evicts from `settledKeys`. But `slimForReplay` is called *after* `store.set(key, Promise.resolve(retained))`.
     - If `carriesBytes` is true, `byteKeys.add(key)` happens in `rememberKey`.
     - **The Bug**: `slimForReplay` increments `bytesHeld` immediately. But if the entry is *never* settled (e.g., the request fails after `slimForReplay` is called but before `rememberKey`? No, `rememberKey` is called right after).
     - **Wait, look at `composeStills.mjs` line 275**: `rememberKey` is called with `carriesBytes: retained.bytesDropped !== true`.
     - If `bytesDropped` is `true`, `carriesBytes` is `false`. `byteKeys` does NOT add the key. `bytesHeld` was NOT incremented in `slimForReplay` (because it returned the dropped version).
     - If `bytesDropped` is `false` (bytes retained), `carriesBytes` is `true`. `byteKeys` adds the key. `bytesHeld` WAS incremented in `slimForReplay`.
     - **The Real P0**: **`releaseBytes` is called on eviction, but `bytesHeld` is a global counter that is never decremented when an entry is *replaced* or if the same key is re-used.**
     - Actually, the biggest issue is simpler: **`bytesHeld` is incremented in `slimForReplay`, but `slimForReplay` is a pure function that doesn't know if the entry will actually be retained in the map.**
     - In `composeStills.mjs`, `slimForReplay` is called, then `store.set` is called, then `rememberKey` is called.
     - If `rememberKey` evicts the *current* key (unlikely, but possible if `settled.size > IDEMPOTENCY_RETAIN` and the current key is the oldest? No, the current key is the newest).
     - **Let's look at the `derivedKeys` eviction in `rememberKey`**:
       ```javascript
       while (derivedKeys.size > DERIVED_RETAIN) {
         const oldest = derivedKeys.values().next();
         if (oldest.done || oldest.value === key) break;
         store.delete(oldest.value);
         derivedKeys.delete(oldest.value);
         releaseBytes(oldest.value);
       }
       ```
       If `oldest.value` was a byte-carrying entry, `releaseBytes` decrements `bytesHeld`. This is correct.
     - **However**: What if an entry is evicted from `COALESCING_STORE` by *other* means? E.g., `store.delete(key)` in the `catch` block of `composeStills`.
       - If a request fails, `store.delete(key)` is called.
       - If that key was byte-carrying, `bytesHeld` is NOT decremented.
       - **Result**: `bytesHeld` leaks. After 12 failed byte-carrying requests, `bytesHeld` is 12. All subsequent byte-carrying requests are dropped, even if the first 12 were evicted/deleted. The budget is permanently exhausted.
       - **Evidence**: `composeStills.mjs` line 280: `store.delete(key)` in catch block. `composeGuards.mjs` `releaseBytes` is only called in `rememberKey` eviction loops. It is NOT called when `store.delete` is called directly.

2. **P1**: **`assertKeyHasOwner` does not prevent IDOR on Derived Keys.**
   - `assertKeyHasOwner` only checks `req.idempotencyKey`.
   - If `req.idempotencyKey` is missing, a derived key is used.
   - `deriveKey` uses `userId`. If `userId` is missing/undefined, `deriveKey` might use a default or throw.
   - If `userId` is undefined, `deriveKey` might produce a key that is shared across anonymous users.
   - **Scenario**: Two anonymous users send the same brief. `deriveKey` produces the same key (if it doesn't salt with a random nonce). They coalesce. User B receives User A's result.
   - **Evidence**: `composeStills.mjs` line 165: `deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count }, now)`. If `req.userId` is undefined, and `deriveKey` does not include a random component, this is an IDOR.

## ATTACKS
- **Correctness**: The `bytesHeld` leak (Blocker 1) is a critical correctness issue. The byte budget is intended to limit memory, but it permanently exhausts, leading to either memory exhaustion (if the leak is ignored) or permanent denial of service for byte-carrying replays (if the leak is respected).
- **Security**: The IDOR on derived keys (Blocker 2) allows one user to access another user's results if they can guess or replicate the derived key. This is a multi-tenant scope leak.
- **Data-truth**: The `slimForReplay` function returns a shape with `bytesDropped: true` and `image: { kind, mime, dropped: true }`. The client must handle this shape. If the client expects `image` to be a base64 string, it will crash. This is a frontend response-shape drift.

## HIGHEST RISK
The `bytesHeld` leak (Blocker 1) is the highest risk because it silently disables the memory safety guard, leading to either OOM or permanent DoS. The cheapest fix is to call `releaseBytes` in the `catch` block of `composeStills` when `store.delete(key)` is called, and to ensure that `releaseBytes` is called whenever a byte-carrying entry is removed from the store, regardless of the reason.

## CONFIDENCE
I could not verify the implementation of `deriveKey` in `composeLimits.mjs`. If `deriveKey` includes a random nonce, Blocker 2 is not an issue. If it does not, it is a critical IDOR. I also could not verify the client's handling of the `bytesDropped` shape, so I cannot confirm if the frontend response-shape drift is a blocker.
