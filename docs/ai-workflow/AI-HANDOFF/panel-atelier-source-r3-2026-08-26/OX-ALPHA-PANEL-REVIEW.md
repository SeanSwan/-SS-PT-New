# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/hostile-source-r3.md
**Seed:** (none)
**Tokens:** 13108 in / 10658 out · **Cost:** ~$0.0000 · **Wall:** 333.8s · **finish:** stop

---

## VERDICT
REVISE — the money gate and the coalescing map are now genuinely tight within a process, but the round's own core lesson ("a control that can be dropped by accident is not a control") is still violated twice: by `defaultCommit` on the run-cap dimension and by a derived idempotency key that makes the celebrated retry-replay protection opt-in for clients.

## BLOCKERS

1. **P1 — `defaultCommit` enforces spend but not the daily run cap, so a forgotten `commit` wiring recreates the exact "per-request ceiling wearing a day's name" defect this slice exists to kill — on the free lane.**
   Failure scenario: route mounts `composeStills` without injecting `commit` (or misspells it), local lane, `req.async === false` or the async path. `defaultCommit` (composeGuards.mjs:44-53) only refuses `spendUsd > 0`; local cost is `{unitUsd: 0, totalUsd: 0}` (composeStills.mjs, GATE 3b ternary), so it returns `{allowed: true}` unconditionally. The only remaining run cap is GATE 2's advisory pre-check against `usage = { runs: 0, spendUsd: 0 }` (composeStills.mjs deps default) — i.e., a per-*batch* cap of `MAX_STILLS`, not a daily cap. Fifty separate requests each pass. This is *not* the filed Linear item: that issue is the permissive `usage` pre-check default *assuming tryCommit is wired*; this is the commit default silently not enforcing runs at all. The file's own docblock states the principle ("A control that can be dropped by accident is not a control") and then drops half the control by accident. Fix is cheap: `defaultCommit` should also refuse when `runs > 0` cannot be checked against a real counter, exactly as it refuses unaccounted spend.

2. **P1 — derived idempotency keys are salted with `now`, so the hosted lane's "retry MUST replay rather than charge twice" guarantee only exists for clients that send `Idempotency-Key`.**
   Failure scenario: hosted render, client connection drops after the provider billed; client SDK auto-retries 2 seconds later *without* a header (the common case). `deriveKey({...}, now)` (composeStills.mjs, GATE 3a) embeds the current timestamp, so the retry derives a *different* key, misses the store, re-runs `commit`, and charges a second time. Meanwhile `rememberKey`'s docblock claims IDEMPOTENCY_RETAIN=500 is "big enough that any realistic retry still replays instead of re-charging" (composeGuards.mjs:14-16) — that retention is dead weight for derived keys, which never collide across milliseconds by construction. The entire 500-entry bound plus the "DELIBERATELY NOT EVICTED HERE" defense (composeStills.mjs, post-`work`) protects only the header-sending minority. Either require the header on the billed lane or drop `now` from `deriveKey` and derive purely from request content. Evidence caveat: I cannot see `deriveKey`'s body; if `now` is merely a tiebreaker excluded from the hash, downgrade this to P2 — but then passing `now` at all is unexplained.

3. **P2 — module-scoped `settledKeys` paired with an injected-per-call `store` breaks the eviction bound the moment two stores exist.**
   Failure scenario: route A injects store A; a test harness (or a second route) uses store B. Key K settles into store A and `settledKeys`. Store B crosses 500 entries; the eviction loop pops K — the oldest *globally* settled key — deletes it from B (no-op) and removes it from `settledKeys` (composeGuards.mjs:27-33). K now lives in store A forever, untracked and un-evictable, because eviction only walks the settled set. Repeat, and store A grows past the bound for the life of the process — precisely the unbounded growth the bound exists to prevent. The docblock even admits the coupling ("Module-scoped because the store may be injected per call") without following it through. Fix: return/own the settled set per store, or key the set by store identity.

4. **P2 — the `'anon'` idempotency namespace lets two unauthenticated callers coalesce onto each other's results.**
   Failure scenario: route reachable without authn (or any path where `req.userId` is undefined). User B sends the same `Idempotency-Key` header as user A; both hash to `uanon:<sha>`; B receives A's batch/result — the exact confused-deputy leak the namespacing comment describes fixing for *authenticated* users (composeStills.mjs, GATE 3a). Contingent on the mounted route requiring authn; I cannot see it, hence P2 not P1 — but the code should refuse rather than fall back to a shared bucket.

