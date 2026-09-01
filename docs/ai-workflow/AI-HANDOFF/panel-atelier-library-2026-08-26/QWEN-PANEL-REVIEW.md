# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASSET-LIBRARY-REVIEW-PACKET-2026-08-26.md
**Tokens (Ollama):** 2044 in / 1266 out | **Wall:** 38.5s | **done_reason:** stop

---
## VERDICT
REVISE — The implementation is structurally sound and correctly scoped, but it fails the "zero PII to LLMs" house rule by storing full text prompts in `provenance` JSONB, and it relies on unverified Sequelize JSONB containment logic that risks silent data leakage or query failures.

## BLOCKERS
1. **P0: House Rule Violation (Zero PII to LLMs).** The document states: "The prompt lives inside `provenance` JSONB" (§4). House rules explicitly mandate "zero PII to LLMs (IDs only)." A user's natural language prompt (e.g., "make a video of a dog running in the rain") is PII/personal data. Storing this in a database column that is part of the asset record violates the binding constraint. **Fix:** Store only a hash or ID reference to the prompt in `provenance`, or ensure the prompt is never persisted in the asset record if it is considered PII. If the prompt is not PII, the rule is ambiguous, but "IDs only" suggests the prompt text itself should not be in the asset metadata if it’s intended for LLM context. *Evidence:* §4, §6.1.
2. **P1: Unverified JSONB Containment Logic.** §6.3 admits: "I assert the clause shape; I cannot execute it." Using `Op.contains` on a JSONB array in Sequelize/Postgres is notoriously tricky (e.g., `tags @> ARRAY['brandkit:universal']` vs `tags @> '["brandkit:universal"]'`). If the shape is wrong, the filter will either crash or return empty results (silent failure). Since this is a core feature ("findable"), shipping without execution proof is a P1 blocker. **Fix:** Add an integration test with a real Postgres instance (or a mock that strictly validates the generated SQL string against known-good patterns) before merge.

## ATTACKS
- **Correctness:** 
  - **Cursor Stability:** §3 claims "two stills from one batch share a millisecond, and a timestamp-only cursor drops one of them." This is correct *if* the ID is unique and monotonically increasing. However, if the ID is a UUID (common in modern stacks), `createdAt|id` ordering is unstable because UUIDs are not time-ordered. If the ID is a serial/int, it’s fine. The document does not specify the ID type. **Risk:** If UUIDs are used, the cursor logic is broken.
  - **Stale State:** The "hasMore" logic fetches one extra row. If a new asset is inserted between the list fetch and the next page fetch, the cursor might skip or duplicate items depending on the ordering stability. This is a known trade-off for cursor pagination but should be documented.
- **Security:**
  - **IDOR:** §3 claims "Owner scoping is structural, not checked." This is good. However, ensure that `req.user.id` is always present and validated. If `req.user` is undefined, the query builder might crash or (worse) default to a null owner, leaking data. **Check:** Does `assetLibrary.mjs` throw if `userId` is null/undefined?
  - **Injection:** The filter allowlist (§3) is a strong defense against injection. However, ensure that the `kind` and `status` values are strictly validated against a whitelist of strings, not just checked for existence. If an attacker passes `kind: "'; DROP TABLE assets; --"`, the allowlist must reject it. The document says "unknown kind... is E_BAD_FILTER," which implies validation, but the implementation detail is critical.
- **Data-truth / schema drift:**
  - **JSONB Drift:** §6.2 notes that tags are "stringly-typed data in a column meant for labels." This is a schema smell. If the tags are meant to be filtered frequently, they should be promoted to a separate `asset_tags` table or a dedicated `tags` column with a GIN index. Storing them in `provenance` (which is likely a blob of metadata) is a drift risk. **Risk:** Future migrations may break the JSONB structure, and the `Op.contains` logic will fail.

## HIGHEST RISK
The **unverified JSONB containment logic** is the highest risk because it is a core feature (filtering) that is explicitly acknowledged as untested against a real database. A silent failure here means users cannot find their assets, which defeats the purpose of the slice. **Cheapest de-risk:** Write a single integration test that spins up a temporary Postgres container (using `testcontainers` or similar) and runs the exact `listAssets` query with a known tag. This takes <1 hour to implement and provides 100% confidence in the query shape.

## CONFIDENCE
- **Could NOT verify:** The ID type (UUID vs. Serial). If UUIDs are used, the cursor logic is broken. **Evidence needed:** The `MediaAsset` model definition or the migration file.
- **Could NOT verify:** The exact implementation of the filter allowlist. Does it reject all non-whitelisted values, or does it only check for known keys? **Evidence needed:** The `assetLibrary.mjs` source code, specifically the filter validation logic.
- **Could NOT verify:** Whether `req.user.id` is guaranteed to be present. **Evidence needed:** The middleware that sets `req.user` and the error handling in `listAssets` if it’s missing.
- **Uncertainty:** The "zero PII to LLMs" rule is ambiguous. If the prompt is not considered PII, then storing it in `provenance` is fine. However, "IDs only" suggests that the prompt text itself should not be in the asset record. **Evidence needed:** Clarification on whether the prompt is considered PII in this context.
