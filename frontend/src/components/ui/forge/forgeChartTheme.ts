/**
 * forgeChartTheme — Victory theme derived from the Forge token pack (Phase 2f).
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUEPRINT (Rule 5): the FIRST real consumer of `forgeTheme.generated.ts`
 * (plan §16 — "generator proven, adoption pending" → adoption begins here).
 * Every color below is a pack token projected into JS; no literal hex lives in
 * this file, so a pack change re-themes charts on regeneration. Victory is the
 * SS-PT adapter (Rule 10) — this theme is explicitly SS-PT-shaped; an adapter
 * INTERFACE is deferred until a second charting consumer exists (plan §11.A6).
 * Shape mirrors `components/Charts/chartTheme.ts` `victoryTheme` so a strangler
 * swap is a one-line prop change.
 */
import { forgeTheme } from '../../../styles/forgeTheme.generated';

/** hex → rgba string (alpha helper; no color literals introduced). */
const alpha = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const dataFont: string = forgeTheme.fontData;
const uiFont: string = forgeTheme.fontUi;
const label = (size: number, font: string = dataFont) => ({ fill: forgeTheme.textPrimary, fontSize: size, fontFamily: font });

/** Series palette — the Dual-Button Glow poles + gold, in Forge token order. */
export const FORGE_SERIES = [forgeTheme.glowB, forgeTheme.glowA, forgeTheme.colorGold, forgeTheme.colorSuccess, forgeTheme.colorWarning] as const;

export const forgeVictoryTheme = {
  axis: {
    style: {
      axis: { stroke: alpha(forgeTheme.glowB, 0.2), strokeWidth: 1 },
      grid: { stroke: alpha(forgeTheme.textPrimary, 0.06), strokeWidth: 1, strokeDasharray: '4 4' },
      ticks: { stroke: alpha(forgeTheme.glowB, 0.2), size: 4 },
      tickLabels: { fill: forgeTheme.textSecondary, fontSize: 10, fontFamily: dataFont, padding: 6 },
      axisLabel: { fill: forgeTheme.textSecondary, fontSize: 11, fontFamily: uiFont, padding: 28 },
    },
  },
  line: { style: { data: { stroke: forgeTheme.glowB, strokeWidth: 2 }, labels: label(11) } },
  area: { style: { data: { fill: alpha(forgeTheme.glowB, 0.15), stroke: forgeTheme.glowB, strokeWidth: 2 }, labels: label(11) } },
  bar: { style: { data: { fill: forgeTheme.glowB }, labels: label(11) } },
  scatter: { style: { data: { fill: forgeTheme.glowA, stroke: forgeTheme.bgBase, strokeWidth: 1 }, labels: label(11) } },
  pie: { style: { data: { stroke: forgeTheme.bgBase, strokeWidth: 1 }, labels: label(11) }, colorScale: [...FORGE_SERIES] },
  tooltip: {
    style: { fill: forgeTheme.textPrimary, fontSize: 11, fontFamily: dataFont },
    flyoutStyle: { fill: alpha(forgeTheme.bgElevated, 0.95), stroke: alpha(forgeTheme.glowA, 0.3), strokeWidth: 1 },
    cornerRadius: 6,
    pointerLength: 6,
  },
  legend: { style: { labels: label(12, uiFont) }, colorScale: [...FORGE_SERIES] },
} as const;

/** Motion honors the pack: reduced-motion packs zero it, Victory gets no animation. */
export const forgeVictoryAnimate = (forgeTheme.motion as string) === '0' ? undefined : { duration: 800, easing: 'cubicInOut' as const };
