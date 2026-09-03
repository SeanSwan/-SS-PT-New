/**
 * waves.js — the round: waves arrive, they touch you, you die, you go again.
 *
 * TEACHING NOTE — THIS IS THE SLICE THE GREY-BOX EXISTS FOR:
 * Everything so far was scaffolding. THIS is the loop a player actually experiences, and it is
 * deliberately being tested with untextured boxes. If the answer to "did I want another round?"
 * is no here, the fix is in these numbers — speed, spacing, wave size, hp — and not in art.
 * Finding that out now costs a week. Finding it out after a cast of monsters costs months.
 *
 * TEACHING NOTE — THE DIFFICULTY CURVE:
 * waveSize grows, but SLOWLY and with a ceiling. Two failure modes it avoids:
 *   - doubling every wave: wave 8 is 256 enemies and the machine dies,
 *   - a flat count: nothing escalates, and there is no reason to keep playing.
 * A gentle curve plus a cap is the boring, correct answer, and the cap is a performance guarantee
 * as much as a design one.
 */

import { hurtsNow, holdsWave } from './lifecycle.js';
import { ROSTER, typeForSlot } from '../enemies/roster.js';
import { PARTS } from '../enemies/partsData.js';
import { ROOMS, PLAYER_RADIUS } from '../world/rooms.js';

/** How many hits the player survives. Low on purpose — a long health bar hides bad feel. */
export const PLAYER_HP = 3;

/** How close an enemy must get to hurt you. */
export const TOUCH_RADIUS = 1.1;

/**
 * THE range question, answered once. Both askers — "should this enemy start attacking?"
 * (store.tick) and "does the landing strike connect?" (tickRound) — call this same function, so
 * the two can never quietly disagree. When the design wants a lunge that REACHES farther than the
 * trigger (it will — it is a lunge), the asymmetry gets built here, visibly, not by two constants
 * drifting apart (GLM-Flash hostile review, finding 3).
 */
export const inTouchRange = (enemy, player) => dist2(enemy, player) <= TOUCH_RADIUS ** 2;

/** Ceiling on a wave, so wave 50 cannot melt the machine. */
const MAX_WAVE_SIZE = 40;

/** Wave 1 = 3, then +2 each wave, capped. Tuned to be learnable, then relentless. */
export function waveSize(wave) {
  return Math.min(MAX_WAVE_SIZE, 1 + wave * 2);
}

/**
 * Spawn `count` enemies evenly around a ring at `radius`, so they arrive from all sides rather
 * than as one clump you can simply run away from.
 *
 * The ring is centred on `centre` — THE PLAYER, not the origin. The world became effectively
 * infinite when the floor started following the player; a ring fixed at the origin would then
 * spawn wave 9 forty units behind a player who has been kiting north, and the game turns into
 * waiting for a delivery. Threats spawn around wherever you actually are.
 */
/**
 * Keep a spawn point inside the room, as far from the player as the room allows (S6a).
 *
 * The ring assumes an infinite plane. Once walls exist, a ring of radius 18 around a player in a
 * 24x20 room puts most of the wave INSIDE the walls, where they pile up against geometry the
 * player can see them stuck behind. Until windows meter entry (S6b), a spawn that lands outside is
 * pulled back to the room's edge along the same bearing — so threats still arrive from all sides,
 * they just arrive from the wall you are not facing instead of from inside it.
 */
function intoRoom(x, z, roomId, player) {
  const room = ROOMS[roomId];
  if (!room) return { x, z };
  const m = PLAYER_RADIUS + 0.6;
  const lo = { x: room.bounds.minX + m, z: room.bounds.minZ + m };
  const hi = { x: room.bounds.maxX - m, z: room.bounds.maxZ - m };
  const clamp = (p) => ({ x: Math.max(lo.x, Math.min(hi.x, p.x)), z: Math.max(lo.z, Math.min(hi.z, p.z)) });
  const MIN = 6; // fair-spawn: never materialise inside the player's reaction distance

  const clamped = clamp({ x, z });
  const away = (p) => Math.hypot(p.x - player.x, p.z - player.z);
  if (away(clamped) >= MIN) return clamped;

  // The clamp pulled this spawn into the player's lap — which happens whenever they stand near a
  // wall, and ALWAYS in a corner. Pushing "away along the bearing" and re-clamping does not work
  // there: the clamp simply undoes the push, and the first version of this shipped spawns 1 unit
  // from a cornered player. So MARCH along the bearing to the wall instead, and take the far
  // point; if that side is short (a corner), the opposite bearing has the whole room behind it.
  const bx = clamped.x - player.x; const bz = clamped.z - player.z;
  const d0 = Math.hypot(bx, bz);
  const dir = d0 > 1e-6 ? { x: bx / d0, z: bz / d0 } : { x: 1, z: 0 };
  const reach = (u) => {
    // Distance from the player to the room edge along the unit vector u (slab method).
    const tx = u.x > 0 ? (hi.x - player.x) / u.x : u.x < 0 ? (lo.x - player.x) / u.x : Infinity;
    const tz = u.z > 0 ? (hi.z - player.z) / u.z : u.z < 0 ? (lo.z - player.z) / u.z : Infinity;
    return Math.max(0, Math.min(tx, tz));
  };
  const forward = reach(dir);
  const back = reach({ x: -dir.x, z: -dir.z });
  const u = forward >= back ? dir : { x: -dir.x, z: -dir.z };
  const t = Math.max(forward, back);
  const marched = clamp({ x: player.x + u.x * t, z: player.z + u.z * t });
  if (away(marched) >= MIN) return marched;

  // Even the march can fail: stand in a CORNER and a diagonal bearing is blocked BOTH ways — one
  // side by the x wall, the other by the z wall — so the line genuinely has no room even though
  // the ROOM does. The farthest point inside a box is always one of its corners, so that is the
  // fallback: not a heuristic, the actual maximum. (Found by sweeping every standing position;
  // the two earlier versions each looked correct and each left a cornered player with a spawn in
  // their lap — a geometry claim needs a sweep, not an example.)
  const corners = [
    { x: lo.x, z: lo.z }, { x: lo.x, z: hi.z }, { x: hi.x, z: lo.z }, { x: hi.x, z: hi.z },
  ];
  return corners.reduce((best, c) => (away(c) > away(best) ? c : best), corners[0]);
}

