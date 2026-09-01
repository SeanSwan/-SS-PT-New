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

/** How many hits the player survives. Low on purpose — a long health bar hides bad feel. */
export const PLAYER_HP = 3;

/** How close an enemy must get to hurt you. */
export const TOUCH_RADIUS = 1.1;

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
export function spawnRing(count, radius, waveNumber = 1, centre = { x: 0, z: 0 }, now = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    // Offset by the wave number so successive waves do not arrive at identical angles.
    const angle = (i / count) * Math.PI * 2 + waveNumber * 0.37;
    out.push({
      id: `w${waveNumber}-e${i}-${Math.random().toString(36).slice(2, 7)}`,
      x: centre.x + Math.cos(angle) * radius,
      z: centre.z + Math.sin(angle) * radius,
      hp: 2,
      // Born into the state machine: a brief fair-spawn window before it can act or be shot.
      state: 'spawning',
      stateSince: now,
    });
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
  const touched = enemies.some((e) => hurtsNow(e, now) && dist2(e, player) <= TOUCH_RADIUS ** 2);
  const hp = Math.max(0, touched ? round.hp - 1 : round.hp);

  // Corpses do not hold a wave open: mid-topple enemies are on the board but already beaten.
  const cleared = enemies.every((e) => !holdsWave(e));
  return {
    hp,
    wave: cleared ? round.wave + 1 : round.wave,
    over: hp <= 0,
    cleared,
    touched,
  };
}
