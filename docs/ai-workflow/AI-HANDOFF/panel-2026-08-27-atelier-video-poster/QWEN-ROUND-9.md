# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 29338 in / 1850 out | **Wall:** 42.2s | **done_reason:** stop

---
## VERDICT
REJECT — The core security guard `keyOwnedByRow` contains a critical logical flaw that allows cross-tenant data exfiltration via the unauthenticated `resolvePublic` endpoint, invalidating the primary security claim of the slice.

## BLOCKERS
1. **P0: Cross-Tenant Data Exfiltration via `resolvePublic`**
   - **Scenario:** An attacker creates a `MediaAsset` row (via the unvalidated `POST /api/render-agents/jobs/:jobId/complete` endpoint) with `kind: 'video'`, `approvalStatus: 'published'`, `ownerUserId: <attacker_id>`, `jobId: <victim_job_uuid>`, and `r2Key: 'jobs/<victim_job_uuid>/secret.mp4'`.
   - **Failure:** `resolvePublic` is mounted **without auth**. It calls `keyOwnedByRow(asset.r2Key, asset)`. The key `jobs/<victim_job_uuid>/secret.mp4` matches the `jobs` namespace. The check `seg[1] === String(row.jobId)` passes because the attacker set `row.jobId` to the victim's job ID. The function returns `true`. `resolvePublic` then signs and returns a valid URL to the victim's private video.
   - **Evidence:** `assetKeyOwnership.mjs` (Section 3): `if (seg.length >= 3 && seg[0] === 'jobs') { return row.jobId !== null && row.jobId !== undefined && seg[1] === String(row.jobId); }`. The document explicitly states in Section 6 that `r2Key` and `jobId` are caller-supplied and unvalidated in the write path (`renderAgentRoutes.mjs:176`). The guard anchors to `row.jobId`, which is attacker-controlled, not a system-generated immutable ID.
   - **Impact:** Full read access to any video asset whose Job ID is known or guessable (UUIDs may be enumerable or leaked via other endpoints). This violates the "multi-tenant scope leak" rule and the "zero PII to LLMs" spirit of isolation (data isolation).

2. **P1: `publishedReference` Leaks `r2Key` and `sha256` for Withheld Assets**
   - **Scenario:** An attacker calls `publishedReference` for an asset where `keyOwnedByRow` fails (e.g., a planted key).
   - **Failure:** The function returns `{ ...base, readUrl: null, snippet: null, withheld: ... }`. The `base` object includes `r2Key: asset.r2Key` and `sha256: asset.provenance?.artifact?.sha256`. While `readUrl` is null, the raw S3 key and content hash are exposed. If the attacker knows the bucket structure or can brute-force keys, this aids in targeting. More critically, it confirms the existence of the asset and its metadata without authorization.
   - **Evidence:** `assetPreviews.mjs` / `publishAsset.mjs` (Section 4c): `const base = { id: asset.id, ..., r2Key: asset.r2Key, ..., sha256: ... };` ... `if (!keyOwnedByRow(asset.r2Key, asset)) { return { ...base, readUrl: null, ... }; }`.
   - **Impact:** Information disclosure. Violates "secret handling" and "authz" rules.

## ATTACKS
- **Correctness:**
  - **Stale State / Race Condition:** `listAssets` fetches rows, then signs them. If an asset is unpublished between `findAll` and `signPreviews`, the signed URL is returned for an asset that should no longer be visible. The `resolvePublic` endpoint re-checks status, but `listAssets` does not re-validate status at signing time.
  - **Type Mismatch:** `keyOwnedByRow` uses `String(row.ownerUserId)`. If `ownerUserId` is a large integer exceeding `Number.MAX_SAFE_INTEGER` (unlikely for user IDs but possible for Job IDs if they were numeric, though they are UUIDs), precision could be lost. More importantly, if `row.jobId` is a UUID and `seg[1]` is a UUID, the string comparison is fine. However, if the system ever migrates to numeric Job IDs, this guard breaks silently.
  - **Null/Undefined:** `previewKeyFor` handles `null` row, but `keyOwnedByRow` is called with `row.posterR2Key` which might be `undefined`. `keyOwnedByRow` checks `typeof key !== 'string'`, so `undefined` returns `false`. This is safe.

- **Security:**
  - **IDOR / Multi-tenant Scope Leak:** As detailed in Blocker 1, the `jobs` namespace guard is trivially bypassed by setting `row.jobId` to the target's Job ID. The anchor is not "anchored to something the caller cannot choose" as the comment claims; `jobId` is chosen by the caller in the `completeJob` payload.
  - **SSRF / Injection:** `readUrl` is injected. If the injection point is compromised, it could sign arbitrary keys. The `keyOwnedByRow` guard is the only defense, and it is broken for the `jobs` namespace.
  - **Secret Handling:** `r2Key` is exposed in `publishedReference` response even when withheld.
  - **Replay/Idempotency:** `findOrCreate` in `videoRenderJobService` uses `where: { r2Key }`. If two tenants generate the same `r2Key` (collision), the second tenant's job will find the first tenant's asset. The document acknowledges this in Round 4/5 but defers it. This is a P1 data integrity issue.

- **Data-truth / schema drift:**
  - **Model Column vs Caller Field Drift:** `posterR2Key` is written from `meta.posterR2Key` (caller-supplied) but validated against `row.ownerUserId` or `row.jobId` (also caller-supplied in the `jobs` case). The validation logic assumes `jobId` is a system-generated immutable identifier, but the write path allows it to be set by the caller. This is a fundamental schema/semantics drift.

## HIGHEST RISK
The `keyOwnedByRow` guard's reliance on `row.jobId` for the `jobs` namespace is the single most dangerous item. It creates a false sense of security while allowing cross-tenant data access.

**Cheapest concrete way to de-risk:**
1. **Immediate:** Remove the `jobs` namespace check from `keyOwnedByRow` entirely. Only allow `atelier/stills/<ownerUserId>/...` keys. This will break video poster previews (they will show as grey boxes), but it closes the P0 security hole. This aligns with the "fail closed" principle.
2. **Short-term:** Implement a server-side validation in `completeJob` that ensures `r2Key` and `posterR2Key` start with `jobs/<jobId>/` where `<jobId>` matches the `jobId` in the URL path (not the body). This ensures the key is anchored to the *actual* job, not the caller's claim.
3. **Long-term:** Migrate to a system-generated, immutable `assetId` prefix for all keys, e.g., `assets/<assetId>/...`, where `assetId` is a UUID generated by the server at creation time. This eliminates the need for complex namespace checks.

## CONFIDENCE
I could NOT verify:
- Whether `jobId` is truly caller-supplied in all code paths. The document states it is, but I did not see the full `renderAgentRoutes.mjs` code.
- Whether there are other unauthenticated endpoints that expose `r2Key` or `jobId`.
- The exact implementation of `readUrl` and whether it has additional safeguards.

**Evidence that would settle it:**
- Full source code of `renderAgentRoutes.mjs` and `completeJob` to confirm `jobId` is caller-supplied.
- A penetration test report demonstrating the cross-tenant access.
- Code review of all `resolvePublic` call sites to ensure no other unauthenticated access paths exist.

My uncertainty is high on the exact exploitability in production, but the logical flaw in the guard is clear and severe. A confident wrong answer here would lead to a data breach. An honest gap acknowledges that the guard is fundamentally flawed for the `jobs` namespace.
