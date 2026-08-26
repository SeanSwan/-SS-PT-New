# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r4.md
**Tokens:** 10278 in / 19664 out (reasoning: 17352) | total 29942
**Wall:** 378.5s

---

## VERDICT
REVISE — all three round-C fixes are sound as built, but the E_BAD_COST fix stopped at the cost side of the comparison: non-finite or undefined **ceilings** still pass every check in `tryCommit`, so one malformed env value silently reopens the exact money gate that fix was written to close. One conditional P1 and two P2s; no file is hiding a third round of the same bug.

## BLOCKERS

Round-C fix verdicts first, as ordered:
- **E_BAD_COST fix: correct but incomplete** → Blocker 1.
- **Coalescing pairing: VERIFIED SOUND.** Proof sketch: every addition to `settledKeys` (`rememberKey`) happens while the key is in the store and resolved; every store-deletion path (catch, async `.finally`, eviction) either deletes only never-settled keys or deletes from both structures together. So `settled ⊆ store`, eviction can never drop an in-flight promise, the loop is bounded (worst case it walks `settled` once, `done`/`key` breaks terminate), and `_resetCoalescing` clears both. The 500 bound is soft (overshoot = in-flight count) — acceptable and effectively bounded by local single-flight.
- **atelierLedger singleton: sound.** Nit only: `makeLaneLedger` remains exported, so a future caller can still construct a second brain against the same file — hardening candidate, not a defect.

1. **P1 (conditional) — NaN/undefined/Infinity ceilings fail open in `tryCommit`, and in gate 2.**
   Scenario: operator sets the spend env to `500$` (or any non-numeric). If `readComposeLimits` coerces with `Number()` without an `isFinite` guard, `limits.maxSpendUsdDaily` is `NaN`; `commit({ spendUsd: 2.5, maxSpendUsdDaily: NaN })` → `before.spendUsd + spendUsd > NaN` is `false` → `{ allowed: true }`. Same for `maxRunsDaily` on the free lane. Every hosted request passes until the provider fails; zero signal, because nothing prints `NaN`. Additionally — and this part is **visible in-document regardless of `readComposeLimits`** — the signature defaults `maxRunsDaily = Infinity, maxSpendUsdDaily = Infinity` mean any caller passing explicit `undefined` is silently uncapped. The file's own sentence — "a money gate whose every test silently answers 'fine' for garbage input is not a gate" — applies verbatim to the ceiling side.
   Evidence: `laneLedger.mjs` → `tryCommit` (guard validates only `spendUsd`/`runs`; the two cap comparisons; the `= Infinity` default params). `composeStills.mjs` → commit call forwarding `limits.maxRunsDaily / limits.maxSpendUsdDaily`; gate 2 uses the same values.
   Fix: one line — reject non-finite or non-positive ceilings with `E_BAD_LIMIT` in `tryCommit`, fail-closed, independent of what `readComposeLimits` does.

2. **P2 — "stops a double-click" overclaims for derived keys.**
   Scenario: no `Idempotency-Key` header; user double-clicks; two calls ~80 ms apart; `deriveKey({ ...req, ... }, now)` with `now = Date.now()` produces two different keys; both pass `store.has`, both reserve, both `commit` runs, both enqueue. Bounded by single-flight and the run cap — the cost is duplicate GPU work and double-committed run budget, not dollars — but the docblock's guarantee exceeds the mechanism. Verify the mounted route requires (or server-derives) a stable key for the async lane.

3. **P2 — the `'anon'` idempotency namespace is shared.** `u${req.userId ?? 'anon'}:${sha(...)}` — two unauthenticated callers sending the same key string coalesce; the second receives the first's `batchId`/stills and the batch row carries the first's userId. Exploitable only if anonymous compose exists on the mounted route — verify.

No other blockers. I am not padding this list.

**Per-file cleanliness:** `composeGuards.mjs` is **CLEAN** — pairing invariant proven above, eviction touches only settled (resolved) entries, defaultCommit fails closed on non-finite/negative spend, all loops bounded. `laneLedger.mjs` is clean except Blocker 1 — the write-failure asymmetry, stranding, and degraded-merge logic all check out, and the atomicity claim is real (`usageFor` → checks → `record`, no `await` between). `composeStills.mjs` is clean except Blockers 2–3.

## ATTACKS

