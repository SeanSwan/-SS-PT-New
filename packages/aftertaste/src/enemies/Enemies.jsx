/**
 * Enemies.jsx — every enemy, in ONE component.
 *
 * TEACHING NOTE — WHY NOT ONE COMPONENT PER ENEMY:
 * The obvious design is <Enemy /> repeated 40 times, each with its own useFrame. That costs 40
 * per-frame callbacks and 40 React components to reconcile, and every enemy needs to know about all
 * the others (for separation). One component owning the whole flock is the habit that keeps a
 * browser game fast — think in FLOCKS, not individuals. The positions live in a plain array, which
 * is also what instanced rendering will want later.
 *
 * TEACHING NOTE — WHY THE LIST LIVES IN THE STORE NOW:
 * Slice 3 kept enemies private to this component. Slice 4 needs shooting (a click, elsewhere) to
 * remove them, so the list moved to the store — the shared table both systems read. That is the
 * normal moment to promote state: when a SECOND system needs it, not before.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { stepEnemy } from './steering.js';
import { useGameStore, usePlayerStore } from '../state/store.js';

export default function Enemies() {
  const meshes = useRef({});
  const enemies = useGameStore((s) => s.enemies);

  useFrame((_state, delta) => {
    const player = usePlayerStore.getState().position;
    const list = useGameStore.getState().enemies;

    // Steer everyone against a SNAPSHOT taken before anyone moves. Updating in place would make
    // enemy 2 react to enemy 1's already-moved position — the flock develops a lean that is almost
    // impossible to diagnose later.
    const snapshot = list.map((e) => ({ x: e.x, z: e.z }));

    for (let i = 0; i < list.length; i++) {
      const next = stepEnemy(snapshot[i], player, snapshot, delta);
      list[i].x = next.x;
      list[i].z = next.z;
      const mesh = meshes.current[list[i].id];
      if (mesh) { mesh.position.x = next.x; mesh.position.z = next.z; }
    }

    if (typeof window !== 'undefined') {
      window.__swanEnemyPos = list.map((e) => ({ x: e.x, z: e.z, hp: e.hp }));
    }
  });

  return (
    <group name="enemies">
      {enemies.map((e) => (
        <mesh
          key={e.id}
          ref={(el) => { if (el) meshes.current[e.id] = el; else delete meshes.current[e.id]; }}
          position={[e.x, 0.5, e.z]}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          {/* Damaged enemies go darker — the cheapest possible "I hit it" feedback. */}
          <meshStandardMaterial color={e.hp > 1 ? '#C4462F' : '#7A2418'} />
        </mesh>
      ))}
    </group>
  );
}
