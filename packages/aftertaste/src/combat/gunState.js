/**
 * gunState.js — the live gun: current spread, recoil-pattern position, ADS. The mutable object
 * lives outside React/zustand (it changes every shot and every frame; nothing UI-shaped reads it
 * raw — the HUD reads a coarse spread fraction via the store's shots). Pure functions do the
 * math so node tests need no browser.
 */
import { WEAPONS, DEFAULT_WEAPON, RECOIL_RESET, SWAP_SECONDS, SPRINT_OUT_SECONDS } from './weapons.js';

/**
 * TWO GUNS, ONE PAIR OF HANDS (S5).
 *
 * You carry two and hold one. That limit is what makes a wall-buy a DECISION — with unlimited
 * slots every purchase is strictly good and the economy's spend side collapses into shopping.
 * Ammo is per-slot, because a swap that refilled your magazine would make swapping a reload.
 */
export const gun = {
  weaponId: DEFAULT_WEAPON,
  /** The two carried weapons; `slot` says which is in your hands. */
  slots: [DEFAULT_WEAPON, null],
  slot: 0,
  /** Per-slot ammo, so each gun remembers its own magazine across swaps. */
  ammo: [
    { mag: WEAPONS[DEFAULT_WEAPON].mag, reserveAmmo: WEAPONS[DEFAULT_WEAPON].reserve },
    null,
  ],
  /** Clock times: the gun is mid-swap until now >= swapUntil; it cannot fire until sprintOutUntil. */
  swapUntil: 0,
  sprintOutUntil: 0,
  /** Semi-auto bookkeeping: a held trigger fires once and waits for a fresh press. */
  firedThisPress: false,
  spread: WEAPONS[DEFAULT_WEAPON].spread.base,
  burstIndex: 0,
  lastShotAt: -Infinity,
  ads: false,
  mag: WEAPONS[DEFAULT_WEAPON].mag,
  reserveAmmo: WEAPONS[DEFAULT_WEAPON].reserve,
  reloadingUntil: 0, // a clock time; the gun is reloading while now < reloadingUntil
};

export const weaponOf = (g) => WEAPONS[g.weaponId];

// ---- Ammo (Beyond-Zombies S1) ----------------------------------------------------------------
// Pure delta-returning functions, same shape as the spread math: callers spread the result over
// their own gun object, so node tests never need the live singleton.

/**
 * Can the trigger do anything right now? Every reason a gun refuses, in ONE place — empty
 * magazine, mid-reload, mid-swap, still coming out of a sprint, and (for a semi) a trigger that
 * has not been released since the last shot. Scattering these across the frame loop is how two of
 * them quietly disagree.
 */
export const canFire = (g, now) => g.mag > 0
  && now >= (g.reloadingUntil ?? 0)
  && now >= (g.swapUntil ?? 0)
  && now >= (g.sprintOutUntil ?? 0)
  && !(weaponOf(g).fireMode === 'semi' && g.firedThisPress);

/** Begin a swap to the other slot. A no-op when the other hand is empty — one gun cannot swap. */
export function startSwap(g, now) {
  const other = 1 - g.slot;
  if (!g.slots[other]) return {};
  return { swapUntil: now + SWAP_SECONDS, pendingSlot: other };
}

/**
 * Land a swap: the other weapon is now in your hands, with ITS magazine, at ITS base spread.
 * Stowing the current gun banks its ammo — a gun you come back to is the gun you left.
 */
export function finishSwap(g) {
  const to = g.pendingSlot;
  const ammo = [...g.ammo];
  ammo[g.slot] = { mag: g.mag, reserveAmmo: g.reserveAmmo };
  const incoming = ammo[to] ?? { mag: WEAPONS[g.slots[to]].mag, reserveAmmo: WEAPONS[g.slots[to]].reserve };
  return {
    slot: to,
    pendingSlot: null,
    // Clear the timer the swap set. Leaving a stale past timestamp behind means "am I mid-swap?"
    // has two possible answers depending on whether the reader compares to `now` or to zero — and
    // a state machine with two truths is the bug, even when both currently agree.
    swapUntil: 0,
    weaponId: g.slots[to],
    ammo,
    mag: incoming.mag,
    reserveAmmo: incoming.reserveAmmo,
    spread: WEAPONS[g.slots[to]].spread.base,
    burstIndex: 0,
    reloadingUntil: 0,
    ads: false,
  };
}

