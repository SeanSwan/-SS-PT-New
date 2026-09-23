# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-AC.md
**Tokens (Ollama):** 4433 in / 883 out | **Wall:** 10.6s | **done_reason:** stop

---
## VERDICT
APPROVE — The module is logically sound, race-safe, and fail-closed; the only remaining risks are operational (memory) and future-conditional (persistence), not correctness defects in the current in-memory implementation.

## BLOCKERS
None.

## ATTACKS
- **Correctness**: The logic is robust against the specific microtask races described. `claimOrCoalesce` correctly handles the "rejected claim" scenario by looping and re-claiming, ensuring only one winner proceeds. `replayIfFresh` correctly distinguishes between a live promise (coalesce) and a settled stub (judge synchronously). The identity check in `dropIfStillOurs` (`store.get(key) === token`) is correct and prevents stale deletes. No off-by-one or null-deref issues found.
- **Security**: No IDOR risk as the key is derived from `userId` + `sha(idempotencyKey)`. No injection risks. The `REPLAY_NEVER_EXPIRES` constant is correctly defined as `Number.MAX_SAFE_INTEGER` to survive JSON serialization, preventing a fail-open bug where `Infinity` becomes `null`/`0` and is misread as expired.
- **Data-truth / schema drift**: `replayExpiresAt` is correctly stripped from the response body in `judge`, preventing internal bookkeeping from leaking into the API contract. The `replayed: true` flag is consistently added.

## HIGHEST RISK
**Unbounded Memory Growth in `store`**: The `store` is an in-memory Map. `REPLAY_NEVER_EXPIRES` entries (hosted lane) are *deliberately* immortal until evicted "for room," but no eviction policy is visible in this module. If the hosted lane is used at scale, this Map will grow without bound, eventually causing OOM crashes. The local lane has TTL, but the hosted lane does not.

**Cheapest De-risk**: Implement a simple LRU or size-based eviction in the `store` abstraction (or wrap it) that evicts the oldest `REPLAY_NEVER_EXPIRES` entries when the Map exceeds a configurable size limit (e.g., 10k entries). This is a 20-line change to the store wrapper, not the replay logic.

## CONFIDENCE
- **Could NOT verify**: The actual eviction mechanism for `REPLAY_NEVER_EXPIRES` entries. The code says "evicted for room," but I don't see the code that does the evicting. If it's in the orchestrator or store wrapper, it's outside this module's scope, but it's a critical operational dependency.
- **Could NOT verify**: The behavior of `store` under concurrent access from multiple Node.js workers/instances. The code assumes a single-process in-memory store. If this is ever deployed in a multi-instance setup without a shared store (e.g., Redis), the identity checks and coalescing logic will break. This is future-conditional but critical for scale.
- **Uncertainty**: I am confident in the single-process, in-memory correctness. I am less confident in the operational robustness (memory, persistence) because those are outside the module's explicit scope but implied by the "hosted lane" use case.

## RECOMMENDATIONS
1. **Add Eviction Policy**: Implement LRU or size-based eviction for `REPLAY_NEVER_EXPIRES` entries. Without this, the hosted lane is a memory leak.
2. **Add Store Abstraction**: Wrap the `store` in an interface that can be swapped for Redis/Memcached in the future. This will make the code more testable and scalable.
3. **Add Metrics**: Instrument the store to track size, eviction rate, and replay hit/miss ratio. This will help with capacity planning and debugging.
4. **Add Integration Tests**: Test the replay logic with a real store (e.g., Redis) to ensure the identity checks and coalescing logic work correctly under concurrent access.
5. **Document the Store Contract**: Clearly document the expected behavior of the `store` (e.g., "must be thread-safe," "must support atomic get/set/delete") to prevent future misuse.
