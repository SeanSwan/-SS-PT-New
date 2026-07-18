/**
 * Slice 3 / C7 — ADDITIVE Victory-theme helper (KIMI-SWAN-LENS-SLICE3 §3). Victory-only. No new dep.
 *
 * COMPOSES the shipped bridge — does NOT replace it, does NOT re-read --world-accent itself:
 *   components/Charts/chartTheme.ts        -> resolveLensChartPalette, SWAN_CHART_PALETTE
 *   components/Charts/lensChartPalette.tsx -> LensChartPaletteProvider (untouched)
 *
 * SHIPPED DECISIONS RESPECTED (chartTheme.ts in-file intent, verbatim):
 *   1. "Chart chrome (axes, tooltips, labels) deliberately stays Swan-fixed for readability;
 *      only the data-series accent pair follows the lens." => ALL chrome below is Swan-fixed;
 *      it never reads a --world-* var.
 *   2. "Only the PRIMARY series follows --world-accent today… the secondary series stays
 *      Swan-fixed until the Chart Charter ships a real dataviz token pair." => CHART CHARTER
 *      DEFERRAL: `qualitative` is EXACTLY two entries; the multi-series dataviz tokens (the
 *      Chart-Charter proposal) do not exist yet and are NOT introduced here (proposal only, §8.1).
 *
 * SVG presentation attributes cannot carry var(), so colors are RESOLVED strings — the same
 * mechanism the shipped bridge documents. Chrome comes from Swan-fixed THEME vars (--frost-white,
 * --bg-surface) so it tracks the theme, never the lens. Fail-closed: any miss/throw/corrupt value
 * => SWAN_CHROME_FALLBACKS. Deleting this file breaks nothing (pure additive).
 */
import {
  resolveLensChartPalette,
  SWAN_CHART_PALETTE,
  type LensChartPalette,
} from '../../../components/Charts/chartTheme';

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** House-rule-#1 audit point; mirrors S1-A §B verbatim. A drift-guard test pins these. */
export const SWAN_CHROME_FALLBACKS = {
  labelFill: '#e0ecf4', // --frost-white, verbatim
  tooltipBg: '#141419', // --bg-surface, verbatim (label-on-bg 15.3:1)
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

const asValidHex = (value: string, fallback: string): string => (HEX6.test(value) ? value : fallback);

function readSwanFixedVar(host: HTMLElement | null | undefined, name: string, fallback: string): string {
  try {
    const raw = getComputedStyle(host ?? document.documentElement).getPropertyValue(name).trim();
    return asValidHex(raw, fallback);
  } catch {
    return fallback;
  }
}

function buildBundle(series: LensChartPalette, labelFill: string, tooltipBg: string): LensVictoryThemeBundle {
  return {
    theme: {
      palette: {
        // CHART CHARTER DEFERRAL — exactly 2 entries. When the Charter ships a real dataviz token
        // pair, this is the ONLY extension point. Do not add entries now.
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
 * Resolve a Victory theme bundle for the lens frame containing `host`. Re-invoke wherever
 * resolveLensChartPalette is re-invoked today (the existing appearance subscriber /
 * LensChartPaletteProvider render path) — no new subscription machinery is added by this slice.
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
