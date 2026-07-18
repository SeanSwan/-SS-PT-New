# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-SWAN-LENS-BLUEPRINT-V2-REGROUNDED-2026-07-17.md
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-s1c-injection-real-monolith-seed.md
**Tokens:** 9814 in / 28143 out · **Cost:** ~$0.4516 · **Wall:** 994.5s

---

# SWAN LENS v2 — SLICE 1 — **S1-C RE-ISSUE (2nd rev): MONOLITH SPLIT / ACTIVE INJECTION**

**Author:** Kimi K3, SwanStudios Design Architect
**Scope:** This document **replaces only S1-C** (§1 S1-C line, §2 rows F9–F15, §3.A extraction rule, §3.E, §5, AT-4/AT-6/G1, FC-2) of my regrounded blueprint. **S1-A (values spine) and S1-B (designValueGuard) stand unchanged.** Slices 2–3 untouched.
**Hard correction accepted:** the `--console-*` block is a **deliberately-scoped, documented, shipped aurora-console skin** with live consumers (`ConsoleAtmosphere.tsx`, `CoachCommandCenter.auroraConsoleStyles.ts`, `CoachCommandCenter.shellStyles.ts`, `manifests/auroraConsole.ts`). **F10 (`consoleAlias.ts` retirement bridge) and G1 (`--console-` grep gate) are RETRACTED.** The skin is preserved verbatim, in always-present core. Retiring it would regress production surfaces — that critique was wrong against the real code and is withdrawn.

---

## 1. EXACT CORE-vs-PER-LENS PARTITION

### 1.A — CORE (always present, one `createGlobalStyle`, mounted last — see §3)

