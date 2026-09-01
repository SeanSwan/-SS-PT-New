# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r11.md
**Tokens:** 14051 in / 22924 out (reasoning: 21277) | total 36975
**Wall:** 338.3s

---

## VERDICT
REVISE — one P1 the nonce fix sailed past: the derived key hashes a *subset* of the request, so two genuinely different requests from the same owner in one 60s bucket coalesce, and the second is silently served the first's output as a "replay."

## BLOCKERS

1. **P1 — `deriveKey` identity omits documented, output-determining request fields; different requests coalesce and the second returns the first's result.**
   - **Scenario A (taste / top-level `aspect`):** authenticated user, `promptSource: 'taste'`, no `brief.text` (taste supplies subjects, so the brief is usually empty), `req.aspect: '16:9'` then `'9:16'`, within 60s. The taste path renders with `aspect: brief.aspect || req.aspect` (composeStills.mjs, `promptsFromTaste` call), but `deriveKey` hashes only `a: brief?.aspect ?? ''` — top-level `aspect` is not destructured and not hashed. Both calls derive the identical key → second hits `store.has(key)` → returns the first's batch with `replayed: true`. The 9:16 render never runs; the client polls a 16:9 batch. `aspect` is in the function's own `@param` list, so this is documented surface.
   - **Scenario B (taste / `cinematic`, `mode`):** both are passed to `promptsFromTaste({ ..., cinematic: !!req.cinematic, mode: req.mode, ... })` and appear in the `@param` doc, and neither appears anywhere in the hashed object `{u,w,ps,ln,model,count,b,i,a,f,s,bucket,solo}`. A `cinematic: false` then `true` pair inside the bucket replays the non-cinematic result.
   - **Scenario C (brief / `slotOverrides`, hosted):** same `brief.text`, `slotOverrides: { negative: 'X' }` vs `{ negative: 'Y' }` → same key → the second caller receives X's images with the wrong negative, on the lane that charges.
   - **Evidence:** composeLimits.mjs `deriveKey` (~lines 139–147): destructure list `{ brief, promptSource, lane, model, count, seed, workspaceId, userId }` and hash body — no aspect-fallback, `cinematic`, `mode`, `slotOverrides`, or resolved `lawProfile`. composeStills.mjs key site (~line 96): `deriveKey({ ...req, brief, promptSource, lane, model, count }, now)` — the `...req` spread is decorative; the destructure discards the differing fields. composeStills.mjs `promptsFromTaste` call (~line 200) and `promptsFromBrief` `slotOverrides`/`lawProfileDrop` (~line 210) prove those fields change output.
   - This is **not** the round-J bug (ownership — two callers, one namespace) and not its nonce fix; it is **dimensionality** — one owner, two different requests, one key. The file's own spec ("has this *exact* request already been answered?") convicts it, and `normalizeText`'s fidelity rationale shows the authors already treat key-exactness as a correctness property.

2. **P2 — `estimateOnly` is refused by the run cap.** Scenario: `usage.runs` at cap (50/50), `estimateOnly: true`, `count: 4` → GATE 2 sits *above* the `if (req.estimateOnly)` early-return (composeStills.mjs, GATE 2 → reservation skip → `chooseLane` → estimate return), so a pricing question that generates nothing and costs nothing throws `E_RUN_CAP`. Same family as the round-J `'billed &&'` fix — free work refused by a budget it never draws from. I flag it knowing the counter-argument (the refusal does tell the operator they're capped); the round-J rationale ("a replay costs no GPU and no money, so nothing it could breach applies to it") applies verbatim to estimates.

## ATTACKS
- **Correctness:** Blocker 1 is the wrong-output class — coalescing logic that under-distinguishes requests. Same family, lower stakes: `req.async` and `req.persist` are also unhashed (a sync request can replay an async 202). Everything else I probed held: the `has`→`set` window is await-free (coalescing race genuinely closed), the settled/derived eviction loops only touch post-settle entries, `releaseBytes` is symmetric with the increment, and the error path deletes the reservation before `settle.rej`.
- **Security:** no new deputy path — `assertKeyHasOwner` plus the nonce close ownership on both key paths, and client keys (`u…` prefix) cannot collide with derived keys (40-hex). Unverifiable rather than filed: `batchId` guessability behind `statusUrl` (batchStore.mjs not shown) and route-level authz.
- **Data-truth:** `tasteMeta` records the **merged** `lawProfile` while taste judging is gated and run on `kit.lawProfileFromKit` — the response can report a laxer profile than was enforced (minor drift, P3). The `model`-as-alias-of-`provider` shape and the slimmed replay's preserved `image: {kind, mime, dropped}` shape are both documented and consistent.

## HIGHEST RISK
Blocker 1. Flipping variants inside a minute is not an edge case — it is the *normal* taste workflow, and because taste briefs carry no text, the unhashed fields (`aspect`, `cinematic`, `mode`) are frequently the **only** differing dimension, making the collision the common path, not the exotic one. Cheapest de-risk: one line in `deriveKey`'s hashed object — add `aa: req.aspect ?? null, c: !!cinematic, m: req.mode ?? null, so: brief?.slotOverrides ?? null, lp: <resolved profile> ?? null` — plus a regression test asserting two same-owner requests in one bucket differing only in `mode` do **not** replay. Keys are opaque, so no client contract changes.

## CONFIDENCE
Could not verify from the document: (a) whether the live routes actually expose `aspect`/`cinematic`/`mode`/`slotOverrides` to callers — the service's own JSDoc lists them, and a direct `composeStills` probe confirms the defect regardless of route surface; (b) `promptSources.mjs` internals — whether `mode`/`cinematic` materially change the prompts is inferred from parameterization; two direct generations with differing `mode` and compared outputs/tasteSeeds would settle it; (c) `composeLaneChoice.gateHosted`, `batchStore.mjs` (IDOR surface), and the production wiring of `usage`/`commit` — none shown; (d) whether a test pins `deriveKey`'s exact field list (a golden-hash test would need updating — cheap, but should be known before the one-liner lands). Line numbers are approximate; the document supplies per-file line counts, not offsets. House rules: no violations in these four files — ≤300-line cap met (note `laneLedger.mjs` sits at exactly 300/300, zero headroom for the next wiring slice), no PII-to-LLM beyond the already-filed backlog item, no prohibited language. The two probe-disproven items and four filed items were left untouched.
