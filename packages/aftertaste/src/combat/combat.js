/**
 * combat.js — hitting things, without a physics engine.
 *
 * TEACHING NOTE — WHY NO PHYSICS ENGINE:
 * The instinct is to reach for rapier (or cannon, or ammo). A physics engine solves a much harder
 * problem than the one we have: arbitrary shapes, stacking, friction, restitution, joints. All of
 * that costs memory, a WASM download, and a simulation step every frame.
 *
 * Our question is far smaller: "is this box within X units of that box?" That is one subtraction,
 * one multiply and a comparison. Recognising when the small tool is sufficient is the whole skill
 * here — see CONCEPTS/collision-without-physics.md for when that stops being true.
 *
 * Everything is a PURE FUNCTION returning NEW objects. Nothing mutates its input. That is what
 * makes combat testable without a browser, and it is why `damage()` copies rather than edits: a
 * mutating version would silently corrupt the snapshot the enemy flock steers against.
 */

/** How many shots an enemy takes. 2 so that "it takes more than one" is actually exercised. */
export const ENEMY_HP = 2;

/** How close a shot must land. Generous on purpose — this is a grey-box, feel comes later. */
export const HIT_RADIUS = 1.4;

/** Squared distance. Avoids a square root; comparing squares gives the same answer. */
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

/** Is `target` within HIT_RADIUS of `point`? Boundary is inclusive, deliberately and testably. */
export function hits(point, target) {
  return dist2(point, target) <= HIT_RADIUS ** 2;
}

/** A NEW enemy with hp reduced, floored at 0. Never mutates. */
export function damage(enemy, amount) {
  return { ...enemy, hp: Math.max(0, enemy.hp - amount) };
}

export const isDead = (enemy) => enemy.hp <= 0;

/**
 * Fire at a point. Damages everything in range, drops the dead, and reports the body count.
 * @returns {{enemies: object[], killed: number}}
 */
export function fireAt(enemies, point, amount = 1) {
  let killed = 0;
  const next = [];
  for (const e of enemies) {
    if (!hits(point, e)) { next.push(e); continue; }
    const hurt = damage(e, amount);
    if (isDead(hurt)) killed++;
    else next.push(hurt);
  }
  return { enemies: next, killed };
}
