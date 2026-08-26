# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/hostile-source-r4.md
**Seed:** (none)
**Tokens:** 10394 in / 11805 out · **Cost:** ~$0.0000 · **Wall:** 336.2s · **finish:** stop

---

## VERDICT

REVISE — light: all three round-C fixes verify correct and I found no P0/P1, but two P2 hardening items in `composeStills` (anonymous idempotency namespace, replay-map memory retention) and one house-rule tension should land before ship; `laneLedger.mjs` is CLEAN.

## BLOCKERS

No P0/P1 blockers are demonstrable from this document. The following are real but sub-blocker; I label them honestly rather than inflating them.

1. **P2 — Anonymous callers share one idempotency namespace (confused-deputy replay).** `composeStills.mjs`, GATE 3a: `` `u${req.userId ?? 'anon'}:${sha(String(req.idempotencyKey)).slice(0, 32)}` ``. Failure scenario: caller A (no `userId`) submits `Idempotency-Key: K` on the hosted lane, pays, gets a result; caller B (also no `userId`) submits the same key K, passes `store.has(key)`, and receives A's full result — including A's images and, on the async path, A's `batchId` and `statusUrl`. The code *explicitly tolerates* a missing userId rather than refusing it. If the mounted route guarantees authentication this is dead-code tolerance, but the tolerant form is a loaded footgun in money-touching code. Fix is one line: throw `E_UNAUTHENTICATED` when `req.userId` is absent instead of coalescing under `'anon'`.

2. **P2 — The bounded replay map retains full base64 image payloads.** `composeGuards.mjs` (`IDEMPOTENCY_RETAIN = 500`, `rememberKey`) + `composeStills.mjs` ("DELIBERATELY NOT EVICTED HERE"). The bound is 500 *entries*, but each hosted-sync entry holds the complete result including `stills[].image.data` (b64, plausibly 1–2 MB per image, up to MAX_STILLS per batch). Failure scenario: 500 distinct-key hosted 4-up batches → roughly 2–4 GB pinned in process memory until evicted by 500 subsequent requests; a scripted client can hold this indefinitely and degrade or OOM the process. The retry-honesty argument for retaining the key is sound; retaining the *pixel bytes* is not required by it. Fix: store a slim replay envelope (cost, key, batch/admission metadata) and strip `image.data` from the retained copy, or bound retained bytes rather than entries.

3. **P2, house rule — "zero PII to LLMs" vs. the hosted lane.** `composeStills.mjs` sends the caller's brief text (post-`applyBrandKit`) to OpenRouter via `hostedGenerate` with no redaction or refusal gate. If the house rule covers external model providers and not just internal analytics calls, user-authored brief text is an uncontrolled PII channel to a third party. If the rule is scoped to internal LLM calls only, disregard — but say so explicitly, because the current document is silent and silence reads as a gap.

4. **P3 — Response-shape drift: the async accepted payload omits `clampedFrom`.** `composeStills.mjs`, local-async branch: the `accepted` object carries `count`, `cost`, `brandKit`, `admission`, `key` — but not `clampedFrom`, which both the estimate and sync paths attach when `clampCount` adjusted the request. A client that surfaces "your 12 was rendered as 8" on the sync path silently loses that signal on the 202 path. One-line fix.

## ATTACKS

