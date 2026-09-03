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
import { aim } from '../player/aim.js';
import { PART_MESH_COUNT } from './partsData.js';
import { can } from '../systems/lifecycle.js';
import { useGameStore, usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';

export default function Enemies() {
  const meshes = useRef({});
  // Two refs per enemy, on purpose (F2). `meshes` is the WRAPPER that carries (x, z) — the same
  // anchor combat.js offsets every hit shape from. `poses` is an INNER group that carries the
  // gait's lean, lift and facing. Keeping them apart makes the invariant structural: nothing a
  // gait does can move the anchor, and a future reader cannot accidentally add displacement to it.
  const poses = useRef({});
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
      const dist = Math.hypot(player.x - snapshot[i].x, player.z - snapshot[i].z);
      const since = list[i].enteredRangeAt == null
        ? Infinity : state.clock.elapsedTime - list[i].enteredRangeAt;
      // "Am I being looked at?" — the angle between where the player is aiming and where this
      // creature stands. Cheap (one atan2 + a subtraction), and only rows that declare a cone pay
      // for it at all.
      let observed = false;
      if (row?.gait?.observedCone) {
        const toEnemy = Math.atan2(snapshot[i].x - player.x, snapshot[i].z - player.z);
        let delta_ = ((toEnemy - (aim.yaw + Math.PI)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        observed = Math.abs(delta_) < row.gait.observedCone && dist < 14;
      }
      const pose = gaitPose(row?.gait, state.clock.elapsedTime, gaitSeed(list[i].id), dist, since, observed);
      // Per-monster speed from the roster row; the fallback keeps stateless test enemies moving.
      const next = stepEnemy(snapshot[i], player, snapshot, delta, (row?.speed ?? 2) * pose.speedScale);
      list[i].x = next.x;
      list[i].z = next.z;
      const mesh = meshes.current[list[i].id];
      if (mesh) { mesh.position.x = next.x; mesh.position.z = next.z; }
      const posed = poses.current[list[i].id];
      if (posed) {
        posed.position.y = pose.yOffset;
        // Face the walk (plus the gait's wobble). atan2(dx, dz): three.js yaw 0 looks down +z.
        const dx = player.x - next.x; const dz = player.z - next.z;
        if (dx * dx + dz * dz > 1e-6) posed.rotation.y = Math.atan2(dx, dz) + pose.yawJitter;
        posed.rotation.x = pose.rotX;
        posed.rotation.z = pose.rotZ;
      }
    }

    if (typeof window !== 'undefined') {
      window.__swanEnemyPos = list.map((e) => ({ x: e.x, z: e.z, hp: e.hp, state: e.state, type: e.type }));
      // Test seam: how many skinned meshes each type renders. Browser specs asserting mesh counts
      // used to hardcode which types were parted, and went red every time the cast grew — the
      // count belongs to the data, so the seam exposes the data.
      window.__swanPartMeshCount = PART_MESH_COUNT;
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
          <group ref={(el) => { if (el) poses.current[e.id] = el; else delete poses.current[e.id]; }}>
          <Suspense
            fallback={(
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={e.hp > 1 ? '#C4462F' : '#7A2418'} />
              </mesh>
            )}
          >
            <Monster id={e.id} type={e.type ?? 'fryling'} hp={e.hp} state={e.state} severed={e.severed} />
          </Suspense>
          </group>
        </group>
      ))}
    </group>
  );
}
