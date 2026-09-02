/**
 * gunState.js — the live gun: current spread, recoil-pattern position, ADS. The mutable object
 * lives outside React/zustand (it changes every shot and every frame; nothing UI-shaped reads it
 * raw — the HUD reads a coarse spread fraction via the store's shots). Pure functions do the
 * math so node tests need no browser.
 */
import { WEAPONS, DEFAULT_WEAPON, RECOIL_RESET } from './weapons.js';

export const gun = {
  weaponId: DEFAULT_WEAPON,
  spread: WEAPONS[DEFAULT_WEAPON].spread.base,
  burstIndex: 0,
  lastShotAt: -Infinity,
  ads: false,
};

export const weaponOf = (g) => WEAPONS[g.weaponId];

/**
 * The recoil kick for THIS shot — deterministic: position N of a burst always kicks the same
 * (Sean: "not just a random kick up"). A pause of RECOIL_RESET restarts the pattern.
 */
export function recoilKick(g, now) {
  const w = weaponOf(g);
  const idx = (now - g.lastShotAt > RECOIL_RESET) ? 0 : g.burstIndex;
  const [pitch, yaw] = w.recoilPattern[Math.min(idx, w.recoilPattern.length - 1)];
  return { pitch, yaw, nextIndex: idx + 1 };
}

/** Spread after firing one shot: blooms per shot, hard-CAPPED (Sean: "make sure the spread has
 *  a limit"). ADS tightens the whole cone. */
export function spreadAfterShot(g) {
  const s = weaponOf(g).spread;
  return Math.min(g.spread + s.perShot, s.max);
}

/** Spread after `dt` seconds of not firing: recovers toward base, never below it. */
export function spreadAfterRest(g, dt) {
  const s = weaponOf(g).spread;
  return Math.max(s.base, g.spread - s.recovery * dt);
}

/** The effective cone half-angle right now (ADS tightens it). */
export function currentCone(g) {
  const s = weaponOf(g).spread;
  return g.spread * (g.ads ? s.adsScale : 1);
}

/**
 * Deviate an aim direction inside the current cone. The randomness is INSIDE the knowable cone —
 * uniform disc sampling perpendicular to the ray, then renormalized. rand() injectable for tests.
 */
export function applySpread(dir, cone, rand = Math.random) {
  if (cone <= 0) return dir;
  // Build any perpendicular basis to dir.
  const ax = Math.abs(dir.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  let ux = dir.y * ax.z - dir.z * ax.y; let uy = dir.z * ax.x - dir.x * ax.z; let uz = dir.x * ax.y - dir.y * ax.x;
  const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
  const vx = dir.y * uz - dir.z * uy; const vy = dir.z * ux - dir.x * uz; const vz = dir.x * uy - dir.y * ux;
  const theta = rand() * Math.PI * 2;
  const r = Math.sqrt(rand()) * cone; // sqrt: uniform over the disc, not clumped at centre
  const dx = Math.cos(theta) * r; const dy = Math.sin(theta) * r;
  const ox = dir.x + (ux * dx + vx * dy); const oy = dir.y + (uy * dx + vy * dy); const oz = dir.z + (uz * dx + vz * dy);
  const l = Math.hypot(ox, oy, oz);
  return { x: ox / l, y: oy / l, z: oz / l };
}
