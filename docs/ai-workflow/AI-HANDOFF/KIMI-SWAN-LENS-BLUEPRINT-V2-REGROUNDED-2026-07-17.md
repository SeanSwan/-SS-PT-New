# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-SWAN-LENS-BLUEPRINT-2026-07-17.md
**Seed:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-swan-lens-real-substrate-seed.md
**Tokens:** 11387 in / 28045 out · **Cost:** ~$0.4548 · **Wall:** 982.5s

---

# SWAN LENS v2 — SLICE 1 "SPINE" — RE-ISSUED, GROUNDED ON `origin/main`

**Author:** Kimi K3, SwanStudios Design Architect
**Status:** This document **replaces** the Slice-1 section of the original "Crystalline Contract." Where the two disagree, this document wins. Slices 2–3 are not re-issued here.
**Grounding:** Written against the REAL substrate seed: `core/style-lens-os/v2/recipeV2.ts`, `compileRecipe.ts`, `validation.ts`, `core/motion/surfaceMotionTiers.ts`, the §B Crystalline theme, the §C prototype `--world-*` set, the §D structural `--lens-*` monolith, and the Rule-67 lane boundary.

---

## 0. GROUNDING CORRECTIONS (read before building)

1. My original `--lens-core/-geo/-fx/-elev` tier system is **deleted**. The real `--lens-*` namespace is **structural only** (8 names, §D). I do not add color tokens to it.
2. My `--world-surface`, `--world-selection-*`, `--world-data-*`, `--world-z-*`, `--world-target-size`, `--world-density-scale` **do not exist and are not created**. The real names are `--world-bg/panel/accent/text/muted/action/shadow/radius` (+ concept-local extras), and **Lane A owns those names and their wiring**.
3. `validateRecipeV2` / `compileRecipe` / `validation.ts` / `surfaceMotionTiers.ts` **already exist and are reused, never duplicated**. My validator is now a strict **extension** (§4).
4. `motionMode` is `'auto' | 'reduced' | 'off'`. Slice-1 has no motion work; the Slice-2 predicate correction is recorded in the DELTA (§9).
5. The monolith (`SwanStyleLensGlobalStyles.ts`, 324 lines, ~28 manifests) and the `--console-*` fork (W3, W1) were **accurate critiques and remain Slice-1 targets**. The adapter styles + manifests are design-lane files; `v2/SurfaceLensGate.tsx`, `makeLensFrame`, `LensPlanFrame`, all of `core/style-lens-os/`, `appearancePersistence`, and the ~36 surfaces are **Lane A's and are not touched**.

---

## 1. WHAT SLICE 1 IS NOW

Three additive capabilities, all inside `frontend/src/adapters/style-lens-swan/`:

- **S1-A — World-role VALUE spine (DATA).** A typed, per-lens value table keyed to Lane A's **existing** `--world-*` role names, sourced entirely from the §B Crystalline theme. It is a **value source, not a schema**: it is shaped to feed `RecipeTokens` (keys without `--`, values passing `TOKEN_VALUE_PATTERN`) whenever Lane A wires roles into `compileRecipe`; in Slice 1 it is consumed only by the guard, its tests, and the registry-integrity check. It does not compete with `RECIPE_V2_SLOTS`; the natural slot mapping (`surface.card`←panel, `text.display/text.body`←text, `action.primary`←action, `chart.progress`←accent) is documentation for Lane A, not code in this slice.
- **S1-B — `designValueGuard` (validator EXTENSION).** New adapter-owned rules that run **in addition to** `validateRecipeV2`, never instead of it (§4 composition law).
- **S1-C — Active-only injection (monolith kill).** Split the 324-line monolith into one static `createGlobalStyle` per manifest + a zero-specificity fallback core + an allowlist selector. Identical selectors, identical declarations, verbatim values. Visual drift = defect.

---

## 2. FILE PLAN (CREATE/MODIFY, all ≤300 lines)

Base: `SL = frontend/src/adapters/style-lens-swan`

