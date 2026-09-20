# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

### A.1 Findings

**Evidence boundary:** No repository contents, diffs, database schema, or command output are attached. The packet contains file names and reported results, but almost no source excerpts or line numbers. I cannot honestly produce a source-verified hostile review from that material, and I will not manufacture `file:line` citations.

The findings below distinguish **reported gaps**, **conditional defects**, and **unverified risks**. They are actionable, but they are **not a substitute for the required repository audit**. That audit becomes the first blocking checkpoint.

1. **CRITICAL · The requested implementation-ready handoff lacks its required evidence.**
   - **Evidence:** `backend/scripts/safe-migrate.mjs:146` is the only source line supplied. No bridge DTO, model definition, route mount excerpt, scheduler example, authorization implementation, database dialect for SwanGuard, or package test scripts were supplied.
   - **What is wrong:** A builder cannot safely implement an interoperable publisher from a contract name, headers, and idempotency rules alone. The actual `spotlight.v1` body is missing. Claiming a complete package would conceal architectural decisions inside implementation.
   - **Specific fix:** Introduce checkpoint **G0**, before implementation. A repository-capable reviewer must attach the exact excerpts and baseline artifacts enumerated in `00-README.md`. The architect then finalizes the blocked interfaces. Do not ask the context-free builder to discover these facts.

2. **HIGH · Session-targeted CoachSignal uniqueness is conditionally broken.**
   - **Evidence target:** `backend/migrations/20260916-create-coach-signals.cjs` and `backend/models/social/CoachSignal.mjs`; **line numbers and definitions unavailable**.
   - **Status:** PostgreSQL’s treatment of NULL in ordinary unique constraints is established. Whether another index already closes this hole is unverified.
   - **Why it matters:** A unique constraint on `(coachId, postId)` does not prevent duplicate signals for the same non-NULL session target when `postId` is NULL.
   - **Specific fix:** If the actual columns are `"coachId"`, `"postId"`, and `"sessionId"`, enforce exactly one target and add session uniqueness:
     ```sql
     ALTER TABLE "CoachSignals"
       ADD CONSTRAINT "CoachSignals_exactly_one_target"
       CHECK (num_nonnulls("postId", "sessionId") = 1) NOT VALID;

     CREATE UNIQUE INDEX CONCURRENTLY
       "CoachSignals_coach_session_unique"
       ON "CoachSignals" ("coachId", "sessionId")
       WHERE "sessionId" IS NOT NULL;

     ALTER TABLE "CoachSignals"
       VALIDATE CONSTRAINT "CoachSignals_exactly_one_target";
     ```
     Preserve the existing post uniqueness constraint. First reconcile duplicates and invalid targets using an approved, auditable survivor mapping. Do not silently delete records. `CREATE INDEX CONCURRENTLY` must run outside a transaction; G0 must establish whether the migration runner permits that. If not, use an explicitly scheduled write-maintenance window and ordinary index creation.
   - **Stop condition:** This DDL is not authorized until the column names, target semantics, referencing tables, and runner transaction behavior are verified.

3. **HIGH · A five-per-day limit can still be exceeded if implemented as count-then-insert.**
   - **Evidence target:** `backend/routes/social/coachSignalRoutes.mjs`; **implementation and lines unavailable**.
   - **Status:** Unverified concurrency risk, not a demonstrated defect.
   - **Why it matters:** Concurrent requests can all observe four existing signals and each insert a fifth. Correct timezone selection does not repair this.
   - **Specific fix:** Serialize quota allocation by `(coachId, localDate)` inside the same transaction as signal creation. Use a unique daily-counter row, lock it, increment only below five, and roll the increment back if signal insertion fails. A duplicate target consumes no additional allowance.
   - **Boundary decision:** Use `America/Los_Angeles`, not a fixed UTC offset. The sixth successful signal before local midnight returns 429. At local midnight, the new day receives a fresh allowance. Store timestamps in UTC.
   - **Deployment decision:** Initialize the current local-day counters from existing signals while creation is briefly write-gated; otherwise rollout itself grants an accidental second allowance.

4. **HIGH · “S3 complete” excludes an operationally necessary surface.**
   - **Evidence target:** `backend/routes/social/spotlightReadRoutes.mjs` and the reported absence of an admin surface; **source lines unavailable**.
   - **Status:** Reported gap.
   - **Why it matters:** An operator cannot distinguish “nothing published,” “publication rejected,” “image degraded,” and “feature disabled” from the member rail.
   - **Specific fix:** Add a read-only SwanStudios admin screen showing receiver state, current live items, revision, receive time, image degradation, and opaque last receipt ID. It must not expose SwanGuard URLs, source documents, checklist attestations, retry internals, or publishing controls. Retractions originate in SwanGuard.

5. **HIGH · Spotlight retraction and revision safety are not established by the summarized idempotency rule.**
   - **Evidence targets:** `backend/routes/bridge/bridgeIngestRoutes.mjs`, `backend/models/social/SwanSpotlight.mjs`, `backend/services/swanBridgeSignature.mjs`; **source lines unavailable**.
   - **Status:** Unverified risk.
   - **Why it matters:** Concurrent revisions, an old retry, or a late image download can resurrect a retracted item or overwrite a newer revision.
   - **Specific fix:** Persist the highest accepted revision and retraction tombstone. Use atomic compare-and-set or a row lock. Lower revisions are no-ops; equal revisions remain 200 no-ops; higher revisions replace state. Attach an uploaded image only while the row still has the intended revision and remains live. Never delete the revision tombstone when removing an item from the rail.

