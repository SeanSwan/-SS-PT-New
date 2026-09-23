# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/swanguard-panel/F0-F2B-REVIEW-PACKET.md
**Tokens (Ollama):** 8153 in / 1554 out | **Wall:** 29.5s | **done_reason:** stop

---
## VERDICT
REJECT — The `creatorIngestRunner` interface exposes a mutable `itemsPerCreator` parameter that allows any caller to override the fixed quota cap, violating the explicit security requirement that the limit be immutable at construction time.

## BLOCKERS
1. **P0** - **Quota Bypass via Interface Exposure**: In `apps/api/src/creatorIngestRunner.ts`, the `CreatorIngestRunnerOptions` interface includes `itemsPerCreator?: number`. While `createCreatorIngestRunnerFromEnv` does not pass this value (defaulting to undefined), the `CreatorIngestRunner` interface is public. If any other code path constructs a `CreatorIngestRunner` using `createCreatorIngestRunner` directly (e.g., in tests, a different environment setup, or a future feature), it can pass `itemsPerCreator: 1000000`. The blueprint explicitly states: "`itemsPerCreator` is NOT part of the interface... The cap is fixed at construction, so no caller... can widen it." However, the code *does* expose it in the options object passed to `runCreatorIngest`. If `runCreatorIngest` respects this parameter, the "fixed at construction" claim is false. The interface `CreatorIngestRunner` only exposes `run()`, but the *factory* `createCreatorIngestRunner` accepts the override. This is a design flaw: the "fixed" cap is only fixed if the caller chooses not to override it. A malicious or buggy caller can bypass the quota.
   *Evidence*: `apps/api/src/creatorIngestRunner.ts` lines 38-42 (`itemsPerCreator?: number` in options) and line 52 (`itemsPerCreator: options.itemsPerCreator` passed to `runCreatorIngest`).

2. **P1** - **Race Condition on Enabled Count Invariant**: In `apps/api/src/creatorSeedImport.ts`, the `importCreatorSeed` function reads `enabledBefore` at the start of the transaction and `enabledAfter` at the end. It asserts `after.enabled === before.enabled`. However, this check is performed under `READ COMMITTED` isolation (default). If another transaction enables a creator *between* the `before` read and the `after` read, `after.enabled` will be higher than `before.enabled`, causing the import to fail with a false positive error: "import changed the enabled count". This is a race condition that makes the import non-idempotent under concurrent owner actions. The invariant should be scoped to the *rows touched by this import*, not the global table state.
   *Evidence*: `apps/api/src/creatorSeedImport.ts` lines 129-131 (`const before = await readCounts...`) and lines 168-172 (`if (after.enabled !== before.enabled)`).

3. **P1** - **Missing Concurrency Guard on Ingest Endpoint**: The `POST /api/creators/ingest` endpoint in `apps/api/src/creatorCatalogRoutes.ts` has no rate limiting or concurrency guard. If two requests are sent simultaneously, both will trigger `ingest.run()`. This can lead to duplicate API calls to YouTube/Twitch, potential quota exhaustion, and inconsistent state in `creator_item` if the upsert logic is not fully idempotent under concurrent writes. The blueprint acknowledges this: "There is currently NO rate limit and NO concurrency guard on this endpoint." This is a DoS vector.
   *Evidence*: `apps/api/src/creatorCatalogRoutes.ts` lines 108-125 (no middleware or lock mechanism visible).

## ATTACKS
- **Correctness**: 
  - **Stale State in Ingest**: `runCreatorIngest` reads enabled creators, then fetches. If a creator is disabled *during* the fetch, the items are still upserted. The visibility is derived from the creator's enabled state at *read* time, so this is acceptable, but the receipt may report items for a now-disabled creator, which is confusing.
  - **Null Handling in `readCreatorIds`**: `apps/api/src/creatorCatalogRoutes.ts` line 62: `value.some((id) => typeof id !== 'string' || !id.trim())`. If `id` is `null` or `undefined`, `typeof id` is `'object'` or `'undefined'`, so it throws. Good. But if `id` is a number, it throws. Good. However, `id.trim()` assumes `id` is a string. The check `typeof id !== 'string'` ensures it is a string before `.trim()`. Correct.
  - **Off-by-One in `itemsPerCreator`**: If `itemsPerCreator` is 0, does it fetch 0 items or all? The code does not specify. If it defaults to a large number when undefined, the P0 blocker is critical.

- **Security**: 
  - **IDOR in `creatorIds`**: The `creatorIds` parameter is used to narrow the run. If the caller provides an ID of a disabled creator, `runCreatorIngest` intersects with the enabled set, so it is safe. If the caller provides an ID of a creator they do not own, the system is single-owner, so all creators are owned by the owner. No IDOR.
  - **Injection**: SQL is parameterized. Safe.
  - **SSRF**: YouTube/Twitch APIs are called by the server. The `creatorIds` are used to look up creators in the DB, not to construct URLs. Safe.
  - **Secret Handling**: API keys are read from env vars. Not exposed in responses. Safe.
  - **Replay/Idempotency**: The ingest endpoint is not idempotent. Two calls result in two fetches. The upsert of `creator_item` should be idempotent, but the API calls are not. This is a DoS risk.

- **Data-truth / schema drift**: 
  - **`creatorSeed.ts` vs `creator` table**: The `CreatorSeedRow` interface has `enabled: boolean`. The mapper sets `enabled: false`. The DB trigger enforces this. No drift.
  - **`creator_item` visibility**: Derived from `creator.enabled`. No `enabled` column in `creator_item`. Correct.

## HIGHEST RISK
The **P0 Quota Bypass** is the most dangerous. The cheapest way to de-risk it is to **remove `itemsPerCreator` from `CreatorIngestRunnerOptions`** and hardcode the cap inside `runCreatorIngest` or pass it as a non-optional, fixed value from the environment. The interface should not allow any caller to override the cap.

## CONFIDENCE
I could not verify the implementation of `runCreatorIngest` in `apps/api/src/creatorIngest.ts` (not provided). I assumed it respects the `itemsPerCreator` parameter. If it ignores it, the P0 blocker is invalid. However, the blueprint explicitly states the cap is "fixed at construction," which implies the parameter is used. I also could not verify the concurrency behavior of `creator_item` upserts under concurrent writes. The evidence would be the source of `creatorIngest.ts` and `creatorItems.ts`.
