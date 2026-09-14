# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-pr2-r2-packet.md
**Seed:** (none)
**Tokens:** 12104 in / 11392 out · **Cost:** ~$0.0000 · **Wall:** 383.2s · **finish:** stop

---

# OX ALPHA — ROUND 2 REVIEW · Swan Forge Strangler PR #2 · revision 886266688

## 0. Anchor — restating my 7 round-1 fixes so scoring is auditable

1. **Geometry authority**: core `button.css` must default to catalog primitives; GlowButton's taste table belongs in the pack, behind hooks.
2. **Spread-prop blind spot** (Ox 1a): `{...x}` bypasses the prop audit; must be surfaced.
3. **Masked-region rewriting** (Ox 1b): matches inside template literals/comments must never be rewritten.
4. **Import-hijack guard** (Ox 1c): only legacy `ui/buttons/GlowButton` imports may be rewritten.
5. **`children ?? text` contract break** (Ox 1d): restore `||`.
6. **minHeight strip precision** (co-owned w/ GLM 1e): digit-anchored, `440` survives.
7. **Ledger honesty**: the deferred OptimizedSignupModal T1 surface must be in EXCEPTIONS.md, not invisible.

---

## 1. Scores

| # | Fix | Score | Evidence |
|---|-----|-------|----------|
| 1 | Geometry core→pack | **PARTIAL** | `css/button.css`: `--_radius: var(--sw-btn-radius, var(--sw-p-radius-md))`, `--_height: … var(--sw-p-target-min)`, `font-weight: var(--sw-btn-weight, 600)`, `letter-spacing: var(--sw-btn-tracking, 0)` — correct. Pack file adds all 8 `--sw-btn-*` keys; `forgeTheme.generated.ts` +8; receipts confirm live 500/0.5px. **But** `.sw-btn--large` still reads `--_height: var(--sw-btn-height-lg, 56px)` — a literal taste value left in core *outside* the hook system. Every sibling fell back to a primitive; this one didn't. That single literal falsifies "core defaults are catalog primitives again," and it proves the claimed purity test does **not** scan for raw px literals in size positions (see §2, B2/B3). |
| 2 | Spread props | **FIXED** | `audit()` opens with `if (/\{\s*\.\.\./.test(attrs)) report.notes.push('spread props … BYPASSED …')`; fixture `codemod (Ox 1a)` locks it. |
| 3 | Masked regions | **FIXED** | `maskedRegions()` exported; `rewriteTags` checks `mask[start]` and reports skips; fixture asserts `skipped.length === 3` with template/block/line cases. New holes found anyway — §2. |
| 4 | Import-hijack | **FIXED** | `LEGACY_IMPORT = /(?:^|\/)ui\/buttons\/GlowButton(?:\.tsx?)?$/`; non-matching spec returned untouched + noted; fixture locks it. Failure direction is fail-safe (untouched → residual → file blocked). |
| 5 | `children \|\| text` | **FIXED** | `ForgeButton.tsx`: `{children \|\| text /* \|\| not ?? … */}` with the rationale inlined at the site. |
| 6 | minHeight digit anchor | **FIXED** | `.replace(/minHeight:\s*(['"]?)44(?:px)?\1(?![\d.])\s*,?\s*/g, '')` — backreference enforces quote pairing, lookahead kills `440`/`44.5`; fixture locks `minHeight: 440` survival. |
| 7 | EXCEPTIONS row | **FIXED** | Row present: R4, owner, expiry 2026-11-23, reason naming the Modal×Field×Auth coupling, second-party review explicitly `PENDING` with a filed request. |

**Aggregate: 5 FIXED, 2 PARTIAL.** Both partials are evidence/integrity failures, not effort failures.

---

## 2. Attacking the new scanner — wrong-but-COMPILING outputs

The residual invariant is genuinely good engineering: it converts most mis-pairings into hard blocks. But it has an asymmetry, and the holes live exactly where the backstop can't see.