5. **P2 — `NaN` spend poisons the money gate into "free."**
   Failure scenario: a provider price lookup returns `undefined` for an unlisted model; `unitUsd * count` → `NaN`; `tryCommit` destructures `spendUsd = 0` — no, `NaN` passes the default — then `billed = spendUsd > 0` is `false` for `NaN` (laneLedger.mjs, tryCommit), skipping both the degraded-refusal and the spend ceiling, and `record` writes `NaN`, which serializes to `null` in the JSON ledger and trips corrupt-read degradation on the *next* read — refusing all billed work until manual repair. Same hole in `defaultCommit` (`NaN > 0` is false). One `Number.isFinite` guard on both closes it.

## ATTACKS

**Correctness**
- The coalescing itself is sound: `has`/`get`/`set` are synchronous with no intervening await, the placeholder pre-attaches `.catch(() => {})`, and the catch path deletes before rejecting. I tried to break it with a rejection racing a duplicate's `get` — the duplicate correctly receives the thrown error.
- `rememberKey`'s eviction can be triggered prematurely by *transient* keys: async-local batch keys sit in the store while in flight but never enter `settledKeys`, so a burst of queued local batches inflates `store.size` past 500 and evicts legitimately replayable *hosted* keys — reintroducing, at small scale, the double-charge the bound was built to prevent. Bounded by queue depth, so enhancement-grade, but the size test measures the wrong population.
- `estimateOnly` runs `chooseLane`, which reserves the GPU, then releases — a real render arriving in that window eats `E_LOCAL_BUSY` because someone asked for a price quote. Estimates shouldn't reserve.
- Stranded runs are memory-only and never reconciled to disk on recovery: a restart after a write-failure episode silently forgives the free lane's stranded volume. The docblock waves at this ("all the file itself claims to be") but it contradicts the cap's stated purpose of protecting the GPU.
- Success path never releases `reservation` for the hosted lane; harmless iff `chooseLane` returns `null` there — unverifiable from this document.

**Security**
- `listAssets` scopes everything under `ownerUserId: req.userId` — correct *iff* `req.userId` comes from the auth context. If the route forwards a client-supplied user id, this is a textbook IDOR over every rendered asset including signed preview URLs. Route not in evidence.
- Tag filters are assembled into an `Op.contains` array, not string-interpolated SQL — no injection path. Cursor forgery yields an empty page at worst. Presigned-URL key disclosure is honestly disclosed and acceptable.
- Zero-PII-to-LLMs: the hosted lane ships operator brief text to OpenRouter verbatim. If briefs are ever customer-derived rather than operator-authored, that's a house-rule violation; nothing here proves either way.

**Data-truth / schema drift**
- `stills.push({ ..., ...s.value, model: s.value.provider })` (composeStills.mjs, result mapping): local-lane fulfilled values are `{ ...r, seed, promptText }` — nothing shown guarantees `r.provider` exists, so local stills likely carry `model: undefined` into `persistBatch` and provenance. If `media_assets.model` is NOT NULL or the provenance contract expects a string, that's a write-time drift. Verify `renderStill`'s return shape.
- `KINDS` mirrors `MEDIA_ASSET_KINDS` by hand with a claimed drift test that is not in this document — the previous omission of `audio` proves the mirror rots. Show the test.
- The `E_SPEND_CEILING` hint says "wait for the UTC day to roll over," but `dayKey` lives in `spendLedger.mjs`, unseen. If it truncates local time, the hint and the gate disagree about when relief arrives.

## HIGHEST RISK
Blocker #1+#2 share one root: the authoritative gate's integrity depends entirely on route wiring, and only the *spend* dimension fails closed. The single cheapest de-risk before ship: one integration test per mounted route that calls it with `deps` exactly as the route builds them, spying on `commit`, asserting (a) the spy is the lane ledger's `tryCommit`, not `defaultCommit`, and (b) a forced ledger-write failure refuses a billed request. That one test catches every forgotten-wiring regression permanently, including both blockers above.

## CONFIDENCE
I could not verify, from this document alone: (1) `deriveKey`'s treatment of `now` — this decides whether Blocker #2 is P1 or a footnote; a one-line read of `composeLimits.mjs` settles it. (2) The mounted routes — authn presence, `userId` provenance, and whether `store`/`commit` are actually injected; this gates Blockers #1, #2, and #4 and the IDOR question, and the document explicitly forbids re-reporting the pre-check default without live-exploitability evidence, which I cannot establish without the route. (3) `renderStill`'s return shape (the `model: undefined` drift) and `makeFileLedger`'s exact `degraded` semantics. (4) Actual line counts vs the 300-line cap — composeStills claims 291, which is close enough to the cap that the next honest addition forces another split. (5) Whether the claimed drift test for `KINDS` exists. My findings on `rememberKey`, `defaultCommit`, `tryCommit`'s NaN path, and the cursor arithmetic are derived wholly from the supplied source and I stand behind them; everything routed through an unseen file is labeled as such above, and I'd rather hand Sean five verified findings and three named gaps than nine confident ones.
