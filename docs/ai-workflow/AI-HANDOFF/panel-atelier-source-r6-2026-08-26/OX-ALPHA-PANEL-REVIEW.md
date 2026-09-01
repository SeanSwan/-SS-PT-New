# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/hostile-source-r6.md
**Seed:** (none)
**Tokens:** 11362 in / 11165 out · **Cost:** ~$0.0000 · **Wall:** 315.7s · **finish:** stop

---

## VERDICT
APPROVE — no provable blocker survives contact with the text; one conditional P1 (the `assetId` replay dependency) needs a single probe to close, not a rewrite.

## BLOCKERS
None that I can demonstrate from the document alone. I am saying that plainly rather than dressing up the conditional in §ATTACKS as a blocker: every candidate I found is either explicitly acknowledged in the headers, already filed, or depends on code not shown (`persistBatch`, `makeFileLedger`, the batch-status route).

## ATTACKS

**Correctness**
1. **`rememberKey` bound can be silently exceeded by async-lane keys** (P2). `composeGuards.mjs` — async local keys are `store.set` at reservation and `store.delete` in `.finally`, but never enter `settledKeys` (only the hosted path calls `rememberKey`). Under an all-local workload the eviction loop drains `settledKeys`, hits `oldest.done`, and breaks while `store.size > IDEMPOTENCY_RETAIN`. Steady-state excess equals concurrent in-flight batches, which GPU single-flight bounds — so this is a bound-overshoot nit, not a leak. Noting it because the file's own comment claims "one process, one map, one set" implies a tighter invariant than actually holds.
2. **Possible double `reservation.release()` on the sync-local failure path** (P2, conditional). `composeStills.mjs` — if `withGpu(fn, reservation)` releases on fn's exception and then `E_ALL_FAILED` propagates to the outer `catch`, `reservation?.release()` fires a second time. Safe iff release is idempotent; unverifiable here.
3. **`assertKeyHasOwner` accepts any non-empty non-string** (P2). `composeGuards.mjs` — `0` is correctly accepted, but so are `NaN`, `false`, and objects; the key derivation `u${req.userId}` string-collapses distinct object identities to `[object Object]`. Only reachable if a misconfigured auth layer emits non-primitives, which is exactly the threat model this guard exists for. One `typeof` check closes it.
4. **Derived-key idempotency is millisecond-scoped** — two identical bodies 1ms apart without an `Idempotency-Key` derive different keys and both charge. Inherent to the design, documented implicitly; listing so it's a known accepted risk, not a surprise.

**Security**
5. **Brief text reaches OpenRouter unredacted** (P2, house-rule adjacent). The hosted lane ships `promptText` verbatim to a third-party provider. House rule is "zero PII to LLMs (IDs only)." Operator-authored briefs on a personal-training SaaS plausibly contain client-identifying content; there is no scrub/redaction step anywhere in the visible pipeline. If briefs are contractually operator-only prose this is fine; if clients supply brief text, this is a rule violation.
6. **Batch-status IDOR surface** (verification, not finding). `statusUrl: /api/atelier/compose/stills/${batch.id}` — the route is not in this document. `createBatch` stores `userId`; whether the GET enforces it determines whether batch ids are capability URLs or IDOR. Anonymous callers without an idempotency key skip `assertKeyHasOwner` entirely (by design), so `batch.userId` can be `undefined` — unownable rows.
7. **Kit tenancy** — `resolveKit(req)` validates existence, not ownership. If brand kits are per-workspace resources, any caller naming another workspace's kit rides its law profile. Registry semantics not shown.

**Data-truth / schema drift**
8. **`chargedUsd` diverges from what the ledger recorded** (P2). Commit charges `cost.totalUsd` (full count); the response reports `unitUsd * stills.length`. After a partial failure the ledger and the receipt disagree by design ("committed, not collected") — but the field is *named* `chargedUsd`, which is false against the ledger. Rename to `committedUsd`/`collectedUsd` or reconcile.
9. **Two different `shared/` roots in import paths.** `laneLedger.mjs` imports `../../shared/providers/spendLedger.mjs` (resolves `backend/shared/…`); `composeStills.mjs` imports `../../../shared/…` (resolves repo-root `shared/…`). Either two trees intentionally exist or one of these is latent path drift. Five rounds deep, presumably both resolve — but nobody has stated why they differ.
10. **The slimForReplay contract references an `assetId` the visible still shape never carries** — see HIGHEST RISK. The fulfilled-still literal in `composeStills.mjs` (`index, lane, promptHash, …s.value`) contains no `assetId`; `persistence` is a separate top-level `{ok, code, persisted}` count. If `persistBatch` does not mutate the stills array in place to annotate each still, the retained replay copy tells the client "fetch by assetId" while carrying no assetId — replay becomes unactionable and the retry re-generates and double-charges, i.e., the exact outcome the whole retention design exists to prevent.

## HIGHEST RISK
Item 10. The entire hosted-lane economics argument (retain-slim-not-bytes, "the client fetches from the library by `assetId`") rests on `persistBatch` annotating `result.stills` in place — a mutation the document shows neither happening nor being guaranteed. Cheapest de-risk: one live probe — `const r = await composeStills(req); assert(r.stills.every(s => typeof s.assetId === 'string')); const s = slimForReplay(r); assert(s.stills[0].assetId === r.stills[0].assetId);` — plus a replay integration test asserting the slimmed payload contains a usable fetch handle. Ten minutes, settles it permanently.

## CONFIDENCE
Could NOT verify from the document:
- **Whether `persistBatch` mutates stills in place** (item 10). Evidence that settles it: the `persistStills.mjs` source, or the probe above.
- **`makeFileLedger` internals** — corrupt-read-returns-degraded vs. throws; whether `record` repairs a corrupt file. `tryCommit`'s degraded-refusal path assumes the former.
- **Batch status route authz** and whether `release()` is idempotent — both outside the shown files.
- **Actual line counts** (299/286/133 are claims; 299 is suspiciously exactly one under the cap).
- **Why two `shared/` roots exist** (item 9).
- Visual house rules (palette, Victory, styled-components, touch targets, dark-first, Dual-Button Glow) are **not applicable** to these three backend files — I checked for the language rules instead: no "yoga/meditation" language present; credential phrasing not present to violate. The only rule with teeth here is PII-to-LLMs (item 5), which turns on brief provenance I cannot see.

I verified the round-F delta itself (`assertKeyHasOwner` value check) against its stated threat model — null/''/undefined all rejected, `0` correctly accepted, and I found no regression it introduces for the admin-only live route. Items 1–4 and 8 are real but sub-blocker; I am not inflating any of them to force a REVISE, and I'd rather hand you item 10 as a one-probe question than a fabricated P1.