`SL/styles/lensCoreStyles.ts` — contents in this exact relative order (mirrors the monolith's own order among these members):

| # | Rule (selector verbatim unless noted) | Source in monolith |
|---|---|---|
| C1 | `:where(:root) { --lens-sidebar-width:280px; …all 8 structural defaults… }` | The monolith's own `:root` block. **Declarations verbatim; selector widened `:root` → `:where(:root)`** — the single sanctioned selector transformation (zero-specificity so per-lens blocks win regardless of injection order; cascade outcome identical because nothing else declares `--lens-*` on root). **Delete my old "copy defaults from the flagship block" rule — the real monolith HAS an explicit defaults block; extract it verbatim.** |
| C2 | `html[data-style-lens='aurora-console'] [data-console-root] { …all enumerated --console-* … }` | **The shipped aurora-console skin, verbatim — declarations AND the load-bearing fallback chains (`var(--console-x, var(--previous, <hex>))`) AND the in-file intent comment ("SCOPED TO [data-console-root] ON PURPOSE… context collapse…") copied verbatim above the block.** Always present; inert on non-console DOM. This is the retracted-F10 replacement: **preserve, never alias, never retire.** |
| C3 | `[data-density='compact'] { --lens-main-padding:18px; --lens-main-padding-mobile:10px; }` | Verbatim. |
| C4 | `[data-style-lens-shell] { gap…; background… }` | Verbatim. |
| C5 | Both `[data-style-lens-shell] :where([data-swan-button-tone='blue'|'purple']) { min-height:44px; box-shadow… }` | Verbatim (the 44px glow floors). |
| C6 | `[data-style-lens-shell] [data-dashboard-scroll-root] { … }` | Verbatim. |
| C7 | `@media (min-width:1025px) { [data-style-lens-shell] [role='navigation'] { … } }` | Verbatim. |
| C8 | `@media (prefers-reduced-motion: reduce) { … !important … }` | Verbatim. The `!important`s are **extracted, not authored** — the no-`!important` house rule governs new code only. |
| C9 | `:root[data-motion='off'] [data-style-lens-shell](, *) { … !important }` | Verbatim, after C8 (monolith order). |

### 1.B — PER-LENS (active-only injection)

**Exactly one** `createGlobalStyle` per manifest id, containing **only** that lens's `[data-style-lens='<id>'] { --lens-* … }` token block, verbatim. ~27 files. No shared rules, no `--console-*`, no defaults leak into these files.

### 1.C — MULTI-BLOCK LENSES (explicit decision, per §C.3)

The 3 descendant rules travel **with their lens's per-lens file**, appended after the token block (monolith relative order), selector + `:where(:not(...))` guard text verbatim:

| Lens file | Extra rule (verbatim) |
|---|---|
| `lenses/analog-flight-recorder.ts` | `[data-style-lens='analog-flight-recorder'] [data-style-lens-shell]:where(:not([data-scoped-lens-frame]:not([data-style-lens='analog-flight-recorder']) *)) { font-family…; box-shadow… }` |
| `lenses/quiet-meridian.ts` | `[data-style-lens='quiet-meridian'] [data-dashboard-scroll-root] > :where(:not([data-scoped-lens-frame]:not([data-style-lens='quiet-meridian']) *)) { max-width:1680px; margin-inline:auto; }` |
| `lenses/candy-glass-arcade.ts` | `[data-style-lens='candy-glass-arcade'] [data-dashboard-scroll-root]:where(:not([data-scoped-lens-frame]:not([data-style-lens='candy-glass-arcade']) *)) { box-shadow… }` |

**Guard-hold proof (requested):** the guard is zero-specificity and fully self-contained in the selector; it depends on no other block. (i) Lens inactive → its rules are **absent from the DOM entirely** → contamination of another lens's preview is impossible by construction (strictly stronger than the monolith, which relied on the guard at runtime). (ii) Lens A committed on `<html>`, frame previews B → A's descendant rule is present; the guard excludes the B-frame subtree exactly as in the monolith. ✓ (iii) Frame previews A while B committed → see §4: union injection puts A's file in the DOM, the frame matches `[data-style-lens='A']`, guard passes inside the frame. ✓ Identical outcomes in all three cases.

### 1.D — Nothing else moves

No Lane A file (`v2/SurfaceLensGate.tsx`, `makeLensFrame`, `LensPlanFrame`, all of `core/style-lens-os/`, `appearancePersistence`, the ~36 surfaces), no manifest, no validator, and **not `App.tsx`** is touched.

---

## 2. CORRECTED FILE PLAN (S1-C only; all ≤300 lines)

Base: `SL = frontend/src/adapters/style-lens-swan`

| # | Action | Path | Budget | Purpose |
|---|---|---|---|---|
| F9 | CREATE | `SL/styles/lensCoreStyles.ts` | ≤300 | `LensCoreGlobalStyles` — §1.A C1–C9. Contingency if verbatim extraction exceeds 300 lines: split into `core/lensCoreTokens.ts` (C1–C3) + `core/lensShellRules.ts` (C4–C9), both always-mounted, tokens component mounted first. Do not compress to fit. |
| ~~F10~~ | **RETRACTED** | — | — | `consoleAlias.ts` **must not be created**. If it exists on any stale branch, delete it. |
| F11 | CREATE | `SL/styles/lenses/<manifestId>.ts` ×~27 | ≤40 each (≤80 for the 3 multi-block files) | One `createGlobalStyle` per lens; verbatim token block (+descendant rule per §1.C). |
| F12 | CREATE | `SL/styles/lenses/index.ts` | ≤140 | Static imports → `LENS_STYLE_ALLOWLIST` (§5). No `import()`, no fetch. |
| F13 | CREATE | `SL/styles/activeLensStyles.ts` | ≤200 | `useStyleLensIds()` + `ActiveLensGlobalStyles` (§6). |
| F14 | CREATE | `SL/styles/__tests__/activeLensStyles.test.tsx` | ≤300 | AT-4a–AT-4e (incl. console-skin regression guard). |
| F14b | CREATE | `SL/styles/__tests__/scopedLensPreview.test.tsx` | ≤180 | AT-4f, AT-4g (multi-block lenses + preview union). |
| F14c | CREATE | `SL/styles/__tests__/monolithReconstruction.contract.test.ts` | ≤180 | AT-4h, AT-4i + jest form of G1′ (reads sources via `fs`). |
| F14d | CREATE | `SL/styles/__tests__/fixtures/swanStyleLensMonolith.legacy.css` | exempt (generated artifact) | Verbatim capture of the pre-split monolith CSS text. The only place the old text persists. |
| F15 | MODIFY | `SL/SwanStyleLensGlobalStyles.ts` | ≤40 | Re-export shell (§7). |
| F16 | unchanged | (S1-A/B file) | — | Compatibility note only: `assertLensRegistryIntegrity` iterates allowlist **keys**; the F12 value-type correction below does not affect it. |

---

## 3. CASCADE-ORDER GUARANTEE (new, load-bearing — my prior doc was silent)

The full monolith reveals a token conflict my earlier split never modeled: `[data-density='compact']` (C3) sets `--lens-main-padding(-mobile)` at specificity (0,1,0) — **equal** to every per-lens `[data-style-lens='<id>']` block. In the monolith, density sits **after** all lens blocks, so density wins when both attributes match the same element (worst case: both on `<html>`; this is unverified — §11).

**Required monolith outcome:** `:where(:root)` defaults < lens token block < density.

**Mechanism (mandatory):**
1. C1 uses `:where(:root)` → (0,0,0); loses to every lens block regardless of order. ✓ order-independent.
2. `ActiveLensGlobalStyles` renders the active lens style component(s) **first** and `<LensCoreGlobalStyles />` **last**, inside a fragment **keyed by the resolved id-set** (`key={known.join('|') || 'core-only'}`). On any lens change the pair remounts and styled-components re-inserts in tree order → lens block(s) precede core in the emitted sheet → density (in core) wins, exactly as the monolith. Remount cost: global styles are inserted in layout effects (pre-paint) → no visible flash; console-skin consumers see an uninterrupted computed value.
3. **AT-4d** string-locks the emitted order, so any styled-components upgrade that changes insertion semantics fails CI loudly instead of silently regressing compact-density users.
4. All other core↔lens selector pairs were audited: they set disjoint properties on disjoint elements (lens blocks set `--lens-*` on the attribute element only; C4–C9 set plain properties on shell/descendants; C8/C9 are `!important`) → order-irrelevant. The keyed pair exists solely for C3.

---

## 4. REACTIVITY — SUBTREE-AWARE, NOT `<html>`-ONLY (corrected)

My previous design observed only `document.documentElement`. That is a **caught defect**: the monolith's `:not([data-scoped-lens-frame]…)` guards prove ScopedLensFrame previews **consume the global sheet** (a preview frame carries `data-style-lens='<previewed>'` and is styled by that lens's block while a different lens is committed). An `<html>`-only design would leave previews of non-committed lenses completely unstyled — a visual regression the guard's existence disproves as acceptable.

