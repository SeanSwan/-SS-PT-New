/**
 * Ground.jsx — the floor, and the thing your clicks land on.
 *
 * TEACHING NOTE: a plane is created standing up (facing you), so it must be rotated flat.
 * -Math.PI / 2 is -90 degrees in radians. three.js uses radians everywhere, never degrees.
 *
 * TEACHING NOTE — THE CLICK TARGET:
 * onClick here is what turns a flat mouse position into a world point: React Three Fiber raycasts
 * from the camera through the pixel, finds where it crosses this plane, and hands us event.point.
 * The ground is the natural click surface for a top-down game.
 *
 * TEACHING NOTE -- WHY THE GRID IS NOT DECORATION:
 * With a camera that follows the player, the player stays in the middle of the screen. On a plain
 * untextured floor that means NOTHING on screen changes as you move, and the game reads as frozen.
 * Your eye needs fixed features passing by to perceive motion at all. A grid is the cheapest
 * possible source of them -- one line, no texture, no art. Every grey-box prototype has one, and
 * this is the reason. It is also a free ruler: one square is one world unit, so you can SEE that
 * the player covers 5 units a second and an enemy covers 2.2.
 *
 * TEACHING NOTE — WHY THE FLOOR FOLLOWS THE PLAYER (the infinite-floor trick):
 * A fixed 50x50 floor has an EDGE, and worse: a grid line that runs along the camera's view
 * direction eventually has an endpoint far BEHIND the camera, and on Windows the browser's GL
 * layer visibly fails to clip such lines — half the grid silently stops drawing after ~9 units of
 * travel. No error, all tests green; only a screenshot caught it (see
 * CONCEPTS/debugging-by-elimination.md for the hunt). The fix is to make the world
 * TRANSLATION-INVARIANT: the plane glides with the player, and the grid follows in WHOLE-UNIT
 * steps — snapped to its own 1-unit cell so the lines land exactly where the "real" infinite
 * grid's lines would be. Snap the grid, or it swims with you and the motion cue it exists to
 * provide is destroyed. The plane is featureless, so IT may follow continuously.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../state/store.js';

export default function Ground({ onClick }) {
  const plane = useRef();
  const grid = useRef();

  useFrame(() => {
    const p = usePlayerStore.getState().position;
    if (plane.current) { plane.current.position.x = p.x; plane.current.position.z = p.z; }
    if (grid.current) { grid.current.position.x = Math.round(p.x); grid.current.position.z = Math.round(p.z); }
  });

  return (
    <group name="ground-group">
      <mesh ref={plane} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick} name="ground">
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#23232b" />
      </mesh>
      {/* Lifted a hair off the floor: two surfaces at exactly the same height fight over which is
          in front, and the result flickers as the camera moves ("z-fighting"). */}
      <gridHelper ref={grid} args={[50, 50, '#3d4356', '#2c313f']} position={[0, 0.01, 0]} />
    </group>
  );
}
