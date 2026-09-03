/**
 * FpsRig.jsx — the camera behind your eyes: pointer lock, mouse-look, eye height, FOV.
 *
 * Extracted from App.jsx (Fable 5.1 review, F3): App had grown to 351 lines carrying two frame
 * systems, a light and the scene. The split is by RESPONSIBILITY, not by line count — each file
 * now owns one job, and App owns only "what is in the world".
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { aim, applyLook, SENSITIVITY } from './aim.js';
import { gun, weaponOf } from '../combat/gunState.js';
import { usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';

/** Eye height. Enemies are ~1 unit tall, so you look slightly DOWN at the swarm — CoD-zombies framing. */
const EYE_HEIGHT = 1.6;

/**
 * FpsRig — the camera goes behind your eyes (Sean's call: shoot like Overwatch/Battlefield).
 *
 * TEACHING NOTE — POINTER LOCK IS WHAT MAKES MOUSE-LOOK POSSIBLE:
 * A normal mouse cursor stops at the screen edge, so "keep turning right" would be impossible.
 * requestPointerLock() hides the cursor and starts reporting RELATIVE movement (movementX/Y)
 * forever, which is exactly what an aim wants. It must be requested from a user gesture — the
 * click — and Esc always releases it; the browser owns that, not us. Lock gates LOOKING only;
 * firing works regardless, which also keeps the game testable in browsers where lock is refused.
 *
 * TEACHING NOTE — A COMPONENT THAT RENDERS NOTHING and only runs a per-frame system is a normal
 * shape: "logic that needs the frame, but is not a visible thing."
 */
function FpsRig() {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    // YXZ: spin (yaw) first, then tilt (pitch). Any other order makes diagonal looking "roll".
    camera.rotation.order = 'YXZ';
    const onMouseDown = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    };
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      // Aiming down sights SLOWS the mouse by the weapon's own factor. Without this, zoom makes a
      // gun harder to aim, not easier: the same wrist flick sweeps the same angle across a much
      // narrower field of view, so every micro-correction is magnified. Every shooter does this.
      const sens = SENSITIVITY * (gun.ads ? weaponOf(gun).adsSensitivity : 1);
      Object.assign(aim, applyLook(aim, e.movementX, e.movementY, sens));
    };
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    // Test seam: headless browsers refuse pointer lock, and a synthetic MouseEvent cannot carry
    // movementX. This is the same one-readable-global reasoning as __swanPlayerPos.
    if (typeof window !== 'undefined') {
      window.__swanAim = aim;
      window.__swanGun = gun;
      window.__swanLook = (dx, dy) => Object.assign(aim, applyLook(aim, dx, dy));
    }
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, gl]);

  // View bob honours the user's reduced-motion preference — bob is feel for most, nausea for some.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const bobPhase = useRef(0);

  useFrame((state, delta) => {
    const p = usePlayerStore.getState().position;
    // Subtle view bob, driven by actual ground speed — standing still is perfectly still.
    let bob = 0;
    if (!reducedMotion && (p.grounded ?? true) && (p.speed ?? 0) > 0.5) {
      bobPhase.current += delta * (p.speed ?? 0) * 1.9;
      bob = Math.sin(bobPhase.current) * 0.022;
    }
    camera.position.set(p.x, EYE_HEIGHT + (p.y ?? 0) + bob, p.z);
    camera.rotation.set(aim.pitch, aim.yaw, 0);
    // Sprint widens the world a touch — the classic speed cue. Eased, never snapped.
    // ADS (right-click) beats sprint: if you are looking down the sights you are aiming, not running.
    const wantFov = gun.ads ? weaponOf(gun).zoomFov : (p.sprinting ? 81 : 75);
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, delta * 8);
      camera.updateProjectionMatrix();
    }
  }, FRAME_ORDER.camera);
  return null;
}

export default FpsRig;
