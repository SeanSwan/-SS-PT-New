# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-pr2-r3-packet.md
**Seed:** (none)
**Tokens:** 9190 in / 7912 out · **Cost:** ~$0.0000 · **Wall:** 267.1s · **finish:** stop

---

# Swan Forge — Strangler PR #2 · ROUND 3 FINAL · ox-alpha

Packet: e10daff13 on 886266688 on 69551054b · forge/phase-1

---

## 1. Round-2 blocker scoring (with diff-line evidence)

### Ox W1 — silent plain-string mutation → **FIXED**
Evidence: `codemod-glowbutton.mjs`, maskedRegions hunk (~L66–71):
```js
if (src[j] === q) { mask.fill(1, s, j + 1); i = j + 1; } else { i = s + 1; } // unterminated → not a string
```
Closed same-line strings are now masked; an unterminated quote resumes at `opener+1` (GLM B2 semantics preserved). Locked by three fixtures: `codemod (Ox W1)` (string bytes unchanged, `skipped >= 1`, real tag converted), the `maskedRegions` unit test (apostrophe in `don't` does not mask the line; the template after it stays masked), and `codemod (GLM B2)`. The old comment claiming plain strings were "reported by the residual check instead" is deleted — the false invariant is gone, not just patched over.

### Ox #2 — parity-test diff missing from packet → **FIXED**
Full diff since 69551054b is in the packet. Critically, it shows the parity invariant was **re-homed, not just re-asserted**: GEOMETRY parity now reads `packToken('--sw-btn-height-lg')` etc. against the source-parsed `BUTTON_SIZES` table (pack carries the taste), and a NEW test pins core purity (`core button.css defaults stay CATALOG primitives`). The diff also exposes the weight assertion upgrade (`font-weight:\s*500;` → `packToken('--sw-btn-weight') === '500'`). This is exactly the artifact I demanded in R2.

### Ox #3 — 56px taste literal in core → **FIXED**
Evidence: `css/button.css` L102: `--_height: var(--sw-btn-height-lg, var(--sw-p-target-lg));` — literal gone from core. New catalog primitive `tokens/primitive.css` L72: `--sw-p-target-lg: 56px`. Enforcement upgraded from convention to test: parity test L120 `expect(buttonCss).not.toMatch(/--sw-btn-(height|radius)(-sm|-lg)?,\s*\d/)` — the purity test now fails on any px literal in a size fallback, so this class of bug cannot quietly return. Load-order dependency documented in button.css L17–19.

### Ox #4 — /about receipts → **FIXED**
Receipts present: 4/4 Forge CTAs with per-button detail (Book Consultation primary large 56/14, weight 500, 0.5px tracking, Sora, `sw-btn-enter`; View Programs accent; Start Your Journey accent; Contact Us ghost), plus behavioral click-through `Book Consultation → /contact`. Homepage receipts carried forward unchanged. Count claim now explicitly "read from output."

**Score: 4/4 FIXED.**

---

## 2. Re-attack: remaining SILENT write vectors

I attacked the new masks specifically, since new masking code is new silent-damage surface:

- **Import-mask offset check (GLM B1 fix, ~L172–174):** `importMask[offset]` checks only the match start. Sound — mask regions are contiguous, and the regex shape `import\s+GlowButton\s+from\s+'[^']*'` cannot contain a comment-opener or backtick, so a match cannot straddle a region boundary. Fixture confirms 1 real rewrite, 2 masked-and-reported.
- **Close-tag pairing loop (~L136–137):** `while ((cm = closeRe.exec(src)) !== null && mask[cm.index])` — a masked close is skipped; if *all* closes are masked, `cm` goes null → hard error, file NOT transformed. Loud in both branches. Fixture `Ox W3` locks the comment case.
- **Phantom-string false positive:** two apostrophes in JSX text on one line (`<p>don't … can't</p>`) form a phantom "closed string" that can mask a *real* tag between them. Attacked: consequence is a false SKIP + SKIPPED report + residual GlowButton → **file blocked, human migrates**. Fail-safe (loud), not silent. Accepted.
- **Escape-state in findTagEnd (~L87):** `if (c === '\\') { i++; continue; }` inside quote state — `'C:\\'` now closes correctly; the two lexers agree; fixture locks it.
- **Regex literals — the one true residual hole**, now *documented* in the header ("regex literals carry no lexer state"). A `<GlowButton` inside `/…/` is unmasked and would be rewritten with no residual to catch it. I attacked whether documentation is sufficient: the vector requires a regex literal containing exact tag syntax — rare in app code — and the disclosure converts "silent" to "accepted risk." Full JS lexing is out of scope for a codemod. **Accepted with disclosure; not blocking.** (Cheap future hardening: a post-transform byte-diff warning when a rewritten span's context contains unbalanced `/` delimiters.)
- **Nested-template interpolation** (`` `a ${`x`} …` ``): traced several nesting shapes; the backtick toggle re-syncs and worst cases over-mask (→ skip + report, loud). Theoretical edge only; non-blocking.

No unreported silent write vector remains in the shipped paths.

---

## 3. Judgments

**ADR on light theme (plan §19):** ACCEPT. The reasoning is coherent: core is deliberately skin-agnostic; light theme is a per-site pack concern; ForgeButton self-scopes crystalline-swan so embedded instances stay visually coherent on the two dark public pages. Recorded trade-off the ADR should carry forward: self-scoping means a future *light* site embedding ForgeButton gets a forced-dark button unless it drives the `--sw-btn-*` hooks — that escape hatch should be named in §19 so the constraint reads as designed, not accidental.

**SWA-210:** Adequate as ticketed debt. Screenshot diffs with `fonts.ready` + reduced-motion receipt + BUTTON_SIZES snapshot in the delete-PR DoD is a concrete, verifiable definition of done, and visual parity is currently attested by manual receipts plus source-parsed token parity. Deferral is defensible *because* the DoD is pinned to the delete PR rather than floating.

**Contrast-waiver restatement:** Consistent across commit message and receipts (white on Wing Purple, 4.23:1, owner sean, expires 2026-10-01, pack-scoped, predates this PR). Strictly, 4.23:1 fails AA for normal-weight 14px labels (needs 4.5:1; large-text exemption doesn't apply at 14px/500) — but that is precisely what the standing waiver governs, with owner and expiry. Properly scoped; not this PR's defect. Flag: expiry review well before 2026-10-01.

**70/70 correction:** Credible and creditable. Disclosing that "73" was inferred rather than read — and correcting it — is the right epistemic behavior for a panel process; the current 75/75 is explicitly output-read. No action needed.

---

## 4. Deploy verdict

**Homepage + /about: DEPLOY.** Both pages dark (ADR-consistent), receipts complete, gates green (75/75 forge, drift 0, contrast PASS under standing waiver, theme:check OK, bindings 22/22, build 27.7s), all four R2 blockers closed with enforcement tests, no open silent-write path.

---

## 5. DISSENT (mandatory)

I approve the deploy, and I dissent on two points so they don't dissolve into the merge:

1. **Dissent on `--sw-p-target-lg`'s filing (primitive.css L72).** It sits under the banner "Accessibility floors (NOT themeable — drift-lint R5 enforced)." 56px is *taste*, not an accessibility floor — the floor is 44px, one line above. Filing taste under the a11y-floor banner grants it R5 non-themeability it hasn't earned and pollutes the taxonomy: the next reviewer will treat "56px is immutable" as an a11y claim. Move it out of the floors block (or split the section) in the delete-PR or next touch. Cheap, non-blocking, but wrong is wrong.
2. **Dissent on the load-order fragility being comment-only (button.css L17–19).** Core now silently falls to UA defaults if `primitive.css` isn't loaded first — a runtime misconfiguration with zero error signal. The comment is necessary but not sufficient; a one-line binding test asserting the pack entry imports `primitive.css` before `button.css` would convert this from tribal knowledge to an enforced invariant. Should ride along with SWA-210.

Neither point blocks deploy; both belong on the record so "documented" doesn't quietly become "forgotten."

---

## VERDICT: **APPROVE**

Deploy homepage + /about. Non-blocking follow-ups recorded above (primitive taxonomy fix, load-order binding test, both foldable into SWA-210 or the delete PR).