export function spawnRing(count, radius, waveNumber = 1, centre = { x: 0, z: 0 }, now = 0, roomId = null) {
  const out = [];
  for (let i = 0; i < count; i++) {
    // Offset by the wave number so successive waves do not arrive at identical angles.
    const angle = (i / count) * Math.PI * 2 + waveNumber * 0.37;
    // The roster decides WHO fills the slot and what its numbers are — a monster is a row.
    const type = typeForSlot(waveNumber, i);
    const spec = ROSTER[type];
    // A BATCHED row fills its slot with a cluster, not one body (F9). The cluster fans out ALONG
    // the ring (a small angular spread) rather than in depth, so every member is still exactly
    // `radius` away — the fair-spawn distance is a promise, and a flood must not break it.
    const batch = spec.batch ?? 1;
    for (let b = 0; b < batch; b++) {
    const spreadAngle = angle + (batch > 1 ? (b - (batch - 1) / 2) * 0.09 : 0);
    const spot = intoRoom(
      centre.x + Math.cos(spreadAngle) * radius,
      centre.z + Math.sin(spreadAngle) * radius,
      roomId, centre,
    );
    out.push({
      id: `w${waveNumber}-e${i}${batch > 1 ? `-${b}` : ''}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      x: spot.x,
      z: spot.z,
      hp: spec.hp,
      // The aim sphere and part shapes scale WITH the rendered silhouette (R1/H8): a monster
      // drawn at 1.5x is hit like a 1.5x monster. renderScale multiplies part shapes in hitscan.
      aimRadius: spec.aimRadius * (spec.renderHeight ?? 1),
      renderScale: spec.renderHeight ?? 1,
      // Locational damage (D3): parted monsters carry their measured hit shapes from the
      // manifest. Shared reference on purpose — hitscan only reads it. Partless types stay on
      // the single waist sphere.
      ...(PARTS[type] ? { parts: PARTS[type] } : {}),
      // Born into the state machine: a brief fair-spawn window before it can act or be shot.
      state: 'spawning',
      stateSince: now,
    });
    }
  }
  return out;
}

const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

/**
 * One frame of round logic.
 *
 * TEACHING NOTE — DAMAGE CHANGED FROM A TAX TO A GAME:
 * Before the lifecycle, an enemy hurt you by mere PROXIMITY, every frame it touched. Now an enemy
 * in range first enters `attacking` and telegraphs a wind-up; only past ATTACK_WINDUP — and only
 * if you are STILL in range — does the strike land. Step back during the wind-up and the lunge
 * whiffs. Both questions are asked of the lifecycle table (hurtsNow / holdsWave), never answered
 * locally — one place to be wrong.
 *
 * @param {{hp:number, wave:number}} round
 * @param {{x:number,z:number}} player
 * @param {object[]} enemies   the REAL board, corpses included — see the Slice-5 lesson
 * @param {number} now         the game clock, for the wind-up arithmetic
 * @returns {{hp:number, wave:number, over:boolean, cleared:boolean, touched:boolean}}
 */
export function tickRound(round, player, enemies, now = 0) {
  // ONE life per frame however many strikes land. Without this, walking into a crowd deletes the
  // whole health bar in a single frame and the death feels arbitrary rather than earned.
  const biters = enemies.filter((e) => hurtsNow(e, now) && inTouchRange(e, player));
  const touched = biters.length > 0;
  const hp = Math.max(0, touched ? round.hp - 1 : round.hp);
  // The kissing bug's bite leaves a FEVER — and the design rule is that it is always visible, never
  // a hidden debuff (ox-parasite-expansion: "a visible fever timer... never a hidden debuff"). The
  // roster row owns the duration, so a second fever-carrier is a row, not a branch here.
  const fever = biters.reduce((best, e) => Math.max(best, ROSTER[e.type]?.onTouch?.fever ?? 0), 0);

  // Corpses do not hold a wave open: mid-topple enemies are on the board but already beaten.
  const cleared = enemies.every((e) => !holdsWave(e));
  return {
    hp,
    wave: cleared ? round.wave + 1 : round.wave,
    over: hp <= 0,
    cleared,
    touched,
    fever,
  };
}
