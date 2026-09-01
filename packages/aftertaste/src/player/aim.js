/**
 * aim.js — where you are looking, as numbers.
 *
 * TEACHING NOTE — YAW AND PITCH, NOT A QUATERNION:
 * An FPS aim is exactly two numbers: yaw (spin left/right) and pitch (tilt up/down). Storing them
 * as angles instead of a rotation object is what makes clamping trivial — you cannot look past
 * straight-up in Overwatch because pitch is clamped, and clamping a quaternion is genuinely hard
 * while clamping a number is one line. Roll stays zero forever; a rolled FPS camera reads as
 * being drunk.
 *
 * TEACHING NOTE — WHY THE AIM IS NOT IN THE STORE:
 * The mouse moves hundreds of times a second and the camera reads the aim every frame. Putting it
 * in zustand would re-render React on every mouse twitch for no benefit — nothing here is UI. A
 * plain mutable object read inside useFrame is the right tool; the store is for state the UI
 * draws. (Same reasoning as writing mesh positions directly — see Player.jsx.)
 */

/** Radians of turn per pixel of mouse travel. One number = one place to tune feel. */
export const SENSITIVITY = 0.0025;

/** You may look almost straight up or down, never past it — beyond ±90° the world flips. */
export const PITCH_LIMIT = (85 * Math.PI) / 180;

/** The one live aim. Mutated by the look handler, read by the camera rig each frame. */
export const aim = { yaw: 0, pitch: 0 };

/**
 * Apply one mouse movement. Pure on its inputs: pass any aim-shaped object and get a new one —
 * the live `aim` above is updated by the caller assigning the result, which keeps this testable.
 * Screen dy is positive DOWNWARD, so pitch subtracts: mouse up = look up.
 */
export function applyLook(current, dx, dy, sensitivity = SENSITIVITY) {
  const yaw = current.yaw - dx * sensitivity;
  const pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, current.pitch - dy * sensitivity));
  return { yaw, pitch };
}

/**
 * The unit vector you are looking along. Derivation: start from three.js's "forward" (0,0,-1),
 * tilt by pitch around X, then spin by yaw around Y — the same YXZ order the camera uses, so the
 * crosshair and this vector can never disagree.
 */
export function aimDirection(yaw, pitch) {
  const cp = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp,
  };
}
