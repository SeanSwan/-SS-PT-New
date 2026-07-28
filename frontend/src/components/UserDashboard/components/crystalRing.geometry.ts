/**
 * FILE: crystalRing.geometry.ts
 * PURPOSE: Pure geometry + the EXTENT BUDGET for the Crystal Ring evolution system.
 *   Everything is authored in a fixed 400x400 viewBox (center 200,200) so the ring renders
 *   at any CSS size with nothing ever clipping (Kimi B: "the budget IS the guarantee, not
 *   overflow:visible"). All FX must live within R_CORE + FX_BUDGET = 200 = the viewBox edge.
 * NOTE: No React, no styled-components — data only, unit-testable.
 */

export const VIEWBOX = 400;
export const CENTER = 200;
/** Core ring-band radius. Ring diameter ~78% of the box; the rest is the FX budget. Sized
 *  so the largest FX (the Apex crown at R_CORE+CROWN_OUTER=186) still clears R_MAX=200. */
export const R_CORE = 156;
/** Hard FX extent budget beyond R_CORE. R_CORE + FX_BUDGET = 200 = the viewBox edge. */
export const FX_BUDGET = 44;
/** The absolute boundary — no drawn pixel may cross this at any animation frame. */
export const R_MAX = R_CORE + FX_BUDGET; // 200
export const STROKE = 22; // band stroke in 400-space (~7px at a 132px render)

// Sub-budgets (each measured from R_CORE; all stay < FX_BUDGET so nothing clips).
export const ORBIT_OFFSET = 22;   // orbital path radius = R_CORE + 22 = 154 (+mote ≤5 → 159)
export const CROWN_INNER = 8;     // crown spikes: R_CORE+8 → R_CORE+30 (=162), well inside 200
export const CROWN_OUTER = 30;
export const AURA_MAX_SCALE = 1.1; // aura scales about center; capped so it never exceeds budget

const TAU = Math.PI * 2;

/** Points evenly spaced on a circle of radius `rad` about center (CENTER,CENTER). */
export const onCircle = (rad: number, i: number, n: number, phase = 0) => {
  const t = phase + (i / n) * TAU;
  return { x: CENTER + rad * Math.cos(t), y: CENTER + rad * Math.sin(t) };
};

/**
 * Regular-polygon path (vertices on radius `rad`), first vertex at the TOP (12 o'clock) so a
 * progress dash drawn along it starts at the top and runs clockwise. `sides < 3` → null
 * (caller draws a real circle for the smooth low-tier silhouette).
 */
export const polygonPath = (rad: number, sides: number): string | null => {
  if (sides < 3) return null;
  let d = '';
  for (let i = 0; i < sides; i += 1) {
    const p = onCircle(rad, i, sides, -Math.PI / 2);
    d += (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
  }
  return d + 'Z';
};

/** Perimeter of a regular polygon whose vertices sit on radius `rad` (for stroke-dasharray). */
export const polygonPerimeter = (rad: number, sides: number): number =>
  sides < 3 ? TAU * rad : sides * 2 * rad * Math.sin(Math.PI / sides);

/** Circumference of the circle silhouette (sides 0). */
export const circleCircumference = (rad: number): number => TAU * rad;

/**
 * The drawn length for a given progress percent along a silhouette's perimeter.
 * Works for both circle (sides<3) and polygon.
 */
export const progressDash = (pct: number, rad: number, sides: number): number => {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (safe / 100) * polygonPerimeter(rad, sides);
};