6. **HIGH · Mandatory remote image rehosting introduces an unverified SSRF and resource-exhaustion boundary.**
   - **Evidence target:** `backend/routes/bridge/bridgeIngestRoutes.mjs` and its image-fetch dependency, whose path was not supplied; **source lines unavailable**.
   - **Status:** Unverified risk.
   - **Why it matters:** Signed input does not make arbitrary URLs safe. A compromised publisher or unsafe redirect could target internal services; oversized or decompression-bomb images can exhaust memory.
   - **Specific fix:** HTTPS only; approved image-source hosts; no credentials or nonstandard ports; reject private, loopback, link-local, multicast, and metadata addresses for IPv4 and IPv6; validate every redirect and bind connections to validated addresses. Maximum two redirects, five-second total fetch deadline, 5 MiB compressed input, and 16 megapixels decoded. Accept JPEG, PNG, and WebP by decoder inspection; reject SVG and animation. Re-encode before R2 storage.
   - **Failure behavior:** Every image failure yields `imageUrl=null`; authenticated, otherwise-valid content ingestion still succeeds.

7. **HIGH · The reverse pulse and reconciliation path are missing; webhook retries alone cannot establish convergence.**
   - **Evidence targets:** reported absence of `GET /api/operator/pulse`; `apps/api/src/featureDispatchOwnerOperator.ts` for the future operator mount; **source lines unavailable**.
   - **Status:** Reported gap.
   - **Why it matters:** A webhook dropped beyond the retry horizon leaves the applications permanently inconsistent. A “pulse” assembled from arbitrary ORM objects can accidentally disclose personal data.
   - **Specific fix:** Add a fixed-schema aggregate serializer and signed incremental manifest protocol. Retractions remain durable. Advance the manifest cursor only after durable application of the entire page. Pulse queries must not select names, emails, handles, post text, or individual identifiers.

8. **MED · The proposed dismissal threshold is currently unevaluable.**
   - **Evidence target:** `frontend/src/components/Social/Spotlight/SpotlightRail.tsx`; **source lines unavailable**.
   - **Status:** Reported gap.
   - **Why it matters:** Without a defined denominator, “40% dismissals” is a slogan, not an operational criterion. Rendering a hidden card must not count as an impression.
   - **Specific fix:** Count an impression only after at least 50% visibility for one continuous second in a foreground tab. Deduplicate by member, item, revision, and Pacific day. Count dismissal only against a qualifying impression; use the same unit for numerator and denominator. Evaluate seven closed Pacific days only when impressions are at least 100. Alert strictly above 0.40, not at 0.40. Never export member IDs.

9. **HIGH · The SwanGuard dirty worktree is an uncontrolled change boundary.**
   - **Evidence targets:** `Desktop/@Everything/SwanGuard-Newsroom/.git` and worktree/index state; **no command output supplied**.
   - **Status:** Reported operational risk.
   - **Why it matters:** Repairing a gitfile does not prove that untracked assets, ignored files, staged changes, and unpublished commits are recoverable. A bundle preserves commits, not the dirty worktree.
   - **Specific fix:** Freeze writers; make a protected filesystem backup; separately save staged and unstaged binary patches, untracked-file inventory, refs, and a git bundle; verify restore before any cleanup. Audit the 12 commits against the fetched remote. Classify and commit explicit file lists by subsystem. Build this feature in a clean worktree from an approved integration commit. Do not blanket-stash, reset, clean, cherry-pick an assumed range, or stage everything.

10. **MED · Passing the reported test suite does not prove deployment, privacy, or concurrency correctness.**
    - **Evidence targets:** named contract tests in the packet; **test bodies and output unavailable**.
    - **Status:** Unsupported completion inference, not a claim that the tests failed.
    - **Why it matters:** Unit tests may never exercise the production raw-body parser mount, real PostgreSQL contention, scheduler multiplicity, DNS rebinding, or omission of forbidden response fields.
    - **Specific fix:** Require production-stack HTTP tests, real-database race tests, migration rehearsals against representative data, schema-based privacy tests, and two-worker scheduler/outbox tests before enablement.

### A.2 Refuted

No implementation claim can be marked source-verified from the supplied material.

Two proposed interpretations can nevertheless be rejected:

- **“Default OFF is a defect.”** No. Changing the default to ON before publisher, privacy, rollback, and reconciliation checks would be a defect. Keep the default OFF; enable explicitly through the rollout below.
- **“A partial index is always required for session uniqueness.”** No. An ordinary unique constraint on `(coachId, sessionId)` also prevents duplicates when both values are non-NULL. The partial index is chosen because it excludes irrelevant post-targeted rows. The separate exactly-one-target constraint is still necessary if that is the verified domain model.

### A.3 Verdict on the current state

S1–S4 are **reported implemented, not independently established as production-sound**. I would retain their existing work, refuse to rewrite their shipped contracts, and refuse public Spotlight enablement until receiver ordering, image isolation, operator visibility, and recovery are demonstrated. I would also refuse to call the package below “complete” while its source-harvest gate remains open. The plan therefore starts with evidence and containment, not S5 UI construction.
