/**
 * gaits.js — movement IDENTITY as data (Beyond-Zombies S2, lane 2).
 *
 * TEACHING NOTE — A CAST READS AS ALIVE THROUGH MOVEMENT MORE THAN MESH:
 * The same model at the same speed reads as a prop; the same model with a signature WAY of moving
 * reads as a creature. A gait here is a pure function of (row data, time, per-enemy seed) → a small
 * pose delta layered on top of steering. Pure on purpose: node tests can prove every pose stays
 * bounded without a browser, and the blueprint's gait/hitbox law (Flash #15) is enforceable — a
 * gait may DECORATE the position, never move the body outside its hit shapes.
 *
 * The pose fields:
 *   rotX / rotZ  — lean (radians), e.g. the shamble's side-to-side sway
 *   yawJitter    — heading wobble (radians) layered on the facing direction
 *   yOffset      — bob (world units, small)
 *   speedScale   — multiplies this frame's steering speed (the skitter's burst rhythm)
 */

/** Deterministic per-enemy phase from its id, so a crowd never sways in lockstep. */
export function gaitSeed(id) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000 * Math.PI * 2;
}

/**
 * WORST-CASE DISPLACEMENT of the top of the body, in world units, under this gait.
 *
 * WHY THIS EXISTS (Fable 5.1 hostile review, F2): the first gait law asserted that sway, lift and
 * jitter stayed inside declared BOUNDS — and it was incapable of failing on the defect it was
 * named for. Hit shapes are pure maths anchored at the enemy's (x, z); the rendered body leans and
 * floats around that anchor. Bounding the PARAMETER (0.09 rad) says nothing about the CONSEQUENCE
 * (how far the head moved). A lean of 0.09 rad on a 1.7-unit body throws the head 15 cm sideways —
 * a headshot the player sees connect, that the maths never sees.
 *
 * So the law is restated in the units that decide a hit: metres of head travel, against the head's
 * own radius. `lean` rotates about the feet, so the top of the body swings by sin(angle) x height;
 * `lift` translates everything. A gait may decorate; it may not move the body out of its hitbox.
 */
export function poseDisplacement(gait, renderHeight = 1, samples = 720) {
  if (!gait) return 0;
  let worst = 0;
  // SWEPT FROM gaitPose ITSELF, never hand-copied from it. A displacement table written by reading
  // the branches is a second source of truth that rots the moment a gait is tuned — which is the
  // exact failure this law exists to correct. The sweep covers a full cycle at several seeds, and
  // both sides of every distance-dependent branch (the creep's lunge is its worst pose).
  // EVERY branch a player can reach: far and near, mid-telegraph and committed, watched and not.
  // A pose the sweep never visits is a pose the law does not govern.
  for (const distance of [Infinity, 0]) {
    for (const sinceEntered of [0, Infinity]) {
    for (const observed of [false, true]) {
    for (const seed of [0, 1.7, 3.9, 5.2]) {
      for (let i = 0; i < samples; i++) {
        const p = gaitPose(gait, i * 0.01, seed, distance, sinceEntered, observed);
        const lean = Math.hypot(p.rotX, p.rotZ);
        const swing = Math.sin(Math.abs(lean)) * renderHeight; // rotation is about the feet
        worst = Math.max(worst, Math.hypot(swing, p.yOffset));
      }
    }
    }
    }
  }
  return worst;
}

const STILL = { rotX: 0, rotZ: 0, yawJitter: 0, yOffset: 0, speedScale: 1 };

/**
 * The pose for one enemy this frame. Unknown/absent gait = STILL (a row without a gait moves the
 * old way, so the whole cast never depends on this file being complete).
 */
