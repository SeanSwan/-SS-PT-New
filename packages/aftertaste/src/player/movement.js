/**
 * movement.js — the movement RULE, as a pure function.
 *
 * TEACHING NOTE — WHY THIS IS NOT IN THE COMPONENT:
 * The game loop calls step() once per frame. Keeping it a plain function of
 * (position, keys, delta) -> position means you can test it in milliseconds without a browser, and
 * you can read the entire rule in one screen. Anything that is "the rules of the game" wants to
 * live in a file like this; the React component just draws the result.
 *
 * TEACHING NOTE — TWO BUGS THIS AVOIDS ON PURPOSE:
 *
 * 1. FRAME-RATE DEPENDENCE. If you add a fixed amount per frame, the player moves twice as fast on
 *    a 120fps monitor as on a 60fps one. Multiplying by `delta` (seconds since the last frame) means
 *    the speed is per SECOND, so it is identical on every machine. This is why every game engine
 *    hands you a delta.
 *
 * 2. DIAGONAL SPEED. Pressing W and D naively adds 1 to both axes, and the diagonal is then
 *    1.414x faster than straight — the classic "strafe-running" bug that shipped in real games for
 *    years. Normalising the direction vector (dividing by its own length) fixes it.
 */

/** Units per second. One number, so "make it faster" is a one-line change you can find. */
export const SPEED = 5;

/** Sprint speed multiplier (hold Shift). Below the point where dodging stops mattering. */
export const SPRINT_MULT = 1.45;
/** How hard the legs push toward the wanted velocity, per second. ~0.15s to full speed. */
export const ACCEL = 40;
/** How hard you stop when no key is held. ~0.08s to rest — weight, not soap. */
export const DECEL = 60;
/** Fraction of ground acceleration available mid-air: you steer a jump, you don't teleport it. */
export const AIR_CONTROL = 0.3;
/** Initial jump velocity and gravity — tuned for a hop that clears a crumb, not a building. */
export const JUMP_VELOCITY = 3.2;
export const GRAVITY = 9.5;

/**
 * @param {{x:number,z:number}} pos    where the player is now
 * @param {{forward:boolean,back:boolean,left:boolean,right:boolean}} keys what is held down
 * @param {number} delta               seconds since the previous frame
 * @param {number} yaw                 which way you are FACING (radians; 0 faces -z)
 * @returns {{x:number,z:number}}      where the player should be now
 *
 * TEACHING NOTE — FPS MOVEMENT IS VIEW-RELATIVE:
 * In the top-down slices W always meant "north" (-z). The moment the camera went behind your eyes
 * (the Overwatch/BF6 change), W has to mean "the way I am looking" — walking north while looking
 * east is not a control scheme anyone can use. The fix is one 2D rotation: build the intent in
 * LOCAL space (right/back, exactly as before), then rotate it by yaw into WORLD space. At yaw 0
 * the rotation is the identity, which is why every earlier movement test still passes untouched.
 * Only yaw steers movement — pitch must not: looking at the floor should not make W walk you
 * downward into it.
 */
export function step(pos, keys, delta, yaw = 0) {
  // -z is "forward" because the camera looks down -z by default in three.js.
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dz = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);

  // Holding W and S at once cancels to zero here, rather than fighting frame to frame.
  if (dx === 0 && dz === 0) return { x: pos.x, z: pos.z };

  // Normalise: make the direction exactly 1 unit long, whatever combination is held.
  const len = Math.hypot(dx, dz);
  dx /= len;
  dz /= len;

  // Rotate the local intent by yaw into world space (standard 2D rotation about Y).
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const wx = dx * cos + dz * sin;
  const wz = -dx * sin + dz * cos;

  return {
    x: pos.x + wx * SPEED * delta,
    z: pos.z + wz * SPEED * delta,
  };
}

/**
 * The FELT movement rule (playtest 2: "I wanna be able to run, jump"). Where step() teleports to
 * full speed on a keypress, stepV evolves a VELOCITY toward the wanted one — acceleration is what
 * reads as weight, deceleration as grip. Still a pure function: (state, keys, delta, yaw) → state.
 *
 * @param {{x,z,vx,vz,y,vy:number}} s  position + velocity (y=0 grounded, vy vertical speed)
 * @param {{forward,back,left,right,sprint,jump:boolean}} keys
 */
export const ADS_MULT = 0.6;

export function stepV(s, keys, delta, yaw = 0, ads = false) {
  // The wanted horizontal velocity: the v1 direction rule times the (sprint-scaled) speed.
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dz = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  const cos = Math.cos(yaw); const sin = Math.sin(yaw);
  // AIMING COSTS MOVEMENT, and you cannot sprint down the sights (F4). Without a cost, ADS is
  // strictly better than hip-fire at every range and the whole hip/ADS decision disappears —
  // every shooter Sean named prices it exactly here. The two are mutually exclusive by
  // construction, so the pair can never both be true and leave the player sprinting while zoomed.
  const sprinting = keys.sprint && !ads;
  const target = SPEED * (sprinting ? SPRINT_MULT : 1) * (ads ? ADS_MULT : 1);
  const wantX = (dx * cos + dz * sin) * target;
  const wantZ = (-dx * sin + dz * cos) * target;

  const grounded = s.y <= 0 && s.vy <= 0;
  const rate = (len > 0 ? ACCEL : DECEL) * (grounded ? 1 : AIR_CONTROL);
  // Move velocity toward the target by at most rate*delta — the one line that IS the feel.
  const chase = (v, want) => {
    const d = want - v;
    const step_ = rate * delta;
    return Math.abs(d) <= step_ ? want : v + Math.sign(d) * step_;
  };
  let vx = chase(s.vx, wantX);
  let vz = chase(s.vz, wantZ);

  // Vertical: jump only from the ground (no double jump — gravity is not a suggestion).
  let vy = s.vy;
  let y = s.y;
  if (keys.jump && grounded) vy = JUMP_VELOCITY;
  vy -= GRAVITY * delta;
  y = y + vy * delta;
  if (y <= 0) { y = 0; vy = Math.max(0, 0); vy = 0; }

  return { x: s.x + vx * delta, z: s.z + vz * delta, vx, vz, y, vy };
}
