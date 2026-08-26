# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-SPEND-LEDGER-REVIEW-PACKET-2026-08-25.md
**Tokens (Ollama):** 2580 in / 1559 out | **Wall:** 23.6s | **done_reason:** stop

---
## VERDICT
REVISE — The core ledger logic is sound, but the video lane’s post-spend recording creates a critical race condition that allows budget bypass under concurrent load, and the "sticky" write-failure state lacks a recovery path for transient I/O errors.

## BLOCKERS
1. **P0: Video Lane Race Condition (TOCTOU).**
   - **Failure Scenario:** Two concurrent video generation requests arrive. Both call `checkRunAllowed` (read) simultaneously. Both read `current_spend < limit`. Both pass. Both execute `adapter.generate`. Both call `record()` (write). Total spend exceeds the daily cap.
   - **Evidence:** `generateVideo.mjs:216` records *after* `adapter.generate` returns. The document explicitly admits this: "the video lane still (a) has the read-then-write window." Unlike the image lane (which commits *before* spend), the video lane allows unlimited concurrent overages if the lease mechanism fails or if multiple workers are active. The document claims "render agent leasing one job at a time" mitigates this, but "unlikely" is not "impossible," and a SaaS must handle concurrency. This is a direct violation of the "cap" intent.

2. **P1: Sticky Write-Failure State Lacks Recovery.**
   - **Failure Scenario:** A transient disk I/O error (e.g., NFS timeout, temporary full disk) occurs during a `record()` call. The ledger sets `degraded: true`. This flag is sticky until restart. If the disk issue resolves in 5 seconds, the system remains in a "refused" state for the rest of the uptime, blocking all new spend even though the ledger is now writable.
   - **Evidence:** `backend/services/laneLedger.mjs` (implied by description): "The unwritable flag is sticky — a later successful write does not clear it. Only a restart does." This is a DoS vector for the billing/spend system. A transient error should not permanently disable the lane without human intervention, especially if the underlying cause is self-healing.

3. **P1: No Idempotency Key in `record()`.**
   - **Failure Scenario:** A client retries a failed request (e.g., network timeout after the provider call succeeded but before the response was sent). The server re-executes `composeStills`. The image lane commits the estimate *before* the provider call. If the provider call fails and the client retries, the second attempt commits *another* estimate. If the provider call succeeds on the second attempt, the ledger has recorded double the spend for a single logical job.
   - **Evidence:** `composeStills.mjs:225` records `cost.totalUsd` based on the estimate. There is no mention of an idempotency key or job ID being passed to `record()` to prevent double-counting on retries. The document states "A batch that fails still consumes budget," but it does not address *duplicate* consumption due to client retries.

## ATTACKS
- **Correctness:**
  - **Race Condition:** As noted in Blocker 1, the video lane’s read-then-write pattern is unsafe under concurrency. The image lane’s commit-before-spend is safer but introduces the double-counting risk on retries (Blocker 3).
  - **Stale State:** The "sticky" degraded flag (Blocker 2) is a form of stale state that does not reflect the current system health.
  - **Unbounded Growth:** The ledger file grows monotonically. The document mentions "30-day retention" for the video lane’s `makeFileLedger`, but does not specify if the new `laneLedger.mjs` implements the same pruning. If not, the file will grow indefinitely, eventually causing performance issues or disk exhaustion.

- **Security:**
  - **DoS via Write Failure:** An attacker who can trigger transient I/O errors (e.g., by exhausting inodes or causing a temporary disk full condition) can permanently disable the spend ledger for the lifetime of the process, effectively removing the budget cap.
  - **IDOR/Scope Leak:** The document does not specify how the ledger is scoped per-workspace or per-user. If the ledger is global, one tenant’s spend could affect another’s budget. If it is per-tenant, the file path resolution must be secure against path traversal. The document mentions "lane allowlist" but not tenant isolation.

- **Data-truth / schema drift:**
  - **Schema Drift:** The document states `shared/providers/spendLedger.mjs` is "pure — fs injected." This is good. However, the `laneLedger.mjs` implementation must ensure that the JSON schema of the ledger file is versioned. If the schema changes in the future, old files may fail to parse, leading to the "corrupt read" path. The document does not mention schema versioning or migration.

## HIGHEST RISK
The video lane’s post-spend recording (Blocker 1) is the most dangerous item because it allows direct budget bypass under concurrent load, which is a core requirement of the feature. The cheapest concrete way to de-risk it is to **move the `record()` call in `generateVideo.mjs` to *before* the `adapter.generate` call**, mirroring the image lane’s behavior. This eliminates the TOCTOU race. To address the double-counting risk on retries (Blocker 3), add an idempotency key (e.g., a UUID generated at the start of the request) to the `record()` call, and ensure the ledger implementation checks for duplicate keys before committing.

## CONFIDENCE
I could not verify the following from the document alone:
1. **Concurrency Model:** The document claims "render agent leasing one job at a time," but does not provide evidence of how this lease is implemented or whether it is atomic. If the lease is not atomic, the race condition in Blocker 1 is exploitable.
2. **Tenant Isolation:** The document does not specify how the ledger is scoped per-tenant. If the ledger file is global, there is a multi-tenant scope leak. If it is per-tenant, the file path resolution must be secure.
3. **Idempotency:** The document does not mention idempotency keys. I assumed they are missing based on the lack of mention, but they may be implemented in a way not described.
4. **Schema Versioning:** The document does not mention schema versioning for the ledger file. I assumed it is missing based on the lack of mention.
5. **Retention Policy:** The document mentions "30-day retention" for the video lane’s `makeFileLedger`, but does not specify if the new `laneLedger.mjs` implements the same pruning. I assumed it does not, based on the lack of mention.

Evidence that would settle these:
1. Code for the lease implementation in the render agent.
2. Code for the file path resolution in `laneLedger.mjs`.
3. Code for the `record()` function in `laneLedger.mjs` to check for idempotency keys.
4. Code for the ledger file parsing to check for schema versioning.
5. Code for the ledger file pruning to check for retention policy.
