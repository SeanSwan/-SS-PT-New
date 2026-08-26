# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r12.md
**Tokens:** 14210 in / 15817 out (reasoning: 13526) | total 30027
**Wall:** 244.6s

---

## VERDICT
REVISE — round K's key fix and the estimate exemption each landed without auditing their own siblings: the identity hash still misses two output-determining fields, and the run-cap exemption was never carried into the hosted budget gate sitting on the same path.

## BLOCKERS

1. **P1 — `deriveKey` omits top-level `req.aspect` and `brief.slotOverrides`, violating the file's own stated invariant ("EVERY FIELD THAT CHANGES THE OUTPUT BELONGS IN THE IDENTITY").**
   Failure scenario: the req contract documents `aspect` as a **top-level** field (`composeStills.mjs`, JSDoc: `{ brief, promptSource, lane, model, count, seed, aspect, cinematic, ... }`), and the taste path consumes it — `promptsFromTaste({ ..., aspect: brief.aspect || req.aspect, ... })`. But `deriveKey` (composeLimits.mjs) destructures only `{ brief, promptSource, lane, model, count, seed, workspaceId, userId, brandKit, lawProfile, cinematic, mode }` and hashes `a: brief?.aspect ?? ''` — never `req.aspect`. Inputs: same user, same brief, taste source, 16:9 at t=0s and 9:16 at t=30s (same 60s bucket) → identical key → second request hits `store.has(key)`, gets the first's 16:9 stills back with `replayed: true`, which reads as success. Same hole for `brief.slotOverrides`: caller-supplied overrides are merged caller-wins into the compile (`slotOverrides: { ...(kit.negativeSlot ? { negative: kit.negativeSlot } : {}), ...(brief.slotOverrides || {}) }`) and appear nowhere in the hash — `f:` covers facets only. This is precisely the round-K shape: the fix enumerated four fields and stopped; the neighbours were never re-audited. (Evidence: composeLimits.mjs `deriveKey` destructure + hashed object; composeStills.mjs JSDoc and the two call sites quoted. The document supplies no line index — cited by symbol/quote.)

2. **P1 — the `estimateOnly` run-cap exemption was not carried into `gateHosted`, and the flag isn't even passed to it.**
   The cost line runs *before* the estimate return: `const cost = lane === 'hosted' ? { ...gateHosted({ model, count, limits, usage, verifier }), lane } : ...` — note `estimateOnly` is absent from that argument list. If `gateHosted` enforces the spend ceiling or the `limits.disabled` state (its documented role: "hosted budget"), then a price preview at/over the ceiling — or in the **default deployment**, where `DEFAULT_MAX_SPEND_USD_DAILY = 0` means `disabled: true` — is refused instead of priced. That is verbatim the mistake the round's own comment names ("refusing a price preview at the cap hides the price exactly when an operator most needs it"), fixed in the gate next door and not here: with the default env, the hosted lane's price may be unqueryable in exactly the state where an operator needs it to decide whether to set a budget. Alternative failure if `chooseLane` reroutes estimates to local instead: the preview reports $0 for work that would bill hosted — a misleading estimate. Either branch is wrong. Caveat: `composeLaneChoice.mjs` was not supplied; the documentable defect is that the exemption flag does not reach the one gate on the estimate path that enforces money.

3. **P2 — `normalizeText` landed on `brief.text` only; `brief.intent`, `brief.facets`, and `slotOverrides` values reach the compiler (and thence ComfyUI node string fields / the hosted prompt body) with control characters and bidi overrides intact.** The invariant — "a node string field is not a place for them" — was implemented for one field and its siblings were not revisited. Same round-K shape, integrity/spoofing-in-records class rather than money.

4. **P2 — committed-vs-charged drift on partial hosted failure.** The ledger commits `cost.totalUsd` (count × unit) pre-call; the result reports `chargedUsd: cost.unitUsd * stills.length`. A 4-up with 2 failures bills 4 in the ledger and receipts 2 in the response. Conservative direction, and distinct from the FILED total-failure double-charge — but any reconciliation of receipts against `atelier.json` will disagree, and nothing in the result says the ledger number differs.

5. **P2 — `tasteMeta` records the wrong law profile.** Judging uses `lawProfile: kit.lawProfileFromKit` (correctly, per the override-bypass fix), but the metadata records the post-override `lawProfile`: `tasteMeta = { ..., lawProfile }`. A caller override to a relaxed profile produces a record claiming relaxed laws judged a render that Swan's full laws actually judged — provenance that lies about which invariant held.

