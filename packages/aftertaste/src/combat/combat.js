/**
 * combat.js — hitting things, without a physics engine.
 *
 * TEACHING NOTE — HITSCAN, THE OVERWATCH/BATTLEFIELD MODEL:
 * When you fire in an FPS, one of two things happens: a real projectile flies (rockets, arrows) or
 * the game draws a straight line from your eye and whatever it crosses first is hit INSTANTLY.
 * The second is called HITSCAN and it is what most guns in Overwatch and Battlefield actually are —
 * the tracer you see is decoration drawn after the decision. Hitscan is one ray test per shot;
 * a projectile is an object simulated every frame. Start with hitscan; earn projectiles.
 *
 * TEACHING NOTE — RAY vs SPHERE IS THE WHOLE TRICK:
 * "Does my aim line pass near that monster?" Treat the monster as a sphere and the mathematics is
 * three lines: project the vector to the sphere's centre onto the ray (a dot product) to find the
 * nearest point along the ray, then compare how far the centre is from that point against the
 * radius. No physics engine, no mesh intersection — and it is EXACT for a sphere. Every serious
 * engine begins here and only reaches for mesh-accurate tests when a sphere stops being honest.
 *
 * Everything is a PURE FUNCTION returning NEW objects. Nothing mutates its input. That is what
 * makes combat testable without a browser: a mutating version would silently corrupt the snapshot
 * the enemy flock steers against.
 */

/** How many shots an enemy takes. 2 so that "it takes more than one" is actually exercised. */
export const ENEMY_HP = 2;

/** The forgiving radius around an enemy's centre a shot may pass through and still count. */
export const AIM_RADIUS = 0.6;

/** Enemies are ~1 unit tall standing on the floor, so a sphere centred at waist height is honest. */
export const TARGET_HEIGHT = 0.5;

/** Beyond this a shot hits nothing. Keeps the ray test bounded and misses cheap. */
export const MAX_RANGE = 60;

/**
 * Fire a ray from `origin` along unit vector `dir`; return the FIRST target it passes within
 * `radius` of, as `{ target, t }` where `t` is the distance along the ray — or null for a miss.
 * Targets behind the origin never count: a gun does not shoot backwards.
 */
export function hitscan(origin, dir, targets, radius = AIM_RADIUS, maxRange = MAX_RANGE) {
  let best = null;
  for (const target of targets) {
    const ox = target.x - origin.x;
    const oy = TARGET_HEIGHT - origin.y;
    const oz = target.z - origin.z;
    // How far along the ray the closest approach to this centre is.
    const t = ox * dir.x + oy * dir.y + oz * dir.z;
    if (t < 0 || t > maxRange) continue;
    // Distance² from centre to that closest point (Pythagoras, no square root needed).
    const closest2 = ox * ox + oy * oy + oz * oz - t * t;
    if (closest2 > radius * radius) continue;
    if (!best || t < best.t) best = { target, t };
  }
  return best;
}

/** A NEW enemy with hp reduced, floored at 0. Never mutates. */
export function damage(enemy, amount) {
  return { ...enemy, hp: Math.max(0, enemy.hp - amount) };
}

export const isDead = (enemy) => enemy.hp <= 0;