**Corrected rule:** inject the **union** of every `data-style-lens` id currently present in the document (committed on `<html>` + any live `[data-scoped-lens-frame]` previews). Style-count invariant: `1 core + N lens styles`, N = distinct known ids in the DOM (N=1 in the common case; typically ≤2 with a preview open). Two lens blocks can never match the same element (one attribute, one value) → mutual order irrelevant. Constraint §C.2's "at most core + the active lens" holds on the committed axis; the union adds only what the monolith already provided to previews, and is the **only** behavior-identical option given Lane A's frame files are untouchable.

**Hook signature (exact):**
```ts
// F13
export function useStyleLensIds(): readonly string[];
```
- `getSnapshot(): string` — dedup'd, sorted, `'\n'`-joined values of every `[data-style-lens]` in the document (`document.querySelectorAll('[data-style-lens]')` includes `<html>`), falsy values dropped. Module-level dirty-flag cache so the returned string is referentially stable between mutations (no render loop).
- `subscribe(cb)` — **one** `MutationObserver` on `document.documentElement` with `{ attributes: true, attributeFilter: ['data-style-lens'], childList: true, subtree: true }` (covers attribute flips AND preview-frame mount/unmount).
- `getServerSnapshot(): ''` — core-only (SSR/test-env safety; also guards `typeof document === 'undefined'`).

