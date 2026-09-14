# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase1-build-packet.md
**Seed:** (none)
**Tokens:** 18393 in / 13313 out · **Cost:** ~$0.0000 · **Wall:** 482.0s · **finish:** stop

---

# Swan Forge Phase 1 — Hostile Build Review

Verdict up front: **REVISE**. The architecture is sound and the instrument-validation instinct is right, but the contrast gate has two holes that let a hostile or merely sloppy pack **pass while shipping broken contrast**, the waiver mechanism is weaker than the governance it sits beside, and at least one claimed deliverable (Playwright smoke) is not in the packet.

---

## 1. Correctness

### 1.1 audit-contrast.mjs — the gate can be silently defeated

**F1 (critical). Waived pairs mask unparseable colors.**
`scripts/audit-contrast.mjs`, `auditPack()`:
```js
const ratio = contrastRatio(fg, bg);
const pass = ratio !== null && ratio >= pair.min;
results.push({ ..., status: pass ? 'PASS' : pair.waived ? 'WAIVED-FAIL' : 'FAIL' });
```
If a resolved value starts with `#` but is garbage (`#GGGGGG`, truncated hex), `contrastRatio` returns `null`, `pass` is `false`, and the status becomes **`WAIVED-FAIL`** — not `FAIL`/`UNRESOLVED`. The CLI only increments `failures` for `FAIL`/`UNRESOLVED`, so a corrupted `--sw-color-accent` on the accent pair yields **AUDIT PASS**. The waiver doesn't just excuse a known 4.23:1; it excuses *instrument failure*. Change the ternary: `pair.waived && ratio !== null ? 'WAIVED-FAIL' : 'FAIL'`.

**F2 (critical). `parseTokens()` does not strip comments.**
`scripts/audit-contrast.mjs`, `parseTokens()`: the regex `(--sw-[\w-]+)\s*:\s*([^;]+);` runs over raw file text. A pack can satisfy the **completeness gate** with tokens that exist only inside `/* … */` and are never applied at runtime — e.g. commenting out a failing `--sw-text-muted` declaration makes `missing` come back empty while the live CSS falls through to nothing. Drift-lint skips comment *lines*; the audit strips nothing. This is both an accidental-false-pass and a hostile-input vector. Strip block/line comments before matching.

