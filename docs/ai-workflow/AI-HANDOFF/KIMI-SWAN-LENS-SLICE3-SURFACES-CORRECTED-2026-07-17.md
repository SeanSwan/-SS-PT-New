# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-SWAN-LENS-BLUEPRINT-2026-07-17.md
**Seed:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-slice3-surfaces-real-substrate-seed.md
**Tokens:** 10248 in / 29954 out · **Cost:** ~$0.4801 · **Wall:** 1073.7s

---

# SWAN LENS v2 — "CRYSTALLINE CONTRACT" — SLICE 3 (RE-ISSUED, GROUNDED)

**Author:** Kimi K3, SwanStudios Design Architect
**Scope:** Slice 3 only — C6 (focus/selection/elevation/z) + C7 (Victory bridge). Slices 1 (S1-A/B/C) + 2 are BUILT and are not re-issued. `SL = frontend/src/adapters/style-lens-swan`.
**Contract status:** This document supersedes the original Slice 3 in full. Deviations are defects.

---

## 0. GROUNDING — the four hard corrections, applied

| # | Correction (verified vs `origin/main`) | Decision taken in this re-issue |
|---|---|---|
| 1 | C7 **exists** (`resolveLensChartPalette` + `LensChartPaletteProvider`, `components/Charts/chartTheme.ts` / `lensChartPalette.tsx`) with the deliberate shipped decision: *chrome stays Swan-fixed, only PRIMARY follows `--world-accent`, multi-series deferred to the Chart Charter.* `--world-data-*` = 0 occurrences. | Original `buildVictoryThemeFromLens` is **withdrawn**. C7 becomes a NEW additive sibling (`SL/charts/victoryLensTheme.ts`) that **composes** the shipped bridge, emits a 2-entry qualitative palette, Swan-fixed chrome, zero `--world-data-*`. The deferral is named in code. |
| 2 | `--world-z-*`, `--lens-elev-*`, `--world-data-*` are all net-new; new `--world-*` names require **Lane A agreement (Rule 67)**. | This slice **emits zero `--world-*` declarations** (tested). Elevation + z ship as additive `--lens-*` families. `--world-z-*` and `--world-data-*` appear **only** in §8 as ready-to-wire proposals (S1-A §3.C pattern). |
| 3 | Global `:focus-visible` / `::selection` already exist in `styles/CosmicEleganceGlobalStyle.ts`, `styles/ImprovedGlobalStyle.ts`, `styles/dashboard-global-styles.css`, `styles/responsive-fixes.css`, plus the S1-C/Slice-2 forced-colors rule. | **Decision: SCOPE, not supersede.** All C6 rules apply only under `[data-style-lens-shell]`. The four legacy files are **retained by name** and keep ownership outside the shell. No second global rule is added. Precedence + forced-colors harmonization specified exactly in §2. |
| 4 | 44px floor already enforced (`validateRecipeV2.minimumTouchTargetPx` + Slice-2 `.lens-target` clamp). | `--world-target-size` is **dropped**. Nothing in this slice touches target sizing. |

Also corrected: my original C6 read `--lens-core-focus-ring` / `--lens-core-selection-*` — **those tokens do not exist on this substrate** (real `--lens-*` is structural: sidebar/padding/panel-radius/navigation-edge/canvas). C6 now reads the **existing** `--world-accent` plus real theme tokens (`--bg-base`, `--frost-white`, `--bg-surface`) with fail-closed fallbacks. No new focus/selection tokens are invented.

---

## 1. FILE PLAN (all `CREATE`, all ≤300 lines)

| File | Lines | Purpose |
|---|---|---|
| `SL/styles/lensSurfaceStyles.ts` | ~115 | C6 CSS string module (scoped focus/selection, `--lens-elev-*`, `--lens-z-*`) + optional component mount |
| `SL/charts/victoryLensTheme.ts` | ~125 | C7 additive Victory-theme helper composing the shipped bridge |
| `SL/styles/__tests__/lensSurfaceStyles.test.ts` | ~150 | C6 source invariants + contrast math |
| `SL/charts/__tests__/victoryLensTheme.test.ts` | ~165 | C7 composition/deferral/fallback tests |

