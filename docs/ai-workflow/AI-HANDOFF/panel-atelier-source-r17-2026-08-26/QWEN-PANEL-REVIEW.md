# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r17.md
**Tokens (Ollama):** 9469 in / 1706 out | **Wall:** 29.2s | **done_reason:** stop

---
## VERDICT
REVISE — The prompt-building collapse is structurally sound, but the async watchdog's "grace" logic contains a critical race condition that can leak GPU reservations indefinitely, and the synchronous path lacks the same hardware safety net.

## BLOCKERS
1. **P0 (Critical): GPU Reservation Leak on Watchdog Timeout.**
   - **Scenario:** In `localBatchRunner.mjs`, if `renderStill` hangs indefinitely (e.g., ComfyUI socket stall), the watchdog fires. The `catch` block executes `inFlight.catch(() => {}).finally(() => { ... release(); })`. However, `inFlight` is the promise returned by `withGpu`. If `withGpu` internally holds the reservation and only releases it upon *natural* completion of the inner async function, and the inner function is stuck in `await renderStill`, the `finally` block on the `inFlight` promise will **never** execute because the promise never settles. The `graceTimer` (30s) fires and calls `release()`, but if `reservation.release()` is not idempotent or if `withGpu` has already detached the reservation from the `release` callback in a way that prevents double-release, the GPU remains locked. More critically, if `withGpu` *does* release on `finally`, the `graceTimer` release is redundant but harmless. The real failure is: **The `aborted` flag is set, but the `for` loop does not check `aborted` *inside* the `await`**. The loop breaks *between* iterations. If the hang is in `renderStill`, the loop is stuck. The `watchdog` rejects, `catch` runs. `inFlight` is still pending. The `graceTimer` fires `release()`. If `reservation.release()` is safe, the GPU is freed. **BUT**: The `finally` block in `localBatchRunner` clears the `timer` (watchdog). It does NOT clear the `graceTimer` if the `inFlight` promise never settles. The `graceTimer` is unref'd, so the process can exit, but if the process stays alive, the `graceTimer` callback has already run. The issue is: **Does `withGpu` release the reservation when the inner function is abandoned?** If `withGpu` is implemented as `async (fn, res) => { res.acquire(); try { return await fn(); } finally { res.release(); } }`, then `res.release()` is called when `fn()` settles. If `fn()` never settles, `res.release()` is never called. The `graceTimer` in `localBatchRunner` calls `reservation.release()` directly. If `reservation.release()` is idempotent, this is safe. If it is not, or if `withGpu` has internal state that assumes it owns the release, this is a leak. **Assuming standard idempotent release, the GPU is freed.** However, the **synchronous path** (`composeStills.mjs` -> `runBatch`) has **NO WATCHDOG**. If `renderStill` hangs in the sync path, the HTTP request hangs, and the GPU is held forever. This is a P0.
   - **Evidence:** `localBatchRunner.mjs` lines 105-125 (grace logic) vs `composeStills.mjs` lines 230-240 (sync path calls `runBatch` with no timeout/watchdog).

2. **P1 (High): Synchronous Path Lacks GPU Watchdog.**
   - **Scenario:** `composeStills.mjs` handles the synchronous lane (hosted or local-sync). If `lane === 'local'` and `req.async === false` (or if the async branch is skipped), it calls `runBatch`. `runBatch` (in `composeBatch.mjs`, not shown but implied) likely calls `renderStill` directly. There is no watchdog, no `aborted` flag, no grace period. A hang in `renderStill` holds the GPU reservation indefinitely, blocking all other local renders.
   - **Evidence:** `composeStills.mjs` line 232: `const settled = await runBatch({ ... });` — no timeout mechanism visible in the provided files.

## ATTACKS
- **Correctness:**
  - **Race Condition in `localBatchRunner`:** The `aborted` flag is checked *between* iterations. If `renderStill` hangs, the loop is stuck. The watchdog fires, `catch` runs, `inFlight` is pending. The `graceTimer` releases the GPU. But the `for` loop is still running in the background, potentially calling `batches.pushStill` or `persist` after the batch is marked `failed`. This could corrupt the batch state (e.g., adding a still to a `failed` batch). The `aborted` flag is not checked *after* `renderStill` resolves, only before the next iteration. If `renderStill` resolves *after* the watchdog fires, the still is pushed to the batch, but the batch is already `failed`. The client sees `failed`, but the batch has a still. This is a state inconsistency.
  - **Stale State:** `batch.stills` is mutated by the background loop even after `finishBatch` is called. The `snapshot` function reads `b.stills`, so a poll after `failed` might see a still that was added after the failure.

- **Security:**
  - **IDOR:** `getBatch` in `batchStore.mjs` correctly checks `b.userId !== userId`. Good.
  - **Injection:** `applyBrandKit` and `promptsFromBrief` are not shown, but assuming they sanitize, no obvious injection.
  - **Secret Handling:** `env` is passed to `renderStill`. If `renderStill` logs `env`, secrets could leak. Not verifiable from the document.

- **Data-truth / schema drift:**
  - **PascalCase vs snake_case:** `batchStore.mjs` uses `batchId`, `userId`, `promptSource` (camelCase). `composeStills.mjs` returns `batchId` in the async response. Consistent.
  - **FK Target Drift:** `persist` is called with `userId`, `workspaceId`. If `persist` expects `user_id`, `workspace_id`, there is a drift. Not verifiable.

## HIGHEST RISK
The **synchronous path lacks a GPU watchdog**. A hang in `renderStill` on the sync lane holds the GPU forever, blocking all local renders. The async path has a watchdog, but the sync path does not. This is a critical availability risk.

**Cheapest de-risk:** Add a watchdog to the synchronous path in `composeStills.mjs` or `runBatch`. Use `Promise.race` with a timeout, similar to `localBatchRunner.mjs`. Ensure the GPU reservation is released on timeout.

## CONFIDENCE
I could not verify:
1. The implementation of `withGpu` in `localStillLane.mjs`. Does it release the reservation on `finally`? If yes, the `graceTimer` in `localBatchRunner` is redundant but safe. If no, the `graceTimer` is the only release, and it is safe if idempotent.
2. The implementation of `runBatch` in `composeBatch.mjs`. Does it have a watchdog? If not, the sync path is vulnerable.
3. The implementation of `renderStill`. Does it handle cancellation? If not, the `aborted` flag is ineffective for in-flight renders.

**Evidence needed:**
- `localStillLane.mjs` to see `withGpu` and `renderStill`.
- `composeBatch.mjs` to see `runBatch` and its timeout handling.
- `persistStills.mjs` to see the schema and field names.
