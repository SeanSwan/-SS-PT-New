# GLM Consult

**Model:** glm-5.3
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase1-build-packet.md
**Tokens:** 18311 in / 27468 out (reasoning: 22888) | total 45779
**Wall:** 343.8s

---

# Swan Forge Phase 1 — Hostile Review (commit 0a11ec9b2)

Verified independently: 21/21 tests (10 core + 11 instruments), SEMANTIC_NAMES = 32 = contract table count, both packs define all 32, accent ratio recomputes to 4.234:1 (#FFFFFF on #8B5CF6), crystalline muted-on-surface recomputes to 4.63:1, primary label 14.2:1. The basics hold. Now the findings.

---

## 1. Correctness

### Token resolution chains

**[HIGH] `scripts/audit-contrast.mjs` ≈L80 (`parseTokens`) — at-rule blindness is an audit-evasion vector.** The regex hoists every `--sw-*` declaration out of context and last-one-wins (`out[m[1]] = m[2].trim()`). A pack can declare a *failing* `--sw-text-primary` in an always-matching rule, then a *passing* value inside `@media (min-width: 99999px)` / `@supports (unknown-feature)` at the bottom. The audit reads the passing value; the browser renders the failing one. The gate can be defeated by a hostile or careless pack PR with two lines. Fix: reject duplicate declarations of an audited token, or track at-rule context.

**[HIGH] `css/button.css` Variants block, `.sw-btn--accent` (≈L85) vs `scripts/audit-contrast.mjs` PAIRS (≈L60) — the audit measures a token the CSS never reads.** The accent pair chain is `['--sw-btn-accent-text', '--sw-text-inverse']`, but `.sw-btn--accent` hard-codes `--_text: var(--sw-text-inverse)` — there is no `var(--sw-btn-accent-text, …)` hook. Every other variant (primary/gilded/success/danger) honors its `-text` override. Consequence: a future pack can define `--sw-btn-accent-text: #0A0A0F`, pass the audit at 4.5+, and still render white-on-purple at 4.23:1. The waiver currently masks this, but the instrument is measuring a phantom. Either add the hook to the CSS or drop the token from the chain.

**[MED] `css/button.css` `.sw-btn:focus-visible` (States block, ≈L120) — hover glow defeats the focus ring.** `.sw-btn:hover:not([disabled]):not(.is-loading)` is specificity (0,4,0); `.sw-btn:focus-visible` is (0,2,0). With pointer resting on a keyboard-focused button (touchpad laptops are the common case), the hover box-shadow replaces `--sw-focus-shadow` entirely — focus indication disappears exactly when both inputs are active. Compose the ring into the hover shadow or use `outline`.

**[MED] `css/button.css` `.sw-btn::after` (sheen, ≈L60–80) — `transition` declared only inside the hover rule.** Un-hover snaps both opacity and background-position instantly; the "sweep out" is half-implemented. Cosmetic, but it's the signature effect.

**[LOW] `css/button.css` `.sw-btn--accent` — glow dual-pole collapse.** `--_glow-a: var(--sw-glow-b); --_glow-b: var(--sw-glow-b);` makes both sheen stops and both glow layers cyan in crystalline. Header comment (L5) says the accent fill gets the *cyan pole* against purple — as written the dual is gone. Looks like a typo; if intentional, comment it.

**[LOW] `css/modal.css` `.sw-modal--drawer` (≈L60) — RTL motion direction is wrong despite the logical-properties claim.** `translateX(calc(8% * …))` is physical. In RTL the sheet anchors inline-end (left edge) but the closed-state offset pushes it *toward center*, so the opening animation slides in from the wrong side. The file's own header claims logical-properties discipline. Fix: direction-aware value or `dir`-scoped override.

**[LOW] `css/modal.css` `.sw-modal-scrim` / `.sw-modal` — close transition never renders.** `transition` lists opacity/transform only; `visibility` flips instantly on class removal, so the fade-out is invisible (open fade works). Add `visibility` to the transition (discretely animatable with a delay) or accept instant close.

**[LOW] `css/input.css` `.sw-input::placeholder` (≈L45) — muted on elevated-mix ≈ 4.40:1 in crystalline.** Input bg is `color-mix(elevated 88%, transparent)` over surface ≈ #191923; muted #6E8296 computes 4.40:1. WCAG treats placeholder as text. Unaudited (see instrument gap below).

### Headless cores / a11y

**[MED] `core/modal.mjs` — the "focus-trap order is core-owned" invariant is only half-owned.** The core owns the *math* (`nextTrapIndex`, ≈L70) and the key reducer; the *wiring* — `lastFocus` save/restore, initial focus on open, focus-return on close, scroll lock, background inertness — lives in `gallery/index.html` (script block, `open()`/`close()`). Every future binding (React, Vue) re-implements that, which is exactly the fork vector §11.A1 forbids. Also no body scroll-lock and no `inert`/aria-hidden on background: pointer users and virtual-cursor SR users reach background content behind an `aria-modal` dialog.

**[MED] gallery trap — zero-focusable modal leaks Tab to the page.** When `items.length === 0`, `nextTrapIndex` returns −1, the handler does nothing, and Tab walks the background behind an open modal. Fix: give the dialog `tabindex="-1"` and focus it as fallback.

**[LOW] `core/modal.mjs` FOCUSABLE_SELECTOR (≈L55)** omits `[contenteditable]`, `iframe`, `audio[controls]`, `video[controls]`, `summary`, and has no `:not([inert])` / visibility guards. Adequate for the gallery; not for arbitrary dialog content.

**[LOW] `core/button.mjs` `getButtonAttrs` (≈L70) — `type: 'button'` hard-coded.** No path to `type="submit"`; every form in the ecosystem either fights the attr map or can't use the core. For a package whose pitch is "one ultimate version of each component," this is a day-one API hole.

### WCAG math in audit-contrast.mjs

The math itself is correct: `relLuminance` threshold 0.04045 ✓, exponent 2.4 ✓, coefficients ✓, order-independent sort ✓, exact 21:1 and 4.54:1 boundary values confirmed by tests. `hexToRgb` rejecting 4/8-digit hex makes those pairs FAIL loudly (good). Two instrument-trust issues beyond the at-rule hole:

**[MED] PAIRS manifest doesn't cover live renderings.** Not audited: `--sw-text-secondary` on `--sw-bg-elevated` (modal body — passes today at 8.9:1, unwatched), state colors as text (`.sw-field__error` danger-on-surface, `.sw-card__meta` muted), placeholder-on-input-bg (4.40:1 above). Today they pass; the gate doesn't know they exist.

**[LOW] Gradient surfaces unmodeled.** `.sw-card--showcase` top stop in swanguard (ink 30% over white ≈ #B9BCC0) gives secondary text ≈ 4.0:1 if content sits high in the card. Pills/body sit mid-card where it passes, but nothing pins that.

### drift-lint.mjs regexes

False negatives (concrete):
- **[MED] R1 `HEX_RE` misses 4- and 8-digit hex.** `#8B5CF6CC` matches neither the 3- nor 6-digit alternative with the `\b` — alpha hex escapes R1 entirely. Note the asymmetry: the *audit* fails on these, the *linter* is blind.
- **[MED] R3 `REORDER_RE` is case-sensitive (no `/i`).** `FLEX-DIRECTION: ROW-REVERSE` and `ORDER: 2` are valid CSS and sail through.
- **[MED] R3 misses `grid-area` placement.** Only `grid-(row|column)` with a leading digit; `grid-area: 2 / 1` reorders and is unflagged. (`grid-column: span 2` correctly ignored.)
- **[LOW] Per-line model misses multi-line declarations** — `flex-direction:` and `row-reverse` on successive lines evade R3; `import {\n GlowButton\n}` evades R4 entirely (the named binding sits on a line without the `import` prefix).
- **[LOW] `unicode-bidi: bidi-override`, `writing-mode`, `transform: scaleX(-1)`** reorder visually and are out of scope. Acceptable for v0 if documented; they're not.

False positives:
- **[LOW] 3-hex-lookalike ID selectors**: `#bed`, `#dad`, `#ace` as IDs in Forge css/ would flag R1. Contrived; fine.
- **[LOW] Trailing `// .sw-btn { … }` comments on code lines** flag R2 (comment skip only handles line-leading comments). Minor.

No ReDoS: all patterns are linear, no nested quantifiers. Checked.

**[MED] Dead code / gap: `loadExceptions` explicit header-row check** (`pathSub.toLowerCase() === 'path-substring'`) is unreachable — the `R\d` group already rejects the header. Harmless, but signals the ledger parser was never fuzzed against real markdown tables (e.g., a row with a `|` inside a reason field will misparse the expiry column and silently *drop* the suppression — the safe direction, at least).

### Test coverage gaps

- **[MED] The audit's FAIL path has never been exercised.** No fixture pack with a genuine sub-4.5 pair, no missing-name fixture, no UNRESOLVED fixture. The instruments test's own header says "a gate nobody validated detects nothing" — the gate's *failure* behavior is unvalidated; only its passing behavior is.
- **[MED] `SEMANTIC_NAMES` is a hand-duplicated copy of `semantic.contract.md`** with no sync test. The "locked" contract is enforced against a list that can drift from the document that declares the lock. Parse the .md table and assert equality.
- **[LOW] `core.test.mjs`**: no assertion that sizes map to `sw-btn--small/large` classes; unknown size → `medium` untested; `type="button"` untested; `is-full` presence untested (only prefix-checked); `getModalAttrs` class/`data-state` strings untested.
- **[LOW] `WAIVED-FAIL` status is produced but never asserted** — a regression that turns the waiver into a silent pass (or a hard fail) wouldn't be caught.

---

## 2. Contract fidelity

- **32-name completeness: HONORED.** 32 = 32, both packs complete, enforced by audit + test. The duplication concern is above.
- **override→semantic→primitive order: HONORED in CSS** (`var(--sw-btn-bg, var(--sw-color-primary))` pattern throughout) **and modeled in the audit** — except for the accent phantom token (§1 HIGH).
- **Focus-order core-invariance: PARTIALLY HONORED.** Drawer vs dialog never fork behavior (modal.css is geometry-only ✓; same trap handlers ✓), but the invariant is convention + gallery wiring, not core API (§1 MED).
- **sw- namespace: HONORED.** All package CSS/classes are `sw-`/`is-`; `g-*` classes are gallery chrome, not package surface. Test enforces it.
- **44px floors: HONORED in practice, UNENFORCED in law.** Buttons (min-block-size AND min-inline-size), inputs, gallery select all ≥ 44px. But nothing prevents a pack from redefining `--sw-p-target-min` (or `--sw-p-focus-width/offset`) — the contract's "NOT themeable" list has **zero mechanical enforcement**. Neither audit nor linter checks pack redefinition of `--sw-p-*`. This is the cheapest high-value rule to add.
- **Reduced-motion discipline: HONORED, with one clever-but-fragile pattern.** Motion multiplication via `calc(dur * var(--sw-motion))` everywhere ✓; explicit `@media` kill-switches for spinner/sheen/card-lift ✓; `max(var(--sw-motion), 0.001)` guards divide-by-zero ✓. Fragility: **without a pack loaded, `--sw-motion` is undefined → every `transition`/`transform` using it becomes invalid-at-computed-time → silently unset.** Degrades safe (no motion) but the spinner vanishes entirely. Document "components require a pack" or add `--sw-motion: 0` fallback in primitive.css.
- **Logical properties: HONORED except the drawer translateX** (§1) and physical `background-position-x` on the sheen (sweeps left→right in RTL; arguably should mirror).

---

## 3. Security / safety on hostile input

**[MED] `scripts/drift-lint.mjs` `walk()` (≈L33) — no symlink handling, no error handling, no depth cap.** `statSync` follows symlinks: a consumer dir containing a symlink cycle (dist → parent is common in monorepos) = infinite recursion until stack overflow; a single unreadable file (EACCES) crashes the whole linter with a raw stack instead of reporting. For a tool explicitly designed to be pointed at arbitrary `--consumer` dirs, wrap reads in try/catch, use `lstatSync`, cap depth.

**[LOW] gallery JS — clean.** No `innerHTML`, no `eval`, no user-controlled URLs; `packSel.value` comes from fixed options; `textContent` only; clipboard wrapped in try/catch with secure-context failure handling; `SNIPPETS[btn.dataset.copy]` with an unknown key writes `"undefined"` to the clipboard — harmless. The `fetch` path is a hard-coded relative.

**[LOW] `core/modal.mjs` `getModalState.labelId`** flows unvalidated into an attribute value. Safe via `setAttribute`, but if any binding builds HTML strings (React does not, string renderers might), it's an injection sink. Validate as an identifier or document "attribute-map only, never string-concat."

**[LOW] Unbounded `readFileSync`** in both scripts — a multi-GB "pack" eats memory. Dev-tool severity; note only.

---

## 4. The accent-label 4.23:1 waiver

**Verdict: endorse the mechanism's existence, reject its current implementation.** The waiver is loud, tested-adjacent, and prints its reason on every run — that's the right shape. Four attacks land:

1. **It's unowned and non-expiring.** The drift-lint EXCEPTIONS ledger — this same slice's own governance invention — requires owner + expiry + auto-expiry. The contrast waiver requires neither. A brand concession with "FLAGGED FOR SEAN DESIGN REVIEW" and no date is a permanent pass wearing a review costume. This is a double standard inside one package.
2. **It's pack-agnostic.** `waived: true` lives on the PAIR, so every future pack inherits a free sub-4.5 accent pass. swanguard's accent passes at 5.76:1 — proving the bar is meetable — yet a third pack shipping 3.9:1 white-on-purple would be waived silently-in-plain-sight. Scope waivers to `(pack, pair)`.
3. **It waives the wrong number** (§1 HIGH): the chain resolves through `--sw-btn-accent-text`, which the CSS never consumes. The waiver document's measurement target doesn't exist at runtime.
4. **4.5 is correctly the applied bar** — base 16px/600 and large 18px/600 are both under the large-text threshold (needs 18.66px bold or 24px), so no 3:1 escape hatch applies. The waiver is a genuine brand concession, not a math error. Fine — as a *time-boxed* one.

Fix: waiver schema `{ owner, expiry, packs: [...] }` mirroring the ledger; expired waiver = hard fail.

---

## 5. Missing vs. what this slice claimed

- **[HIGH] "Gallery as test gate with ?capture=1 determinism" — the hook shipped, the gate didn't.** No Playwright config, no spec file, no screenshot harness, nothing in `package.json` beyond the manual `npx serve` instruction in an HTML comment. The packet's "Playwright smoke… verified" was a human run. `?capture=1` works (inline `--sw-motion: 0` + the `[data-mode="capture"]` kill-switch is correctly `!important` and correctly overrides the pack's media-query value via inline specificity), but determinism infrastructure that exists only when someone remembers to run it is not a gate.
- **[MED] R2/R4 are inert in the gate.** `npm run lint:drift` (what `gate` runs) passes no `--consumer` dirs, so the consumer-facing rules — including the adoption tracker the slice touts — execute against zero files. "drift-lint 0 findings" is trivially true: the only rules that ran were R1/R3 over six clean files.
- **[MED] The contract's "cross-product" claim.** `semantic.contract.md` says the audit runs "the (pack × component-override) cross-product"; it actually runs a hand-maintained PAIRS list. The accent phantom proves manifest/CSS drift already happened once.
- **[LOW]** No `./semantic.contract.md` export; no core API for modal open/close transitions (focus save/restore) despite the header claiming the core "owns open/close state machine" — it owns a props normalizer.

---

## VERDICT: **REVISE**

Nothing here is REJECT-grade: additive package, nothing imports it, tests are real, the WCAG math is right, and the design (motion multiplier, exception ledger, instrument self-tests) is genuinely above bar. But the contrast gate can be evaded via at-rule placement, it audits a token the button never renders, and the waiver is an unowned permanent pass — the gate is the product of this slice, and the gate has holes.

### Ranked fixes

1. **Audit at-rule awareness** (`audit-contrast.mjs` parseTokens): reject or context-track duplicate/conditional declarations of audited tokens. Closes the evasion hole. (HIGH)
2. **Accent chain/CSS mismatch**: add `var(--sw-btn-accent-text, var(--sw-text-inverse))` to `.sw-btn--accent` or drop the token from the pair. One line either way. (HIGH)
3. **Waiver governance**: `{owner, expiry, packs[]}` on waived pairs; expired = exit 2. Reuse the ledger philosophy the slice already invented. (HIGH)
4. **Enforce the non-themeable list**: lint rule — packs may not declare `--sw-p-target-min`, `--sw-p-focus-width`, `--sw-p-focus-offset`. Five lines in drift-lint. (MED, cheap)
5. **Ship the capture gate**: a Playwright spec (pack × component matrix, trap/Escape, `?capture=1`) wired into `gate`, or re-label the gallery as preview-only. (MED)
6. **`walk()` hardening**: `lstatSync`, try/catch per file, depth cap. (MED)
7. **Lint regexes**: R1 cover 4/8-digit hex; R3 add `/i` + `grid-area`; document (or fix) the line-oriented blind spots for multiline declarations/imports. (MED)
8. **Core modal API for open/close**: focus save/restore/initial-focus/zero-focusable-fallback (`tabindex="-1"` on dialog) + scroll lock, so §11.A1 is enforced by API, not by gallery example. (MED)
9. **PAIRS manifest expansion**: secondary-on-elevated, state-color-as-text, placeholder pairing; plus a fixture test that exercises genuine FAIL / UNRESOLVED / missing-name paths and asserts `WAIVED-FAIL`. (MED)
10. **`SEMANTIC_NAMES` ↔ contract.md sync test**; drawer RTL translateX; hover-vs-focus ring composition; `type="submit"` path. (LOW, batch)

Fixes 1–5 before merge; 6–10 as the immediate follow-up commit.