**Single permitted prior-slice touch (declared, additive):** ONE import line adding `lensSurfaceCss` to the same composition that already mounts Slice-2's viewport-style string. S1-C core is **not** edited. If that mount point is frozen, the fallback mount is `<LensSurfaceGlobalStyles />` once at the lens-shell root (exported from the same file). `chartTheme.ts` / `lensChartPalette.tsx` are **imported, not modified**. No surface, manifest, or Lane-A file is touched.

---

## 2. C6 — `SL/styles/lensSurfaceStyles.ts` (exact)

```ts
/**
 * Slice 3 / C6 — lens-shell focus, selection, elevation, z. ADDITIVE. S1-C core untouched.
 *
 * MOUNT: `lensSurfaceCss` is composed by the SAME mount that composes Slice-2's viewport
 * styles (one additive import line — the only prior-slice touch this slice makes).
 * Fallback: <LensSurfaceGlobalStyles /> once at the lens-shell root.
 *
 * FOCUS/SELECTION RECONCILIATION — decision: SCOPE, not supersede.
 *   Rules apply ONLY under [data-style-lens-shell]. These existing app-wide rules are
 *   RETAINED and keep ownership OUTSIDE the shell (not edited, not overridden there):
 *     - styles/CosmicEleganceGlobalStyle.ts
 *     - styles/ImprovedGlobalStyle.ts
 *     - styles/dashboard-global-styles.css
 *     - styles/responsive-fixes.css
 *   Inside the shell, C6 wins by specificity: `[data-style-lens-shell] …:focus-visible`
 *   is (0,2,0) vs their bare `:focus-visible` at (0,1,0) — order-independent, no !important.
 *   Therefore NO second competing GLOBAL rule exists; exactly one rule owns each region.
 *   forced-colors: harmonized by SAME VALUE with the shipped S1-C rule — both declare
 *   `2px solid Highlight`, so the declarations cannot conflict regardless of order.
 *   ::selection under forced-colors is UA-forced; intentionally not re-declared.
 *
 * TOKENS: emits ZERO --world-* declarations (Rule 67 — new world names are Lane A's).
 *   READS the shipped --world-accent + theme vars --bg-base only.
 *   var() fallbacks below mirror S1-A §B shipped values verbatim; this header is the
 *   house-rule-#1 audit point for every literal in this file. Banned trio absent (tested).
 *
 * ELEVATION: additive --lens-elev-* family, Swan-fixed this slice. Scale is derived from
 *   the shipped S1-A shadow `0 8px 24px rgba(10,10,15,0.55)` (elev-3 = base verbatim;
 *   offset/blur ×0.25 / ×0.5 / ×1 / ×2; alpha 0.45 / 0.50 / 0.55 / 0.60). Consumption is
 *   OPT-IN via the .lens-elev-* utilities or `box-shadow: var(--lens-elev-<n>)`.
 *
 * Z: additive --lens-z-* interim family (token form of Slice-2's CRYSTALLIZE_OVERLAY_Z
 *   pattern). Consumers write `z-index: var(--lens-z-<step>)`; bare z literals stay banned.
 *   Promotion to --world-z-* is PROPOSED, not emitted — see Deferred §8.2.
 */
import { createGlobalStyle } from 'styled-components';

export const lensSurfaceCss = /* css */ `
[data-style-lens-shell] {
  --lens-elev-0: none;
  --lens-elev-1: 0 2px 6px rgba(10, 10, 15, 0.45);
  --lens-elev-2: 0 4px 12px rgba(10, 10, 15, 0.5);
  --lens-elev-3: 0 8px 24px rgba(10, 10, 15, 0.55);
  --lens-elev-4: 0 16px 48px rgba(10, 10, 15, 0.6);
  --lens-z-base: 0;
  --lens-z-raised: 100;
  --lens-z-sticky: 200;
  --lens-z-overlay: 300;
  --lens-z-modal: 400;
  --lens-z-toast: 500;
}

[data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--world-accent, #60c0f0); /* fallback = ice-wing; 9.0:1 vs --bg-surface, 9.7:1 vs --bg-base */
  outline-offset: 2px;
}

