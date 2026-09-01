/**
 * sheenColor — colour maths for the Sheen pointer engine (SWA-224)
 * =================================================================
 * Extracted from `useSheenPointer` when that file crossed the 300-line cap
 * (Rule 4). Pure functions, no DOM, no state — which also makes them the
 * cheapest part of the engine to test.
 */

const lerpChannel = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
};

/**
 * Continuous colour blend across the surface width — candidate B's behaviour,
 * as opposed to the midpoint flip the production GlowButton used. `t` is clamped,
 * so a pointer parked past an edge yields the edge colour rather than an
 * extrapolated one.
 */
export const blendHex = (from: string, to: string, t: number): [number, number, number] => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const k = Math.min(1, Math.max(0, t));
  return [lerpChannel(a[0], b[0], k), lerpChannel(a[1], b[1], k), lerpChannel(a[2], b[2], k)];
};
