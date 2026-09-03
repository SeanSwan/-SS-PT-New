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
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboard } from './useKeyboard.js';
import { gun } from '../combat/gunState.js';
import { useGameStore } from '../state/store.js';
import { resolveCollision } from '../world/rooms.js';
import { stepV } from './movement.js';
import { aim } from './aim.js';
import { usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';

export default function Player() {
  // Position AND velocity now (feel pack): stepV evolves velocity, which is what reads as weight.
  const body = useRef({ x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 });
  const keys = useKeyboard();
  const setPosition = usePlayerStore((s) => s.setPosition);

  // Test seam (S6a): put the player somewhere exactly. Proving a wall holds requires STANDING at
  // it — the first version of the wall test walked from the middle for 2.2s, never reached the
  // side walls 12 units away, and passed with the wall code deliberately deleted. A stopwatch is
  // not a position.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__swanTeleport = ({ x, z }) => {
      body.current.x = x; body.current.z = z; body.current.vx = 0; body.current.vz = 0;
    };
    return () => { delete window.__swanTeleport; };
  }, []);

  useFrame((_state, delta) => {
    const next = stepV(body.current, keys.current, delta, aim.yaw, gun.ads, useGameStore.getState().feverUntil > 0);
    // THE WALLS ARE REAL (S6a). Resolved AFTER the physics rather than inside it: movement stays a
    // pure function of intent, and the map stays a table the movement code has never heard of.
    // Velocity is zeroed on the axis that was blocked, so walking into a wall does not bank speed
    // that fires you sideways the moment you turn away from it.
    const room = useGameStore.getState().room;
    if (room) {
      const fixed = resolveCollision(next.x, next.z, room);
      if (fixed.x !== next.x) { next.x = fixed.x; next.vx = 0; }
      if (fixed.z !== next.z) { next.z = fixed.z; next.vz = 0; }
    }
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
