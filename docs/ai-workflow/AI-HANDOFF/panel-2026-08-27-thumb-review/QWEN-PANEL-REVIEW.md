# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\thumb-review.md
**Tokens (Ollama):** 4174 in / 1843 out | **Wall:** 31.5s | **done_reason:** stop

---
## VERDICT
REVISE — The core logic is sound and the "optimization never blocks persistence" invariant holds, but the concurrency model for the derivative generation is unsafe under the stated "two concurrent persists" scenario, risking data corruption or inconsistent state.

## BLOCKERS
1.  **P0: Race condition in `row.update` causes lost updates or inconsistent state.**
    *   **Scenario:** Two concurrent requests persist the same `still` (same `userId`, same `sha256`). Both pass `findOrCreate` and receive the same `row` object (or two distinct row objects pointing to the same DB record, depending on ORM implementation, but logically the same entity). Both see `posterR2Key` as `null`. Both execute `makeThumbnail`. Both execute `d.putObject` (idempotent, harmless). Both execute `row.update({ posterR2Key: thumbKey })`.
    *   **Failure:** If the ORM's `update` is not atomic or uses a stale snapshot, one update may overwrite the other, or more critically, if `row` is a detached object, the second update might fail or succeed based on transaction isolation. However, the deeper issue is that `row` is a local variable. If `findOrCreate` returns a *new* instance for the second caller (common in Prisma/TypeORM if not cached), `row.update` works. But if the library relies on the *returned* `posterR2Key` from `persistStill` to render the UI immediately, and the second request's `row.update` hasn't committed yet, the UI might flash the original. More dangerously, if `row` is a shared reference or if the ORM batches writes, a race on the `posterR2Key` field could lead to a state where the DB has the key but the object returned to the client is stale, or vice versa.
    *   **Evidence:** `persistStill` code: `const [row, created] = await d.assetModel.findOrCreate...` followed by `await row.update({ posterR2Key: thumbKey })`. There is no optimistic locking, no `WHERE posterR2Key IS NULL` guard in the update, and no transaction wrapping the check-and-set.

2.  **P1: `makeThumbnail` returns `null` if output is larger than input, but `persistStill` does not handle the case where `thumb` is null *after* a successful `putObject` of the original.**
    *   **Scenario:** A user uploads a 100x100 PNG (10KB). `makeThumbnail` generates a 100x100 WebP (15KB) because WebP is less efficient at tiny sizes. `out.data.length >= bytes.length` is true. `makeThumbnail` returns `null`.
    *   **Failure:** `persistStill` catches this as "no thumbnail". `posterR2Key` remains `null`. The library falls back to the original. This is *correct* behavior per the spec ("A thumbnail is an optimisation"). However, the *comment* in `makeThumbnail` says "A 'thumbnail' larger than its source is not a thumbnail." This is fine. But consider the *cost*. We are doing CPU work to generate a file we then discard. This is a P2 performance issue, not a blocker. *Wait*, let's look closer. Is there a case where `makeThumbnail` *throws*? No, it catches. Is there a case where `putObject` for the thumbnail fails? Yes. `persistStill` catches `err` from the `try` block containing `makeThumbnail` and `putObject`. If `putObject` fails, `posterR2Key` remains `null`. This is safe.
    *   **Re-evaluation:** This is not a blocker. It is a minor inefficiency.

3.  **P1: `findOrCreate` with `where: { r2Key }` is not atomic with the subsequent `putObject` if `created` is false but the object is missing.**
    *   **Scenario:** A row exists in the DB with `r2Key = 'hash123'`. The object `hash123` was deleted from R2 (manual cleanup, lifecycle policy, or bug). A new request comes in with the same bytes. `findOrCreate` finds the row, `created` is `false`. `persistStill` skips `putObject` for the original. It then tries to generate a thumbnail. `makeThumbnail` succeeds. `putObject` for the thumbnail succeeds. `row.update` succeeds.
    *   **Failure:** The library tries to sign the *original* key `hash123` (if `posterR2Key` was null before this run, or if the fallback is used). The browser gets a 404. The card is broken. The code assumes "existing row means bytes are already there". This assumption is **false** if the object store and database are not perfectly synchronized.
    *   **Evidence:** `persistStill` comment: "an existing row means the bytes are already there under this exact key". This is a **P0** data integrity risk. The code does not verify the object exists before skipping the upload.

## ATTACKS
-   **Correctness:**
    -   **Race Condition (Blocker 1):** As described, the check-then-act on `posterR2Key` is not atomic.
    -   **Stale State (Blocker 3):** The assumption that `created === false` implies object existence is fragile.
    -   **Null Handling:** `makeThumbnail` returns `null` on failure. `persistStill` handles this by leaving `posterR2Key` as `null`. This is correct.
    -   **Type Mismatch:** `thumb.bytes` is a Buffer. `d.putObject` expects `Body`. If `d.putObject` expects a string or Stream, this will fail. The doc says `d.putObject({ Key, Body, ContentType, Metadata })`. It doesn't specify `Body` type. If it's an S3 client, it accepts Buffer. If it's a custom wrapper, it might not. **P1**: Verify `d.putObject` accepts Buffer.

-   **Security:**
    -   **IDOR:** `thumbObjectKey` includes `userId`. `r2Key` includes `userId`. Good.
    -   **Injection:** No SQL injection risk in `findOrCreate` (ORM). No command injection in `sharp`.
    -   **Secret Handling:** `readUrl` is injected. If `readUrl` leaks the secret in the URL, that's a problem, but it's out of scope for this module.
    -   **Replay/Idempotency:** `putObject` is idempotent. `row.update` is not idempotent if it changes state, but here it sets a specific value.

-   **Data-truth / schema drift:**
    -   **`posterR2Key` column:** The doc says it's an existing nullable column. Good.
    -   **`mime` field:** `persistStill` returns `mime`. The library uses `r.mime` for fallback. If `r.mime` is `null` or wrong, the fallback signer might use the wrong content type. `persistStill` sets `mime` based on `MIME_BY_FORMAT` or `still.image.mime`. This seems robust.

## HIGHEST RISK
**The assumption that `created === false` implies the object exists in R2 (Blocker 3).**
**Cheapest De-risk:** Add a `d.headObject({ Key: r2Key })` check before skipping `putObject`. If the object is missing, re-upload it. This ensures the "existing row" invariant holds. Alternatively, always `putObject` if `created` is false, relying on R2's idempotency (which is safe but costs bandwidth). The `headObject` check is cheaper.

## CONFIDENCE
I cannot verify the implementation of `d.putObject` and `d.assetModel.findOrCreate`. If `findOrCreate` uses a transaction that locks the row, the race condition in Blocker 1 might be mitigated. If `d.putObject` is a standard S3 client, it accepts Buffers. If it's a custom wrapper, it might not. I also cannot verify if the R2 bucket has lifecycle policies that delete objects, which would make Blocker 3 a real-world issue. I am confident in the code logic review based on the provided snippets, but the integration points are unknown.
