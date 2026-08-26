# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r10.md
**Tokens:** 12267 in / 23676 out (reasoning: 21723) | total 35943
**Wall:** 367.9s

---

## VERDICT
REVISE — I re-derived the eviction and budget invariants line by line and they close (no fresh P0 in the shown code), but the byte budget bounds the wrong unit, one ledger check violates its own free-lane invariant, and — answering your note squarely — the unpersisted-bytes rescue has crossed from guard to hazard and should be deleted rather than fixed a fifth time.

(Line cites below are symbol-level; the paste carries no line numbers.)

## BLOCKERS

1. **P1 — `BYTES_RETAIN` counts entries, not bytes.** composeGuards.mjs (`BYTES_RETAIN = 12`, `bytesHeld += 1` in `slimForReplay`). Failure: R2 misconfigured → persistence fails *correlatively* (your own comment) → 12 consecutive hosted 4-ups, each `count × multi-MB base64`, retained resident — plausibly hundreds of MB held during exactly the incident the budget was built for — and the 13th lost render's replay hits `bytesBudgetExhausted` and silently drops its bytes anyway. A bound named in bytes that measures entries bounds neither memory nor the rescue. It fails at both jobs simultaneously.

2. **P1 (conditional, load-bearing contract) — `slimForReplay`'s `result.stills.some((s) => !s.assetId)` requires `persist` to *mutate* the still objects.** composeStills.mjs never attaches `assetId` itself (`stills.push({ index, lane, promptHash, ...s.value, model })` — no assetId), and the `persistence` return value is kept as a separate summary. If `persistStills.mjs` returns IDs without annotating the stills, *every* hosted entry takes the keep-bytes branch (memory blowout per #1), and exhausted replays of **successfully persisted** renders report `bytesDropped` with no `assetId` to fetch — a paid render rendered unrecoverable by the exact branch written to prevent that. The document does not show the contract; everything downstream of `!s.assetId` hangs on it.

3. **P2 — the spend-ceiling check lacks the `billed` guard its twin has.** laneLedger.mjs `tryCommit`: `if (billed && before.degraded)` is guarded; `if (before.spendUsd + spendUsd > maxSpendUsdDaily)` is not. Failure: operator lowers the cap mid-day below committed spend ($30 committed, cap dropped to $10) → `30 + 0 > 10` → every **free local render** — the default lane — refused `E_SPEND_CEILING` until UTC rollover. This contradicts the file's own stated invariant ("a bookkeeping problem must not take down a lane that costs nothing") three paragraphs above the code.

4. **P2 — the injectable `store` param re-arms the bug the header documents as fixed.** composeStills.mjs `store = COALESCING_STORE` default, paired with module-global `settledKeys`/`derivedKeys`. Your own docblock: pairing a non-global store with the global sets "broke the eviction bound the moment two stores existed." The default removed the footgun and kept the gun: any future caller passing a custom store gets evictions deleting keys from a map that may not hold them, against a settled-set describing a different map. `settledKeys` is also exported mutable. Delete the parameter; tests have `_resetCoalescing`.

5. **P2 — house-rule scope: brief free text reaches OpenRouter unscreened.** House rule says "zero PII to LLMs (IDs only)"; `brief.text` → `promptsFromBrief` → `hostedGenerate` with no PII scrub visible. An operator brief ("poster for Jane Smith's marathon") ships a client's name to a third party. Either the rule is scoped to identity fields (say so explicitly) or the brief needs screening — right now it's neither.

No other blockers. I confirmed, independently and against the DISPROVEN list: the `store.has` → `store.set` window is same-tick (race closed); in-flight entries can never be in `settledKeys` or `derivedKeys`; `bytesHeld` balances across all four store-deletion paths. That last one took enumerating every mutation path in two files — which is itself finding #6 below.

## ATTACKS

- **Correctness:** Residual, sub-blocker: `runLocalBatch` throwing *synchronously* after `batches.createBatch` leaves an eternal `queued` batch (`.finally` never attached, `settle.rej` after `settle.res` is a no-op). `model: s.value.provider` is `undefined` if a generator omits `provider`. Hosted lane is synchronous-only over proxy timeouts; a human-speed retry after a 60s timeout with a *derived* key may land outside the time bucket and re-charge (client-keyed retry is protected by retention).
- **Security:** `assertKeyHasOwner` incl. `null`/`''` is now solid. Unverifiable from the document: workspace/brandKit authorization (admin-only is *claimed* in a comment, route not shown); `batch.id` predictability → IDOR on `statusUrl`; OpenRouter key handling inside `gateHosted`/`verifier`.
- **Data-truth / schema drift:** Replay shape `{image: {kind, mime, dropped}}` vs live `{image: {...}}` is documented server-side but I cannot see the frontend contract honoring `dropped`. `model` alias for `provider` preserved ✓. Persistence truth is split across two surfaces — the `persistence` summary object *and* per-still flags ("each still says which") — two sources that can drift.

## HIGHEST RISK

**The unpersisted-bytes rescue subsystem as a whole — and yes, to your note: the accumulated complexity is now the risk, specifically here.** My test for it: could I re-derive correctness in one read? The two-class key retention — **yes**; keep it, every fix was load-bearing, both loops are provably bounded, it's ~30 lines. The byte rescue — **no**: I had to enumerate every store-deletion path across two files to convince myself `bytesHeld` balances. Four rounds of fixes, three state cells, one release path, an invariant maintained by discipline rather than structure, and a bound in the wrong unit (Blocker 1) hanging on an unverifiable contract (Blocker 2). Patches are now patching patches.

**Cheapest de-risk: delete it.** `slimForReplay` always slims; on persistence failure the *live* response already carries the bytes (the caller who paid has its images) plus an explicit `persistFailed`; recovery points at a durable handle, not process RAM. That deletes `byteKeys`, `bytesHeld`, `releaseBytes`, `BYTES_RETAIN`, `carriesBytes`, and the exhausted branch — roughly 40 lines and an entire invariant class — and converts Blockers 1 and 2 from defects into non-code. If you must keep the rescue: count real bytes (`byteLength`), not entries, and fold all three sets into one LRU with per-entry metadata so eviction is structural, not disciplinary.

## CONFIDENCE

Could not verify from the document: (1) **the route wiring** — `usage: atelierLedger().usageToday()` / `commit: atelierLedger().tryCommit` at the production call site. The ledger file's entire premise is that this wiring class failed twice before; the route is not shown, and `usage = { runs: 0 }` + `defaultCommit` still silently组合 into an unenforced run cap for anyone who forgets. (2) `persistStills.mjs`'s assetId mutation contract (Blocker 2). (3) `chooseLane`/`gateHosted`, `composeBatch`, `batchStore` id generation, `deriveKey`'s bucket width, `clampCount`/`MAX_STILLS` bounds (my worst-case memory arithmetic depends on them). (4) `makeFileLedger`'s read-modify-write atomicity across processes on a *shared* `SWAN_SPEND_LEDGER_DIR` volume — the "one process per lane" invariant is documented but nothing enforces it. What would settle nearly all of it in one stroke: a single end-to-end probe through the **real route** with the **real ledger** — two identical client-keyed requests → assert one charge, one batch, replay carries `assetId`; one request with a stubbed persist returning `{ok:true}` without mutation → assert the replay does not lie about `bytesDropped`. That test either passes and retires Blockers 2 and half my confidence list, or fails and proves the deletion in HIGHEST RISK correct.
