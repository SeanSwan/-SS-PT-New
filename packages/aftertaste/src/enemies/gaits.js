/**
 * gaits.js — movement IDENTITY as data (Beyond-Zombies S2, lane 2).
 *
 * TEACHING NOTE — A CAST READS AS ALIVE THROUGH MOVEMENT MORE THAN MESH:
 * The same model at the same speed reads as a prop; the same model with a signature WAY of moving
 * reads as a creature. A gait here is a pure function of (row data, time, per-enemy seed) → a small
 * pose delta layered on top of steering. Pure on purpose: node tests can prove every pose stays
 * bounded without a browser, and the blueprint's gait/hitbox law (Flash #15) is enforceable — a
 * gait may DECORATE the position, never move the body outside its hit shapes.
 *
 * The pose fields:
 *   rotX / rotZ  — lean (radians), e.g. the shamble's side-to-side sway
 *   yawJitter    — heading wobble (radians) layered on the facing direction
 *   yOffset      — bob (world units, small)
 *   speedScale   — multiplies this frame's steering speed (the skitter's burst rhythm)
 */

/** Deterministic per-enemy phase from its id, so a crowd never sways in lockstep. */
export function gaitSeed(id) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000 * Math.PI * 2;
}

const STILL = { rotX: 0, rotZ: 0, yawJitter: 0, yOffset: 0, speedScale: 1 };

/**
 * The pose for one enemy this frame. Unknown/absent gait = STILL (a row without a gait moves the
 * old way, so the whole cast never depends on this file being complete).
 */
export function gaitPose(gait, t, seed = 0) {
  if (!gait) return STILL;
  if (gait.type === 'shamble') {
    // The Regular: heavy side-to-side sway with a slight forward hang — weight, not bounce.
    const p = t * gait.hz * Math.PI * 2 + seed;
    return {
      rotZ: Math.sin(p) * gait.sway,
      rotX: 0.06 + Math.sin(p * 0.5) * 0.02,
      yawJitter: 0,
      yOffset: Math.abs(Math.sin(p)) * 0.02,
      speedScale: 1,
    };
  }
  if (gait.type === 'skitter') {
    // The roach: bursts of speed with darting heading wobble — insect rhythm, not a glide.
    const p = t * gait.burstHz * Math.PI * 2 + seed;
    const burst = Math.max(0, Math.sin(p)); // half-wave: sprint, pause, sprint
    return {
      rotZ: 0,
      rotX: 0,
      yawJitter: Math.sin(p * 3.7 + seed) * gait.jitter,
      yOffset: 0,
      // A half-wave sine averages 1/π (≈0.318), so 0.68 + burst×1.0 averages ≈1.0 — the roster
      // speed stays the truth. The first constants here (0.4 + 1.2) averaged 0.78: the "rhythm"
      // was a 22% stealth NERF, and only the averaging test caught it.
      speedScale: 0.68 + burst * 1.0,
    };
  }
  return STILL;
}
