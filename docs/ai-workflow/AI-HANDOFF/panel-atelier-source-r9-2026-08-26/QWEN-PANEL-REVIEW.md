# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r9.md
**Tokens (Ollama):** 12989 in / 1387 out | **Wall:** 31.1s | **done_reason:** stop

---
## VERDICT
REVISE — The code is structurally sound and the recent fixes are correct, but `slimForReplay` contains a logic inversion that causes a P0 data loss scenario (dropping the only copy of an image when the budget is exhausted) and a P1 memory leak in the eviction logic.

## BLOCKERS
1. **P0**: **Data Loss on Budget Exhaustion**: In `composeGuards.mjs`, `slimForReplay` checks `if (result.stills.some((s) => !s.assetId))`. If true, it enters the "keep bytes" branch. Inside that branch, it checks `if (bytesHeld >= BYTES_RETAIN)`. If the budget is exhausted, it **returns a slimmed copy** (`bytesDropped: true`, `image: { dropped: true }`). This is the exact opposite of the intent. The intent is to keep bytes *because* they are the only copy. If the budget is exhausted, the code drops the only copy, resulting in a permanent loss of the user's paid render. The comment says "a lost render is still lost — but the process survives," but the code actively destroys the data rather than just failing to retain it for *future* requests. The correct behavior when budget is exhausted is to **throw** or **refuse the request** (or return an error indicating the system cannot retain the result), not to silently drop the only copy of the data.
   *   *Evidence*: `composeGuards.mjs` lines ~140-145: `if (bytesHeld >= BYTES_RETAIN) return { ...result, replayed: true, bytesDropped: true, ... stills: result.stills.map(({ image, ...rest }) => ({ ...rest, image: image ? { kind: image.kind, mime: image.mime, dropped: true } : null })) };`

2. **P1**: **Memory Leak in Eviction Logic**: In `composeGuards.mjs`, `rememberKey` for `clientKeyed` entries evicts from `settled` and `store`. However, the `derivedKeys` set is **never cleaned up** when a derived key is evicted from `store` by the client-key eviction logic, or if the derived key is simply not accessed again. More critically, the `derivedKeys` set grows unbounded if `DERIVED_RETAIN` is not enforced correctly. Wait, looking closer: `rememberKey` *does* evict derived keys. But the `bytesHeld` counter is **never decremented** when a key is evicted from the store. If a key with bytes is evicted, `bytesHeld` remains high, permanently blocking new bytes from being retained, even though the memory was freed. This is a P1 functional bug (system degrades to "always drop bytes" after 12 unpersisted stills, even if they are evicted).
   *   *Evidence*: `composeGuards.mjs` `rememberKey` deletes from `store` but does not adjust `bytesHeld`. `slimForReplay` increments `bytesHeld` but there is no corresponding decrement on eviction.

## ATTACKS
- **Correctness**: 
    - **Stale State**: `bytesHeld` is a global counter that is not tied to the actual memory usage of the `store`. Evicting a key does not release the "budget" slot. This leads to a permanent denial of service for byte retention after 12 unpersisted stills, regardless of current memory pressure.
    - **Logic Inversion**: As noted in Blocker 1, the `bytesHeld >= BYTES_RETAIN` check returns a *slimmed* (dropped) result, which is the opposite of the intended "keep bytes" behavior.
- **Security**: 
    - **IDOR/Confused Deputy**: `assertKeyHasOwner` is good. However, `deriveKey` uses `sha(String(req.idempotencyKey))`. If `req.idempotencyKey` is not a string, `String()` might produce `"undefined"` or `"null"`, leading to a collision. The code should validate the type of `idempotencyKey` before hashing.
    - **Race Condition**: The `store.set(key, pending)` is synchronous, which is good. However, if `settle.res` is called in the `finally` block of the async local lane, and the promise is already rejected, it might throw. The code does `pending.catch(() => {})`, which is good.
- **Data-truth / schema drift**: 
    - **Shape Drift**: `slimForReplay` returns `image: { kind, mime, dropped: true }`. The original `image` object might have had other fields (e.g., `data`, `url`). Clients expecting `image.data` will get `undefined`. This is a breaking change for any client that relies on the full shape, even if they check `dropped`. The documentation should be explicit that the shape changes.

## HIGHEST RISK
The **P0 Data Loss** in `slimForReplay`. The system is designed to retain bytes when persistence fails, but if the budget is exhausted, it silently drops the only copy. This is a catastrophic failure for a paid service.

**Cheapest De-risk**: 
1. Fix the logic in `slimForReplay`: If `bytesHeld >= BYTES_RETAIN`, **throw an error** (e.g., `ComposeError('E_BYTES_BUDGET_EXHAUSTED', ...)`) instead of returning a slimmed copy. This forces the caller to handle the error, preventing silent data loss.
2. Implement a `decrementBytesHeld` function and call it in `rememberKey` when evicting a key that was previously counted in `bytesHeld`. This requires tracking which keys contributed to `bytesHeld` (e.g., a `Set` of keys with bytes).

## CONFIDENCE
I am confident in the P0 and P1 findings because they are direct logic errors in the provided code. I could not verify the behavior of `makeFileLedger` or `spendLedger.mjs` because they are not provided, but the `laneLedger.mjs` code appears consistent with its description. I also could not verify the `localStillLane.mjs` behavior, but the `composeStills.mjs` code correctly handles the async local lane by returning a batch ID immediately.
