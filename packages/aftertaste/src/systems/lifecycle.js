/**
 * lifecycle.js — the enemy state machine: spawning → alive → attacking → dying → gone.
 *
 * TEACHING NOTE — WHY A STATE MACHINE, AND WHY ONE TABLE:
 * "A dying enemy must not damage you, must not block the wave from clearing, and must not be shot
 * again" is THREE rules living in three different systems (waves, combat, steering). Give each
 * system its own if-statement and they drift apart the first time one is edited. Instead every
 * state declares its capabilities ONCE, below, and every system ASKS the table. A state machine is
 * not cleverness — it is one place to be wrong.
 *
 * TEACHING NOTE — TIME LIVES IN THE ENEMY:
 * Each enemy carries `state` and `stateSince` (the clock reading when it entered the state).
 * Durations are then pure arithmetic — no timers, no setTimeout, nothing to leak or cancel. The
 * whole machine is a pure function of (enemy, now), which is why it can be tested in milliseconds.
 *
 * NOTE: this module is groundwork for the lifecycle slice — written, tested, and NOT yet wired
 * into the game. Wiring it is a behaviour slice of its own (corpses that stay on the board, a
 * dodgeable attack wind-up). Claiming it here would be claiming behaviour the game does not have.
 */

/** Seconds before a freshly spawned enemy becomes dangerous — the fair-spawn window. */
export const SPAWN_SECONDS = 0.6;
/** The attack clip is 16 frames at 24fps. The state lasts exactly as long as the animation. */
export const ATTACK_SECONDS = 16 / 24;
/** The strike lands this far into the attack. Before it, you are watching a wind-up — DODGE. */
export const ATTACK_WINDUP = 0.4;
/** The death clip is 24 frames at 24fps; the corpse leaves the board when the topple ends. */
export const DEATH_SECONDS = 24 / 24;

/** What each state may do. Every system asks this table; none carries its own opinion. */
export const CAPABILITIES = {
  spawning: { canMove: false, canHurt: false, canBeShot: false, holdsWave: true },
  alive: { canMove: true, canHurt: false, canBeShot: true, holdsWave: true },
  attacking: { canMove: false, canHurt: true, canBeShot: true, holdsWave: true },
  dying: { canMove: false, canHurt: false, canBeShot: false, holdsWave: false },
};

/** An enemy with no `state` field behaves as `alive` — the machine is opt-in per enemy. */
const stateOf = (enemy) => enemy.state ?? 'alive';

export const can = (enemy, ability) => CAPABILITIES[stateOf(enemy)][ability];

/** Does this enemy keep the wave open? (Corpses do not.) */
export const holdsWave = (enemy) => can(enemy, 'holdsWave');

/**
 * Is this enemy's strike landing RIGHT NOW? Only an attack past its wind-up hurts — the wind-up
 * is the dodge window, and it is what turns contact damage from a tax into a game.
 */
export function hurtsNow(enemy, now) {
  return stateOf(enemy) === 'attacking' && now - enemy.stateSince >= ATTACK_WINDUP;
}

/**
 * One enemy, one tick. Returns the SAME object when nothing changed (identity doubles as a cheap
 * change detector), a NEW object on a transition, or `null` when the enemy leaves the board.
 * Being shot to death is NOT here — combat marks `dying` at the moment of the killing hit,
 * because the killer knows `now` and the reason; the machine only ages states.
 */
export function stepLifecycle(enemy, now, inTouchRange) {
  const age = now - enemy.stateSince;
  switch (stateOf(enemy)) {
    case 'spawning':
      return age >= SPAWN_SECONDS ? { ...enemy, state: 'alive', stateSince: now } : enemy;
    case 'alive':
      return inTouchRange ? { ...enemy, state: 'attacking', stateSince: now } : enemy;
    case 'attacking':
      return age >= ATTACK_SECONDS ? { ...enemy, state: 'alive', stateSince: now } : enemy;
    case 'dying':
      return age >= DEATH_SECONDS ? null : enemy;
    default:
      return enemy;
  }
}
