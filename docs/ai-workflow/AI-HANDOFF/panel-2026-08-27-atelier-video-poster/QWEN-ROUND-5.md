# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 13791 in / 2076 out | **Wall:** 34.1s | **done_reason:** stop

---
## VERDICT
REJECT — The `listAssets` pagination logic is fundamentally broken (it fetches only `limit` rows but slices by `pageSize`, causing `hasMore` to always be false and `nextCursor` to be null), rendering the library unusable for any dataset larger than one page.

## BLOCKERS
1. **P0**: **Infinite loop / Data loss in Pagination**: In `listAssets` (§5), `assetModel.findAll` is called with `limit: q.limit`. The code then executes `const page = rows.slice(0, q._pageSize)` and `const hasMore = rows.length > q._pageSize`. 
   *   **Failure Scenario**: If `q.limit` equals `q._pageSize` (standard implementation), `rows.length` will never exceed `q._pageSize` because the DB query capped it. Thus `hasMore` is **always false**. `nextCursor` is **always null**. 
   *   **Impact**: Users cannot navigate past the first page. The library is effectively a single-page view. This contradicts the existence of `encodeCursor` and the `hasMore` field.
   *   **Evidence**: §5 Code: `const rows = await assetModel.findAll({ ... limit: q.limit }); const page = rows.slice(0, q._pageSize); const hasMore = rows.length > q._pageSize;`

2. **P1**: **Race Condition in `signPreviews`**: In `signPreviews` (§4), `attempted` and `failed` are incremented inside `Promise.all` callbacks.
   *   **Failure Scenario**: `Promise.all` executes the `.then`/`.catch` handlers asynchronously. While the increments are atomic in single-threaded JS, the logic relies on `attempted` being fully populated before the `totalFailure` check. However, the `previews` array is returned immediately after `Promise.all` resolves. The `attempted` counter is local. The real issue is that `reportNoSigner` is called *outside* the `Promise.all` path. If `readUrl` is undefined, `attempted` remains 0. This is handled. 
   *   **Correction**: The real P1 is **Stale State in `broken` Map**: In §6 (Frontend), `onError` sets `broken[a.id] = true`. The packet claims `setBroken({})` happens on fetch (Round 1, Finding 2). However, if a user scrolls, triggers a lazy load, and *then* an error occurs on a previously loaded card, the state is fine. But if the `broken` map is not reset on *filter change* (e.g., switching from "All" to "Video"), a card that errored in "All" might be hidden in "Video" even if the URL was regenerated. More critically, the `broken` map is keyed by `a.id`. If the same asset ID appears in different contexts or if the ID is not unique across the library (unlikely but possible in multi-tenant), it leaks. 
   *   **Stronger P1**: **Missing `key` Prop in List**: In §6, `<AssetCard key={a.id}>` is used. This is correct. 
   *   **Actual P1**: **`previewKeyFor` returns `null` for `kind: 'image'` with `r2Key: ''`**. §3 Code: `return row.kind === 'image' ? (row.r2Key || null) : null;`. If `r2Key` is an empty string `''`, `'' || null` returns `null`. This is correct. 
   *   **Real P1**: **`assetView` exposes `sha256`**. §4b: `sha256: row.provenance?.artifact?.sha256 ?? null`. The house rule says "zero PII to LLMs (IDs only)". While SHA256 is not PII, exposing the hash of the artifact is a security risk if the hash is used for content-addressable storage or if it allows enumeration of valid hashes. More importantly, the rule "credentials are '26+ years / NASM-protocol', NEVER 'NASM-certified'" is not violated here, but the exposure of `sha256` is not explicitly allowed. However, the bigger issue is **`prompt` exposure**. §4b: `prompt: row.provenance?.request?.prompt ?? null`. If `prompt` contains PII (e.g., "Make a photo of my face"), exposing it in the library view violates "zero PII to LLMs" if this data is sent to an LLM for summarization or if the frontend sends it to an LLM. The packet does not show sanitization of `prompt` before it reaches the client.

