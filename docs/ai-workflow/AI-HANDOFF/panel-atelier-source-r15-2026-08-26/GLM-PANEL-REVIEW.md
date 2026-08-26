# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r15.md
**Tokens:** 7878 in / 15368 out (reasoning: 13449) | total 23246
**Wall:** 219.9s

---

## VERDICT
REVISE — the audit the author asked for found the eighth instance of the sync/async pattern (the brief-path law drop uses the merged profile on sync but the kit's own on async), plus an async watchdog that releases the GPU permit while the abandoned render loop is still alive.

## BLOCKERS

1. **P1 — Brief-path `lawProfileDrop` diverges between lanes. This is defect #8 of the pattern you are hunting.**
   Scenario: any request with `promptSource: 'brief'` where the caller's explicit `lawProfile` override differs from the kit's own profile.
   - Sync path: `composeStills.mjs` derives `const lawProfile = resolveLawProfile(kit.lawProfile)` (the merged value, per your own comment "the value AFTER the caller's explicit override has won") and passes it to `buildPrompts`, whose brief branch does `lawProfileDrop: LAW_PROFILES[lawProfile] || []` (`composePrompts.mjs:~50`). The caller's override changes which laws are dropped.
   - Async path: `composeStills.mjs` async dispatch passes `lawProfile: kit.lawProfileFromKit` (~line 208), and `localBatchRunner.mjs` brief branch does `lawProfileDrop: LAW_PROFILES[lawProfile] || []` (~line 58) — the kit's own profile. **The caller's override is silently ignored on the default lane.**
   Concrete failure: kit with permissive own profile (drops LAW4), caller overrides `lawProfile: 'full'` requesting every Swan law → hosted honors it, local (the default, where renders actually happen) keeps dropping LAW4. Mirror case: Swan kit + permissive override → hosted drops Swan's kill-list, local doesn't. Same logical request, different law enforcement per lane. Your "same correction the sync path received" comment was true for the **taste** branch only — `buildPrompts` uses kit-own for taste but **merged** for brief, while `runLocalBatch` uses kit-own for both. The two files disagree on the brief branch.

2. **P1 — Watchdog releases the GPU reservation while the render loop is still running.**
   `localBatchRunner.mjs:~63` — `Promise.race([watchdog, withGpu(loop)])`. On watchdog reject, the catch runs `reservation?.release()` (~line 84) and `finishBatch(error)`. But the race does not cancel the inner loop: nothing checks a cancelled flag per iteration, so the loop keeps calling `renderStill` / `persist` / `pushStill` into an already-terminal batch, and — worse — the released permit admits the next local batch onto the still-occupied card. Failure scenario: one stalled socket at minute 20 + one queued batch → two concurrent renders on the single-flight 5090, defeating exactly the admission invariant the reservation exists to enforce (VRAM contention/OOM). Also: if `withGpu` releases on its own completion, you get a double release. Same double-release class exists in the sync path — if `persist` throws after `runBatch`'s `withGpu` already released, the outer catch releases again.

3. **P2 — Persisted `model` provenance drifts by async flag.**
   Sync persist call (`composeStills.mjs:~250`): `persist({ ..., model, env })` where `model = req.model || DEFAULT_MODEL` — an **OpenRouter id**. Async persist (`localBatchRunner.mjs:~75`): `model` = the passed `model: cost.model` = `local.STILL_PROVIDER`. So local lane + `async:false` writes a MediaAsset row naming a model that never rendered the image, while the same response reports `model: cost.model` — the DB row and the response disagree about one render.

4. **P2 — `tasteMeta` is never surfaced on async, and async is where taste runs.**
   `buildPrompts` returns `tasteSeed / lawRejected / tasteDropped / lawProfile`; `runLocalBatch` keeps only `t.prompts` and discards the rest (~line 47). Taste is local-only and local is async-by-default, so the sync `tasteMeta` spread is near-dead code, and a client polling a batch that returned 3 stills for a count of 6 gets no explanation — precisely the "metadata is read when someone is asking why" situation your own comment in `composePrompts.mjs` defends.

5. **P2 — Persistence summary depends on an undocumented dual contract.**
   Sync consumes `persist()`'s **return value** as `persistence`. Async discards the return and instead computes `batch.stills.filter((s) => s.persist?.ok)` — which only works if `persistBatch` **mutates** the still objects to attach `.persist`. If it doesn't mutate, every async batch reports `ok:false, persisted:0` despite assets existing; if it does, one function silently serves two contracts. Minor addendum: an all-failed async batch reports `{ok: true, persisted: 0, total: 0}` (`0 === 0`).

## ATTACKS
- **Correctness:** `deps` defaults silently disable the caps — `usage = { runs: 0, spendUsd: 0 }` means a route that forgets to wire usage gets unlimited spend with no error, and `compiler` defaults to `undefined`. Verify the has→set idempotency window (verified: no `await` between `store.has` and `store.set` — clean); post-terminal batch mutation from Blocker 2; `E_ALL_FAILED` throws on sync but is structurally impossible on async (acceptable given 202-already-sent, but the asymmetry should be stated in the contract).
- **Security:** the batch poll endpoint is the classic IDOR — `statusUrl: /api/atelier/compose/stills/${batch.id}` hands out a handle whose ownership check lives in `batchStore`/the route, neither shown. If the GET doesn't assert `req.userId === batch.userId`, `promptText` (brand-applied), asset ids, and brand kit view leak cross-tenant. Idempotency namespacing (`u${userId}:sha(...)`) is correct; returning the derived `key` embeds the internal userId in responses (minor). No PII scrub exists on `brief.text` before hosted dispatch — free operator text goes to a third-party API; under a strict reading of "IDs only to LLMs" state whether briefs are exempt. Replay: async evicts at terminal / hosted retains — documented and reasoned; fine.
- **Data-truth / schema drift:** Blocker 3 (model column); `persistence` response shape may differ between lanes (sync = whatever `persistBatch` returns; async = synthesized `{ok, persisted, total}`) — verify key parity; `provider`-vs-`model` aliasing is documented. Still shape per-still is otherwise field-for-field identical between lanes — verified.

## HIGHEST RISK
The duplication itself: `runLocalBatch` re-implements `buildPrompts` inline, and that copy has already diverged twice. Cheapest de-risk: **delete the inline prompt construction in `localBatchRunner.mjs` and call `buildPrompts({ ..., lane: 'local' })`** — it is already lane-aware (`caps = lane === 'hosted' ? hostedCaps(model) : { provider: local.STILL_PROVIDER, ... }`) and already returns `tasteMeta` — passing the merged `lawProfile` exactly as the sync path does. Then add one golden test asserting both lanes produce byte-identical prompt text and seeds for identical inputs, including a case where kit-own profile ≠ override. One function, one truth; the pattern structurally cannot recur.

## CONFIDENCE
Could not verify from the document: (a) `resolveKit`/`resolveLawProfile` semantics — I inferred `kit.lawProfile` = merged and `kit.lawProfileFromKit` = kit-own from your comments; if that inference is wrong, Blocker 1 collapses, so it's the first thing to check (`promptSources.mjs` source settles it); (b) whether `persistBatch` mutates stills (settles Blocker 5); (c) `batchStore` ownership checks, `markRunning`/`pushStill`-after-terminal behavior, and the poll route's authz (settles the IDOR and half of Blocker 2); (d) `withGpu` release semantics (settles the double-release half of Blocker 2); (e) `chooseLane`/`gateHosted`/`defaultCommit` internals; (f) whether the route actually injects `usage` and `compiler`. House rules: no violations in this slice — file caps hold (271/89/56/42), all UI rules N/A for backend, no banned language present.
