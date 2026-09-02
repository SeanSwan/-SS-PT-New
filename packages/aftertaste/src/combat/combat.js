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
/** Ray entry into a sphere at world centre c with radius r; null on miss. Entry clamps to 0 when
 *  the origin is inside — point-blank contact registers, it does not go negative-and-skip. */
function sphereEntry(origin, dir, c, r, maxRange) {
  const ox = c[0] - origin.x; const oy = c[1] - origin.y; const oz = c[2] - origin.z;
  const t = ox * dir.x + oy * dir.y + oz * dir.z;
  const d2 = ox * ox + oy * oy + oz * oz;
  const inside = d2 <= r * r;
  if (!inside && t < 0) return null;
  const closest2 = d2 - t * t;
  if (closest2 > r * r) return null;
  const tEnter = inside ? 0 : t - Math.sqrt(r * r - closest2);
  return tEnter > maxRange ? null : tEnter;
}

/** Ray entry into a capsule (segment a-b swept by radius r): find the segment point nearest the
 *  ray (standard ray/segment closest approach), then treat it as a sphere there. Exact for the
 *  degenerate a===b capsule; a hair conservative at the caps of long ones — honest enough for a
 *  grey-box, and always inside the true capsule (it never awards a hit the true shape would not). */
function capsuleEntry(origin, dir, a, b, r, maxRange) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const abLen2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  let s = 0;
  if (abLen2 > 1e-12) {
    // Closest parameters between ray (origin + t·dir) and segment (a + s·ab), s clamped to 0..1.
    const ao = [origin.x - a[0], origin.y - a[1], origin.z - a[2]];
    const dDotAb = dir.x * ab[0] + dir.y * ab[1] + dir.z * ab[2];
    const aoDotAb = ao[0] * ab[0] + ao[1] * ab[1] + ao[2] * ab[2];
    const aoDotD = ao[0] * dir.x + ao[1] * dir.y + ao[2] * dir.z;
    const denom = abLen2 - dDotAb * dDotAb; // dir is unit length
    s = denom > 1e-12 ? (aoDotAb - aoDotD * dDotAb) / denom : 0;
    s = Math.max(0, Math.min(1, s));
  }
  const p = [a[0] + ab[0] * s, a[1] + ab[1] * s, a[2] + ab[2] * s];
  return sphereEntry(origin, dir, p, r, maxRange);
}

/** Entry into one part's shape, offset to the enemy's world position and scaled by its render
 *  scale (shapes live in the normalized 1-unit frame; a monster rendered at 1.5x carries its
 *  hitboxes at 1.5x — the H8 guard: hit shapes move WITH the silhouette, or collisions look
 *  unfair for invisible reasons). */
function partEntry(origin, dir, shape, ex, ez, k, maxRange) {
  if (shape?.kind === 'sphere') {
    return sphereEntry(origin, dir, [ex + shape.c[0] * k, shape.c[1] * k, ez + shape.c[2] * k], shape.r * k, maxRange);
  }
  if (shape?.kind === 'capsule') {
    const a = [ex + shape.a[0] * k, shape.a[1] * k, ez + shape.a[2] * k];
    const b = [ex + shape.b[0] * k, shape.b[1] * k, ez + shape.b[2] * k];
    return capsuleEntry(origin, dir, a, b, shape.r * k, maxRange);
  }
  return null;
}

export function hitscan(origin, dir, targets, radius = AIM_RADIUS, maxRange = MAX_RANGE) {
  let best = null;
  for (const target of targets) {
    // LOCATIONAL: a parted monster IS its parts — the ray tests each part shape and the earliest
    // entry names both the monster and the part. No fallback to the whole-body sphere: a shot
    // that misses every part misses the monster (D3, roster-v2 contract §4).
    if (Array.isArray(target.parts) && target.parts.length) {
      const k = target.renderScale ?? 1;
      for (const p of target.parts) {
        const tEnter = partEntry(origin, dir, p.hitShape, target.x, target.z, k, maxRange);
        if (tEnter !== null && (!best || tEnter < best.t)) best = { target, t: tEnter, part: p.tag };
      }
      continue;
    }
    // Partless: one sphere at waist height, as before. Select on the ENTRY point, not the nearest
    // centre — the bullet stops at the first surface it reaches (GLM-5.3 hostile review).
    const r = target.aimRadius ?? radius;
    const tEnter = sphereEntry(origin, dir, [target.x, TARGET_HEIGHT, target.z], r, maxRange);
    if (tEnter !== null && (!best || tEnter < best.t)) best = { target, t: tEnter, part: null };
  }
  return best;
}

/** How far a punch reaches, and how wide the swing is (± radians off the facing direction). */
export const MELEE_RANGE = 1.7;
export const MELEE_ARC = Math.PI / 3; // ±60°

/**
 * The punch (playtest 2: "run, jump, punch"). Everything close enough AND inside the swing arc
 * is hit — a crowd shove, not a sniper poke. Pure: returns the enemies the swing connects with.
 * Yaw follows the aim convention (0 faces -z; facing = aimDirection's ground projection).
 */
export function meleeHits(enemies, player, yaw) {
  const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
  return enemies.filter((e) => {
    const dx = e.x - player.x; const dz = e.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d === 0) return true; // standing inside you is very much in range
    if (d > MELEE_RANGE) return false;
    const cos = (dx * fx + dz * fz) / d;
    return cos >= Math.cos(MELEE_ARC);
  });
}

/** A NEW enemy with hp reduced, floored at 0. Never mutates. */
export function damage(enemy, amount) {
  return { ...enemy, hp: Math.max(0, enemy.hp - amount) };
}

export const isDead = (enemy) => enemy.hp <= 0;