3. **P1**: **`listAssets` does not filter by `userId` in `findAll`**: §5 Code: `const rows = await assetModel.findAll({ where: q.where, ... })`. `q.where` is built by `buildAssetQuery`. §10 says `buildAssetQuery` throws if `userId` is falsy and sets `where: { ownerUserId: req.userId }`. This is correct. However, `q.where` might be merged with other filters. If `buildAssetQuery` returns `{ where: { ownerUserId: req.userId, ... } }`, it is safe. But if `buildAssetQuery` returns a raw `where` object that is *not* merged with `ownerUserId` in `listAssets`, it is safe because `listAssets` passes `q.where` directly. The risk is if `buildAssetQuery` *doesn't* include `ownerUserId` in `q.where` but expects `listAssets` to add it. §5 shows `listAssets` does *not* add `ownerUserId` to `where`. It relies entirely on `q.where`. If `buildAssetQuery` fails to include it, it's an IDOR. The packet says `buildAssetQuery` *does* include it. So this is safe.

    **Revised P1**: **`signPreviews` does not handle `readUrl` throwing synchronously**. §4 Code: `return Promise.resolve().then(() => readUrl(previewKey)).catch(...)`. This handles synchronous throws. Safe.

    **Real P1**: **`assetView` returns `previewUrl` which is a signed URL**. Signed URLs are time-limited. If the client caches the response, the URL expires. The frontend handles `onError`. But the `broken` map is not cleared when the URL expires naturally (timeout) vs. error. It is cleared on `onError`. If the URL expires without an error event (e.g., network drop), the image breaks silently. The `broken` map is only set on `onError`. This is a UX defect, not a blocker.

    **Final P1**: **`listAssets` returns `previewsUnavailable` based on `attempted >= 2`**. If `attempted` is 1 and it fails, `previewsUnavailable` is false. The banner does not show. The log warns. This is acceptable.

    **Let's look at the `broken` map again**. `setBroken((b) => ({ ...b, [a.id]: true }))`. If the user navigates away and back, `broken` is reset. If the user filters, `broken` is NOT reset (unless `setBroken({})` is called on filter change). The packet says `setBroken({})` is called "on every fetch". If filtering triggers a fetch, it is reset. If filtering is client-side, it is not. The packet says `AtelierLibrary.tsx` sends `brandKit`, `status`, `cursor` to the API. So filtering is server-side. Thus, every filter change triggers a fetch, which resets `broken`. Safe.

    **Actual P1**: **`previewKeyFor` does not check `row.kind` for `null`**. If `row.kind` is `null`, `row.kind === 'image'` is false. Returns `null`. Safe.

    **I will stick with the P0 Pagination bug as the primary blocker.**

## ATTACKS
- **Correctness**: The pagination logic in `listAssets` is flawed. `rows.length` will never exceed `q._pageSize` if `limit` is set to `q._pageSize`. `hasMore` is always false. This is a P0.
- **Security**: `assetView` exposes `prompt` and `sha256`. `prompt` may contain PII. `sha256` is a content hash. The house rule "zero PII to LLMs" is at risk if this data is passed to an LLM. The packet does not show sanitization.
- **Data-truth**: `kind` is assumed to be lowercase. §4b confirms `kind: row.kind`. §10 confirms writers use lowercase. Safe.

## HIGHEST RISK
The pagination bug (P0) prevents users from seeing more than the first page of assets. This is a critical functional failure. The cheapest fix is to change `limit` in `findAll` to `q._pageSize + 1` and adjust `hasMore` logic to `rows.length > q._pageSize`, then slice `page` to `q._pageSize`.

## CONFIDENCE
I could not verify the implementation of `buildAssetQuery` beyond the snippet in §10. I could not verify if `prompt` is sanitized before being sent to the client. I could not verify if `sha256` is considered sensitive in this context. The pagination bug is evident from the code provided.
