/**
 * forgeChartTheme — Victory theme derived from the Forge token pack (Phase 2f).
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUEPRINT (Rule 5): the FIRST real consumer of `forgeTheme.generated.ts`
 * (plan §16 — "generator proven, adoption pending" → adoption begins here).
 * SINGLE-SOURCE SCOPE (honest, panel round 6): COLOR, FONT FAMILY, TEXT SCALE and
 * MOTION are projected from the pack; geometry (stroke widths, paddings, radii,
 * duration) is Victory-specific and lives here as named constants — a pack cannot
 * re-rhythm a chart, only re-color/re-type it. No literal hex in this file.
 * Victory is the SS-PT adapter (Rule 10) — explicitly SS-PT-shaped; an adapter
 * INTERFACE is deferred until a second charting consumer exists (plan §11.A6).
 * Shape mirrors `components/Charts/chartTheme.ts` `victoryTheme` so a strangler
 * swap is a one-line prop change.
 */
import { forgeTheme } from '../../../styles/forgeTheme.generated';

/** Chart geometry — Victory-specific, deliberately NOT pack-driven. */
const GEOMETRY = { strokeWidth: 2, tickPadding: 6, axisLabelPadding: 28, tooltipRadius: 6, animMs: 800 } as const;
/** Label sizes follow the pack's text scale (user/site font scaling), base 10/11/12 px. */
const scale = Number(forgeTheme.textScale) || 1;
const px = (base: number) => Math.round(base * scale);

/** hex → rgba string (alpha helper; no color literals introduced). */
const alpha = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const dataFont: string = forgeTheme.fontData;
const uiFont: string = forgeTheme.fontUi;
const label = (size: number, font: string = dataFont) => ({ fill: forgeTheme.textPrimary, fontSize: px(size), fontFamily: font });

/** Series palette — the Dual-Button Glow poles + gold, in Forge token order. */
export const FORGE_SERIES = [forgeTheme.glowB, forgeTheme.glowA, forgeTheme.colorGold, forgeTheme.colorSuccess, forgeTheme.colorWarning] as const;

export const forgeVictoryTheme = {
  axis: {
    style: {
      axis: { stroke: alpha(forgeTheme.glowB, 0.2), strokeWidth: 1 },
      grid: { stroke: alpha(forgeTheme.textPrimary, 0.06), strokeWidth: 1, strokeDasharray: '4 4' },
      ticks: { stroke: alpha(forgeTheme.glowB, 0.2), size: 4 },
      tickLabels: { fill: forgeTheme.textSecondary, fontSize: px(10), fontFamily: dataFont, padding: GEOMETRY.tickPadding },
      axisLabel: { fill: forgeTheme.textSecondary, fontSize: px(11), fontFamily: uiFont, padding: GEOMETRY.axisLabelPadding },
    },
  },
  line: { style: { data: { stroke: forgeTheme.glowB, strokeWidth: GEOMETRY.strokeWidth }, labels: label(11) } },
  area: { style: { data: { fill: alpha(forgeTheme.glowB, 0.15), stroke: forgeTheme.glowB, strokeWidth: GEOMETRY.strokeWidth }, labels: label(11) } },
  bar: { style: { data: { fill: forgeTheme.glowB }, labels: label(11) } },
  scatter: { style: { data: { fill: forgeTheme.glowA, stroke: forgeTheme.bgBase, strokeWidth: 1 }, labels: label(11) } },
  pie: { style: { data: { stroke: forgeTheme.bgBase, strokeWidth: 1 }, labels: label(11) }, colorScale: [...FORGE_SERIES] },
  tooltip: {
    style: { fill: forgeTheme.textPrimary, fontSize: px(11), fontFamily: dataFont },
    flyoutStyle: { fill: alpha(forgeTheme.bgElevated, 0.95), stroke: alpha(forgeTheme.glowA, 0.3), strokeWidth: 1 },
    cornerRadius: GEOMETRY.tooltipRadius,
    pointerLength: 6,
  },
  legend: { style: { labels: label(12, uiFont) }, colorScale: [...FORGE_SERIES] },
} as const;

/**
 * Motion honors the pack multiplier NUMERICALLY (panel round 6, GLM C1 / Ox #5): any
 * pack value ≤ 0 — '0', 0, '0.0' — disables Victory animation; the generated type is
 * a string literal today, and Number() makes the gate independent of that.
 */
export const forgeVictoryAnimate = Number(forgeTheme.motion) > 0 ? { duration: GEOMETRY.animMs, easing: 'cubicInOut' as const } : undefined;