**Correctivity**
- Tried to break the store pairing five ways (replay-during-reject, estimateOnly poisoning, eviction of pending, settled/store divergence, eviction infinite loop) — all hold; see proof above.
- `E_ALL_FAILED` after commit re-charges on retry — this is the documented monotonic/committed-not-collected philosophy, bounded by the ceiling. Not re-reporting as a defect.
- Minor truthfulness nit: partial batches report `chargedUsd: unitUsd * stills.length` while the ledger committed `unit * count` — committed > collected by design, but the response understates what the ceiling consumed.
- Hung async batch pins its key forever (watchdog is optional: `deps.watchdogMs` gates it) — one map entry per hung batch, bounded by GPU single-flight. Cosmetic.
- Corrupt-read gap candidate: `strandedRuns` covers **write failure**, not **corrupt read**. If `makeFileLedger`'s degraded read reports `runs: 0` (rather than last-known), every free request reads zero and the volume cap is vacuous under a corrupt file — the same class the stranding fix closed for unwritable. However, if corrupt reads also fail writes, the stranding path self-covers; if writes overwrite-and-heal, it self-corrects. Entirely dependent on `spendLedger.mjs` semantics — see CONFIDENCE.

**Security**
- `req.outDir` is passed verbatim into `renderStill({ ..., outDir: req.outDir })`. If any mounted route forwards a client-controlled `outDir`, the local lane is an arbitrary-path write primitive. Almost certainly server-derived — but the route is not in the document; verify before calling this dry.
- Hosted lane sends brief-derived `promptText` to OpenRouter. House-rule contact point: "zero PII to LLMs (IDs only)." Defensible if briefs are operator-authored art direction (an ID-only image prompt is meaningless), but the taste-vs-brief split should get an explicit blessing from whoever owns that rule.
- Taste local-only ("hosted never carries taste prompts") is **enforced nowhere in the visible code** — it must live in `composeLaneChoice.mjs`. If it doesn't, `lane === 'hosted' && promptSource === 'taste'` reaches `{ ...p.compiled, promptText }` with `p.compiled === undefined`, sending an incomplete payload to a billed provider.
- `statusUrl`/`batchId` ownership check lives in the route — not supplied, verify (IDOR surface).
- No injection/traversal in visible code: lane is allowlisted before `path.join`, client keys are hashed, no user-supplied URLs.

**Data-truth / schema drift**
- Per-still `model: s.value.provider` — local-lane `renderStill` return shape unknown; if it lacks `provider`, local stills carry `model: undefined` while hosted stills carry a real one. Top-level `cost.model` is authoritative; check consumers of the per-still field.
- `accepted` (202) vs final response shapes intentionally differ — the poll contract must match `batchStore` fields (not supplied).
- No ORM/PascalCase surface here; ledger JSON keys are consistent between `usageFor` and `tryCommit`.

**House rules:** all three files ≤ 300 lines (83/273/291 — `composeStills` is 9 under cap; plan the next split before adding a gate). Backend-only, so styled-components/Victory/palette/touch-target/WCAG have no surface here. No yoga/meditation language; no "NASM-certified" (credentials phrasing absent entirely).

## HIGHEST RISK
Blocker 1: a **silent** fail-open on the money ceiling — the failure mode is invisible (no error, no log, `NaN` never surfaces) and it's the precise class round C's fix was meant to kill. Cheapest de-risk: three lines in `tryCommit` rejecting non-finite/non-positive `maxRunsDaily`/`maxSpendUsdDaily`, plus two tests (NaN ceiling, undefined ceiling → assert refusal). Paste `readComposeLimits` in parallel — if it already `isFinite`-guards, this downgrades to defense-in-depth and this round is dry pending only the route verifications.

## CONFIDENCE
Could NOT verify from the document:
- **`composeLimits.mjs`** — whether `readComposeLimits` sanitizes env values (settles Blocker 1's severity), whether `deriveKey` actually mixes `now` (settles Blocker 2), `clampCount` bounds.
- **`composeLaneChoice.mjs`** — taste+hosted refusal, reservation release on hosted paths.
- **The mounted atelier route** — commit wiring to `atelierLedger().tryCommit` (the known filed item), Idempotency-Key requirement (Blocker 2), `outDir` provenance, `batchId` ownership on the status endpoint (Blocker 3 / IDOR).
- **`localBatchRunner` / `batchStore` / `localStillLane` / `persistStills`** — failure recording on the batch, `withGpu` release semantics, `renderStill` return shape (per-still `provider`).
- **`spendLedger.mjs`** — what a degraded (corrupt) read reports for `runs`. If zero, the free-lane volume cap is vacuous under corruption — the one residual gap I could not close either way.
- **Deployment topology** — the one-process-per-lane invariant is asserted in prose, not enforced anywhere; two replicas means N×cap with no signal.

Also: the document supplies no line numbers, so evidence above is cited by function + quoted code. If `readComposeLimits` turns out guarded and the route confirms key-requirement + server-derived `outDir` + batchId authz, my verdict moves to APPROVE with only the ceiling guard as recommended hardening.
