# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 15324 in / 857 out | **Wall:** 23.3s | **done_reason:** stop

---
## VERDICT
APPROVE — The core logic is sound, the "half-of-a-pair" defect class is effectively neutralized by the single-function rule, and the remaining risks are correctly scoped to backlog items rather than hidden in the slice.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: The `previewKeyFor` logic is robust. The `if (!row)` guard correctly handles both `null` and `undefined` (whereas a default parameter would only catch `undefined`). The `signPreviews` logic correctly distinguishes between "no signer" (config) and "signer failed" (error), and the `attempted >= 2` gate for `previewsUnavailable` is the correct heuristic to avoid false positives on sparse pages. The `Promise.resolve().then()` pattern correctly handles synchronous throws from the injected `readUrl`.
- **Security**: Tenant scoping is secure. `buildAssetQuery` throws `E_BAD_OWNER` if `userId` is falsy and unconditionally sets `where: { ownerUserId: req.userId }`. There is no IDOR risk in the read path. The `findOrCreate` collision risk (Backlog #1) is a data integrity issue (silent asset loss for the completer), not a disclosure issue, because the library view is strictly owner-scoped.
- **Data-truth / schema drift**: The `kind` casing is safe. There are exactly two writers (`persistStills.mjs` -> `'image'`, `videoRenderJobService.mjs` -> `'video'`), both using lowercase literals. The `posterR2Key` column is shared, and the new logic correctly treats it as a "viewable still" regardless of the parent asset's kind.

## HIGHEST RISK
**Risk**: The `findOrCreate` in `videoRenderJobService.mjs` scopes only on `r2Key`, not `ownerUserId`. If a key collision occurs (e.g., via a bug in key generation or data import), a video job completion will "find" another tenant's asset row, update the job to point to it, and fail to create the new asset for the current user. The user loses their asset silently.

**De-risk**: This is already correctly identified as **Backlog #1**. The cheapest way to de-risk *before* ship (if you must ship now) is to add a **post-creation assertion** in the video job service: after `findOrCreate`, verify that `asset.ownerUserId === job.userId`. If it fails, throw a `ComposeError` rather than silently proceeding. This converts a silent data loss into a loud, debuggable error. (Note: This is a mitigation, not a fix; the proper fix is adding `ownerUserId` to the `where` clause, which requires the DB access currently unavailable in this environment.)

## CONFIDENCE
I could not verify the **production logging configuration**. The code relies on `console.warn`/`console.error` for telemetry. If the production environment (e.g., Render, AWS Lambda) strips or suppresses `console` output, the "broken signer" and "no signer" warnings will be invisible, leaving the operator with a "page of grey boxes" and no diagnostic trail. The packet states that `backend/package.json` has no build step and `console` goes to stderr, which is captured by Render. **Evidence to settle**: A sample of production logs from a known failure scenario, or confirmation from the DevOps team that `console` output is reliably captured and searchable in the logging pipeline.

I could not verify the **actual size of the `findOrCreate` collision risk** in production. The packet provides a SQL query to measure it, but I have no database access. **Evidence to settle**: The result of the provided SQL query (`SELECT count(*) ... WHERE a.kind = 'video' AND a.poster_r2_key IS NULL AND j.poster_r2_key IS NOT NULL`). If the count is non-zero, the risk is real and the Backlog #1 fix is urgent. If zero, the risk is theoretical.