**Component (exact shape):**
```tsx
export function ActiveLensGlobalStyles(): ReactElement {
  const ids = useStyleLensIds();
  const known = ids.filter((id) => id in LENS_STYLE_ALLOWLIST);
  if (process.env.NODE_ENV !== 'production') warnOncePerUnknownId(ids, known); // console.warn once per id, module-level Set
  return (
    <Fragment key={known.length ? known.join('|') : 'core-only'}>
      {known.map((id) => {
        const LensStyles = LENS_STYLE_ALLOWLIST[id];
        return <LensStyles key={id} />;
      })}
      <LensCoreGlobalStyles />
    </Fragment>
  );
}
```
Unknown id → core-only, **never throws**, no attribute writes.

---

## 5. ALLOWLIST SHAPE (F12, type corrected)

```ts
import type { ComponentType } from 'react';
export type LensStyleComponent = ComponentType; // createGlobalStyle returns a COMPONENT, not a RuleSet

export const LENS_STYLE_ALLOWLIST: Readonly<Record<string, LensStyleComponent>> = Object.freeze({
  'analog-flight-recorder': AnalogFlightRecorderLensStyles,
  'aurora-console': AuroraConsoleLensStyles,
  /* … one entry per manifest id, alphabetical, static imports only … */
});
```
My regrounded F12 typed this as `Record<string, RuleSet>` — wrong for `createGlobalStyle`; corrected (F5/F16 consume only keys → no S1-A/B change). Extraction rule: the allowlist key-set **must equal** the set of `[data-style-lens]` blocks found in the monolith AND the manifest id set; if either comparison fails, **STOP and reconcile — do not invent blocks or skip manifests.**

Per-lens file template (F11):
```ts
// AUTO-EXTRACTED from SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';
export const QuietMeridianLensStyles = createGlobalStyle`
  [data-style-lens='quiet-meridian'] { --lens-sidebar-width:228px; …verbatim… }
  [data-style-lens='quiet-meridian'] [data-dashboard-scroll-root] > :where(:not([data-scoped-lens-frame]:not([data-style-lens='quiet-meridian']) *)) { max-width:1680px; margin-inline:auto; }
`;
```

---

## 6. SHELL (F15 — export preservation, exact)

```ts
/**
 * SwanStyleLensGlobalStyles — RE-EXPORT SHELL (S1-C monolith split).
 * Implementation: ./styles/lensCoreStyles.ts (always-on core) + ./styles/lenses/* (active-only).
 * Preserves the exact named export consumed at App.tsx:246 and asserted by
 * swanStyleLensRuntime.contract.test.ts. Do not rename; do not add side effects.
 */
export { ActiveLensGlobalStyles as SwanStyleLensGlobalStyles } from './styles/activeLensStyles';
```
Same file path → `App.tsx` import specifier resolves unchanged → App.tsx untouched → contract test green. Extraction step: **verify the pre-split file's complete export list first**; any export beyond the named component must be re-exported verbatim from the shell. If a default export exists, keep it (`export default ActiveLensGlobalStyles`).

---

## 7. EXTRACTION PROTOCOL (order of operations — fail-safe)

1. Read the monolith; copy its **full CSS text verbatim** → F14d fixture. Commit fixture first.
2. Extract C1–C9 → F9; extract per-lens blocks (+3 descendant rules) → F11 files. Verbatim, including the console-skin intent comment. Any ambiguity in a block → **STOP and ask; do not guess, average, or normalize.**
3. Build F12 allowlist; run the key-set equality check (§5).
4. Run AT-4i (reconstruction equality, §8) **before** touching F15. Green → swap F15 to the shell. Red → extraction defect; fix extraction, never the fixture.

---

## 8. ACCEPTANCE TESTS (S1-C, executable, jsdom + styled-components; head assertions are string-based per standing §10.5)