- **W1 (BLOCKING) — plain-string mutation, no backstop.** `maskedRegions` deliberately does *not* mask `'…'`/`"…"` strings ("JSX text uses apostrophes freely"). Consequence: `const help = 'Try <GlowButton text="Hi" />'` — `openRe` matches, `findTagEnd` finds a well-formed tag, the string is **rewritten to contain `<ForgeButton …>`**. Post-transform, the file contains zero `GlowButton` identifiers → `residual = 0` → **file written, exit 0, corrupted string, compiles fine**. This directly violates the tool's own header charter ("Reports (never silently rewrites)"). The same applies to the import rewrite regex running unmasked over the whole source (an `import GlowButton from …` inside a codegen template literal gets swapped). Fix: compute a *quoted-string* region set separate from the mask; any open-tag or import match inside one → skip + report, never rewrite. Add the fixture. The apostrophe-in-JSX-text fear is misplaced — a scanner that only enters string mode *after* a quote char never phantom-masks JSX text like `Don't`.
- **W2 — regex literals unmasked.** `maskedRegions` knows `/…/` only as `//` or `/*`. A regex literal containing `<GlowButton` is rewritten → corrupt regex, compiles, wrong behavior. Low probability, same fix family as W1.
- **W3 — close-tag rename inside strings/comments.** `closeRe` results are not mask-checked. A `'</GlowButton>'` inside children-string gets renamed and the *real* close is orphaned — but the orphan leaves a residual → file blocked. **Fail-safe**, so not blocking; noting it because the fix is one `mask[cm.index]` check.
- **W4 — nested-template desync in `findTagEnd`.** Backtick-as-quote consumes `${…}` without depth tracking; a nested template inside an interpolation can drop depth negative. Outcomes are mostly hard-error (fail-safe); a mis-termination requires an improbable brace sequence. Accept for now; note it in the script header as a known limit.
- **W5 — minHeight quote-mismatch edge.** `minHeight: '44"` (mismatched quotes) fails the `\1` backreference → floor hack survives silently → the exact 48→44 regression PR #2 caught, resurrected per-site. Formatting this broken is rare; nit.

Net: the scanner went from "silently breaks builds" to "blocks loudly in ~90% of hostile inputs." W1 is the remaining silent-write vector and it's cheap to close.

---

## 3. Disproven items and deferrals — legitimate or dodge?

**Disproven (all five): LEGITIMATE.** Each refutation is specific and checkable-shaped (vite.config exports only `@`; 0 `import.meta.glob` uses; gen-backlog routes missing rows to MIGRATE, never archive; `LEGACY_VARIANT_MAP` aliases cosmic→primary; T0 header appears once). Disproving a reviewer's claim with evidence instead of defensively coding against it is the correct behavior. One process ask: cite file:line in the next packet so round 3 never relitigates these.

**Deferrals:**

- **BUTTON_SIZES snapshot → delete-PR: legitimate, but time-box it.** The legacy file as live anchor is coherent *during* the strangler window. My dissent (§DISSENT) is that the delete-PR is the highest-churn, lowest-discipline moment in the whole migration — exactly when "add the test" gets skipped. Require the snapshot as a listed task *inside* the delete-PR's definition-of-done, with the EXCEPTIONS-style expiry discipline.
- **Playwright screenshot diffs: half-dodge.** The substitution (computed-style receipts + click-through) is *stronger* than pixels for token conformance and honestly reported — the 46px readings explained as mid-animation `scale(0.95)` with offsetHeight 48 is exactly the receipt quality I want. But "fonts time out in preview" is an environmental bug with a known fix (`await document.fonts.ready`, or block the font request in the Playwright config). A deferral without a ticket and a named fix becomes permanent by inertia. Condition: file the ticket, reference it here, land screenshots before the GlowButton delete-PR (where pixel truth matters most).
- **Light theme: dodge-shaped as presented.** The *decision* may be sound — packs as per-site skins, not per-user-theme, is a defensible architecture. But "disclosed, not receipted" is not a state, it's a placeholder. Nothing written down prevents a future light-mode page on the same site from inheriting 0.5px tracking and dark-tuned glows. Required: a short ADR (D-decision record) stating pack scope, which sites consume crystalline-swan, and what happens when one ships light mode — or a light-theme smoke receipt. Non-blocking for this deploy if home+about are dark; blocking for the pack's catalog claim.
- **Archive PR for 9 UNREACHABLE files: legitimate.** Rule 77 Tier-2 requiring Sean's approval is a real gate; proposing rather than self-serving is correct.
- **Allow-tag ratchet → SWA-206: legitimate.** Ticketed with expiry; standard ratchet hygiene. Verify the ticket exists at merge.

---

## 4. Did moving geometry to the crystalline pack restore rollback inertness and catalog authority?

