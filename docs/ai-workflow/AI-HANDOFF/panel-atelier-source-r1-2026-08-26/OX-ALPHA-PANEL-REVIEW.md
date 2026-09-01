# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/hostile-source-packet.md
**Seed:** (none)
**Tokens:** 13105 in / 8231 out · **Cost:** ~$0.0000 · **Wall:** 244.7s · **finish:** stop

---

## VERDICT
REVISE — the engineering discipline here is genuinely above average (the cursor-precision analysis and the write-failure asymmetry are correct), but there is a bypassable brand-scope gate, a client-controlled filesystem path, and a silent cap-erosion path that would each embarrass you in production.

## BLOCKERS

1. **P1 — Taste-source brand leak is bypassable via the documented lawProfile override.** `composeStills.mjs` computes `const lawProfile = resolveLawProfile(kit.lawProfile)` and gates with `if (promptSource === 'taste' && lawProfile !== 'full')`. But `registry.mjs` explicitly documents "an explicit `lawProfile` on the request still wins." So a caller sending `brandKit: <non-Swan>, lawProfile: 'full', promptSource: 'taste'` passes the gate and dresses a non-Swan render in the Swan-rated taste corpus — the *exact* leak `E_TASTE_IS_SWAN_ONLY` exists to prevent, reachable through the front door. The gate must test `kit.lawProfileFromKit`, not the effective profile. (If `resolveKit` in `promptSources.mjs` does *not* fold the override in, then the opposite defect holds: the documented override is dead and `lawProfileOverridden` lies. Either way one of the two files is wrong — see CONFIDENCE.)

2. **P1 — Client-controlled `outDir` flows into the renderer unvalidated.** `composeStills.mjs`, `runBatch`/`one()`: `renderStill({ promptText: p.text, seed, outDir: req.outDir }, { env })`, and the JSDoc lists `outDir` as part of the public `req`. Nothing in this file constrains it. If `localStillLane.renderStill` writes under it without a `path.resolve` + root-prefix check, any authenticated caller writes rendered files to arbitrary server paths (`outDir: "../../etc/…"`) — traversal-by-render. Either sanitize here or remove the field from the caller-facing contract.

3. **P1 — Ledger write failure silently disables the *free* lane's run cap.** `laneLedger.mjs`, `tryCommit`: `if (written?.failed && billed)` — only billed requests are refused on failed writes. But the failed write also means `runs` was never recorded, so `before.runs` never grows. During any persistent write failure (disk full, EROFS), the local 5090 lane's daily run cap stops being enforced entirely: every request reads the same stale total, passes, proceeds, records nothing. The doc reasons correctly about *money* ("a bookkeeping problem must not take down a lane that costs nothing") and misses that the same branch erases the *GPU* ceiling. Free requests should still be counted best-effort or the run cap should fail closed independently of the spend ceiling.

## ATTACKS

**Correctness**
- **Silent reintroduction of the millisecond bug via missing deps.** `assetLibrary.mjs`: `sqlAware = Boolean(fn && col && whereFn)` — if a caller invokes `listAssets` with `Op` but forgets `fn`/`col`, the code falls back to raw `createdAt` comparison, which is precisely the sub-millisecond row-eating behavior the header devotes twenty lines to fixing. No error, no warning — the guarantee degrades silently. Fail loudly instead.
- **`limit: 0` clamps to 1, contradicting the file's own philosophy.** The ABSENT-vs-ZERO comment says a provided value is "clamped into range, never reinterpreted" — but an explicit `0` becoming a page of 1 *is* reinterpretation. Refuse it.
- **Local stills get `model: undefined`.** `stills.push({ …, model: s.value.provider })` — local-lane fulfilled values carry no `provider` field, so the alias ships `undefined` while the top-level `model` is `cost.model`. Response-shape drift between lanes.
- **`chargedUsd` lies after the commit.** The ledger commits `cost.totalUsd` (full count) pre-call; the response reports `chargedUsd: cost.unitUsd * stills.length` post-failure, and the async-accepted payload reports `chargedUsd: 0` while the commit has already consumed the runs. Committed-vs-reported spend drift; reconcile or rename the field.
- **NaN poisons the ledger permanently.** If `cost.totalUsd` is ever `NaN` (price-table gap, `costUsd` arithmetic upstream), `before.spendUsd + NaN > maxSpendUsdDaily` is `false` — the gate passes — and `NaN` is persisted into the ledger, after which every subsequent comparison is `false` and the spend ceiling is dead for the rest of the UTC day. Guard with `Number.isFinite(spendUsd)`.

