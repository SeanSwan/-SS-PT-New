# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r12.md
**Tokens (Ollama):** 14952 in / 1022 out | **Wall:** 16.1s | **done_reason:** stop

---
## VERDICT
REVISE — The ledger is now wired, but the default commit path still fails open for the hosted lane, and the `estimateOnly` exemption bypasses the run cap, creating a free preview DoS vector.

## BLOCKERS
1. **P0**: `defaultCommit` allows `spendUsd > 0` if `runBatch` is bypassed or if the `commit` dependency is not injected in a test/dev context, but more critically, the **`estimateOnly` path bypasses the run cap entirely** (`if (!req.estimateOnly && runs + count > limits.maxRunsDaily)`). An attacker can loop `estimateOnly: true` requests with `count: 4` to exhaust the GPU's CPU/IO or simply spam the API without hitting the `E_RUN_CAP` gate, as the cap check is explicitly skipped. The "preview consumes no run" logic is a security hole, not a feature.
2. **P1**: **Hosted total-failure double-charge**: In `composeStills.mjs`, the `commit` call happens *before* `runBatch`. If `runBatch` fails (e.g., network timeout, provider 500), the code throws `E_ALL_FAILED`. The `catch` block calls `store.delete(key)` and `settle.rej(err)`. However, the ledger `record` has *already* incremented the spend/runs. The client sees a failure and retries. The retry hits the ledger, which has already counted the failed attempt. If the provider actually *did* charge for the failed attempt (common in image generation APIs where the request was received but not fulfilled), the user is charged twice for one logical request. The ledger is monotonic and does not roll back on failure, but the API contract implies "failed = not charged". This is a billing integrity blocker.

## ATTACKS
- **Correctness**: `estimateOnly` bypasses the run cap, allowing unlimited "free" previews that still consume CPU/IO for prompt compilation and lane selection. This is a resource exhaustion vector.
- **Security**: The `defaultCommit` function in `composeGuards.mjs` throws `E_NO_SPEND_GATE` if `spendUsd > 0` and no gate is wired. However, in `composeStills.mjs`, the `commit` dependency defaults to `defaultCommit`. If a developer accidentally routes a hosted request through a path that doesn't inject the real ledger `commit`, it will throw. But if they *do* inject the real ledger, the `defaultCommit` is never used. The risk is if `commit` is *not* injected (e.g., in a test or a new route) and `spendUsd` is 0 (local lane), it passes. If `spendUsd` is > 0 (hosted), it throws. This is fail-closed, which is good. However, the `estimateOnly` path *does* call `gateHosted` which checks the budget, but it does *not* call `commit`. So `estimateOnly` is safe from spend, but unsafe from run cap bypass.
- **Data-truth**: The `slimForReplay` function drops bytes if `assetId` exists. If persistence fails, it keeps bytes. This is correct. However, the `rememberKey` eviction logic for `derivedKeys` uses `derivedKeys.values().next()` which is not guaranteed to be the *oldest* if the Set is not ordered by insertion (Sets are ordered by insertion in JS, so this is fine). But the `while` loop condition `oldest.done || oldest.value === key` is a bit fragile. If `oldest` is the current key, it breaks, which is correct.

## HIGHEST RISK
The **`estimateOnly` run-cap bypass** is the most dangerous item because it allows unbounded resource consumption without any cost or cap enforcement. The cheapest fix is to apply the run cap to `estimateOnly` requests as well, or to introduce a separate, stricter cap for estimates (e.g., 10 estimates per day per user).

## CONFIDENCE
I could not verify the exact behavior of `runBatch` on failure—specifically, whether it rolls back the ledger or not. The code shows `commit` is called before `runBatch`, and there is no rollback logic in the `catch` block. I assume the ledger is not rolled back, which is the standard behavior for monotonic ledgers. If the provider charges for failed requests, this is a P0 billing bug. If the provider does not charge for failed requests, the user is still charged in the ledger for a failed attempt, which is a UX bug but not a financial loss. I am confident in the `estimateOnly` bypass because the code explicitly skips the cap check.
