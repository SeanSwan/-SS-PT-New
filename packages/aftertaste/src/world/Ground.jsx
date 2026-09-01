/**
 * Ground.jsx — the floor.
 *
 * TEACHING NOTE: a plane is created standing up (facing you), so it must be rotated flat.
 * -Math.PI / 2 is -90 degrees in radians. three.js uses radians everywhere, never degrees.
 *
 * TEACHING NOTE -- WHY THE GRID IS NOT DECORATION:
 * Your eye needs fixed features passing by to perceive motion at all; on a featureless floor the
 * game reads as frozen. A grid is the cheapest possible source of them, and it is a free ruler:
 * one square is one world unit, so you can SEE that you cover 5 units a second and an enemy 2.2.
 *
 * TEACHING NOTE — WHY THE GRID IS A TEXTURE AND NOT LINES (twice burned):
 * The grid began as a GridHelper — actual GL line primitives. Lines running along the camera's
 * view direction eventually cross far behind the camera, and the Windows GL layer visibly fails
 * to clip them: half the grid silently stopped drawing. At a 13-unit top-down height that took 9
 * units of travel to trigger; from a 1.6-unit FPS eye it is triggered STANDING STILL. So the grid
 * is now PAINTED ON THE FLOOR — a tiny canvas drawn once and repeated 50×50 across the plane.
 * A textured triangle cannot lose its stripes to line clipping; there are no lines left to clip.
 * (The hunt that found the original defect: CONCEPTS/debugging-by-elimination.md.)
 *
 * TEACHING NOTE — THE FLOOR FOLLOWS THE PLAYER, IN WHOLE-UNIT STEPS:
 * The world is translation-invariant (see the sun in App.jsx): the floor glides with you so it is
 * effectively infinite. It snaps to WHOLE units — its texture is the grid now, so a continuously
 * gliding floor would carry its lines with you and destroy the exact motion cue they exist for.
 * Snapped to its own 1-unit cell, every line lands where an infinite world grid's lines would.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, RepeatWrapping } from 'three';
import { usePlayerStore } from '../state/store.js';

/** One grid cell, drawn once: floor colour with a 2px line along two edges. Repeated by the GPU. */
function makeGridTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#23232b';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3d4356';
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);
  const texture = new CanvasTexture(c);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(50, 50);
  // Without anisotropy a floor texture at a grazing FPS angle smears to mud in the distance.
  texture.anisotropy = 8;
  return texture;
}

export default function Ground() {
  const plane = useRef();
  const texture = useMemo(makeGridTexture, []);

  useFrame(() => {
    const p = usePlayerStore.getState().position;
    if (plane.current) {
      plane.current.position.x = Math.round(p.x);
      plane.current.position.z = Math.round(p.z);
    }
  });

  return (
    <mesh ref={plane} rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="ground">
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
