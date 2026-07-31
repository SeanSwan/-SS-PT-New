/**
 * ============================================================================
 * FILE: shared/bootcamp-core/phases.mjs
 * PURPOSE: Runner phases + the TV density rule derived from viewing physics.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 */

/**
 * Runner phases, 1:1 with the Audience screen inventory (Opus 5 §1.3).
 * `paused` is deliberately NOT here — pausing is orthogonal state, not a phase.
 * Modelling it as a phase loses the information about what you were doing.
 */
export const PHASES = Object.freeze({
  LOBBY: 'lobby',                           // S0 — participants set up their own stations
  WARMUP: 'warmup',                         // S1 — hero, synchronized
  WORK: 'work',                             // S2 — clock band + N station cards
  REST: 'rest',                             // S4 — next exercise demo + one cue
  STATION_TRANSITION: 'station_transition', // S3 — MOVE → + rotation diagram
  ROUND_BREAK: 'round_break',
  COOLDOWN: 'cooldown',                     // S6 — the block that always gets skipped
  COMPLETE: 'complete',                     // S7 — capture feedback while Sean is standing there
});

export const PHASE_VALUES = Object.freeze(Object.values(PHASES));
export const isPhase = (value) => PHASE_VALUES.includes(value);

/**
 * TV DENSITY — physics, not taste (Opus 5 §0.3).
 *
 * Signage legibility wants cap height >= viewing distance / 150 for a mixed-age,
 * out-of-breath audience reading at a glance (the more common 1:200 rule assumes
 * a rested reader who can step closer). Cap height is ~0.70 of font size.
 *
 * At 20 ft (6096 mm): 6096/150 = 40.6 mm cap => ~58 mm font. On a 55" 16:9 panel
 * (685 mm tall) that is ~8.5vh — and a grid of 8 cards cannot hold that size.
 *
 * Hence: card capacity is bounded by HARDWARE. When stationCount exceeds it the
 * answer is never to shrink the cards — it is to alternate the grid in halves or
 * fall back to printed station cards, which is why paper is a first-class output.
 */
export const TV_LEGIBILITY_RATIO = 150;
export const CAP_HEIGHT_TO_FONT = 0.7;

/** 16:9 panel height in mm from a diagonal in inches. */
export function panelHeightMm(diagonalInches) {
  if (!(diagonalInches > 0)) return null;
  // 16:9 => height = diagonal * 9 / sqrt(16^2 + 9^2) = diagonal * 9 / 18.3576
  return (diagonalInches * 25.4 * 9) / Math.sqrt(16 * 16 + 9 * 9);
}

/**
 * Minimum legible font size as a percentage of viewport height.
 * @param {number} diagonalInches
 * @param {number} viewDistanceFt distance to the FARTHEST station, not the average
 * @returns {number|null} vh units
 */
export function minFontVh(diagonalInches, viewDistanceFt) {
  const heightMm = panelHeightMm(diagonalInches);
  if (!heightMm || !(viewDistanceFt > 0)) return null;
  const distanceMm = viewDistanceFt * 304.8;
  const capMm = distanceMm / TV_LEGIBILITY_RATIO;
  const fontMm = capMm / CAP_HEIGHT_TO_FONT;
  return (fontMm / heightMm) * 100;
}

/**
 * How many station cards fit legibly. Empirically a card needs roughly 3x its
 * name's font height once scheme, equipment and the always-visible modification
 * line are stacked; the grid gets ~85vh after the clock band.
 *
 * Returns null when the space profile has not been measured yet — callers must
 * treat null as "unknown, use the conservative default", never as "unlimited".
 */
export function maxStationCards(diagonalInches, viewDistanceFt) {
  const fontVh = minFontVh(diagonalInches, viewDistanceFt);
  if (fontVh === null) return null;
  const cardHeightVh = fontVh * 3;
  const usableVh = 85;
  const rows = Math.floor(usableVh / cardHeightVh);
  return Math.max(1, rows * 2); // two columns
}

/** Conservative default when the room has not been measured. */
export const DEFAULT_MAX_STATION_CARDS = 4;

/**
 * Presentation strategy when the plan has more stations than the screen can hold.
 * Never shrinks type — that is the one option physics forbids.
 */
export function stationPresentation(stationCount, capacity) {
  const limit = capacity ?? DEFAULT_MAX_STATION_CARDS;
  if (stationCount <= limit) return { mode: 'grid', perPage: stationCount, pages: 1 };
  if (stationCount <= limit * 2) {
    return { mode: 'alternating', perPage: Math.ceil(stationCount / 2), pages: 2, crossfadeSec: 6 };
  }
  return { mode: 'rotation_only', perPage: 0, pages: 1, requiresPrintedCards: true };
}
