/**
 * Equipment IQ Geometry — pure math for the pattern-web radial + arc gauge
 * ========================================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #4
 *
 * Pure, DOM-free geometry so the radial math stays unit-testable. Lays out
 * however many movement patterns the API returns (7 OR 8 — never hardcoded),
 * evenly spaced. Angle convention for the web: radians, 0 = top (12 o'clock),
 * increasing clockwise. Arc-gauge convention: phi in [0, PI], 0 = left end of
 * the semicircle, PI = right end, sweeping over the top.
 */

export interface PatternCoverageInput {
  pattern: string;
  /** 0..1 coverage from the gap report (clamped defensively). */
  coverage: number;
}

export interface SpokePoint {
  pattern: string;
  coverage: number;
  /** Radians; 0 at top, clockwise. */
  angle: number;
  outerX: number;
  outerY: number;
  tipX: number;
  tipY: number;
  labelX: number;
  labelY: number;
}

export interface ArcSegment {
  pattern: string;
  coverage: number;
  /** Full faint track for the segment. */
  trackPath: string;
  /** Coverage-proportional fill arc; null when coverage is 0. */
  fillPath: string | null;
  labelX: number;
  labelY: number;
}

export interface ArcGaugeLayout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  segments: ArcSegment[];
}

/** Web radius as a fraction of the SVG size (leaves the label ring room). */
export const WEB_RADIUS_RATIO = 0.34;
/** Label ring radius as a fraction of the SVG size. */
export const LABEL_RADIUS_RATIO = 0.44;
/** Radian gap between arc-gauge segments. */
export const ARC_GAP_RAD = 0.05;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Point on the web at `angle` (0 = top, clockwise) and `radius` from center. */
const webPoint = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.sin(angle),
  y: cy - radius * Math.cos(angle),
});

/** Point on the gauge semicircle at phi (0 = left, PI = right, over the top). */
const arcPoint = (cx: number, cy: number, radius: number, phi: number) => ({
  x: cx - radius * Math.cos(phi),
  y: cy - radius * Math.sin(phi),
});

/**
 * Evenly lay out N pattern spokes around the web. The first spoke points
 * straight up; spacing is always 2*PI/N — 7 patterns or 8, never hardcoded.
 */
export function computeSpokePoints(
  patterns: PatternCoverageInput[],
  size: number,
): SpokePoint[] {
  const list = Array.isArray(patterns) ? patterns : [];
  const count = list.length;
  if (count === 0) return [];
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * WEB_RADIUS_RATIO;
  const labelRadius = size * LABEL_RADIUS_RATIO;
  return list.map((entry, index) => {
    const angle = (2 * Math.PI * index) / count;
    const coverage = clamp01(entry.coverage);
    const outer = webPoint(cx, cy, maxRadius, angle);
    const tip = webPoint(cx, cy, maxRadius * coverage, angle);
    const label = webPoint(cx, cy, labelRadius, angle);
    return {
      pattern: entry.pattern,
      coverage,
      angle,
      outerX: round2(outer.x),
      outerY: round2(outer.y),
      tipX: round2(tip.x),
      tipY: round2(tip.y),
      labelX: round2(label.x),
      labelY: round2(label.y),
    };
  });
}

/**
 * Closed N-gon path (the web rings / empty-state dashed heptagon).
 * Vertices share the web angle convention so rings align with spokes.
 */
export function polygonPath(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle = 0,
): string {
  if (sides < 3 || radius <= 0) return '';
  const points: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const { x, y } = webPoint(cx, cy, radius, startAngle + (2 * Math.PI * i) / sides);
    points.push(`${round2(x)} ${round2(y)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/**
 * Weakest pattern = lowest coverage; earlier index breaks ties — mirrors
 * backend/services/equipmentGapReport.mjs so client math never disagrees.
 */
export function findWeakestPattern(
  patterns: PatternCoverageInput[],
): string | null {
  const list = Array.isArray(patterns) ? patterns : [];
  if (list.length === 0) return null;
  let weakest = list[0];
  for (const entry of list) {
    if (clamp01(entry.coverage) < clamp01(weakest.coverage)) weakest = entry;
  }
  return weakest.pattern;
}

/** Overall coverage as a whole-number percent label value. */
export function coveragePercent(overallCoverage: number): number {
  return Math.round(clamp01(overallCoverage) * 100);
}

const arcPathBetween = (
  cx: number,
  cy: number,
  radius: number,
  phi0: number,
  phi1: number,
): string => {
  const start = arcPoint(cx, cy, radius, phi0);
  const end = arcPoint(cx, cy, radius, phi1);
  const largeArc = phi1 - phi0 > Math.PI ? 1 : 0;
  return `M ${round2(start.x)} ${round2(start.y)} A ${round2(radius)} ${round2(radius)} 0 ${largeArc} 1 ${round2(end.x)} ${round2(end.y)}`;
};

/**
 * Mobile (<768px) collapse: the same patterns as a horizontal segmented
 * semicircular arc gauge. Each pattern gets an equal segment (minus gaps);
 * the coverage fill sweeps a proportional fraction of its segment.
 */
export function computeArcGauge(
  patterns: PatternCoverageInput[],
  width: number,
): ArcGaugeLayout {
  const list = Array.isArray(patterns) ? patterns : [];
  const cx = width / 2;
  const radius = Math.max(20, width / 2 - 28);
  const cy = radius + 24;
  const height = cy + 26;
  const count = list.length;
  if (count === 0) return { width, height, cx, cy, radius, segments: [] };

  const segmentSweep = (Math.PI - (count - 1) * ARC_GAP_RAD) / count;
  const segments = list.map((entry, index) => {
    const phi0 = index * (segmentSweep + ARC_GAP_RAD);
    const phi1 = phi0 + segmentSweep;
    const coverage = clamp01(entry.coverage);
    const label = arcPoint(cx, cy, radius - 22, (phi0 + phi1) / 2);
    return {
      pattern: entry.pattern,
      coverage,
      trackPath: arcPathBetween(cx, cy, radius, phi0, phi1),
      fillPath:
        coverage > 0
          ? arcPathBetween(cx, cy, radius, phi0, phi0 + segmentSweep * coverage)
          : null,
      labelX: round2(label.x),
      labelY: round2(label.y),
    };
  });
  return { width, height, cx, cy, radius, segments };
}
