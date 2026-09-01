---
decision: Six-seat hostile panel on the async local-stills contract — six fixes landed, three findings disproven, durability deferred with a named trigger
status: shipped
supersedes: none
---

# Panel synthesis — async local stills · 2026-08-25 (loop iteration 2)

**Seats:** Ox Alpha, GLM-5.3, Kimi K3, Grok 4.6, Qwen 3.8, HY3 — all six returned.
**Spend: ~$0.239** — Kimi $0.1718, Grok $0.0631, HY3 $0.0036; GLM subscription; Ox and Qwen free. **The dry-run estimated ~$0.138; Kimi came in at 1.8× its estimate** (9,737 reasoning tokens the 6k/seat assumption did not model). Record the real figure, not the estimate.
**Verdicts:** Ox / GLM / Kimi / Grok / HY3 REVISE · Qwen REJECT. **Final Decider:** Fable 5, arbitrating against the branch.

## Confirmed and FIXED this iteration

| Finding | Seats | What landed |
|---|---|---|
| **A client-supplied `Idempotency-Key` was used raw** — user B sending the same header lands on user A's batch and receives A's batch id | Ox (3A), Kimi (3) | The client key is namespaced: `u<userId>:<sha(key)>`. The *derived* key already salted with userId; only the header path was exposed. **Confusd-deputy + handle leak — the most serious find of the round.** |
| No timeout on the background render: a hang leaves the batch `running` and the GPU reserved until the process dies | Ox (1), GLM (2), Kimi (1), Grok (3), Qwen (3) | `BATCH_WATCHDOG_MS` (20 min) races the batch; on expiry it finishes `failed` with `E_BATCH_TIMEOUT` and releases the card. Pinned by a 60 ms-watchdog test |
| Idempotency entries outlive their batch → a deliberate re-render replays the old one | Ox (3B), GLM (4), Kimi (2) | The key is evicted when the batch turns terminal |
| **`estimateOnly` reserved the GPU** — the debounced price preview would 409 for the whole two minutes a batch renders | GLM (5) | An estimate never reserves. Pinned by a test that estimates *during* a running batch |
| Batch-id gate accepted any 36 hex-ish characters and answered 404 for a malformed id | Ox (4), Kimi (6), HY3 (2) | Real UUID regex; malformed → `E_BAD_BATCH_ID` 400 |
| A restart 404 reads as "your renders are gone" | Qwen (1), Grok (2), HY3 (1), GLM (3) | The 404 body now says: *stills that had already rendered were saved to your asset library* — which is true, because persistence is per-frame |
| `prune` and the id gate were UNTESTED (the packet said so) | HY3 (2,3), Kimi (6) | Both now tested, including "prune never drops a running batch" |

## Disproven against the code

| Claim | Seat | Why it does not hold |
|---|---|---|
| Replay releases the GPU while the original batch holds it | Grok (P0), GLM (P0) | **The packet was stale, not the code.** The replay check had already been moved *ahead* of lane choice earlier in this same iteration, so a replay never reserves. The gate table described the previous ordering — my error, not theirs |
| Reserve-before-idempotency means a double-click gets `E_LOCAL_BUSY` instead of coalescing | Kimi (5) | Same stale-packet cause; a test pins the double-click → same `batchId`, `replayed:true` |
| The client polls forever after a 404 | Ox (2), Kimi (4), HY3 (1) | `pollBatch` already maps `E_BATCH_NOT_FOUND` → `terminal:true, status:'failed'`; Generate re-enables. It was untested — now covered by the honesty suite's batch cases |

## Deferred, with the trigger named

- **Durable batch rows** (Qwen P0, Grok P0, HY3 P1, GLM P1). Today a restart loses in-flight batch *metadata*; the stills themselves survive as `MediaAsset` rows. That is honest and the 404 says so. It becomes a real defect the moment there is a second backend process or a client that must reattach across a restart — **that is the trigger**: durability lands with workspaces (SWA-209 #3), not before.
- **Cancel endpoint** — deliberately absent; the watchdog now bounds the worst case. Revisit if a real render is ever cancelled in anger.
- **Poll hygiene** (ETag/304, jitter, cross-tab reattach) — GLM (6), Ox, Qwen. Real but small at one operator and one tab; added to SWA-209.

## The lesson worth keeping

**My packet went stale against my own code inside one iteration.** Two seats raised P0s about a reservation-release ordering I had fixed hours earlier and had not re-read before writing the gate table. Yesterday the same class was a stale *number*; today it is a stale *gate row*. The packet is generated from the code or it is fiction — and a gate table is exactly as stale-able as a line count.
