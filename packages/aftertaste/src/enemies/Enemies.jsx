/**
 * Enemies.jsx — every enemy, in ONE component.
 *
 * TEACHING NOTE — WHY NOT ONE COMPONENT PER ENEMY:
 * The obvious design is <Enemy /> repeated 40 times, each with its own useFrame. That works, and it
 * costs you 40 separate per-frame callbacks and 40 React components to reconcile. Worse, each enemy
 * needs to know about all the others (for separation), which means either 40 store subscriptions or
 * passing an array into each one.
 *
 * Instead: one component owns the whole flock. One useFrame, one loop over a plain array. This is
 * the single most useful habit for keeping a browser game fast — think in FLOCKS, not individuals.
 *
 * When you eventually have hundreds, the next step is instanced rendering (one draw call for all of
 * them). The shape of this file is already ready for that: the positions live in a plain array, not
 * scattered across component state.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { stepEnemy } from './steering.js';
import { usePlayerStore } from '../state/store.js';

/** Where the first wave stands. Slice 5 replaces this with a spawner. */
const START = [
  { x: -6, z: -8 },
  { x: 0, z: -10 },
  { x: 6, z: -8 },
];

export default function Enemies() {
  const meshes = useRef([]);
  // The authoritative positions. The meshes are just what you can see of them.
  const positions = useRef(START.map((p) => ({ ...p })));

  useFrame((_state, delta) => {
    const player = usePlayerStore.getState().position;
    const current = positions.current;

    // Read ALL current positions before writing any, so every enemy steers against the same
    // snapshot. Updating in place would make enemy 2 react to enemy 1's already-moved position —
    // subtly order-dependent, and the kind of bug that only shows up as "the flock leans left".
    const snapshot = current.map((p) => ({ ...p }));

    for (let i = 0; i < current.length; i++) {
      const next = stepEnemy(snapshot[i], player, snapshot, delta);
      current[i].x = next.x;
      current[i].z = next.z;
      const mesh = meshes.current[i];
      if (mesh) {
        mesh.position.x = next.x;
        mesh.position.z = next.z;
      }
    }

    // Exposed for the browser test, same reason as the player position.
    if (typeof window !== 'undefined') window.__swanEnemyPos = current.map((p) => ({ ...p }));
  });

  return (
    <group name="enemies">
      {START.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { meshes.current[i] = el; }}
          position={[p.x, 0.5, p.z]}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#C4462F" />
        </mesh>
      ))}
    </group>
  );
}
