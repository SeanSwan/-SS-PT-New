/**
 * cameraFollow.js — keep the camera behind the player, smoothly.
 *
 * TEACHING NOTE — WHY NOT JUST SNAP THE CAMERA:
 * Setting the camera exactly to (player + offset) every frame works, and looks awful: every tiny
 * movement is transmitted 1:1 and the view feels rigid and twitchy. Instead we move the camera a
 * FRACTION of the way toward its target each frame. That lag is what reads as "smooth" — the same
 * trick behind almost every third-person camera you have ever used.
 *
 * The fraction is frame-rate corrected: at 120fps we take a smaller step than at 60fps, so the feel
 * is identical on any machine. 1 - (1 - t)^(delta*60) is the standard way to write that.
 */
// Pulled back in Slice 5. At y:7/z:10 the view covered roughly 20 units, and enemies spawn on a
// ring of radius 18 -- so they arrived entirely off-screen and the first thing you knew about a
// monster was losing a life to it. Being killed by something you were never shown is not difficulty,
// it is a missing camera. This framing shows enough of the ring that threats are visible as they
// close in. See CONCEPTS/game-feel.md.
export const CAMERA_OFFSET = { x: 0, y: 13, z: 15 };
const SMOOTH = 0.12; // 0 = never moves, 1 = snaps instantly

export function followPlayer(camera, target, delta) {
  const t = 1 - Math.pow(1 - SMOOTH, delta * 60);
  camera.position.x += (target.x + CAMERA_OFFSET.x - camera.position.x) * t;
  camera.position.y += (CAMERA_OFFSET.y - camera.position.y) * t;
  camera.position.z += (target.z + CAMERA_OFFSET.z - camera.position.z) * t;
  camera.lookAt(target.x, 0.5, target.z);
}