**F3 (high). Pair coverage has real holes — at least one is a live marginal failure.**
`scripts/audit-contrast.mjs`, `PAIRS[]`. Computing against the shipped packs:
- `--sw-text-muted` (#6E8296) on `--sw-bg-elevated` (#1A1A24) in crystalline-swan ≈ **4.45:1 — below 4.5**. This exact pairing ships: `.sw-input::placeholder` (css/input.css) sits on `color-mix(--sw-bg-elevated 88%, transparent)`, and `.sw-card__metric-label`/`.sw-card__meta` sit near-elevated contexts. The pair list audits muted/**surface** only. Whether the composited input background squeaks past 4.5 is luck, not gating.
- No `text-secondary`/`bg-base`, no `muted`/`bg-base`, no success/danger/warning/gold fill-vs-page pairs, nothing for `--sw-bg-overlay` (unauditable as rgba — see F4).
- `.sw-card--showcase` (css/card.css) renders body text over a **gradient** mixing `--sw-color-primary` 30% and `--sw-color-accent` 12% into surface. The audit models flat `bg-surface` only. Top-of-card text contrast is ungated.

**F4 (medium). `resolveChain()` only accepts `#`-prefixed values.**
`scripts/audit-contrast.mjs`, `resolveChain()`: any legitimate pack using `rgb()`, `oklch()`, or a `var()` indirection for a color token gets `UNRESOLVED` → hard fail. Fail-closed is the right bias, but the error message says "UNRESOLVED" with no hint why, and there is no supported non-hex path at all. Document it or support `rgb()/oklch()`; right now the format constraint is implicit.

**F5 (low). WCAG math itself: correct.** I verified `relLuminance`, the 0.04045 cutover, channel ordering, sort-descending ratio, and spot values (black/white 21, #767676 ≈ 4.54, accent #8B5CF6 vs white = 4.233 — the waiver's claimed number is honest). No math findings.

### 1.2 drift-lint.mjs — regexes leak in both directions

**F6 (high). `REORDER_RE` is case-sensitive and line-bound.**
`scripts/drift-lint.mjs`, REORDER_RE definition + `lintText()`. CSS properties/values are ASCII-case-insensitive: `FLEX-DIRECTION: ROW-REVERSE;` in a pack sails through. Multi-line declarations (`order:\n  2;`) sail through because linting is per-line. `direction: ltr` in an RTL document is equally a visual-reorder and is not flagged (only `rtl`). `grid-area` reordering is not covered at all.

**F7 (medium). Comment skipping is naive.**
`lintText()` skips only lines whose trimmed start is `*`, `//`, or `/*`. Consequences: (a) continuation lines of block comments that don't begin with `*` (e.g. ` see GlowButton import */`) produce false-positive R4/R1 hits — your own test only proves the leading-`*` case; (b) trailing comments (`color: #FF0000; /* brand */`) fire R1. Both directions wrong.

**F8 (medium). `SW_OVERRIDE_RE` is line-bound too.** A consumer selector wrapped across lines (`.sw-btn,\n.sw-card {`) evades R2 on the first line. Also matches prose/template-literal mentions of `.sw-x {` in TSX strings — report-only mode absorbs this today, but it will pollute enforcement mode later.

**F9 (medium). `walk()` has no symlink-cycle protection and no error handling.**
`scripts/drift-lint.mjs`, `walk()`: `statSync` follows symlinks; a symlinked directory cycle recurses until stack overflow. `readdirSync`/`readFileSync` on a permission-denied entry throws and kills the whole run with an uncaught exception — a hostile or merely messy consumer tree turns the linter into a crasher. Skip symlinks (`lstatSync` + `isSymbolicLink`), wrap per-entry IO in try/catch, and consider a file-size cap.

**F10 (low). Exception suppression is substring-anywhere.**
CLI block: `v.path.includes(e.pathSub)` — a ledger row for `Legacy.css` suppresses findings in `src/deep/nested/Legacy.css.backup/util.ts`. Scope to path-segment or suffix matching. Also `loadExceptions` parses expiry with `new Date('YYYY-MM-DD')` (UTC) against a local `today` — one-day boundary skew. Cosmetic but free to fix.

### 1.3 Cores

**F11 (medium). `FOCUSABLE_SELECTOR` is incomplete.**
`core/modal.mjs`: misses `[contenteditable]:not([contenteditable="false"])`, `iframe`, `audio[controls]`/`video[controls]`, `details > summary`, `area[href]`. Includes `[tabindex]:not([tabindex="-1"])`, which wrongly admits positive-tabindex decorations and disabled custom widgets. Since this constant is the declared "single source of truth," the gaps propagate to every binding.

**F12 (low). `nextTrapIndex` stale-index behavior.** `currentIndex >= count` (focused element removed from DOM mid-session) wraps modulo into an arbitrary position rather than clamping. Untested edge.

**F13 (low). "Core-invariant focus order" is aspirational.** `core/modal.mjs` owns the selector and the pure math, but trap *execution*, focus save/restore, and inert-background handling all live in the gallery script (gallery/index.html `<script type="module">`). Every future binding reimplements the wiring — exactly the fork surface §11.A1 forbids. Ship a reference `createFocusTrap(container)` in the core or rename the claim.

**F14 (info). Button core is clean.** `getButtonAttrs` loading/disabled semantics (aria-disabled + aria-busy, native disabled otherwise) are correct; `canActivate` guards re-entry; unknown variants never throw. One nit: `type: 'button'` is forced with no documented escape hatch for submit use-cases.

### 1.4 Test coverage gaps

**F15 (high). Instruments are only tested on their happy path.** `test/instruments.test.mjs` proves good packs pass and rules fire on fixtures — but there is **zero** test that the audit *fails* on a bad pack, that `WAIVED-FAIL` vs `FAIL` classification is right, or that malformed hex fails closed. F1 would have been caught by one fixture. The file's own epigraph ("a gate nobody validated detects nothing") is half-honored.

**F16 (medium).** No test pins `SEMANTIC_NAMES` (audit-contrast.mjs) to `tokens/semantic.contract.md` — the 32-name list is hand-duplicated; the additive-only lock lives in a markdown file the machine never reads. Parse the table in the test.

**F17 (medium).** Untested: `hexToRgb` 8-digit rejection, `contrastRatio` null propagation, `getButtonAttrs(disabled+loading)`, `nextTrapIndex(currentIndex ≥ count)`, drift-lint CLI arg handling, `loadExceptions` integration with the real `EXCEPTIONS.md`.

---

## 2. Contract fidelity

**F18 (pass, verified).** 32-name completeness: I counted `SEMANTIC_NAMES` = 32 and both packs declare all 32; the audit enforces it per-pack. Override→semantic→primitive is implemented via `var()` fallback chains in css/button.css (`--sw-btn-*` → semantic → primitive) and matches §11.A4. `sw-` namespace holds for all classes and custom properties; `is-*` state classes are the documented exception and the test enforces the boundary.

**F19 (medium). Drawer transform is physical, violating the logical-properties law.**
`css/modal.css`, `.sw-modal--drawer`: `transform: translateX(calc(8% * var(--sw-motion)))`. The drawer anchors to `inset-inline-end`; in RTL that is the *left* edge, and positive `translateX` pushes it **into** the viewport instead of off it — the closed drawer peeks on-screen in RTL. Everything else in the sheet is logical; this one property breaks the §11 law. Use a logical-safe technique (e.g. translate along inline axis via `translate` with `calc` on a direction-aware custom property, or hide with `visibility`/clip).

**F20 (low). No enforcement of pack presence.** Semantic tokens have no primitive fallbacks (`--sw-color-primary` etc.), so a consumer that forgets a pack gets guaranteed-invalid → initial values (black-on-black buttons). Nothing fails loudly. A `@supports not (…)` guard or a documented required-attribute check belongs in the skin layer or docs.

**F21 (info). `--sw-color-warning` is dead at v1 lock.** No component consumes it, and the additive-only law means it's frozen forever. Either wire it (form validation states are the obvious home — `.sw-field__error` exists, no warning equivalent) or don't lock it.

**F22 (pass with nit). Reduced-motion discipline is genuinely good** — multiplier pattern, pack-level media queries, spinner-to-dot fallback, capture-mode double-cover (`--sw-motion: 0` + `animation: none !important`). Nit: `.sw-modal` closes with `visibility:hidden` flipping instantly (visibility isn't in the transition list), so the close animation never plays — cosmetic, but it also means the scrim click-through window differs from the visual state.

---

## 3. Security / safety

**F23 (medium).** Gallery JS is clean: no innerHTML, no eval, clipboard failures caught, fetch is same-origin package-relative. Two nits: the pack-starter `fetch()` sits *outside* its try/catch (gallery/index.html copy-starter handler) — a failed fetch is an unhandled rejection; and `SNIPPETS[btn.dataset.copy]` yields `undefined` → `"undefined"` copied for an unknown key. Trivial hardening.

**F24 (covered above).** Hostile-input surface is concentrated in drift-lint's walker (F9) and the audit's comment-blind parser (F2). The audit regexes themselves are backtrack-safe.

---

## 4. The accent-label 4.23:1 waiver — attack, with a repair

The number is honest (I reproduced 4.233:1 for #FFFFFF on #8B5CF6), the printing is loud, and the flag-for-review note is present. But the **mechanism** is the weakest governance in the packet:

1. **It lives in code, not in the ledger.** `EXCEPTIONS.md` rows carry owner + expiry and auto-expire. Contrast waivers (`PAIRS[].waived`) are immortal booleans with a prose string. Six months from now the PAIRS array accumulates `waived: true` entries nobody reviews — the exact silent-cap failure mode the design claims to prevent.
2. **It masks instrument failure** (F1) — the waiver currently excuses *unparseable* values, not just low ratios.
3. **It's blanket across packs** — swanguard-editorial's accent (#0E5FD8) vs white is ~5.76:1 and needs no waiver; only crystalline does. Fine today, but the waiver isn't scoped to the offending pack.
4. **Substantively, 4.23:1 is a real AA fail**: button labels render at 1rem/600 — below the 18.66px-bold large-text threshold — so 3:1 large-text relief does not apply. "Shipped original did it" is provenance, not compliance.

**Endorse the concept (flagged, loud, non-blocking deviation with named owner), reject the implementation.** Move it into a governed ledger with expiry, scope it per-pack, fix F1 so waivers can't mask null ratios, and put a dated remediation on the table: darken crystalline `--sw-color-accent` a step (white needs fg luminance ≤ ~0.183; #8B5CF6 is 0.198 — a small step gets there) or bump button label size/weight into large-text territory.

---

## 5. Missing vs. claimed

**F25 (high). The Playwright smoke does not exist in this packet.** No playwright dependency, config, test file, or CI hook appears in package.json or the tree — yet the header claims "Playwright smoke of both packs + modal trap/Escape" as verified, and the gallery is billed as "the TEST GATE surface." Same for the `?capture=1` screenshot-diff harness: the flag exists, the diff runner doesn't. Either commit the harness or strike the claim; an unverifiable gate claim is worse than no claim.

**F26 (medium). Input has a skin but no headless core.** `core/` contains button and modal only; `css/input.css` ships with no `core/input.mjs`, no validation-state state machine, no `aria-describedby` wiring for hint/error (the gallery hand-wires `aria-invalid`). The "headless cores" pillar is 2-of-3 for the shipped skins.

**F27 (low).** No consumption documentation/README in the packet; no codemod accompanying `LEGACY_VARIANT_MAP` despite "84 consumers depend on these names." Presumably later-phase, but the map without a migration path is a compatibility promise with no tooling.

---

# VERDICT: REVISE

Not REJECT — the three-layer architecture, the multiplier-based reduced-motion discipline, the WCAG math, and the button core are genuinely solid, and every numeric claim I checked reproduced. But a contrast gate that a comment or a corrupt hex value can silently defeat is not a gate, and the packet claims a Playwright gate it doesn't contain.

**Ranked fixes:**

1. **audit-contrast.mjs `auditPack()`**: `WAIVED-FAIL` must require `ratio !== null`; null on a waived pair = blocking FAIL. (F1)
2. **audit-contrast.mjs `parseTokens()`**: strip comments before token extraction. (F2)
3. **Expand `PAIRS[]`**: muted/elevated (currently failing at ~4.45), muted/base, secondary/base, fill-vs-page pairs; decide and document a policy for gradient (showcase card) and transparent (ghost) backgrounds. (F3)
4. **Re-home the accent waiver** into a governed, expiring, per-pack ledger entry; attach a dated remediation to reach 4.5 or large-text sizing. (§4)
5. **Commit or descope the Playwright/capture harness.** (F25)
6. **css/modal.css drawer**: replace physical `translateX` with an inline-axis-safe hide. (F19)
7. **drift-lint hardening**: case-insensitive + multi-line-aware `REORDER_RE`, real comment stripping, symlink-safe/error-tolerant `walk()`, path-scoped exception matching. (F6–F10)
8. **Instrument failure-path tests**: bad-pack fixtures proving FAIL/exit-2, waiver-classification test, `SEMANTIC_NAMES`↔contract.md pinning test. (F15–F16)
9. **core/modal.mjs**: extend `FOCUSABLE_SELECTOR` (contenteditable, iframe, summary, media controls), clamp stale indices; ship a reference trap implementation or soften the core-invariance claim. (F11, F13)
10. Wire or defer `--sw-color-warning`; add pack-presence guidance/guard. (F20–F21)
