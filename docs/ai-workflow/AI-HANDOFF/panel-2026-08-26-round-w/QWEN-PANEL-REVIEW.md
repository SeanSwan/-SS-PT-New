# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-W.md
**Tokens (Ollama):** 2924 in / 882 out | **Wall:** 23.6s | **done_reason:** stop

---
## VERDICT
REVISE — The `replayExpiresAt` calculation in the terminal disposition logic uses an incorrect baseline (`finishedAt` vs `createdAt`), causing valid batches to be replayed as expired 404s shortly after completion, violating the "honest replay" contract.

## BLOCKERS
1. **P0 — Replay Expiry Baseline Error**: In the terminal disposition block, `replayExpiresAt` is calculated as `(snap.finishedAt || Date.now()) + BATCH_TTL_MS`. However, `BATCH_TTL_MS` (defined elsewhere as the total lifetime of the batch row, e.g., 1 hour) is intended to expire the *row* relative to its creation, not its completion. If a batch takes 50 minutes to render, `finishedAt` is at T+50m. `replayExpiresAt` becomes T+50m + 60m = T+110m. But the database row expires at T+60m. A client retrying at T+65m receives a `200 OK` with `replayed: true` and a `statusUrl` that now returns `404` because the underlying row is gone. This violates the explicit invariant: *"A REPLAY IS ONLY HONEST WHILE THE ROW IT POINTS AT EXISTS."* The fix is to use `snap.createdAt` (or the original request time) as the baseline: `replayExpiresAt: snap.createdAt + BATCH_TTL_MS`.

## ATTACKS
- **Correctness**: The `replayIfFresh` guard correctly handles the `has`/`get` race by returning `null` synchronously on miss, preserving the atomic claim window. However, the *content* of the retained stub is semantically broken due to the P0 blocker above. The `slimForReplay` call is redundant on the 202 stub (which has no bytes), but harmless.
- **Security**: No IDOR or injection risks found. The key derivation `u${req.userId}:${sha(idempotencyKey)}` is sound. The `rememberKey` failure path correctly prioritizes preventing double-billing over memory hygiene, which is the right trade-off for a financial system.
- **Data-truth / schema drift**: The `count` field is correctly overridden from `snap.stills.length` to reflect actual delivered frames, preventing the "8-of-10 replayed as 10" defect. However, the `replayExpiresAt` field is a *new* field injected into the replay body that is not part of the standard `accepted` stub schema. While the code strips it before returning to the client (`const { replayExpiresAt, ...body } = prior`), this internal bookkeeping field is fragile. If `slimForReplay` or any other middleware inspects the object before stripping, it may see a field that doesn't exist in the original contract.

## HIGHEST RISK
The **P0 Expiry Baseline Error** is the most dangerous item because it silently corrupts the client's view of batch status. A user sees a successful replay, clicks the status link, and gets a 404. This is a user-facing trust failure that is hard to debug because the API returns 200. The cheapest fix is to change `snap.finishedAt` to `snap.createdAt` in the `replayExpiresAt` calculation, ensuring the replay window aligns exactly with the database row's TTL.

## CONFIDENCE
I cannot verify the exact value of `BATCH_TTL_MS` or the `createdAt` field name in the `snap` object from the provided excerpt. I assumed `snap.createdAt` exists based on standard SaaS patterns and the context of "rows expire an hour after they finish." If `snap` does not have `createdAt`, the fix would require passing the original request time into the terminal disposition scope. I also cannot verify if `slimForReplay` has side effects beyond stripping bytes, but the code comment suggests it is pure. The P0 finding is high-confidence based on the logical inconsistency between "row expiry" and "replay expiry" baselines.