/** Put a weapon into a slot (a wall-buy, or the dev keys). Buying a third replaces what you hold. */
export function equip(g, weaponId, now) {
  // An id nobody declared is a caller bug, not a new gun. Refusing beats corrupting the hands with
  // an undefined weapon whose every stat read is a crash three frames later.
  if (!WEAPONS[weaponId]) return {};
  const target = g.slots[1] == null && g.slots[0] !== weaponId ? 1 : g.slot;
  const slots = [...g.slots]; slots[target] = weaponId;
  const ammo = [...g.ammo]; ammo[target] = { mag: WEAPONS[weaponId].mag, reserveAmmo: WEAPONS[weaponId].reserve };
  const holding = target === g.slot;
  return {
    slots, ammo,
    ...(holding ? {
      weaponId, mag: WEAPONS[weaponId].mag, reserveAmmo: WEAPONS[weaponId].reserve,
      spread: WEAPONS[weaponId].spread.base, burstIndex: 0, reloadingUntil: 0,
    } : {}),
    swapUntil: now + (holding ? SWAP_SECONDS : 0),
  };
}

/** One shot's ammo cost. Firing an empty gun is a no-op — the dry click is the caller's feedback. */
export const ammoAfterShot = (g) => ({ mag: Math.max(0, g.mag - 1) });

/** Is a reload worth anything? (Full mags and empty reserves both say no.) */
export const needsReload = (g) => g.mag < weaponOf(g).mag && g.reserveAmmo > 0;

/**
 * Begin reloading: a STATE with a duration, not an instant. The rounds move at the END —
 * finishReload — because an interrupted reload (sprint-cancel, death) must leave the mag exactly
 * as it was, and that is only possible if starting moves nothing.
 */
export const FEVER_RELOAD_SCALE = 1.25;

export const startReload = (g, now, fevered = false) =>
  needsReload(g)
    // A fever makes your hands slower — the cost is paid exactly where a horde player feels it,
    // in the seconds between an empty magazine and a full one (F10).
    ? { reloadingUntil: now + weaponOf(g).reloadSeconds * (fevered ? FEVER_RELOAD_SCALE : 1) }
    : {};

/** Complete the reload: top the mag up from reserve, paying only for the rounds that moved. */
export function finishReload(g) {
  const take = Math.min(weaponOf(g).mag - g.mag, g.reserveAmmo);
  return { mag: g.mag + take, reserveAmmo: g.reserveAmmo - take, reloadingUntil: 0 };
}

/**
 * The recoil kick for THIS shot — deterministic: position N of a burst always kicks the same
 * (Sean: "not just a random kick up"). A pause of RECOIL_RESET restarts the pattern.
 */
export function recoilKick(g, now) {
  const w = weaponOf(g);
  const idx = (now - g.lastShotAt > RECOIL_RESET) ? 0 : g.burstIndex;
  // PAST THE PATTERN, CYCLE — never clamp (F7). Clamping held the final entry forever, so a long
  // burst drifted one direction indefinitely: not a gun you learn, just a slide. `loop` names the
  // segment that repeats, so a sustained burst has a rhythm a player can pull against.
  const n = w.recoilPattern.length;
  let at = idx;
  if (idx >= n) {
    const [from, to] = w.recoilLoop ?? [0, n - 1];
    const span = (to - from) + 1;
    at = from + ((idx - n) % span);
  }
  const [pitch, yaw] = w.recoilPattern[at];
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

/**
 * How long after the last shot before the cone starts closing. Derived from the WEAPON's own fire
 * interval — "stopped firing" can only mean "longer than one firing cycle". A fixed constant
 * shorter than the interval (the first version: 0.12s vs a 0.15s interval) let recovery run
 * BETWEEN the shots of a held burst, and on a slow frame a full mag emptied without the cone ever
 * reaching its cap — the third two-rates-on-one-number bug of this project, caught by a saved
 * failure artifact showing RELOADING with the cap never hit.
 */
export const recoverDelay = (g) => weaponOf(g).fireInterval + 0.1;

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

/**
 * Put the gun away: cone closed, burst reset, sights down, magazine full (F6).
 *
 * WHY IT LIVES HERE: holstering used to be six assignments inlined in the trigger's `over` branch,
 * which meant only DEATH could holster. A reset that was not a death — a test, a future restart
 * key — left a half-blown cone and a mid-burst pattern behind. State that belongs to the gun is
 * reset by the gun.
 */
export function holster(g = gun) {
  const w = WEAPONS[g.weaponId];
  g.swapUntil = 0;
  g.sprintOutUntil = 0;
  g.firedThisPress = false;
  g.ads = false;
  g.spread = w.spread.base;
  g.burstIndex = 0;
  g.lastShotAt = -Infinity;
  g.reloadingUntil = 0;
  g.mag = w.mag;
  g.reserveAmmo = w.reserve;
  return g;
}