| # | Action | Path | Budget | Purpose |
|---|---|---|---|---|
| F1 | CREATE | `SL/contract/lensValues.types.ts` | ≤80 | `LensWorldRoleValues`, `ValueKind`, `LensWorldValuesRegistry` types. Keys **without** `--`, mirroring `RecipeTokens`. |
| F2 | CREATE | `SL/contract/values/crystallineDefault.ts` | ≤60 | `CRYSTALLINE_DEFAULT_WORLD_VALUES` — the exact table in §3.B. The only place Slice-1 world-role hex lives. |
| F3 | CREATE | `SL/contract/values/index.ts` | ≤60 | `buildWorldValuesRegistry(manifestIds: string[]): LensWorldValuesRegistry` — maps **every** manifest id to the default table (per-lens world-role differentiation is Slice-3 design work, not this slice). |
| F4 | CREATE | `SL/contract/designValueGuard.ts` | ≤230 | `validateLensDesignValues()`, `validateDesignThenRecipe()` (composed entry), `CONTRAST_RULES`, `DESIGN_VALUE_PATTERN`. Rules R1–R7 (§4). |
| F5 | CREATE | `SL/contract/registryIntegrity.ts` | ≤120 | `assertLensRegistryIntegrity(manifestIds, valuesRegistry, styleAllowlist)` — dev/CI thrower. All inputs **injected** (no import guessing). |
| F6 | CREATE | `SL/contract/safeResolveLensId.ts` | ≤50 | Pure `safeResolveLensId(requestedId, knownIds)` + `ANNOUNCE_COPY` constants (§7). Shipped **for Lane A to wire** into the Apply handler; Slice 1 does not call it from Lane A files. |
| F7 | CREATE | `SL/contract/__tests__/designValueGuard.test.ts` | ≤260 | AT-1, AT-2, AT-3. |
| F8 | CREATE | `SL/contract/__tests__/registryIntegrity.test.ts` | ≤200 | AT-5, FC-1. |
| F9 | CREATE | `SL/styles/lensCoreStyles.ts` | ≤220 | `LensCoreGlobalStyles`: `:where(:root)` zero-specificity fallbacks for the 8 structural `--lens-*` names only. No colors, no `--world-*`. |
| F10 | CREATE | `SL/styles/consoleAlias.ts` | ≤60 | Deprecated `--console-*` → real-token aliases (§3.E), scoped to aurora-console, imported **only** by its lens file. |
| F11 | CREATE | `SL/styles/lenses/<manifestId>.ts` ×~28 | ≤40 each | One `createGlobalStyle` per manifest. Block extracted **verbatim** from the monolith (same `[data-style-lens='<id>']` selector, same declarations). |
| F12 | CREATE | `SL/styles/lenses/index.ts` | ≤140 | Static imports → `LENS_STYLE_ALLOWLIST: Readonly<Record<string, RuleSet>>`. No `import()`, no fetch. |
| F13 | CREATE | `SL/styles/activeLensStyles.ts` | ≤110 | `ActiveLensGlobalStyles` (core + active family) + `useLensIdAttribute()` via `useSyncExternalStore` + MutationObserver on `<html data-style-lens>`. Unknown id → core-only, dev `console.warn` once per id, **never throws**. |
| F14 | CREATE | `SL/styles/__tests__/activeLensStyles.test.tsx` | ≤240 | AT-4, FC-2. |
| F15 | MODIFY | `SL/SwanStyleLensGlobalStyles.ts` | ≤40 | Re-export shell: `export { ActiveLensGlobalStyles as SwanStyleLensGlobalStyles } …` — **preserve the file's current export shape exactly** (named and/or default) so all existing importers compile unchanged. |
| F16 | MODIFY | `SL/index.ts` | +45 | After the existing manifest aggregation: `if (process.env.NODE_ENV !== 'production') assertLensRegistryIntegrity(manifestIds, buildWorldValuesRegistry(manifestIds), LENS_STYLE_ALLOWLIST);` Re-export guard, types, `safeResolveLensId` for tests/Lane A. |