[data-style-lens-shell]::selection,
[data-style-lens-shell] ::selection {
  background-color: var(--world-accent, #60c0f0);
  color: var(--bg-base, #0a0a0f); /* 9.7:1 on the fallback pair */
}

@media (forced-colors: active) {
  [data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid Highlight; /* same value as the shipped S1-C rule => conflict-free */
    outline-offset: 2px;
  }
}

[data-style-lens-shell] .lens-elev-1 { box-shadow: var(--lens-elev-1); }
[data-style-lens-shell] .lens-elev-2 { box-shadow: var(--lens-elev-2); }
[data-style-lens-shell] .lens-elev-3 { box-shadow: var(--lens-elev-3); }
[data-style-lens-shell] .lens-elev-4 { box-shadow: var(--lens-elev-4); }
`;

/** Fallback mount only. Primary mount = the Slice-2 style composition (one additive line). */
export const LensSurfaceGlobalStyles = createGlobalStyle`${lensSurfaceCss}`;
```

**Why IACVT cannot strand focus here:** if `--world-accent` were ever an invalid color, the `outline` declaration would be invalid-at-computed-value-time. That path is closed upstream: the S1 validator rejects a bad accent at Apply and fails closed to the safety lens, so the `var()` fallback only ever engages when the token is *absent* (e.g., shell rendered pre-Apply) — where `#60c0f0` is the intended Swan default. Declarative fail-closed; no JS required.

---

## 3. C7 — `SL/charts/victoryLensTheme.ts` (exact)

```ts
/**
 * Slice 3 / C7 — ADDITIVE Victory-theme helper. Victory-only. No new dependency.
 *
 * COMPOSES the shipped bridge — does NOT replace it, does NOT re-read --world-accent:
 *   components/Charts/chartTheme.ts  -> resolveLensChartPalette, SWAN_CHART_PALETTE
 *   components/Charts/lensChartPalette.tsx -> LensChartPaletteProvider (untouched)
 *
 * SHIPPED DECISIONS RESPECTED (chartTheme.ts in-file comments, verbatim intent):
 *   1. "Chart chrome (axes, tooltips, labels) deliberately stays Swan-fixed for
 *      readability; only the data-series accent pair follows the lens."
 *      => ALL chrome below is Swan-fixed. It never reads a --world-* var.
 *   2. "Only the PRIMARY series follows --world-accent today… the secondary series stays
 *      Swan-fixed until the Chart Charter ships a real dataviz token pair."
 *      => CHART CHARTER DEFERRAL: `qualitative` is EXACTLY two entries. Do not extend
 *      here. Extension point marked below; multi-series --world-data-* tokens do not
 *      exist (0 occurrences) and are NOT introduced (proposal only, §8.1).
 *
 * SVG presentation attributes cannot carry var(), so colors are resolved strings —
 * the same mechanism the shipped bridge documents. Chrome values are read from the
 * Swan-fixed THEME vars (--frost-white, --bg-surface) so they track the theme, never
 * the lens. Fail-closed: any miss/throw/corrupt value => SWAN_CHROME_FALLBACKS.
 *
 * SWAN_CHROME_FALLBACKS mirrors S1-A §B verbatim (labelFill = --frost-white #e0ecf4,
 * tooltipBg = --bg-surface #141419); alpha variants are frost-white derivations.
 * This table is this file's house-rule-#1 audit point; a drift-guard test pins it.
 */
import {
  resolveLensChartPalette,
  SWAN_CHART_PALETTE,
  type LensChartPalette,
} from '../../../components/Charts/chartTheme';

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export const SWAN_CHROME_FALLBACKS = {
  labelFill: '#e0ecf4',                 // --frost-white, verbatim
  tooltipBg: '#141419',                 // --bg-surface, verbatim (label-on-bg 15.3:1)
  axisStroke: 'rgba(224, 236, 244, 0.48)', // frost-white @48% — 4.3:1 on --bg-base
  gridStroke: 'rgba(224, 236, 244, 0.12)', // frost-white @12% — decorative, non-text
  tooltipBorder: 'rgba(224, 236, 244, 0.24)',
} as const;

export interface LensVictoryThemeBundle {
  /** Spread into <VictoryChart theme={...}> (Victory merges over its own default). */
  theme: {
    palette: { qualitative: [string, string] };
    axis: {
      style: {
        axis: { stroke: string };
        grid: { stroke: string };
        ticks: { stroke: string; size: number };
        tickLabels: { fill: string };
        axisLabel: { fill: string };
      };
    };
  };
  /** Spread onto <VictoryTooltip flyoutStyle={...} style={...} />. */
  tooltip: {
    flyoutStyle: { fill: string; stroke: string };
    style: { fill: string };
  };
}

const asValidHex = (value: string, fallback: string): string =>
  HEX6.test(value) ? value : fallback;

function readSwanFixedVar(
  host: HTMLElement | null | undefined,
  name: string,
  fallback: string,
): string {
  try {
    const raw = getComputedStyle(host ?? document.documentElement)
      .getPropertyValue(name)
      .trim();
    return asValidHex(raw, fallback);
  } catch {
    return fallback;
  }
}

function buildBundle(series: LensChartPalette, labelFill: string, tooltipBg: string): LensVictoryThemeBundle {
  return {
    theme: {
      palette: {
        // CHART CHARTER DEFERRAL — exactly 2 entries. When the Charter ships a real
        // dataviz token pair, this is the ONLY extension point. Do not add entries now.
        qualitative: [series.primary, series.secondary],
      },
      axis: {
        style: {
          axis: { stroke: SWAN_CHROME_FALLBACKS.axisStroke },
          grid: { stroke: SWAN_CHROME_FALLBACKS.gridStroke },
          ticks: { stroke: SWAN_CHROME_FALLBACKS.axisStroke, size: 5 },
          tickLabels: { fill: labelFill },
          axisLabel: { fill: labelFill },
          // fontFamily deliberately UNSET — current chart font handling is unchanged.
        },
      },
    },
    tooltip: {
      flyoutStyle: { fill: tooltipBg, stroke: SWAN_CHROME_FALLBACKS.tooltipBorder },
      style: { fill: labelFill },
    },
  };
}

/**
 * Resolve a Victory theme bundle for the lens frame containing `host`.
 * Re-invoke wherever resolveLensChartPalette is re-invoked today (the existing
 * appearance subscriber / LensChartPaletteProvider render path) — no new subscription
 * machinery is added by this slice.
 */
export function resolveLensVictoryTheme(host?: HTMLElement | null): LensVictoryThemeBundle {
  try {
    const series = resolveLensChartPalette(host ?? null); // shipped bridge; primary follows --world-accent
    const safeSeries: LensChartPalette = {
      primary: asValidHex(series.primary, SWAN_CHART_PALETTE.primary),
      secondary: asValidHex(series.secondary, SWAN_CHART_PALETTE.secondary),
    };
    return buildBundle(
      safeSeries,
      readSwanFixedVar(host, '--frost-white', SWAN_CHROME_FALLBACKS.labelFill),
      readSwanFixedVar(host, '--bg-surface', SWAN_CHROME_FALLBACKS.tooltipBg),
    );
  } catch {
    // Total fail-closed: pure Swan bundle, never throws, always complete.
    return buildBundle(SWAN_CHART_PALETTE, SWAN_CHROME_FALLBACKS.labelFill, SWAN_CHROME_FALLBACKS.tooltipBg);
  }
}
```

---

## 4. ACCEPTANCE TESTS (exact key assertions)

### 4.1 `SL/styles/__tests__/lensSurfaceStyles.test.ts`

```ts
import { lensSurfaceCss } from '../lensSurfaceStyles';

const lum = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('C6 lensSurfaceStyles — source invariants', () => {
  it('emits ZERO --world-* declarations (Rule 67 / Lane A)', () => {
    expect(lensSurfaceCss).not.toMatch(/--world-[a-z0-9-]+\s*:/);
  });
  it('contains no z-index property and no !important', () => {
    expect(lensSurfaceCss).not.toMatch(/z-index\s*:/);
    expect(lensSurfaceCss).not.toMatch(/!important/);
  });
  it('contains no banned literals (retired trio, aqua, cyan)', () => {
    expect(lensSurfaceCss).not.toMatch(/#0a0a1a|#00ffff|#7851a9|\baqua\b|\bcyan\b/i);
  });
  it('scopes EVERY rule to [data-style-lens-shell] — no bare global focus/selection', () => {
    const selectors = lensSurfaceCss
      .replace(/@media[^{]+\{/g, '') // strip media prelude; inner selectors still checked
      .match(/[^{}]+(?=\{)/g) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) expect(s).toContain('[data-style-lens-shell]');
  });
  it('declares the S1-A shadow base verbatim at --lens-elev-3', () => {
    expect(lensSurfaceCss).toContain('--lens-elev-3: 0 8px 24px rgba(10, 10, 15, 0.55);');
  });
  it('harmonizes forced-colors with the SAME value as the S1-C rule', () => {
    const block = lensSurfaceCss.match(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/);
    expect(block?.[1]).toContain('outline: 2px solid Highlight;');
  });
});

describe('C6 fallback contrast (house bar)', () => {
  it('selection pair #60c0f0 on #0a0a0f >= 4.5', () => {
    expect(ratio('#60c0f0', '#0a0a0f')).toBeGreaterThanOrEqual(4.5); // ≈ 9.7
  });
  it('focus ring #60c0f0 vs --bg-surface #141419 >= 3.0', () => {
    expect(ratio('#60c0f0', '#141419')).toBeGreaterThanOrEqual(3.0); // ≈ 9.0
  });
});
```

### 4.2 `SL/charts/__tests__/victoryLensTheme.test.ts`

```ts
import { resolveLensVictoryTheme, SWAN_CHROME_FALLBACKS } from '../victoryLensTheme';
import { SWAN_CHART_PALETTE } from '../../../components/Charts/chartTheme';

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0(\.\d+)?|1)\)$/;

const hostWith = (vars: Record<string, string>): HTMLElement => {
  const el = document.createElement('div');
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  document.body.appendChild(el);
  return el;
};

describe('C7 resolveLensVictoryTheme — composes the shipped bridge', () => {
  it('primary follows --world-accent per host; secondary + chrome stay Swan-fixed', () => {
    const a = resolveLensVictoryTheme(hostWith({ '--world-accent': '#60c0f0' }));
    const b = resolveLensVictoryTheme(hostWith({ '--world-accent': '#8b5cf6' }));
    expect(a.theme.palette.qualitative[0]).not.toBe(b.theme.palette.qualitative[0]);
    expect(a.theme.palette.qualitative[1]).toBe(b.theme.palette.qualitative[1]);
    expect(a.theme.palette.qualitative[1]).toBe(SWAN_CHART_PALETTE.secondary);
    expect(a.theme.axis).toEqual(b.theme.axis); // chrome is lens-invariant
    expect(a.tooltip).toEqual(b.tooltip);
  });

  it('CHART CHARTER DEFERRAL guard: qualitative is EXACTLY 2 entries', () => {
    expect(resolveLensVictoryTheme(null).theme.palette.qualitative).toHaveLength(2);
  });

  it('all emitted colors are valid; no --world-data-*; no banned literals', () => {
    const bundle = resolveLensVictoryTheme(null);
    const flat = JSON.stringify(bundle);
    expect(flat).not.toContain('--world-data');
    expect(flat).not.toMatch(/#0a0a1a|#00ffff|#7851a9|\baqua\b|\bcyan\b/i);
    const colors = [
      ...bundle.theme.palette.qualitative,
      bundle.theme.axis.style.tickLabels.fill,
      bundle.theme.axis.style.axisLabel.fill,
      bundle.tooltip.flyoutStyle.fill,
      bundle.tooltip.style.fill,
    ];
    colors.forEach((c) => expect(c).toMatch(HEX6));
    [
      bundle.theme.axis.style.axis.stroke,
      bundle.theme.axis.style.grid.stroke,
      bundle.theme.axis.style.ticks.stroke,
      bundle.tooltip.flyoutStyle.stroke,
    ].forEach((c) => expect(c).toMatch(RGBA));
  });

  it('fail-closed: corrupt --frost-white => table fallback, no throw', () => {
    const host = hostWith({ '--frost-white': 'not-a-color' });
    const bundle = resolveLensVictoryTheme(host);
    expect(bundle.theme.axis.style.tickLabels.fill).toBe(SWAN_CHROME_FALLBACKS.labelFill);
  });

  it('fail-closed: getComputedStyle throws => complete pure-Swan bundle', () => {
    const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('boom');
    });
    const bundle = resolveLensVictoryTheme(null);
    expect(bundle.theme.palette.qualitative).toEqual([
      SWAN_CHART_PALETTE.primary,
      SWAN_CHART_PALETTE.secondary,
    ]);
    expect(bundle.tooltip.flyoutStyle.fill).toBe(SWAN_CHROME_FALLBACKS.tooltipBg);
    spy.mockRestore();
  });

  it('drift guard: fallbacks mirror the shipped S1-A §B theme values', () => {
    expect(SWAN_CHROME_FALLBACKS.labelFill).toBe('#e0ecf4'); // --frost-white
    expect(SWAN_CHROME_FALLBACKS.tooltipBg).toBe('#141419'); // --bg-surface
  });
});
```

*(Uses the same jsdom custom-property stubbing pattern as the existing `chartTheme` tests; `vi` = the repo's test runner.)*

---

## 5. SLICE ACCEPTANCE (executable)

1. Both unit suites above green (§4).
2. **Grep gates (CI):**
   - `grep -Rn "world-data" frontend/src` → **0 hits**.
   - `grep -n "z-index" SL/styles/lensSurfaceStyles.ts` → **0 hits**; `grep -n "!important" <both new modules>` → 0 hits.
   - `grep -RnE "#0a0a1a|#00FFFF|#7851A9" SL/styles SL/charts` → 0 hits.
   - `grep -nE "\--world-[a-z0-9-]+\s*:" SL/styles/lensSurfaceStyles.ts` → 0 hits (no `--world-*` declarations).
3. **Playwright + axe** on the 4 dashboard routes × 2 lenses (`swan-crystalline-default`, an alternate lens): **0 serious/critical violations**; inside `[data-style-lens-shell]`, a focused button's computed `outline-color` resolves to the active lens's `--world-accent`; **outside** the shell, computed focus style is byte-identical to the pre-slice baseline (proves legacy globals untouched); `page.emulateMedia({ forcedColors: 'active' })` → computed outline is the system `Highlight` color inside the shell.
4. **Visual (Victory):** after a Slice-2 Apply switching lens, a chart consuming the existing provider/helper shows the PRIMARY series in the new accent; SECONDARY series and all chrome are pixel-identical to the pre-slice baseline.
5. Line budget: each new file ≤ 300 lines (`wc -l` gate).

## 6. FAIL-CLOSED CHECKS (demonstrate both)

- **C6:** unset `--world-accent` on the shell → computed focus outline resolves to fallback `#60c0f0`; focus is never unstyled. Invalid accent cannot reach the shell (S1 validator rejects at Apply → safety lens); IACVT chain documented in §2.
- **C7:** corrupt `--world-accent` → shipped bridge already fails closed to `SWAN_CHART_PALETTE.primary`, and the helper's `asValidHex` re-guards it; corrupt `--frost-white` → table fallback; `getComputedStyle` throwing → complete pure-Swan bundle; **deleting `victoryLensTheme.ts` breaks nothing** — every chart on the shipped bridge keeps working (pure additive).

---

## 7. DELTA vs ORIGINAL SLICE 3

| Original (blind) | Re-issued (grounded) | Why |
|---|---|---|
| Global `:focus-visible` + `::selection` | Scoped to `[data-style-lens-shell]`; 4 legacy files retained by name; precedence (0,2,0) vs (0,1,0); forced-colors same-value harmonization | Correction 3 — no 2nd competing global rule |
| Read fictional `--lens-core-focus-ring` / `--lens-core-selection-*`, `--lens-geo-radius-sm` | Reads existing `--world-accent` + `--bg-base` with S1-A §B fallbacks; zero new focus/selection tokens | Those tokens don't exist on this substrate |
| Emitted 6 `--world-z-*` + `--world-target-size` + 7 `--world-data-*` | Emits **zero** `--world-*`. `--lens-z-*` interim family instead; `--world-target-size` deleted (44px already enforced via `validateRecipeV2` + `.lens-target`); `--world-data-*` deleted entirely | Corrections 1, 2, 4 |
| `--lens-elev-*` on `rgba(2,6,18,…)` via `MODIFY worldProjection.ts` (+30) | `--lens-elev-*` rebased to shipped S1-A shadow `rgba(10,10,15,…)`, emitted by the new module; worldProjection untouched | S1-C core is frozen; base value must match shipped |
| C6 CSS via `MODIFY styles/lensCoreStyles.ts` | New `styles/lensSurfaceStyles.ts` string module (Slice-2 viewport-styles pattern) | S1-C core is frozen |
| C7 `buildVictoryThemeFromLens` reading `--world-data-1..5/-grid/-axis`, re-theming chrome | New sibling `resolveLensVictoryTheme` **composing** `resolveLensChartPalette`; 2-entry qualitative; chrome Swan-fixed; deferral named in code | Correction 1 — tokens don't exist; decision is deliberate |
| MODIFY 4 dashboard shells (literal sweep) | **Dropped from this slice.** Elevation/z adoption by surfaces is opt-in (`.lens-elev-*`, `var(--lens-z-*)`) follow-up | "Do NOT touch the 36 surfaces" |

---

## 8. DEFERRED — ready-to-wire, NOT built (S1-A §3.C pattern)

### 8.1 → Chart Charter (+ Lane A, Rule 67): multi-series dataviz tokens
Proposed values, contrast vs `--bg-base #0a0a0f`:

| Token | Proposed | Contrast | Note |
|---|---|---|---|
| `--world-data-1` | `#60c0f0` | 9.7:1 | ice-wing, in-palette |
| `--world-data-2` | `#8b5cf6` | 4.7:1 | wing-purple, in-palette |
| `--world-data-3` | `#c6a84b` | 8.6:1 | gilded-fern, in-palette |
| `--world-data-4` | `#e0ecf4` | 15.3:1 | frost-white, in-palette |
| `--world-data-5` | `#d98a9e` | 7.6:1 | **NEW hue — requires design-token review** (no in-palette 5th candidate clears 3:1 with hue separation; midnight-sapphire fails at 1.3:1) |
| `--world-data-grid` | `rgba(224,236,244,0.12)` | decorative | non-text |
| `--world-data-axis` | `rgba(224,236,244,0.48)` | 4.3:1 | frost-white derivation |

Wire path when ratified: exactly one edit — the marked `qualitative` extension point in `victoryLensTheme.ts`. The shipped bridge's "secondary stays Swan-fixed" comment is the Charter's to amend, not this slice's.

### 8.2 → Lane A (Rule 67): `--world-z-*` promotion
Proposed: `--world-z-base 0` · `-raised 100` · `-sticky 200` · `-overlay 300` · `-modal 400` · `-toast 500` — **numerically identical** to `--lens-z-*`, so promotion is a zero-churn alias (same pattern S1-C used for the console-alias retirement), then `--lens-z-*` deprecates.

### 8.3 → Follow-ups (design-lane, queued, not this slice)
- Per-lens `--lens-elev-*` overrides: requires adding the family to the S1 validator allowlist (S1-C file — frozen here).
- Align Slice-2's `CRYSTALLIZE_OVERLAY_Z` constant to read `var(--lens-z-overlay)` (one line).
- Surface adoption of `.lens-elev-*` / `var(--lens-z-*)` (opt-in; the original shell literal-sweep re-scoped).
- Legacy global focus/selection consolidation: the supersede list is **pre-declared** (the four files in §2); when the lens shell covers app root, retirement = deleting those four rulesets, no archaeology.

---

## 9. HOUSE-RULE CONFORMANCE
Raw hex only in the two declared audit tables + test assertions (rule 1 ✓) · banned trio absent, grep-gated (2 ✓) · no 4th namespace — `--lens-elev-*`/`--lens-z-*` are additive inside `--lens-*`, zero new `--world-*` (3 ✓) · existing world vars + data attributes untouched (4 ✓) · no animation added (5 ✓) · static imports only; helper composes the shipped module (6 ✓) · no z/shadow literals outside token declarations; no `!important` (7 ✓) · no light mode/telemetry/PII (8 ✓) · Victory, styled-components, and the single-Apply `AppearanceProfile` shape untouched (9 ✓) · every file ≤ 300 lines; where this document was silent (import specifier depth, test-runner stubbing), it defers to the existing repo pattern rather than improvising (10 ✓).

**Opus verifies fidelity to this re-issued Slice 3 only. No merge without §5 green and both §6 fail-closed checks demonstrated.**
