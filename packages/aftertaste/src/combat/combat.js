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

/** Beyond this a shot hits nothing. Keeps the ray test bounded — and it must stay INSIDE the
 *  fog's far distance (46, App.jsx): a longer range kills targets that render as nothing, which
 *  is the "killed by something you were never shown" sin relocated to the gun (GLM-Flash, F9). */
export const MAX_RANGE = 45;

/**
 * Fire a ray from `origin` along unit vector `dir`; return the FIRST target it passes within
 * range of, as `{ target, t }` where `t` is the distance along the ray — or null for a miss.
 * Targets behind the origin never count: a gun does not shoot backwards.
 *
 * A target may carry its own `aimRadius` (the roster's long, low patty-larva needs a bigger
 * sphere than the compact fryling); `radius` is the fallback for targets that do not.
 */
export function hitscan(origin, dir, targets, radius = AIM_RADIUS, maxRange = MAX_RANGE) {
  let best = null;
  for (const target of targets) {
    const ox = target.x - origin.x;
    const oy = TARGET_HEIGHT - origin.y;
    const oz = target.z - origin.z;
    // How far along the ray the closest approach to this centre is.
    const t = ox * dir.x + oy * dir.y + oz * dir.z;
    const d2 = ox * ox + oy * oy + oz * oz;
    const r = target.aimRadius ?? radius;
    const inside = d2 <= r * r;
    // Behind the muzzle AND not swallowing it: a gun does not shoot backwards.
    if (!inside && t < 0) continue;
    // Distance² from centre to the closest point on the ray (Pythagoras, no square root needed).
    const closest2 = d2 - t * t;
    if (closest2 > r * r) continue;
    // Select on the sphere's ENTRY point, not the nearest centre — the bullet stops at the first
    // surface it reaches. A grazed sphere can begin BEFORE a dead-centre one whose centre is
    // nearer; nearest-centre selection awards that shot to the wrong monster. (GLM-5.3 hostile
    // review 2026-09-01 — and load-bearing for locational damage, where spheres overlap by design.)
    const tEnter = inside ? 0 : t - Math.sqrt(r * r - closest2);
    if (tEnter > maxRange) continue;
    if (!best || tEnter < best.t) best = { target, t: tEnter };
  }
  return best;
}

/** A NEW enemy with hp reduced, floored at 0. Never mutates. */
export function damage(enemy, amount) {
  return { ...enemy, hp: Math.max(0, enemy.hp - amount) };
}

export const isDead = (enemy) => enemy.hp <= 0;