export function gaitPose(gait, t, seed = 0, distance = Infinity, sinceEntered = Infinity, observed = false) {
  if (!gait) return STILL;
  if (gait.type === 'creep') {
    // The kissing bug: the ONLY gait that reads the world. Far away it creeps low and slow; inside
    // lungeRange it commits, hard. The distance argument exists for this one creature, and every
    // other gait ignores it — a gait that changes with the player is a different ANIMAL, not a
    // speed setting.
    const p = t * gait.hz * Math.PI * 2 + seed;
    const inRange = distance <= gait.lungeRange;
    // THE TELEGRAPH IS THE DODGE WINDOW (F11). Without it the creature crossed an invisible line
    // and was simply on you at 3.4x — a lunge with no wind-up is not an ambush, it is a teleport.
    // The design doc's own word for this creature is "freezes, then strikes": it stops dead, sinks
    // into a deeper crouch, and only then commits. Everything else in this game telegraphs
    // (ATTACK_WINDUP); the one creature built around ambush had nothing.
    const winding = inRange && sinceEntered < (gait.telegraph ?? 0);
    const lunging = inRange && !winding;
    // IT FREEZES WHEN YOU LOOK AT IT (G9). The design doc calls this creature's telegraph "its own
    // shadow — it freezes completely when directly observed". That behaviour, not the mesh, is what
    // makes it a different animal from a slow roach: it closes the distance you are not watching.
    // Only outside a committed lunge; once it has thrown itself, looking at it does not stop it.
    if (observed && !lunging) {
      return { rotZ: 0, rotX: gait.crouch * 2, yawJitter: 0, yOffset: 0, speedScale: (gait.observedScale ?? 0.15) };
    }
    return {
      rotZ: 0,
      rotX: lunging ? -(gait.lungePitch ?? 0.15)
        : winding ? gait.crouch * 2
        : gait.crouch + Math.sin(p) * 0.02,
      yawJitter: 0,
      yOffset: lunging ? 0.04 : 0,
      speedScale: lunging ? gait.lungeMult : winding ? 0 : 0.55,
    };
  }
  if (gait.type === 'shamble') {
    // The Regular: heavy side-to-side sway with a slight forward hang — weight, not bounce.
    const p = t * gait.hz * Math.PI * 2 + seed;
    return {
      rotZ: Math.sin(p) * gait.sway,
      rotX: (gait.hang ?? 0.06) + Math.sin(p * 0.5) * 0.02, // forward hang is data: the law must be able to tune it
      yawJitter: 0,
      yOffset: Math.abs(Math.sin(p)) * 0.02,
      speedScale: 1,
    };
  }
  if (gait.type === 'lurch') {
    // The drip-cyst: top-heavy, so it DIPS and recovers rather than swaying — weight falling
    // forward and catching itself.
    const p = t * gait.hz * Math.PI * 2 + seed;
    const dip = Math.max(0, Math.sin(p));
    return { rotZ: 0, rotX: dip * gait.dip, yawJitter: 0, yOffset: dip * 0.03, speedScale: 0.6 + dip * 0.8 };
  }
  if (gait.type === 'hover') {
    // The fly: never touches down. A fast bob with a banking roll — the only cast member whose
    // vertical offset is its identity.
    const p = t * gait.hz * Math.PI * 2 + seed;
    return { rotZ: Math.sin(p * 0.7) * gait.roll, rotX: 0, yawJitter: 0, yOffset: gait.lift + Math.sin(p) * gait.bob, speedScale: 1 };
  }
  if (gait.type === 'inch') {
    // The larva: compress, surge, compress. Its speed IS the animation — a caterpillar that moved
    // at a constant rate would read as a sliding prop.
    const p = t * gait.hz * Math.PI * 2 + seed;
    const surge = Math.max(0, Math.sin(p));
    return { rotZ: 0, rotX: -surge * 0.05, yawJitter: 0, yOffset: 0, speedScale: (1 - gait.surge) + surge * gait.surge * Math.PI };
  }
  if (gait.type === 'skitter') {
    // The roach: bursts of speed with darting heading wobble — insect rhythm, not a glide.
    const p = t * gait.burstHz * Math.PI * 2 + seed;
    const burst = Math.max(0, Math.sin(p)); // half-wave: sprint, pause, sprint
    return {
      rotZ: 0,
      rotX: 0,
      yawJitter: Math.sin(p * 3.7 + seed) * gait.jitter,
      yOffset: 0,
      // A half-wave sine averages 1/π (≈0.318), so 0.68 + burst×1.0 averages ≈1.0 — the roster
      // speed stays the truth. The first constants here (0.4 + 1.2) averaged 0.78: the "rhythm"
      // was a 22% stealth NERF, and only the averaging test caught it.
      speedScale: 0.68 + burst * 1.0,
    };
  }
  return STILL;
}
