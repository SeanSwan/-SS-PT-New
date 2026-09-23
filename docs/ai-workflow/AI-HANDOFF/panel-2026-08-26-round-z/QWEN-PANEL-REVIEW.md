# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-Z.md
**Tokens (Ollama):** 5821 in / 623 out | **Wall:** 8.0s | **done_reason:** stop

---
## VERDICT
APPROVE — The logic is sound, the race conditions are correctly handled via synchronous guards and identity checks, and there are no P0/P1 defects.

## BLOCKERS
None.

## ATTACKS
- **Correctness:** The `claimOrCoalesce` logic correctly handles the "third kind of miss" (rejected claims) by using `claimIfAbsent` (get-or-set) to prevent two concurrent retries from both claiming the key after a rejection. The `replayIfFresh` function correctly distinguishes between in-flight promises (which must be awaited) and settled objects (which can be judged synchronously). The `judge` function correctly strips `replayExpiresAt` from the response body to prevent internal state leakage. The `startLocalBatch` `.finally` block correctly retains the key only if frames were delivered (`snap.stills.length > 0`) and deletes it otherwise, preventing permanent failures or double-charges. The `rememberKey` call is correctly placed after the `store.set` to ensure the key is registered only if the stub was successfully written.
- **Security:** No IDOR risks identified; keys are derived from `userId` and `idempotencyKey`. No injection risks. The `slimForReplay` function correctly filters out internal fields. The `claimOrCoalesce` function correctly prevents a second caller from overwriting a live claim.
- **Data-truth / schema drift:** The `startLocalBatch` function correctly uses `snap.stills.length` for `count` and `snap.failures.length` for `failed` in the retained stub, ensuring the replay reflects the actual outcome rather than the initial request. The `cost` field is correctly calculated based on delivered frames. The `replayExpiresAt` is correctly set to `snap.finishedAt + BATCH_TTL_MS`, ensuring the stub expires with the batch row.

## HIGHEST RISK
The highest risk is the potential for a "zombie" key if the `batches.getBatch` call in the `.finally` block throws an error after the `store.set` has already succeeded. However, the code correctly handles this by checking `retained` before deleting the key in the `catch` block, ensuring that a successfully written stub is not deleted. The cheapest way to de-risk this is to add a unit test that simulates a `batches.getBatch` throw after `store.set` to verify that the key is retained and not deleted.

## CONFIDENCE
I could not verify the behavior of `batches.prune` and `batches.getBatch` from the document alone, as these are external dependencies. I assumed they behave as described in the comments (e.g., `prune` returns a list of expired batches, `getBatch` returns the batch snapshot). Evidence to settle this would be the source code of the `batches` module or integration tests that cover the interaction between `startLocalBatch` and the `batches` service.