**Not modified:** `manifests/*.ts` (untouched this slice), `validateRecipeV2`, `compileRecipe`, `validation.ts`, `surfaceMotionTiers.ts`, `SurfaceLensGate.tsx`, `makeLensFrame`, `LensPlanFrame`, `tokenDiscipline.contract.test.ts`, `appearancePersistence`, any of the ~36 surfaces.

---

## 3. TOKEN CONTRACT

### 3.A — Existing structural `--lens-*` (names unchanged; values move, never change)
`--lens-sidebar-width` · `--lens-sidebar-collapsed` · `--lens-main-padding` · `--lens-main-padding-mobile` · `--lens-panel-radius` · `--lens-shell-gap` · `--lens-navigation-edge` · `--lens-canvas`.
**Extraction rule (exact):** each lens file's declarations are copied verbatim from its monolith block. Core fallbacks (F9) are copied verbatim from the **flagship/default manifest's block** and listed in the file header with their source. **If blocks disagree on what the "default" value is, STOP and ask — do not average, round, or pick.** Each lens file must textually contain all 8 names (enforced by AT-4b).

### 3.B — World-role VALUES (Lane A's real names; design lane's values)
`CRYSTALLINE_DEFAULT_WORLD_VALUES` — every value restates or derives from §B. Contrast computed per WCAG 2.x sRGB, asserted in AT-1:

