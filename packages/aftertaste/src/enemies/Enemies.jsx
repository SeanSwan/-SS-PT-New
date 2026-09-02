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
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { stepEnemy } from './steering.js';
import Monster from './Monster.jsx';
import { ROSTER } from './roster.js';
import { gaitPose, gaitSeed } from './gaits.js';
import { can } from '../systems/lifecycle.js';
import { useGameStore, usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';

export default function Enemies() {
  const meshes = useRef({});
  const enemies = useGameStore((s) => s.enemies);

  useFrame((state, delta) => {
    const player = usePlayerStore.getState().position;
    // The round advances here because this loop already has the player position and the flock.
    // state.clock.elapsedTime is three.js's running total; the invulnerability window uses it.
    useGameStore.getState().tick(player, state.clock.elapsedTime);
    const list = useGameStore.getState().enemies;

    // Steer everyone against a SNAPSHOT taken before anyone moves. Updating in place would make
    // enemy 2 react to enemy 1's already-moved position — the flock develops a lean that is almost
    // impossible to diagnose later.
    const snapshot = list.map((e) => ({ x: e.x, z: e.z }));

    for (let i = 0; i < list.length; i++) {
      // Only the alive MOVE — the lifecycle table decides. A spawning enemy is materialising, an
      // attacking one is planted in its lunge, a corpse is toppling. All of them still stand in
      // the separation snapshot above, so the living flock walks AROUND a corpse, not through it.
      if (!can(list[i], 'canMove')) continue;
      const row = ROSTER[list[i].type];
      // Gait identity (S2): the pose decorates, the speedScale pulses — the skitter's burst rhythm
      // IS its speed some frames and its pause others; steering itself is unchanged.
      const pose = gaitPose(row?.gait, state.clock.elapsedTime, gaitSeed(list[i].id));
      // Per-monster speed from the roster row; the fallback keeps stateless test enemies moving.
      const next = stepEnemy(snapshot[i], player, snapshot, delta, (row?.speed ?? 2) * pose.speedScale);
      list[i].x = next.x;
      list[i].z = next.z;
      const mesh = meshes.current[list[i].id];
      if (mesh) {
        mesh.position.x = next.x;
        mesh.position.z = next.z;
        mesh.position.y = pose.yOffset;
        // Face the walk (plus the gait's wobble). atan2(dx, dz): three.js yaw 0 looks down +z.
        const dx = player.x - next.x; const dz = player.z - next.z;
        if (dx * dx + dz * dz > 1e-6) mesh.rotation.y = Math.atan2(dx, dz) + pose.yawJitter;
        mesh.rotation.x = pose.rotX;
        mesh.rotation.z = pose.rotZ;
      }
    }

    if (typeof window !== 'undefined') {
      window.__swanEnemyPos = list.map((e) => ({ x: e.x, z: e.z, hp: e.hp, state: e.state, type: e.type }));
    }
  }, FRAME_ORDER.world);

  // The per-frame position writes land on this WRAPPER group, not on the model inside it. The
  // Fryling's own scale/offset (feet on the floor, centre on the enemy's position) then composes on
  // top, so movement code never has to know what the monster looks like. Note y=0 where the box
  // used y=0.5 — a box is centred on its origin, but the Fryling's origin is at its feet.
  return (
    <group name="enemies">
      {enemies.map((e) => (
        <group
          key={e.id}
          ref={(el) => { if (el) meshes.current[e.id] = el; else delete meshes.current[e.id]; }}
          position={[e.x, 0, e.z]}
        >
          {/* Suspense: useGLTF suspends until the GLB arrives. The fallback is the Slice-3 box, so
              the first frames of wave 1 show grey-box enemies instead of an empty board. */}
          <Suspense
            fallback={(
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={e.hp > 1 ? '#C4462F' : '#7A2418'} />
              </mesh>
            )}
          >
            <Monster type={e.type ?? 'fryling'} hp={e.hp} state={e.state} severed={e.severed} />
          </Suspense>
        </group>
      ))}
    </group>
  );
}
