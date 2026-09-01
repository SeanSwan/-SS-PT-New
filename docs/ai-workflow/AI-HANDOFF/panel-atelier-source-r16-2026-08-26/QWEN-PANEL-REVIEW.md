# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r16.md
**Tokens (Ollama):** 7887 in / 1587 out | **Wall:** 17.9s | **done_reason:** stop

---
## VERDICT
REVISE — The code is functionally sound and the "eighth pair" (taste judging vs. compiler dropping) is correctly split, but the `localBatchRunner` has a critical race condition where the watchdog timeout does not actually stop the GPU work, violating the stated invariant and the "abandoned batch stops touching GPU" comment.

## BLOCKERS
1. **P0: Watchdog Timeout Does Not Stop GPU Work (Race Condition)**
   - **Scenario:** A render hangs or takes longer than `BATCH_WATCHDOG_MS` (20 mins). The `Promise.race` rejects with `E_BATCH_TIMEOUT`. The `catch` block in `localBatchRunner.mjs` executes `reservation?.release()`. However, the `withGpu` callback (the actual render loop) is still running in the background because `Promise.race` only resolves the *promise*, it does not cancel the *execution*. The `aborted.now` flag is set, but the `renderStill` call currently in flight (or the next one if the loop hasn't checked yet) continues to use the GPU. If `reservation.release()` is called while `renderStill` is still holding the GPU context (or if the GPU driver doesn't immediately release), a new batch admitted immediately after the timeout will contend for the GPU, causing VRAM OOM or corruption. The comment says "A promise race ends the WAIT, never the WORK — and the work is what owns the hardware," but the code *does* release the reservation while the work is still running.
   - **Evidence:** `localBatchRunner.mjs:78-80` (`Promise.race`), `localBatchRunner.mjs:98-100` (`catch` releases reservation), `localBatchRunner.mjs:82` (`aborted.now` check is only at the *start* of the next iteration, not during the current `await renderStill`).

2. **P1: `tasteMeta` Missing in Async Path**
   - **Scenario:** A client requests `promptSource: 'taste'` on the local (async) lane. The `runLocalBatch` function calls `promptsFromTaste` but discards `t.tasteSeed`, `t.lawRejected`, etc. The batch object created in `composeStills.mjs:218` does not include `tasteMeta`. When the client polls the batch, they receive the stills but no metadata about *why* certain prompts were rejected or what seed was used for the taste draw. This breaks the contract implied by the sync path (`composeStills.mjs:245` includes `...tasteMeta`) and makes debugging taste-based rejections impossible for async users.
   - **Evidence:** `localBatchRunner.mjs:52-54` (discards `t` object), `composeStills.mjs:218` (batch creation lacks `tasteMeta`), `composeStills.mjs:245` (sync path includes it).

3. **P2: Undocumented Side-Effect in `persist()`**
   - **Scenario:** The `persist` function is expected to mutate `stills` in place to add `persist.ok` and `assetId`. This is relied upon in `localBatchRunner.mjs:89` (`batch.stills.filter((s) => s.persist?.ok)`) and `composeStills.mjs:238` (`persisted === batch.stills.length`). If a future developer refactors `persist` to return a new array or object without mutating the input, the persistence summary will silently report `persisted: 0` even if all stills were successfully saved, leading to false `E_PERSIST_SKIPPED` or `ok: false` states.
   - **Evidence:** `localBatchRunner.mjs:89`, `composeStills.mjs:238`, `persistStills.mjs:185` (mutation happens here).

## ATTACKS
- **Correctness:** 
  - **Race Condition (P0):** As detailed in Blocker 1, the watchdog timeout does not cancel the in-flight GPU work. The `aborted` flag is checked only between iterations, not during the `await renderStill`. This allows a timed-out batch to continue rendering while a new batch is admitted, violating single-flight guarantees.
  - **Stale State:** The `batch.stills` array is mutated in place by `persist()`. If `persist()` is async and throws, the `catch` block in `localBatchRunner.mjs:92` records the failure, but the `still` object may be partially mutated (e.g., `persist.ok` set but `assetId` missing), leading to inconsistent state in the batch store.
- **Security:** 
  - **IDOR:** The `assertKeyHasOwner` check in `composeStills.mjs:165` correctly namespaces client-supplied idempotency keys by `userId`, preventing cross-tenant batch ID leakage. This is well-handled.
  - **Multi-tenant Scope:** The `brandKit` resolution and `lawProfile` gating correctly prevent non-Swan brands from accessing the Swan taste corpus. The split between `judgeProfile` and `lawProfile` in `localBatchRunner.mjs:48-50` correctly enforces that the taste corpus is judged by the kit's own laws, not the merged profile.
- **Data-truth / schema drift:** 
  - **Async vs. Sync Response Shape:** The async path (`composeStills.mjs:218-225`) returns a `batchId` and `statusUrl`, while the sync path returns `stills` directly. This is intentional and documented, but the lack of `tasteMeta` in the async path (Blocker 2) creates a schema drift for clients that expect consistent metadata across lanes.

## HIGHEST RISK
The **P0 race condition** in `localBatchRunner.mjs` where the watchdog timeout releases the GPU reservation while the render loop is still active. This can lead to GPU resource contention, VRAM exhaustion, or corrupted renders if a new batch is admitted immediately after the timeout.

**Cheapest de-risk:** Modify the `withGpu` callback in `localBatchRunner.mjs` to check `aborted.now` *before* each `renderStill` call (already done) AND *after* each `renderStill` call, breaking the loop immediately if aborted. Additionally, ensure that `reservation.release()` is only called *after* the render loop has fully exited. This can be achieved by moving the `reservation.release()` call into a `finally` block that only executes after the `withGpu` promise resolves or rejects, and ensuring the `aborted` flag is checked in a `finally` block to break the loop if it's still running.

## CONFIDENCE
I could not verify the exact behavior of `withGpu` and whether it supports cancellation or interruption. If `withGpu` is implemented as a simple wrapper that does not check for external abort signals, the P0 race condition is real. If `withGpu` has internal cancellation logic that respects the `aborted` flag, the risk is mitigated. Evidence needed: the implementation of `localStillLane.mjs`'s `withGpu` function to confirm whether it checks for external abort signals or relies solely on the caller to break the loop.
