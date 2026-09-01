# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r5.md
**Tokens (Ollama):** 11672 in / 1008 out | **Wall:** 23.5s | **done_reason:** stop

---
## VERDICT
REJECT — The "slimmed" replay mechanism in `composeGuards.mjs` breaks the client contract by stripping base64 payloads from the synchronous hosted lane, forcing clients to re-fetch assets they just received or crash on missing data, while the async lane correctly preserves the batch ID handle.

## BLOCKERS
1. **P0**: `slimForReplay` strips `image.data` from synchronous hosted results, but the synchronous path returns the result directly to the client. **Scenario**: Client sends a synchronous hosted request (default if `async` is not `false`? No, `async !== false` is the async path. Wait, `composeStills` line 220: `if (lane === 'local' && req.async !== false)` is async. Hosted is always synchronous in this code path? No, `runBatch` handles hosted. The code at line 250 `const work = (async () => { ... })()` is the synchronous path for hosted. It returns `result`. `slimForReplay` is applied at line 268: `store.set(key, Promise.resolve(slimForReplay(result)));`. But `return result;` at line 270 returns the **original** `result`, not the slimmed one. So the client gets the full data. The **replay** (line 138: `return { ...(await store.get(key)), replayed: true };`) gets the slimmed version. **Failure**: Client retries a synchronous hosted request. The replay returns `stills` with `image: { kind: 'b64', mime: 'image/png', dropped: true }` and **no `data` field**. If the client expects `image.data` to be present (as it was in the original response), it will crash or fail to render. The docblock says "client fetches from the library by `assetId`", but the synchronous response **does not include `assetId`** in the `stills` array items (see line 245: `stills.push({ index: i, lane, promptHash: ..., ...s.value, model: ... })` where `s.value` is from `runBatch` which does not include `assetId`). The `assetId` is only created in `persistBatch` (line 248), which is **not** included in the `stills` array. So the client has **no way** to fetch the asset from the library on replay. This is a P0 data loss/crash.
2. **P1**: `assertKeyHasOwner` checks `req.userId === undefined`, but `req.userId` could be `null` or an empty string, which would pass the check and allow anonymous coalescing. **Scenario**: `req.userId = null` and `req.idempotencyKey = "abc"`. `assertKeyHasOwner` passes. `key = "u" + null + ":" + sha("abc")` = `"unull:..."`. Two anonymous users with `userId: null` and the same key coalesce. **Fix**: Check `!req.userId` instead of `=== undefined`.

## ATTACKS
- **Correctness**: `slimForReplay` removes `image.data` but the synchronous response shape does not include `assetId`, making the replay unusable. The docblock claims "client fetches from the library by `assetId`", but `assetId` is not in the response.
- **Security**: `assertKeyHasOwner` does not handle `userId: null` or `userId: ""`, allowing anonymous IDOR.
- **Data-truth**: The synchronous hosted response includes `stills` with `image.data`, but the replay response does not. This is a response-shape drift between the initial call and the replay.

## HIGHEST RISK
The synchronous hosted replay is broken because it strips the base64 data but does not provide an `assetId` for the client to fetch the asset. The cheapest fix is to **not slim the synchronous hosted replay** (i.e., keep the full `image.data` in the store for the hosted lane) or to **include `assetId` in the `stills` array** so the client can fetch the asset on replay.

## CONFIDENCE
I could not verify whether the client is expected to handle `image.dropped: true` and fetch the asset from the library, because the `assetId` is not in the response. I also could not verify whether `userId: null` is a valid state in the system, but it is a common pattern. The P0 is certain because the code does not include `assetId` in the `stills` array.
