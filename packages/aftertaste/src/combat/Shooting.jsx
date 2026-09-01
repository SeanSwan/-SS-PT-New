/**
 * Shooting.jsx — click the ground, everything near that point takes a hit.
 *
 * TEACHING NOTE — HOW A 2D CLICK BECOMES A 3D POINT:
 * Your mouse is flat; the world is not. The standard trick is RAYCASTING: fire an invisible ray
 * from the camera through the pixel you clicked, and find where it crosses something. Here the
 * "something" is the ground plane, so the answer is where the ray meets y = 0.
 *
 * React Three Fiber gives this to you free: any mesh with an onClick handler already did the
 * raycast, and hands you the exact world point in `event.point`. That is why the click lives on the
 * GROUND mesh rather than on the window — the ground is what we want the ray to hit.
 */
import { useGameStore } from '../state/store.js';

export function useShoot() {
  const fire = useGameStore((s) => s.fire);
  return (event) => {
    // stopPropagation: without it a click that passes through several meshes fires several times.
    event.stopPropagation?.();
    const point = event.point ?? { x: 0, z: 0 };
    fire({ x: point.x, z: point.z });
  };
}