| Role (→ Lane A's `--world-*`) | Value | Source | Check |
|---|---|---|---|
| `bg` | `#0a0a0f` | `--bg-base`/`--obsidian-black` | — |
| `panel` | `#141419` | `--bg-surface`/`--carbon` | — |
| `accent` | `#60c0f0` | `--ice-wing`/`--accent-primary` | on panel **9.0:1** ≥ 3.0 ✓ |
| `text` | `#e0ecf4` | `--frost-white` | on bg **16.4:1** ✓ · on panel **15.3:1** ✓ |
| `muted` | `#99A0A7` | derived: frost-white 65% over bg-surface | on panel **6.9:1** ≥ 4.5 ✓ |
| `action` | `#60c0f0` | `--accent-primary` | with proposed `onAction #0a0a0f` → **9.7:1** ✓ |
| `shadow` | `0 8px 24px rgba(10,10,15,0.55)` | obsidian-based paint | — |
| `radius` | `16px` | design value | — |

`titleFont`/`letterSpacing` exist in Lane A's observed set but are concept-local; **out of Slice-1 scope.**

### 3.C — NEW tokens — **requires Lane A agreement** (proposals only; NOTHING in Slice 1 emits these)
`--world-selection-bg #002060` (midnight-sapphire; frost text on it 12.7:1) · `--world-selection-text #e0ecf4` · `--world-on-action #0a0a0f` · `--world-focus-ring #60c0f0` (on panel 9.0:1 ≥ 3.0) · `--world-data-1 #60c0f0` (on bg 9.7:1) · `--world-data-2 #8b5cf6` (4.7:1) · `--world-data-3 #c6a84b` (8.6:1) · `--world-data-4 #4070c0` (4.0:1) · `--world-data-5 #e0ecf4` (16.4:1) · `--world-data-grid rgba(224,236,244,0.14)` · `--world-data-axis #99A0A7` (on bg 7.5:1) · theme-token proposal `--text-muted #99A0A7`. Consumers are Slice 3 (a11y skinning, Victory bridge). No z-scale tokens are proposed from this lane; the Slice-2 overlay will not need them.

### 3.D — Retired, rejected on sight (case-insensitive, in any value, key, fixture, or comment)
`#0a0a1a` · `#00FFFF` · `#7851A9` · named `aqua`/`cyan` (word-boundary). Tests construct these literals by concatenation (`'#0a0a' + '1a'`) so the grep gate finds zero occurrences anywhere.

### 3.E — `--console-*` retirement bridge (W1)
F10 enumerates **every** `--console-*` literal present in `manifests/auroraConsole.ts` at build time (enumerate; do not rename — aurora surfaces still read them until the Slice-3 audit) and re-declares each as a zero-specificity alias to a **real** token with a hard §B fallback:
```ts
:where([data-style-lens='aurora-console']) {
  --console-bg: var(--bg-base, #0a0a0f); /* one entry per enumerated name; map to §B theme or §D structural tokens only */
}
```
Header comment: `DEPRECATED — remove after aurora-console surfaces migrate (Slice 3 audit).` Fail-closed: deleting this file degrades aurora to core fallbacks; nothing else breaks.

---

## 4. VALIDATOR BEHAVIOR — AS EXTENSION, NOT PARALLEL

**Composition law (verbatim, mirrors the codebase's own invariant):** *two fail-closed validators must never disagree on validity.* Therefore: composed accept ⟺ `validateRecipeV2` accepts **∧** guard accepts. The guard can only **narrow** the accept set (it adds design rules); it never overrides a base rejection, and `validateDesignThenRecipe(recipe, values)` runs the guard first, short-circuits, and returns base issues untouched when the guard passes. `validateStyleLensManifest` / `validateAppearanceProfile` are not wrapped, not edited.

**XP-1 (new, adapter-owned): `validateLensDesignValues(manifestId, values): DesignIssue[]`** in F4. Rules:
- **R1 presence:** all 8 world roles from §3.B required.
- **R2 banned scan (case-insensitive):** the §3.D literals; substrings `url(`, `expression(`, `@import`, `javascript`; whole-word `aqua|cyan`. (Note: `url(`/`expression(` pass the base charset; base already rejects `url()` explicitly — the guard mirrors that and adds the rest.)
- **R3 charset parity:** every value matches `DESIGN_VALUE_PATTERN = /^[a-zA-Z0-9 #%().,+*/'"_-]{1,240}$/` — a local re-declaration **identical** to `TOKEN_VALUE_PATTERN` (not currently exported by Lane A). Parity is enforced behaviorally by AT-2, not by import.
- **R4 kind formats:** `color` → `/^#[0-9a-fA-F]{6}$/`; `length` → `/^\d+(\.\d+)?(px|rem)$/`; `paint` → passes R2+R3 **and** starts with `#`, `rgb(`, `rgba(`, `linear-gradient(`, `radial-gradient(`, `color-mix(in srgb,`, or `none`.
- **R5 contrast (hex6 color roles only):** `(text,bg) ≥ 4.5`, `(text,panel) ≥ 4.5`, `(muted,panel) ≥ 4.5`, `(accent,panel) ≥ 3.0`, WCAG 2.x relative luminance. Non-hex roles skipped with a recorded note.
- **R6 namespace:** values contain no `--console-`, `--world-`, or `--lens-` substrings (keys are bare roles; declarations live in CSS files only).
- **R7 determinism:** pure function; issues sorted by `(role, rule)`.

**XP-2 (new, adapter-owned): `assertLensRegistryIntegrity(...)`** in F5 — thrown from F16 in dev/CI: every manifest id has exactly one values entry and exactly one style-allowlist entry; guard passes for each. Message: `[SwanLens] registry integrity failed: <n> issue(s) — <first message>`.

**XP-3 (integration point, requires Lane A agreement):** Apply-time composition — `safeResolveLensId` + guard before `validateAppearanceProfile`/`compileRecipe`, plus `data-lens-fallback` and live-region writes. The Apply handler and `appearancePersistence` are Lane A's; Slice 1 ships the parts (F6) and the copy (§7), Lane A wires them.

**XP-4 (Lane A ask, non-blocking):** export `TOKEN_VALUE_PATTERN` from `recipeV2.ts` so F4 can import instead of re-declare. Until then AT-2 guards parity.

---

## 5. RUNTIME INJECTION ARCHITECTURE (S1-C, exact)

- F9 core emits fallbacks under **`:where(:root) { … }`** — zero specificity, so every `[data-style-lens='…']` block wins regardless of injection order. Core contains the 8 structural names only.
- F11 files each export a `createGlobalStyle` whose text is the monolith block **verbatim** (selector included).
- F13 renders `<LensCoreGlobalStyles />` + the allowlist entry for the current `data-style-lens` (or core-only on miss). Reactivity: `useSyncExternalStore` whose subscribe attaches a `MutationObserver` (`attributes: true, attributeFilter: ['data-style-lens']`) on `document.documentElement`; snapshot is `getAttribute('data-style-lens')`. At most two global styles are ever mounted.
- Budgets: core ≤ 6 KB gzip, each lens ≤ 4 KB gzip (enforced AT-6). Static imports only — no `import()`, no fetch, no string-evaluated CSS. styled-components only.

---

## 6. ACCEPTANCE TESTS (executable; run against the real repo)

- **AT-1** `designValueGuard.test.ts`: (a) `CRYSTALLINE_DEFAULT_WORLD_VALUES` passes; asserted ratios `16.4 / 15.3 / 6.9 / 9.0` (1 dp). (b) Missing `panel` → R1 issue. (c) Concatenated banned literals (`'#0a0a'+'1a'`, `'#00ff'+'ff'`, `'#7851'+'a9'`, `'cy'+'an'`) → R2. (d) `muted: #4070c0` (swan-lavender, on panel 3.75:1) → R5 contrast failure. (e) 241-char value and `;`-containing value → R3.
- **AT-2 parity corpus:** the 12 hostile values (`url(`, `expression(`, `@import`, `javascript`, `;`, `{`, `}`, `<`, `>`, `\`, 241-char, banned hex) are rejected by **both** the guard and `validateRecipeV2` (fed via a minimal otherwise-valid recipe fixture) — base and guard can never diverge on these.
- **AT-3 composed-authority:** recipe with bad semver (`1.0`) + guard-clean values → `validateDesignThenRecipe` rejects with **base issues only**. Guard-dirty values + valid recipe → rejects with **guard issues only**, and a spy proves `compileRecipe` is never called on guard failure.
- **AT-4** `activeLensStyles.test.tsx` (jsdom + styled-components, assertions are **string-based on `document.head`** — jsdom computed-custom-property support is unreliable, and this blueprint does not depend on it): (a) with `data-style-lens='aurora-console'`, head contains `[data-style-lens='aurora-console']` and does **not** contain the selector text of any other lens (each selector string is the unique marker); (b) flipping the attribute re-renders and removes the previous lens's selector text; (c) unknown id → only core text present, no throw; (d) **AT-4b:** every F11 source file textually contains all 8 `--lens-*` names; (e) dev warn fires once per unknown id, not per render.
- **AT-5** `registryIntegrity.test.ts`: real inputs (manifest ids from the adapter aggregation) pass; a doctored trio (extra style key / missing values entry / guard-failing values) throws with the exact `[SwanLens] registry integrity failed:` prefix.
- **AT-6 CI gates (exact):**
  - G1: `grep -Rn -- "--console-" frontend/src | grep -vE "styles/consoleAlias|__tests__"` → empty.
  - G2: `grep -RniE "#0a0a1a|#00ffff|#7851a9" frontend/src` → empty (tests concatenate, so zero hits is achievable and required).
  - G3: jest budget test — `zlib.gzipSync(source).byteLength` ≤ 6144 (core) / 4096 (each lens file). Source gzip is the enforced upper bound proxy for emitted CSS.

## 7. FAIL-CLOSED CHECKS (demonstrated, not asserted)

- **FC-1 (dev/CI):** tamper one values entry → `assertLensRegistryIntegrity` throws at adapter init, before any render. Build cannot ship a bad lens.
- **FC-2 (runtime):** set `data-style-lens` to an id deleted from the allowlist → core-only render, no throw, no attribute writes, app fully interactive; core `:where(:root)` fallbacks carry the 8 structural vars. Prod never crashes on appearance.
- **FC-3 (composed):** guard-failing apply payload → rejected before `compileRecipe` (spy-verified); nothing partially applies.
- **Lane-A-wired (shipped ready in F6, flagged "requires Lane A agreement"):** on rejected Apply — keep the persisted profile, write `data-lens-fallback="true"`, announce **"That style couldn't be applied safely, so the default look was restored."**; on success — **"Appearance applied: {lens display name}."** No safety-lens id is invented or hardcoded anywhere in this slice.

---

## 8. BUILDER DO-NOT (Slice-1 subset; all original house rules stand)

1. Do NOT create any token name outside §3.A/§3.B; §3.C items are proposals, not code. No `--lens-core/-geo/-fx/-elev`, no `--world-surface/-data-*/-z-*`.
2. Do NOT modify, wrap, or re-implement `validateRecipeV2`, `compileRecipe`, `validation.ts`, `surfaceMotionTiers.ts`, `SurfaceLensGate.tsx`, `makeLensFrame`, `LensPlanFrame`, `appearancePersistence`, or any of the ~36 surfaces.
3. Do NOT change a single declaration value while extracting monolith blocks. Verbatim or stop.
4. Do NOT write the §3.D literals anywhere, including fixtures — concatenate in tests.
5. Do NOT use `import()`, fetch, `!important`, light mode, telemetry, or PII. Values consumed as `var(--token, #fallback)` at point of use.
6. Do NOT exceed 300 lines/file — split, don't compress. If this document is silent, stop and ask.

---

## 9. DELTA vs MY ORIGINAL BLUEPRINT (what changed and why)

1. **3-tier `--lens-core/-geo/-fx/-elev` DELETED** — the real `--lens-*` is structural (8 names). Slice 1 extracts those verbatim and adds only zero-specificity fallbacks.
2. **`worldProjection.ts` DELETED** — `--world-*` names/wiring are Lane A's. Replaced by a typed **values** table (S1-A) keyed to Lane A's real names; all new names demoted to the §3.C "requires Lane A agreement" list.
3. **`lensValidator.ts` → `designValueGuard.ts` (extension)** — base validators reused; guard narrows only; `TOKEN_VALUE_PATTERN` parity enforced behaviorally (AT-2) because Lane A doesn't export it (XP-4 asks, non-blocking).
4. **Safety-lens id `swan-crystalline-default` RETRACTED** — I invented it. Fail-closed is now: reject, keep persisted profile, core-only render. Apply-side announcement ships as F6 for Lane A to wire (the Apply handler is theirs).
5. **Monolith split KEPT (W3 was accurate)** but grouped **one file per manifest** — no invented family taxonomy; shell preserves the existing export signature.
6. **`consoleAlias` KEPT (W1 was accurate)** but aliases now target **real** §B/§D tokens only; G1 grep gate enforces the retirement boundary.
7. **44px floor** = the existing `validateRecipeV2` `minimumTouchTargetPx` check — my `--world-target-size` token dropped.
8. **Slice-2 corrections recorded now:** reduced-motion predicate is `motionMode !== 'auto'` **or** `prefers-reduced-motion: reduce` (no `'full'` mode exists); the Crystallize will **consume** `surfaceMotionTiers` (calm M0 in-app) — `lensMotionTokens.ts` will not exist.
9. **`SurfaceLensGate` audit modification RETRACTED** — Lane A file. Dev audit signal lives in F16's throw + F13's warn-once instead.

---

## 10. STATED AMBIGUITIES (flagged, not improvised)

1. Exact structural fallback values await verbatim extraction (§3.A rule); disagreement across blocks = stop and ask.
2. The full `--console-*` enumeration awaits reading `manifests/auroraConsole.ts` (§3.E pattern is exact; the list is mechanical).
3. The manifest barrel's export name is unverified, so F5/F16 take all registries as **injected parameters** from the adapter's existing aggregation — no import assumptions.
4. Ownership of the §B theme file (for the proposed `--text-muted`) is unconfirmed — treated as requiring the same agreement as §3.C.
5. jsdom cannot reliably assert computed custom properties; AT-4/FC-2 are deliberately string-based. A Playwright computed-style pass is recommended as a Slice-2 addition, not assumed here.

**Opus verifies fidelity to this document only. Slice 1 merges when AT-1…AT-6 are green and FC-1…FC-3 are demonstrated.**
