# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r7.md
**Tokens:** 11552 in / 16909 out (reasoning: 15297) | total 28461
**Wall:** 314.4s

---

## VERDICT
APPROVE — the three files as presented are clean: I can construct no provable new defect from the code in front of me, and the residual risk lives in unshown contracts (named below), not in these lines.

## BLOCKERS
None provable from the document. I am not inventing filler: every candidate I chased (eviction desync between `settledKeys` and the store, the `oldest.value === key` break, double-release of the GPU reservation, `settle.res`/`store.set` interleaving, coalesced-duplicate byte delivery, stranded-run accounting on refused billed writes) closes correctly under single-thread tracing. The items below are real mechanisms I could not fully verify or explicitly documented tradeoffs I dispute the severity of — they are attacks, not blockers.

## ATTACKS
- **Correctness**
  - **Derived-key replay is likely time-salted away.** `deriveKey({ ...req, ... }, now)` (composeStills, key-build line) strongly implies `now` is mixed into the key. If so, two identical requests ~50ms apart — i.e., every real double-click — derive *different* keys: no `store.has` hit, full second run, second charge on hosted, second batch on local. The header claim "it stops a double-click" would then hold only for same-millisecond clicks. All real idempotency rests on clients sending `Idempotency-Key`. Unverifiable without `composeLimits.mjs`.
  - **Local sync path (`req.async === false`) never explicitly releases the reservation on success.** The estimate path releases, the catch releases, the async path hands it to `runLocalBatch` — but the sync local path's release depends entirely on `withGpu(cb, reservation)` releasing internally (composeStills `runBatch` local branch). If it admits but doesn't release, every sync local render permanently consumes a GPU slot → `E_LOCAL_BUSY` forever after N renders. Unverifiable without `localStillLane.mjs`.
  - **`brief.text.length` on the taste path** (length gate is outside the `brief`-only condition). If `normalizeText(undefined)` returns anything other than `''`, a taste request with no brief crashes with a raw TypeError, not a `ComposeError`. Probably fine; `composeLimits.mjs` would settle it.
- **Security**
  - **"Hosted … never carries taste prompts" is a header promise, not visible enforcement.** The taste refusal at the top (`kit.lawProfileFromKit !== 'full'`) gates *brand*, not *lane*. Nothing in composeStills refuses `promptSource === 'taste'` + hosted; that must live in `chooseLane`/`gateHosted` (composeLaneChoice.mjs — not shown). If absent, Swan-corpus-derived prompts ship to OpenRouter — the exact brand-scope leak this ladder exists to prevent. Highest-value thing to probe in that file.
  - Key-owner namespacing and the `E_BAD_OWNER` null/`''` widening are correct as written; no IDOR visible in these files.
- **Data-truth / schema drift — the one that matters:**
  - **`slimForReplay`'s condition depends on `stills[].assetId`, and nothing visible in composeStills ever writes `assetId` onto a still.** `persistBatch`'s return value lands in `result.persistence` — it is *not* merged into `stills`. If `persistStills.mjs` returns asset ids separately rather than mutating the still objects in place, `result.stills.some((s) => !s.assetId)` is **always true**, `bytesDropped` is never set, and the entire round-F memory bound is dead code — every hosted replay copy retained at full fidelity, silently, while the code comments claim the opposite. This is caller-field-vs-producer-field drift of exactly the kind this panel hunts, and the document does not supply the contract.
- **DoS/memory (documented tradeoff, disputed severity):** retention counts entries, not bytes — the doc's own sentence "a bound that counts the wrong unit is not a bound." The assetId-failure branch (and `req.persist === false`, which routes into the same branch) retains full payloads: 500 entries × 4 base64 images ≈ multi-GB resident. Trigger is precisely an R2 outage or persist-skipped run on a hosted lane with budget set → OOM kills the process, taking every in-flight local batch and the stranded-run counters with it. "Rare enough that carrying the bytes costs little" is true per-entry and false at the cap. Cheap fix: a byte budget (or short full-fidelity ring, N≈25) instead of an entry-count exemption.

## HIGHEST RISK
The `assetId`-on-stills contract. If `persistBatch` doesn't mutate stills in place, the headline fix of this round is inert and nobody would notice — responses still work, memory just quietly reverts to unbounded-bytes. **Cheapest de-risk:** one probe — hosted happy path with `persist` mocked to succeed, then assert the stored copy (`store.get(key)` after settle) has `bytesDropped: true` and zero `image.data` fields; plus a 30-second read of `persistStills.mjs` for the mutation. An hour total, and it converts my biggest unknown into a fact.

## CONFIDENCE
What I could **not** verify, and what would settle each:
1. **`persistStills.mjs`** — does it write `assetId` onto each still (settles the dead-code question above). Decisive.
2. **`composeLaneChoice.mjs`** — (a) is taste-on-hosted refused in code; (b) does `chooseLane` return a reservation for the hosted lane (if yes, the sync hosted success path leaks it — no release call exists there).
3. **`composeLimits.mjs`** — `deriveKey` (is `now` mixed in → the double-click claim), `normalizeText(undefined)` (the `.length` crash), `clampCount` minimum (can `count` reach 0), `readComposeLimits` defaults.
4. **`localStillLane.mjs`** — does `withGpu` release the reservation after the callback (settles the sync-local leak).
5. **Route wiring** — does the live route actually inject `usage` + `commit = atelierLedger().tryCommit`, and did the route's old module-scope ledger construction get removed (dual instances = split `unwritable` flags against the same file)? The filed item covers the run-cap half; commit wiring is separately unverified — if unwired, hosted spends are refused by `defaultCommit` even with a budget set, which fails closed and would look like "hosted broken" in prod, not a leak.
6. **`spendLedger.mjs` (`makeFileLedger`)** — corrupt-read semantics (does `record` throw on a corrupt file, does `usageFor` return `runs: 0` when degraded). The free-lane-proceeds-on-degraded behavior is only safe if the unknown total is treated as "0 but flagged," which is what the code does — but I'm trusting the docblock's description of the inner module.

I did not re-report the filed items (defaultCommit run-cap; video lane's direct `record`) or the probe-disproven ones. If probes 1–3 come back clean, I would call these files CLEAN without reservation.
