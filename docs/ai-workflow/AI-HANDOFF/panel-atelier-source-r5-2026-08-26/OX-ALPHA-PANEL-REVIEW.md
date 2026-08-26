# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/hostile-source-r5.md
**Seed:** (none)
**Tokens:** 11238 in / 9826 out · **Cost:** ~$0.0000 · **Wall:** 301.1s · **finish:** stop

---

## VERDICT
REVISE — the round-E headline fix (`assertKeyHasOwner`) closes the shared-anonymous-namespace hole only for `undefined`, leaving the same confused deputy open for `null`/empty-string owners, and the video lane's bare-`record` path can silently drop real spend from the ledger.

## BLOCKERS

1. **P1 — `assertKeyHasOwner` accepts `null` (and `''`) as an owner, reconstructing the exact shared-namespace bug Round E claims to close.**
   Failure scenario: the auth layer normalizes "not logged in" to `req.userId = null` (the most common JS convention, and precisely the kind of normalization variance a defensive guard exists to absorb). Guard check: `req.userId === undefined` → false → passes. Key construction: `` `u${req.userId}:${…}` `` → `"unull:a1b2…"`. Two anonymous callers sending the same `Idempotency-Key` coalesce onto each other's batch id and stills — byte-for-byte the defect the fix's own docblock describes ("two of them sending the same key string coalesced onto each other's work"), one equality operator away from being live again. Empty-string userId collapses to `"u:"` the same way.
   Evidence: `composeGuards.mjs`, `assertKeyHasOwner` body (`req.userId === undefined`) vs. `composeStills.mjs` key template (`u${req.userId}`). Fix is one line: treat `undefined`, `null`, and `''` as ownerless (`req.userId == null || req.userId === ''`).

2. **P2 — Video lane's bare-`record` path loses real spend on write failure; `strandedRuns` is unreachable from it.**
   Failure scenario: `generateVideo` records *after* spending via bare `record(day, {spendUsd})` (per this file's own docblock: "a bare `record` is used by the video handler"). Write fails → `consecutiveFailures` increments, `{failed:true}` returned, and the handler "has nothing left to refuse" — but unlike `tryCommit`, the bare path never feeds `strandedRuns`, so `usageFor` keeps reporting the pre-failure total. Money moved; the counter didn't. Until `WRITE_FAILURES_BEFORE_DEGRADED` (3) is hit, each failing request mints fresh headroom equal to its actual spend. Exposure is bounded (~2 requests' spend per incident) but it is uncounted real spend on a money gate whose entire premise is "the ceiling counts what was committed."
   Evidence: `laneLedger.mjs` — `record()` catch block (increments `consecutiveFailures`, returns `{failed:true}`, no stranding) vs. `tryCommit`'s `written?.failed && runs > 0` stranding branch; docblock lines naming the video handler as the bare-`record` consumer.

## ATTACKS

**Correctness**
- Derived-key coalescing may not survive a double-click. The header claims idempotency "stops a double-click," but keyless requests derive their key via `deriveKey({…}, now)` with `now = Date.now()` evaluated per call. If `deriveKey` mixes `now` in at millisecond resolution, two clicks 10ms apart produce *different* keys, skip coalescing entirely, and both run (double GPU render locally, double commit on hosted). Whether this is real depends entirely on `deriveKey` internals (quantized time? param-hash only?), which the document does not show — see CONFIDENCE.
- If `runLocalBatch` is *not* an `async function`, a synchronous throw would propagate before `.finally/.catch` attach — after `settle.res(accepted)` has already fired, producing a 500 to the caller, a phantom `queued` batch row, and an already-committed ledger entry. Almost certainly it's `async` (making this moot), but nothing in the document proves it.
- `slimForReplay` strips `image` down to `{kind, mime, dropped}` even for local-lane file-backed stills, where the payload is a cheap path, not base64. The docblock's recovery story ("client fetches by `assetId`") only works if `persist` attaches an `assetId` to each still — not demonstrable from this document.

**Security**
- Hosted lane ships raw operator free-text briefs to OpenRouter. House rule is zero PII to LLMs; this is a personal-training SaaS where briefs plausibly contain client names/notes, and there is no scrubbing gate anywhere between `brief.text` and `generator(compiled, …)`. At minimum this needs a stated policy position, not silence.
- `statusUrl: /api/atelier/compose/stills/${batch.id}` — batch rows are created with `userId`, but whether GET on that route enforces ownership is invisible from here. If `batchStore` lookup is unscoped, that's a textbook IDOR on rendered assets. Cannot clear or condemn from the document alone.
- `req.userId` is trusted as the idempotency namespace. If it arrives from the request body rather than verified session state, caller B claims `userId: A` plus A's leaked key and lands on A's replay. Authen boundary is upstream, but the guard's threat model explicitly includes cross-caller coalescing, so it deserves one sentence in the route wiring.

**Data-truth / schema drift**
- Ledger commits `cost.totalUsd` (full `count × unitUsd`) but the response reports `chargedUsd = unitUsd × stills.length` (successes only). Deliberately conservative, but the two numbers permanently diverge on any partial failure and nothing reconciles them — anyone building billing reporting off the ledger will over-state. Acknowledged direction, worth an explicit comment where it diverges.
- `provider` vs `model` aliasing on stills is handled consciously (`model: s.value.provider`) — good; no drift found there.

Checked against house rules: no styled-components/MUI, no chart lib, no palette/touch/WCAG surface in these files; no "yoga/meditation" language; no credential phrasing at all; stated line counts 126/286/299 are all ≤300 (I cannot independently count the real files — see below); no obvious PII-to-LLM violation *except* the hosted-brief item above.

## HIGHEST RISK
Blocker #1. It's the round-E flagship fix, it's one `===` away from its stated threat model, and the failure mode is silent cross-caller work leakage. Cheapest de-risk: a five-line unit test asserting `assertKeyHasOwner({idempotencyKey:'k', userId: null})` throws and that the resulting key never equals another ownerless caller's — plus the one-line widening of the check. Do it before anything else in this round.

## CONFIDENCE
Things I could not verify from the document, and what would settle each:
- **Whether `req.userId` can be `null` in practice** (vs. always `undefined` when absent). Blocker #1 is conditional on this. Settled by reading the route/auth middleware that populates `req`.
- **`deriveKey`'s treatment of `now`** — determines whether the keyless double-click attack is real or theoretical. Settled by `composeLimits.mjs`.
- **`makeFileLedger` internals** (does `inner.record` re-read the file? does `usageFor` re-read per call?) — my in-process atomicity reasoning assumes sync read-append; confirmed only by assertion in comments. Settled by `shared/providers/spendLedger.mjs`.
- **Ownership enforcement on the batch status URL** — settled by `batchStore.mjs` and the route definition.
- **Whether `persist` attaches `assetId` per still** — the entire `slimForReplay` recovery story rests on it. Settled by `persistStills.mjs`.
- **Actual line counts** — I take 126/286/299 on faith; `composeStills` at 299 has one line of headroom, which is itself a maintenance risk worth noting.
- **Whether `runLocalBatch` is `async`** — settles the synchronous-throw edge case.

I found no fabricated filler above; every item traces to specific code shown. Items I actively checked and believe are sound: the `rememberKey` eviction loop (settled ⊆ store invariant holds, in-flight entries never evicted, `oldest.value === key` break is correct), the sync check-commit window in `tryCommit`, the replay path's has/get atomicity, the deliberate non-eviction rationale on the hosted path, and the stranded-runs accounting on the `tryCommit` free-work branch.