**Security**
- `outDir` traversal — see Blocker 2.
- Batch-status IDOR unproven: async path hands out `statusUrl: /api/atelier/compose/stills/${batch.id}`; the poll handler is not in this document. If it looks up by `batch.id` without an `ownerUserId` scope check, user B polls user A's batch. Must be verified before ship.
- `decodeCursor` accepts any well-formed `date|id` pair, not just cursors "this list issued" (the error message overclaims). Harmless today because `ownerUserId` scopes the query, but do not tighten that assumption invisibly.
- Presigned URLs per row per page: correct trade, correctly disclosed. No objection.

**Data-truth / schema drift**
- Tag-prefix contract is implicit: `assetLibrary.mjs` filters on `brandkit:`, `workspace:`, `lane:`, `brandkit-hash:`, `seed:` — whatever `persistStills.mjs` writes must match character-for-character, and neither file owns the constant. One shared prefix module or a drift test, same as you did for `KINDS`.
- `KINDS` mirror: the comment promises a drift test pinning it to `MediaAsset.MEDIA_ASSET_KINDS`; the test is not in this document, and an unverified pin is a copy waiting to be wrong by your own standard.

## HIGHEST RISK
Blocker 2 — client-supplied `outDir` reaching the filesystem. It is the only finding here that turns an HTTP request into a server-side write outside the intended tree, and everything downstream (persistence, publishing) inherits wherever those bytes landed. Cheapest de-risk before ship: delete `outDir` from the public request contract and derive it server-side from the batch id under a configured root; if a caller-supplied path is genuinely needed, `path.resolve` + `startsWith(configuredRoot)` + reject `..` segments, with a test.

## CONFIDENCE
- **`resolveKit` semantics (`promptSources.mjs` not provided)** determine whether Blocker 1 manifests as a bypass or as a dead override. The exported `resolveBrandKit` in `registry.mjs` implements override-wins; whether `resolveKit` delegates to it settles which bug you have. Evidence that settles it: the `promptSources.mjs` source, or one test: `brandKit: nonSwan, lawProfile: 'full', promptSource: 'taste'`.
- **`renderStill`'s handling of `outDir`** (`localStillLane.mjs` not provided) — Blocker 2 is proven only if sanitization is absent there. Its source settles it.
- **Whether the route actually wires `commit` to `tryCommit`.** `composeStills` defaults `commit = () => ({ allowed: true })` and `usage = { runs: 0, spendUsd: 0 }` — both gates are no-ops unless the route injects the lane ledger. The wiring is not in this document; if it is missed, every ceiling in these files is decorative. Route source, or a test asserting `E_SPEND_CEILING` end-to-end.
- **Batch status endpoint authz**, **`gateHosted` internals** (does `estimateOnly` make network calls?), and the **existence of the promised `KINDS` drift test** — all asserted by prose, none provable from these four files.
- House-rule check: these are backend files, so the styled-components/Victory/palette/touch-target rules are N/A; no forbidden vocabulary appears; no credentials phrasing appears. One standing violation is *acknowledged but not fixed*: `render-agent.mjs` at 344 lines exceeds the 300-line cap per the document's own admission — the binding rule does not have a "we wrote a paragraph about it" exemption.