No P0s. The FILED items (defaultCommit run-cap, video direct record, hosted retry double-charge, unscreened brief text to the hosted provider) remain open and I am not re-filing them — note the fourth is a standing **house-rules violation (zero PII to LLMs)** and stays flagged until screened.

## ATTACKS

**Correctivity**
- Probed and clean: client-key namespace `u${userId}:${sha32}` has no colon-collision (hash suffix is hex-only); `rememberKey` bounds the *settled* set, not `store.size`, so in-flight promises can't be evicted mid-coalesce; NaN costs and NaN/absent ceilings are refused (`tryCommit` `E_BAD_COST`/`E_BAD_CAP`), and `Number(undefined) || 0` fail-open is explicitly refused via the `IMAGE_PRICES` absence check; anonymous derived keys get a `solo` nonce; failed-write stranding only counts free runs that actually ran.
- Open beyond the blockers: the async local path deletes its key on batch settle, so a double-click straddling the 60s bucket boundary re-runs and re-commits runs — stated trade, acceptable, but it means "replayed" guarantees are bucket-fragile.
- `runLocalBatch` orphaning on process death (client polls a batchId that died with the process) — `batchStore.mjs` not supplied, cannot judge.

**Security**
- `statusUrl: /api/atelier/compose/stills/${batch.id}` — batchId ownership scoping on the poll route is the IDOR surface I cannot see. `batches.createBatch({ userId, ... })` stores the owner; whether the route *checks* it is unverifiable from this document. If unscoped, batchId enumeration leaks renders. Needs the route file.
- Brief text to the hosted provider unscreened — FILED, standing PII-to-LLM rule violation.
- Coalescing store and ledger are process-local — both stated honestly; the multi-replica N×cap and restart double-charge exposures are documented deployment invariants, not hidden defects.

**Data-truth / schema drift**
- `model` is aliased onto `provider` in the settled-stills shape for contract 383c218e9 — deliberate, documented, fine.
- Blocker 4 (ledger `totalUsd` vs result `chargedUsd`) and blocker 5 (`tasteMeta.lawProfile` mislabel) are the live drift items.
- `slimForReplay` preserves `image: { kind, mime, dropped: true }` shape for clients — good; but a client reading `cost.chargedUsd` off a *replay* gets the original's partial number while the ledger holds the full commit (compounds blocker 4).

## HIGHEST RISK
Blocker 1 — the identity hash that was just fixed is still not an identity. Cheapest de-risk, in order: (a) write the **differential key-coverage test first** — enumerate every req/brief field that reaches `promptsFromBrief` or `promptsFromTaste`, mutate each, assert the derived key changes; this test would have caught `aspect`, `slotOverrides`, and brandKit, and catches the next field someone adds; (b) then the two-line fix: `ax: req.aspect ?? brief?.aspect ?? null` (or normalize the aspect source at the top of `composeStills` so only one field exists) and `so: brief?.slotOverrides ?? null` in the hashed object.

## CONFIDENCE
Could not verify from the document:
- **`composeLaneChoice.mjs`** — whether `gateHosted` throws on `disabled`/ceiling for previews, or whether `chooseLane` reroutes estimates. Blocker 2's severity holds either way (refused preview vs $0 preview), but which branch fires is unknown. Settling evidence: that file, plus one route test of `estimateOnly: true`, hosted, at ceiling and at default budget.
- **`promptSources.mjs`** — whether `intent`/`facets`/`slotOverrides` actually reach compiled prompt text (blockers 1 and 3 assume they do; the deriveKey hash treating `i`/`f` as identity fields strongly implies it). Settling evidence: the compiler's field consumption.
- **Route wiring** — whether the live route passes `commit: atelierLedger().tryCommit` and `usage: atelierLedger().usageToday()`, or falls to `defaultCommit`/`{runs:0}`. The FILED defaultCommit item implies this is genuinely open; if unwired, the fast run-cap gate compares against zero forever — the exact per-request-cap-wearing-a-day's-name defect the ledger header was written about. Settling evidence: the route file.
- **Batch poll authz and `persistStills` asset scoping** — no route/persist code supplied; the IDOR question in ATTACKS is a gap in my review, not a clean bill.
- **Caller behaviour** — whether real clients send top-level `aspect` (the JSDoc contract says they may; if none do today, blocker 1 is latent rather than live — but contracts are the attack surface, not current callers).
- House rules: line counts (154/285/211/≤300) comply — `laneLedger.mjs` sits at exactly 300 with zero headroom; the next docblock added breaches the cap. No MUI/Recharts/palette/touch-target surface in these files; no "yoga/meditation" or credential-language violations present.
