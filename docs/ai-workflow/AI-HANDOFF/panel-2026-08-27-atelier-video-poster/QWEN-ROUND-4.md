# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 11975 in / 970 out | **Wall:** 25.1s | **done_reason:** stop

---
## VERDICT
APPROVE — The core logic is robust, the "single rule" architecture is sound, and the identified edge cases (n=1 failure, null rows) are handled with appropriate telemetry and degradation.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: 
    - **Race Condition (Stale State)**: In `AtelierLibrary.tsx`, the `broken` map is reset via `setBroken({})` on every fetch (verified in Round 1, Finding 2). However, if a user scrolls down, triggers a lazy load, and *then* the initial page's signatures expire, the `onError` handler sets `broken[id] = true`. If the user scrolls back up, the component re-renders. If the `previewUrl` is still present in state (stale), it will attempt to render the image again. If the URL is still expired, it errors again. This is acceptable behavior (retry on error), but ensure `previewUrl` is not cached in a way that prevents re-signing if the user refreshes. The current implementation relies on the API returning fresh URLs on re-fetch, which is correct.
    - **Type Mismatch**: `previewKeyFor` returns `null` or a string. `signPreviews` maps this to `null` or a URL. `assetView` passes `previewUrl` (string | null) to the frontend. The frontend checks `a.previewUrl && !broken[a.id]`. This is type-safe.
    - **Null Handling**: `previewKeyFor` now explicitly handles `null` and `undefined` via `if (!row) return null`. This is correct.

- **Security**:
    - **IDOR**: `buildAssetQuery` throws `E_BAD_OWNER` if `userId` is falsy. `where` clause includes `ownerUserId: req.userId`. This is secure.
    - **Injection**: No SQL injection risk as Sequelize parameterizes queries.
    - **SSRF**: `readUrl` is injected. The backend uses `r2.generateThumbnailUrl(key)`. This is a standard S3/R2 pre-signed URL generator. No SSRF risk as the key is validated against the bucket's allowed prefixes (assumed, standard practice).
    - **Secret Handling**: No secrets in the response. Signed URLs are temporary.
    - **Replay/Idempotency**: Not applicable for read-only list operations.

- **Data-truth / schema drift**:
    - **Model Column vs Caller Field**: `posterR2Key` is used consistently. `kind` is used consistently.
    - **PascalCase vs snake_case**: `posterR2Key` (camelCase) in JS, `poster_r2_key` (snake_case) in DB. Sequelize handles this.
    - **FK Target Drift**: `jobId` links to `VideoRenderJob`. Verified in Round 2, Finding 2.
    - **Frontend Response-shape Drift**: `assetView` returns `kind`, `brandKit`, `lane`, `promptTruncated`, `width`, `height`, `status`, `previewUrl`. The frontend card render uses all these. Verified in Round 3, Finding 3.

## HIGHEST RISK
**The `node:test` blind spot.** 188 tests are running under `node:test` but are invisible to the Vitest suite. If one of these tests fails, the CI pipeline will report a clean run (Vitest passes) while the underlying logic is broken. This is a significant risk to code quality and confidence.

**Cheapest de-risk**: Add a CI step that runs `node --test` on the `backend/tests/unit/*.mjs` files that use `node:test`. This ensures these tests are executed and their results are visible in the CI pipeline.

## CONFIDENCE
- **Verified**: The logic of `previewKeyFor`, `signPreviews`, and the frontend card render is correct and handles edge cases (null rows, n=1 failures, mixed pages).
- **Verified**: The security model (IDOR, injection) is sound.
- **Verified**: The data schema is consistent.
- **Unverified**: The actual production data distribution of `posterR2Key` for video assets. The Round 3 query to measure this is correct, but I cannot run it.
- **Unverified**: The behavior of the `node:test` suite in CI. I have verified that they pass locally, but I have not verified that they are integrated into the CI pipeline.
