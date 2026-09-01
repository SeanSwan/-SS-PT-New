---
decision: Async local stills (202 + poll) — hostile review + enhancement pass, iteration 2 of the Atelier loop
status: open
supersedes: none
---

# Atelier iteration 2 — async local `/stills` · HOSTILE REVIEW + ENHANCEMENT PACKET

**Author:** Fable 5 (Final Decider — does not vote) · 2026-08-25
**Seats:** Ox Alpha, GLM-5.3, Kimi K3, Grok 4.6, Qwen 3.8, HY3.
**Remit:** attack the async contract below, then say what should exist and does not. Rank by value. Do not restate §2.

**How this packet is written (a rule learned from the last round):** every gate is a `predicate → refusal code` with the test that pins it. Prose about behaviour is not offered. If a gate has no test it says UNTESTED.

## §1 — WHAT CHANGED SINCE THE LAST PANEL (all six of you found this)

The local Still lane held one HTTP request open for ~2 minutes (4 × ~27s). Now:

- `POST /api/atelier/compose/stills` with `lane:local` → **`202 {accepted:true, batchId, statusUrl}`** immediately; the batch renders in the background under the GPU reservation; each still is **persisted the moment it renders** (asset id present before a poll can see it).
- `GET /api/atelier/compose/stills/:batchId` → snapshot `{status: queued|running|done|partial|failed, stills[], failures[], rendered, count, persistence, error, terminal}`; owner-scoped; **404 for another owner, for a batch older than 1h after finishing, or after a server restart** (absence, never "running").
- Hosted lane unchanged: synchronous (seconds).
- UI polls every 3s until `terminal`, shows `rendered of count`, disables Generate while a batch is in flight, says "this page can be left".

## §2 — THE GATES, AS PREDICATES (`backend/services/atelier/*.mjs`)

| Gate | Predicate → code | Pinned by |
|---|---|---|
| Accept at once | `lane==='local' && !estimateOnly` → `202`, `accepted:true`, batch `queued` | `atelierAsyncStills.test.mjs` "returns accepted + batchId without waiting" (asserts < 25ms with 30ms/frame stubs) |
| Reservation before VRAM read | `reserveGpu()` then `admission()`; second concurrent local request → `E_LOCAL_BUSY` (409, Retry-After) | "a second batch while one is running is refused" · lanes suite "refused, not queued" |
| Reservation released on every path | estimateOnly, replay, throw-before-batch, background failure → `release()` | "a crash before rendering … releases the GPU" (asserts `reserveGpu()` succeeds after) |
| Per-frame persistence | after each `renderStill` → `persist({stills:[still]})` → `assetId` on the still before `pushStill` | "every still the poll sees already has its asset id" |
| Terminal state guaranteed | `finishBatch` in try AND catch → `done|partial|failed`; failure carries `error.code` | "mid-batch failure … partial" · "crash … FAILED" |
| Idempotency coalesces to one batch | `store.has(key)` → same `batchId`, `replayed:true` | "double-click maps to the SAME batch id" |
| Owner scope on poll | `getBatch(id, userId)` → `null` unless `b.userId === userId` → 404 | "another owner cannot read the batch" |
| Batch id shape | `/^[0-9a-f-]{36}$/` else `E_BATCH_NOT_FOUND` | UNTESTED (route-level) |
| Expiry | `prune()` drops finished batches > 1h; running never pruned | UNTESTED |
| Hosted stays sync | `lane==='hosted'` → full result inline | "the hosted lane is still synchronous" |

Store: `backend/services/atelier/batchStore.mjs` — **process-local Map**. One backend process is the deployment shape; a restart loses in-flight batches and reports them by 404.

## §3 — WHAT IS DELIBERATELY NOT HERE

- No cancel endpoint. A batch runs to completion once accepted.
- No durable batch store; no cross-process visibility.
- No SSE/WebSocket; polling at 3s.
- No progress *within* a frame (ComfyUI reports it; we do not surface it).
- The render agent's own Motion jobs are a separate process; the in-process reservation cannot see them. Admission reads live VRAM, which does.

## §4 — QUESTIONS (adversarial; rank)

1. **Break the background half.** The request returns; the client disconnects; the process is killed at frame 2 of 4 with two stills persisted. What is the honest state, and is 404-by-absence enough, or must the batch be durable before this ships?
2. **Break the reservation.** `store.set(key, Promise.resolve(accepted))` before the batch starts; a replay during `queued` returns `accepted` again. Any path where the reservation is held with no batch running, or released while one is?
3. **Break the poll.** 3s polling on a ~2-minute batch is 40 requests each hitting `protect, adminOnly`. Is that fine for a single operator, and what breaks at N tabs? Should `Retry-After`/ETag be involved?
4. **Cancel.** Is a cancel endpoint required before merge for a solo operator on his own GPU, or is "let it finish" honest enough for now? If required: what does cancelling mid-frame do to the ComfyUI queue?
5. **What is missing** — absence-first, ranked: SSE vs polling; per-frame progress; cancel; durable batches; batch history in the library; a "render while I'm away" notification (Hermes/Telegram); anything else.
6. **The one thing most likely to kill this contract in real use** — one paragraph.

**Constraints:** styled-components only; Crystalline Swan tokens with fallbacks; 44px; 300-line cap; zero PII to LLMs; fail-closed licence/spend gates; tri-state honesty; Wan 2.2 commercial-safe default.
