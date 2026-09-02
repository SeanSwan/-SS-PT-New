/**
 * Debris.jsx — severed parts tumbling on the floor. DECORATION, by contract: nothing here is an
 * enemy, holds a wave, or takes a bullet (roster-v2 contract §5 answered those in the table).
 *
 * TEACHING NOTE — A CANNED TOSS, NOT A PHYSICS ENGINE:
 * Each gib follows a deterministic ballistic arc computed from its age: position is a pure
 * function of (bornAt, now), so there is no per-gib velocity state to integrate, nothing to
 * accumulate error, and a re-render can never teleport a chunk. The dry voxel pop (T1 default —
 * food monsters shed crumbs, not blood): a few tinted cubes fan out, bounce once by clamping the
 * arc at the floor, spin as they fly, and fade out over the TTL. A physics engine remains
 * un-earned — see CONCEPTS/collision-without-physics.md.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, DEBRIS_TTL } from '../state/store.js';
import { ROSTER } from '../enemies/roster.js';

const CHUNKS_PER_GIB = 4;
const GRAVITY = 6; // gentler than earth: crumbs, not cannonballs
const POP_HEIGHT = 0.85; // gibs leave from about head height

/** Deterministic per-chunk launch parameters from the debris id — no RNG state to drift. */
function launch(seedStr, k) {
  let h = 2166136261;
  const s = `${seedStr}:${k}`;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 6283) / 1000; // angle 0..2π
  const speed = 0.8 + (((h >>> 8) % 100) / 100) * 0.9;
  const up = 1.2 + (((h >>> 16) % 100) / 100) * 0.8;
  const spin = 2 + (((h >>> 24) % 100) / 50);
  return { vx: Math.cos(a) * speed, vz: Math.sin(a) * speed, up, spin };
}

function Gib({ item }) {
  const group = useRef();
  const tint = ROSTER[item.type]?.tint?.[1] ?? '#7A2418';

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const age = Math.max(0, state.clock.elapsedTime - item.bornAt);
    const fade = Math.max(0, 1 - age / DEBRIS_TTL);
    g.children.forEach((chunk, k) => {
      const L = launch(item.id, k);
      const x = item.x + L.vx * Math.min(age, 1.2); // lateral travel stops after the scatter
      const z = item.z + L.vz * Math.min(age, 1.2);
      // Ballistic arc, clamped at the floor — one "bounce" into rest, no simulation.
      const y = Math.max(0.06, POP_HEIGHT + L.up * age - 0.5 * GRAVITY * age * age);
      chunk.position.set(x, y, z);
      chunk.rotation.set(L.spin * age, L.spin * age * 0.7, 0);
      chunk.scale.setScalar(0.12 * (0.5 + fade * 0.5));
      if (chunk.material) chunk.material.opacity = fade;
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: CHUNKS_PER_GIB }, (_, k) => (
        <mesh key={k} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={tint} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function Debris() {
  const debris = useGameStore((s) => s.debris);
  if (typeof window !== 'undefined') window.__swanDebris = debris.map((d) => ({ part: d.part, type: d.type }));
  return (
    <group name="debris">
      {debris.map((d) => <Gib key={d.id} item={d} />)}
    </group>
  );
}
