/**
 * steering.js — how a monster decides where to move, without a map.
 *
 * TEACHING NOTE — WHY NOT PATHFINDING:
 * Pathfinding (A*) searches a map for a route. It is the right tool when there are walls to go
 * around, and it costs real work per search. Forty monsters each searching every frame is a budget
 * you do not have — and in an open food court there is nothing to route around anyway.
 *
 * Steering is the cheap alternative: each monster answers one question per frame — "which way is
 * the player, and who am I standing on?" — and moves that way. No map, no route, no search. A crowd
 * of these reads as intelligent, and that is the whole trick. See
 * CONCEPTS/steering-vs-pathfinding.md.
 *
 * The two behaviours here are the classic pair (Craig Reynolds, 1987, the "boids" rules):
 *   SEEK       — go toward the target
 *   SEPARATE   — do not stand inside your neighbour
 * Seek alone gives you a conga line that collapses into one square. Separation is what turns it
 * into something that reads as a swarm.
 */

/** Deliberately slower than the player (5). If enemies are faster the game is not a game. */
export const ENEMY_SPEED = 2.2;

/** Neighbours closer than this push each other apart. Roughly two body-widths. */
export const SEPARATION_RADIUS = 1.6;

/** How hard separation pushes relative to seeking. Too high and they refuse to approach at all. */
const SEPARATION_WEIGHT = 1.5;

const ZERO = () => ({ x: 0, z: 0 });

/**
 * A unit-length direction from `from` toward `to`.
 * Returns zero when they are in the same place — dividing by a zero length is the classic way
 * this function produces NaN, and one NaN position removes the monster from the visible world
 * with no error message anywhere.
 */
export function seek(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  if (len === 0) return ZERO();
  return { x: dx / len, z: dz / len };
}

/**
 * A direction away from any neighbour inside SEPARATION_RADIUS.
 * Closer neighbours push harder (the push is divided by distance), which is what stops a pile
 * forming without needing any collision physics.
 */
export function separate(self, neighbours) {
  let x = 0;
  let z = 0;
  for (const other of neighbours) {
    const dx = self.x - other.x;
    const dz = self.z - other.z;
    const dist = Math.hypot(dx, dz);
    // dist === 0 is the enemy compared against itself, or a perfect overlap. Skipping is correct:
    // there is no meaningful "away" direction, and dividing by it yields NaN.
    if (dist === 0 || dist > SEPARATION_RADIUS) continue;
    x += (dx / dist) / dist;
    z += (dz / dist) / dist;
  }
  const len = Math.hypot(x, z);
  if (len === 0) return ZERO();
  return { x: x / len, z: z / len };
}

/**
 * One frame of enemy movement: seek the player, pushed apart by neighbours.
 *
 * @param {{x:number,z:number}} self
 * @param {{x:number,z:number}} target      where the player is
 * @param {{x:number,z:number}[]} neighbours other enemies (may include self; distance 0 is skipped)
 * @param {number} delta                     seconds since the last frame
 * @param {number} speed                     units/sec — the roster's per-monster number; the
 *                                           default keeps every pre-roster caller identical
 */
export function stepEnemy(self, target, neighbours, delta, speed = ENEMY_SPEED) {
  const toPlayer = seek(self, target);
  const push = separate(self, neighbours);

  let x = toPlayer.x + push.x * SEPARATION_WEIGHT;
  let z = toPlayer.z + push.z * SEPARATION_WEIGHT;

  const len = Math.hypot(x, z);
  if (len === 0) return { x: self.x, z: self.z };

  // Normalise the COMBINED direction so adding a second behaviour never makes a monster faster.
  x /= len;
  z /= len;

  return {
    x: self.x + x * speed * delta,
    z: self.z + z * speed * delta,
  };
}
