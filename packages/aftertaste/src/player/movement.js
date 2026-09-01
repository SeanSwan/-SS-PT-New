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