- **AT-4a (active-only):** `data-style-lens='aurora-console'` → head contains `[data-style-lens='aurora-console']` token-block text and **no other lens's** selector string (each selector is the unique marker).
- **AT-4b (flip):** change the attribute → previous lens selector removed, new one present; core text present throughout.
- **AT-4c (unknown id):** → core-only, no throw; dev `console.warn` fires **once per id**, not per render.
- **AT-4d (cascade-order lock, new):** with any lens active, `head.indexOf("[data-density='compact']") > head.indexOf("[data-style-lens='<active>']")`, and `:where(:root)` defaults present. Locks §3.
- **AT-4e (console-skin regression guard, new — the retracted G1's true replacement):** with aurora-console active, head contains `html[data-style-lens='aurora-console'] [data-console-root]`, **every** `--console-[a-z-]+` name enumerated at test time from `lensCoreStyles.ts` source (source-derived, ≥11, no hardcoded list → no drift), and a spot-checked load-bearing fallback chain (`var(--accent-gold, #c6a84b)`). Flip to another lens → the skin block is **still present** (always-on core; inert without `[data-console-root]`, matching monolith behavior). Then render `ConsoleAtmosphere`'s DOM contract (`data-console-root`) and assert the declarations target it. Deleting or renaming any part of the skin fails this test.
- **AT-4f (multi-block lenses):** for each of `analog-flight-recorder` / `quiet-meridian` / `candy-glass-arcade`: activate → head contains token block AND descendant rule AND the verbatim guard substring `:not([data-scoped-lens-frame]:not([data-style-lens='<id>']) *)`; activate a different lens → both absent.
- **AT-4g (scoped-preview union):** html = `quiet-meridian` + mounted `<div data-scoped-lens-frame data-style-lens='analog-flight-recorder'>` → **both** lens blocks present (exactly 2 lens styles mounted); unmount the frame → observer fires → analog block removed, meridian retained.
- **AT-4h (lens-file purity, jest+fs):** each F11 file contains its own selector exactly once; **zero** `--console-` occurrences across `styles/lenses/` (the skin lives only in core — this is G1 inverted into a boundary guard, not a retirement); core contains the full `--console-*` enumeration.
- **AT-4i (reconstruction equality — the behavior-identical proof):** line-start-dedent normalize (quote-safe; interior spacing untouched) the F14d fixture with the single sanctioned transform `:root {` → `:where(:root) {`; then every F9/F11 template literal must be a verbatim substring of it, and consuming each leaves **only whitespace**. Nothing lost, nothing added, nothing altered. Plus a strict assertion that every `name:value;` declaration pair in the fixture appears character-identical in exactly one extracted file.

**CI gates (AT-6, revised):**
- **G1 — RETRACTED.** Replaced by **G1′** = AT-4e + AT-4h (presence-in-core ∧ absence-from-lens-files).
- **G2 — unchanged:** `grep -RniE "#0a0a1a|#00ffff|#7851a9" frontend/src` → empty (tests concatenate literals).
- **G3 — unchanged budgets:** `zlib.gzipSync(source).byteLength` ≤ 6144 (core, now larger — revalidate at extraction; **if exceeded, STOP and ask, do not raise the budget**) / ≤ 4096 per lens file (incl. the 3 multi-block files).
- **G4 — new:** AT-4i must pass in CI.

---

## 9. FAIL-CLOSED CHECKS (S1-C)

- **FC-2 (runtime, revised):** id missing from the allowlist (deleted lens file, tampered attribute) → core-only render: 8 structural vars + console skin + shared shell rules carry the app; no throw, no attribute writes, fully interactive. Preview frames of unknown ids degrade identically.
- **FC-4 (CI, new):** tamper or delete the console skin, any shared rule, or any lens block → AT-4e / AT-4h / AT-4i fail before merge. A missing allowlist key additionally trips S1-A's `assertLensRegistryIntegrity` at dev/CI init.
- **FC-5 (CI, new):** a styled-components upgrade that alters insertion ordering → AT-4d fails; the density-over-lens cascade cannot silently regress.

---

## 10. DO-NOT (S1-C subset; all house rules stand)

1. Do NOT create `consoleAlias.ts`, alias, rename, or "migrate" any `--console-*` name; do not simplify the fallback chains. The skin ships verbatim in core.
2. Do NOT touch Lane A files, manifests, `validateRecipeV2`/`compileRecipe`/`validation.ts`/`surfaceMotionTiers.ts`, or `App.tsx`.
3. Do NOT change any declaration value or selector during extraction (the single sanctioned exception: `:root` → `:where(:root)` on C1). Verbatim or stop.
4. No `import()`, fetch, string-evaluated CSS, authored `!important`, telemetry. styled-components only. ≤300 lines/file — split, never compress (§2 contingency).
5. Do NOT write §3.D retired literals anywhere — concatenate in tests.

---

## 11. STATED AMBIGUITIES (flagged, not improvised)

1. Which element Lane A writes `data-density` on (html vs shell). Architecture is correct under both readings (§3 keyed ordering covers the worst case; proximity alone suffices otherwise). Confirm with Lane A; no code change either way.
2. Exact core line count after verbatim extraction — §2 contingency applies.
3. Whether the monolith contains a block for **every** manifest id — §5 equality rule; mismatch = STOP.
4. jsdom cannot assert computed custom properties; AT-4d/e are string-based by design. A Playwright computed-style pass (density + console skin) is recommended as a Slice-2 addition.

---

## 12. DELTA vs MY REGROUNDED S1-C (what changed and why)

1. **F10 `consoleAlias.ts` DELETED; G1 grep gate RETRACTED.** The `--console-*` block is a shipped, documented, consumed aurora-console skin — my W1 "fork" critique was wrong. Skin preserved verbatim in core (C2) with its intent comment and fallback chains; discipline is now enforced **inversely** by G1′/AT-4e (presence in core) + AT-4h (absence from lens files).
2. **Core massively expanded.** My F9 was "8 structural fallbacks only." The full monolith shows the shared/global layer also owns: `[data-density='compact']`, all `[data-style-lens-shell]` rules (incl. the two 44px button-tone glow floors, dashboard-scroll-root, the ≥1025px nav media rule), and both motion-off blocks — all now C3–C9, always present.
3. **Core defaults source corrected:** from the monolith's real `:root` block, verbatim — my "copy from the flagship manifest's block" rule (and its stop-and-ask clause) is deleted.
4. **Per-lens split narrowed:** ONLY the ~27 token blocks; the 3 descendant rules (analog-flight-recorder, quiet-meridian, candy-glass-arcade) explicitly travel with their lens files, guard text verbatim, with the three-case guard-hold proof (§1.C).
5. **Reactivity corrected from `<html>`-only to subtree-union** (§4). The old design would have left ScopedLensFrame previews of non-committed lenses unstyled — a regression proven by the guards' existence. Recorded as a caught defect.
6. **Injection order specified for the first time** (§3): lens-first / core-last inside an id-keyed fragment, to preserve the monolith's density-over-lens cascade at equal specificity; string-locked by AT-4d; SC-version drift fails closed via FC-5.
7. **Old AT-4b ("every lens file contains all 8 `--lens-*` names") RETRACTED** — the real blocks override 4–6 names each. Replaced by AT-4i reconstruction equality against a committed verbatim fixture, which is a strictly stronger behavior-identical guarantee.
8. **Allowlist type fix:** `Record<string, RuleSet>` → `Record<string, ComponentType>` (`createGlobalStyle` returns a component). Key-based consumers (F5/F16) unaffected.
9. **Style-count invariant corrected:** "at most two global styles" → "1 core + N per distinct lens id present" (preview union; N=1 common case).
10. **Budgets kept** (6 KB core / 4 KB lens gzip) with an explicit stop-and-ask if the larger verbatim core exceeds 6 KB; budgets never raised silently.

**Opus verifies fidelity to this document only for S1-C. Slice 1 S1-C merges when AT-4a…AT-4i + G1′/G2/G3/G4 are green and FC-2/FC-4/FC-5 are demonstrated.**