**Substantially yes — one leak.** Rollback inertness: revert/delete the pack → every channel (`height`, `radius`, `weight`, `tracking`, glows, text) falls back to primitives. That's inert. Catalog authority: primitives own the defaults; the pack is pure consumer. The transitional authority model is also right: the parity test's ground truth is the legacy GlowButton source *during* migration (fidelity), flipping to the pack at delete-PR — document that flip explicitly.

The leak: **`--sw-btn-height-lg, 56px`** (§1, Fix 1). One taste literal squatting in core means "revert the pack" leaves large buttons at 56px — not inert, and proof the purity test has a blind spot. Either route it through a hook/primitive or write a one-line exemption comment explaining why no primitive exists — and make the purity test enforce whichever answer.

---

## 5. Deploy verdict reasoning — public homepage + about

Homepage: gates green (73/73, build 20.9s, theme:check OK, bindings 22/22), ten CTA receipts with geometry/weight/tracking/font/focus-ring/hover numbers, click-through verified, provenance 8/9 byte-for-byte with the one hand edit disclosed. Contrast PASS is under a **standing waiver** — acceptable only because it predates this PR; restate its scope in the merge notes.

**About is the gap.** `About.V3.tsx` changed 12 lines in this commit and the receipts section covers `/` only. The panel's own bar — no receipt, no deploy claim — applies to the page the verdict names. Homepage is deploy-ready on evidence; about currently rides on green gates alone.

---

## DISSENT (mandatory)

- **I dissent from my own round-1 caution on `import.meta.glob` being fully closed.** The disproval is correct for today's tree, but nothing prevents a future contributor from reintroducing dynamic resolution that the codemod's file-list workflow can't see. I'm not asking for code — I'm noting that "0 uses" is a snapshot, not a guard, and I'd support a one-line drift-lint rule if the panel wants it. I rank it below everything blocking.
- **I dissent from the packet's framing of the parity-test work as done.** Claiming "parity test re-pointed + new purity test" while omitting the test file's diff from the packet is the same evidence-withholding pattern round 1 punished. Tests I can't read are tests I can't credit.
- **I dissent from deferring the BUTTON_SIZES snapshot to the delete-PR** (contrary to my §3 "legitimate"): deferrals gravitate to the busiest possible future moment. Pin it in the delete-PR's DoD now.
- **I partially dissent from myself on W1's severity**: the codemod is not on the deploy critical path for *this* PR, so one could argue nit. I keep it blocking because shipping a tool whose header promises "never silently rewrites" while knowing a silent-write vector exists is a charter violation, and charter violations compound.

---

## VERDICT: **REVISE**

### BLOCKING (file + line)
1. **W1 silent string mutation** — `packages/swan-forge/scripts/codemod-glowbutton.mjs`, `maskedRegions()` contract comment (~L48–52) and `rewriteTags` open-match handling (~L112–118): add quoted-string region detection; matches inside strings → skip + report, never rewrite; fixture for `<GlowButton` inside a `'…'` string asserting `skipped ≥ 1` and bytes unchanged.
2. **Missing test diff** — `frontend/src/components/ui/forge/ForgeButton.parity.test.tsx`: include the full diff in the round-3 packet; show the purity test's assertions and confirm whether it would catch a raw px literal in a size fallback.
3. **Taste literal in core** — `packages/swan-forge/css/button.css`, `.sw-btn--large` (~L99): `var(--sw-btn-height-lg, 56px)` → route through a hook/primitive or inline exempting comment; purity test updated to match.
4. **About receipts** — `frontend/src/pages/about/About.V3.tsx`: run the same computed-style + click-through pass on `/about`, or narrow the deploy claim to homepage only.

### NITS (non-blocking)
- W2 regex-literal masking, W3 close-mask check, W4 nested-template header note, W5 minHeight quote-mismatch — bundle into the W1 fix.
- Screenshot deferral: file the ticket + `document.fonts.ready` plan; land before delete-PR.
- Light theme: ADR for the D-decision (pack = per-site scope) or light-theme smoke receipt.
- EXCEPTIONS row: second-party review must complete (or the row expires) before/at merge.
- Restate the contrast waiver's scope in merge notes.

**Deploy recommendation:** homepage is shippable the moment items 2–4 land (they're evidence, not code); about ships with its receipts. Item 1 gates the codemod, not the pages — but it gates *this PR*.
