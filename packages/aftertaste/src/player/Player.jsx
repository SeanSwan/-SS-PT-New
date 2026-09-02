/**
 * Player.jsx — you, now that the camera is behind your eyes.
 *
 * TEACHING NOTE — THE PLAYER RENDERS NOTHING IN FIRST PERSON:
 * The blue box is gone because YOU are standing where it stood. In an FPS the "player" is not a
 * thing you draw — it is a position and an aim that everything else reads (the camera parks at the
 * position; enemies seek it; the gun fires from it). What survives from the top-down slices is
 * exactly the part that was never about drawing: the movement rule, still a pure function.
 *
 * TEACHING NOTE — useFrame IS STILL THE UPDATE STEP:
 * The callback runs once per frame before the picture is drawn, and it does not re-render React —
 * it updates a plain object and publishes to the store. Movement is now VIEW-RELATIVE: step()
 * receives the aim's yaw, so W means "the way I am looking" (see movement.js for why, and why
 * pitch deliberately does not steer).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboard } from './useKeyboard.js';
import { stepV } from './movement.js';
import { aim } from './aim.js';
import { usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';

export default function Player() {
  // Position AND velocity now (feel pack): stepV evolves velocity, which is what reads as weight.
  const body = useRef({ x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 });
  const keys = useKeyboard();
  const setPosition = usePlayerStore((s) => s.setPosition);

  useFrame((_state, delta) => {
    const next = stepV(body.current, keys.current, delta, aim.yaw);
    body.current = next;
    // Publish EVERY frame, moving or not — the __swanPlayerPos seam must exist from frame one.
    // (A "publish only on change" optimisation here broke seven browser tests at once.) The
    // published object carries y + speed + sprint for the camera's bob/FOV; 2D consumers
    // (enemies, spawn rings, touch range) read x/z as ever.
    setPosition({
      x: next.x, z: next.z, y: next.y,
      speed: Math.hypot(next.vx, next.vz),
      grounded: next.y <= 0,
      sprinting: keys.current.sprint && (keys.current.forward || keys.current.back || keys.current.left || keys.current.right),
    });
  }, FRAME_ORDER.player);

  return null;
}