**Correctness**
- Round-C fix 1 (E_BAD_COST): verified in both sites. `tryCommit` validates `Number.isFinite` on both `spendUsd` and `runs` plus negativity; `defaultCommit` validates `spendUsd`. Edge cases checked: `-0` passes (`-0 < 0` is false) — harmless; fractional `runs` (e.g. 2.5) passes validation but `clampCount` guarantees integers upstream. The throw-vs-return asymmetry between `defaultCommit` and `tryCommit` both surface as refusals. Sound.
- Round-C fix 2 (module-scoped store + settledKeys): verified paired and process-scoped; `_resetCoalescing()` clears both. The eviction loop terminates (each iteration shrinks `settled`), protects in-flight promises (evicts from `settled` insertion order, never the store's), and the `oldest.value === key` break self-corrects on the next call. The failure-path ordering `store.delete(key); settle.rej(err)` correctly lets an already-coalesced waiter receive the error while a *later* arrival legitimately re-runs. `pending.catch(() => {})` and `.finally(...).catch(...)` ordering close the unhandled-rejection windows. Sound.
- Round-C fix 3 (atelierLedger singleton): verified lazy, module-scoped, mirrors `videoLedger`. One residual nit: the singleton captures `process.env` at first construction, so setting `SWAN_SPEND_LEDGER_DIR` after the first call is invisible — test footgun only.
- `defaultCommit` ignoring `runs`: FILED, not re-reported. Same for the permissive `usage` pre-check default.
- `strandedRuns` never flushes to disk after recovery, so a restart re-mints headroom equal to the stranded count — disclosed in-file and bounded by failure windows; accepted.
- `estimateOnly` still acquires a GPU reservation via `chooseLane` and releases it immediately — an estimate can be refused `E_LOCAL_BUSY` while the card is busy. UX wart, not a defect.

**Security**
- **IDOR candidate, unverifiable:** `statusUrl: /api/atelier/compose/stills/${batch.id}` — the GET handler is not in the document. It MUST assert `batch.userId === requester`. This is the classic leak for this exact architecture and is the single most important thing to confirm outside this review.
- **Kit↔workspace binding:** the gate refuses `workspaceId` without `brandKit`, but nothing shown validates that the named kit *belongs to* the named workspace. `resolveKit(req)` internals are not shown; if it accepts any kit id for any workspace, brand-scope leakage (Swan art direction onto another site's workspace asset) survives the slice that claims to close it.
- Injection/secrets/replay: no SQL, no shell, no secrets in source; env vars referenced by name only; the derived key is salted with userId and hashed. Clean.
- Rate-limit/DoS: the daily caps ARE the rate limit, which makes the route's wiring of `commit` load-bearing (see HIGHEST RISK).

**Data-truth / schema drift**
- `chargedUsd = unitUsd × stills.length` (response) diverges deliberately from the ledger's committed `totalUsd` (monotonic, pre-commit). Correct direction — but downstream billing must read the ledger, never the response. Assert this somewhere.
- `provider` canonical / `model` alias handled explicitly for the 383c218e9 contract. Good.
- `usageFor` includes `reason` only when `unwritable` — consumers must treat it as optional. Minor.
- PascalCase/snake_case and FK drift: no schema surface in these files; nothing to flag.

## HIGHEST RISK

The mounted route's dependency wiring is the entire money gate. If the route does not inject `commit: atelierLedger().tryCommit` and a *per-request* `usage`, then `defaultCommit` (which ignores `runs` entirely) becomes the authoritative gate and the free lane's daily volume cap exists nowhere except the per-call `{ runs: 0 }` default — the filed defect, live, with a 27-second serial GPU render reachable in an unbounded daily loop. Cheapest de-risk before ship: one route-layer integration test that fires two batches exceeding `DEFAULT_MAX_RUNS_DAILY` against the *production-wired* `composeStills` and asserts the second returns `E_RUN_CAP` with zero generator calls — plus a startup assertion that the wired `commit !== defaultCommit`. That single test converts the biggest unknown in this review into a known.

## CONFIDENCE

What I could NOT verify from this document, and what would settle each:

1. **`makeFileLedger` / `dayKey` internals** (`shared/providers/spendLedger.mjs`): the single-process atomicity claim in `tryCommit` holds only if `usageFor`/`record` are fully synchronous, and the "UTC day" hint assumes `dayKey` is UTC-bound. Settle with: the spendLedger source, or a test asserting two synchronous `tryCommit` calls cannot both pass a tight cap.
2. **`chooseLane` / `gateHosted`** (`composeLaneChoice.mjs`): reservation lifecycle on the hosted-sync success path (who releases it — I assume `withGpu` on the local path and `null` on hosted, but the success path here never touches `reservation` directly), unknown-model pricing refusal, and whether `gateHosted`'s `totalUsd` is computed from `IMAGE_PRICES`. Settle with: that file.
3. **Route wiring, authn, and batch-status authz**: whether `userId` can be absent (blocker 1's trigger), whether the GET status route checks ownership, and whether `usage` is evaluated per-request. Settle with: the route file and the batchStore GET handler. These two answers flip blocker 1 between P2 and non-issue, and decide the HIGHEST RISK item.
4. **`resolveKit` / brandKits registry**: whether kit↔workspace binding is validated. Settle with: `registry.mjs`.
5. **Line counts and frontend house rules**: claimed 291/273/83 is plausible from the bodies shown but I cannot count compiled lines; styled-components/Victory/palette/touch-target rules have no surface in backend files and are therefore neither violated nor confirmable here.

Where I am confident: the three round-C fixes are correctly implemented; `laneLedger.mjs`'s degraded/unwritable/stranded state machine is internally consistent and its asymmetries are deliberate and correctly reasoned; `composeGuards.mjs` is CLEAN as a unit — the retention concern lives in what `composeStills` chooses to *put* in the map, not in the guard's logic.
