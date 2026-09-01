# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 19069 in / 712 out | **Wall:** 26.5s | **done_reason:** stop

---
## VERDICT
APPROVE — The code correctly implements the security guard and UI logic, and the extensive falsification evidence confirms the logic holds under attack, despite minor documentation inconsistencies.

## BLOCKERS
None. The security vulnerability identified in Round 6 (unvalidated `posterR2Key` leading to IDOR/SSRF-like signing) is correctly mitigated by `keyOwnedByRow` in `assetKeyOwnership.mjs`. The logic correctly anchors validation to row-owned IDs (`ownerUserId` or `jobId`) rather than payload data, and the tests confirm that cross-tenant attacks (e.g., `jobs/7/...` for owner 7) are refused.

## ATTACKS
- **Correctness**: The `previewKeyFor` logic is sound. It correctly prioritizes `posterR2Key` if valid, and falls back to `r2Key` only for `kind === 'image'`. The `signPreviews` function handles the "falsy signer" edge case (Round 5 fix) by explicitly throwing if `readUrl` resolves to a falsy value, preventing silent failures. The `previewsUnavailable` flag logic is consistent with the "attempted >= 2" gate to avoid false positives on single-row pages.
- **Security**: The `keyOwnedByRow` function effectively prevents IDOR. It checks that the key's namespace and ID segment match the row's owner or job. Since `jobId` is a UUID and `ownerUserId` is numeric, collision is structurally impossible. The `publishAsset` and `resolvePublic` sites also apply this guard, closing the public exposure vector. No injection risks are apparent as the keys are used in presigned URL generation, not string interpolation.
- **Data-truth / schema drift**: The `assetView` function correctly maps `row.kind` to the response. The frontend marker (`a.kind !== 'image'`) ensures video/audio cards are labeled, preventing the "poster looks like a still" confusion. The `seed` parsing in `assetView` correctly handles NaN by returning `null`, avoiding silent data loss.

## HIGHEST RISK
The highest risk is the **unmeasured gap in `findOrCreate` backfill** (Round 2 Finding 2). If a video asset row was created before a poster existed, `posterR2Key` remains `null` forever, and the library will show a grey box. This is a data integrity issue, not a security flaw, but it undermines the feature's value. The cheapest way to de-risk is to run the provided SQL query (`SELECT count(*) ... WHERE a.poster_r2_key IS NULL AND j.poster_r2_key IS NOT NULL`) to quantify the affected rows. If non-zero, a one-statement backfill is needed.

## CONFIDENCE
I could not verify the **production data state** of the `findOrCreate` backfill gap, as this requires access to the database. I also could not verify the **exact behavior of `generateThumbnailUrl`** in edge cases (e.g., if it ever returns `null`), but the code defensively handles this. The `node:test` blind spot (Round 2) is a harness issue, not a code defect, but it means some tests are invisible to standard verification commands. Evidence to settle these: a database query for the backfill gap and a review of the test harness configuration.
