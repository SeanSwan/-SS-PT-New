/**
 * Tracers.jsx — the visible bullet ("I wanna see bullets", playtest 2) plus the muzzle pop.
 *
 * TEACHING NOTE — THE TRACER IS THE BULLET'S WAKE, NOT THE BULLET:
 * Hitscan already decided the hit the instant the trigger pulled (combat.js). What players call
 * "seeing the bullet" is a light streak drawn AFTER the fact along the ray — every hitscan
 * shooter fakes it exactly this way. Each streak is a thin glowing cylinder from muzzle to impact
 * (a hit tracer STOPS at the monster — that stop is subtle aim feedback), alive for a blink
 * (SHOT_TTL) and faded by age as a pure function, like the debris.
 *
 * The muzzle flash is one point light whose intensity decays from the latest shot — light is the
 * cheapest "the gun went off" cue that exists.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { useGameStore, SHOT_TTL } from '../state/store.js';

const UP = new Vector3(0, 1, 0);
const _dir = new Vector3();
const _quat = new Quaternion();

function Streak({ shot }) {
  const ref = useRef();
  const from = shot.from; const to = shot.to;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  _dir.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
  _quat.setFromUnitVectors(UP, _dir);

  useFrame((state) => {
    if (!ref.current?.material) return;
    const age = state.clock.elapsedTime - shot.at;
    ref.current.material.opacity = Math.max(0, 1 - age / SHOT_TTL) * 0.85;
  });

  return (
    <mesh ref={ref} position={mid} quaternion={_quat.clone()}>
      <cylinderGeometry args={[0.012, 0.012, len, 4, 1, true]} />
      <meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

export default function Tracers() {
  const shots = useGameStore((s) => s.shots);
  const light = useRef();

  // Muzzle flash: one light, intensity decayed from the newest shot's age.
  useFrame((state) => {
    const l = light.current;
    if (!l) return;
    const latest = useGameStore.getState().shots.at(-1);
    if (!latest) { l.intensity = 0; return; }
    const age = state.clock.elapsedTime - latest.at;
    l.intensity = Math.max(0, 1 - age / 0.06) * 2.5;
    l.position.set(latest.from[0], latest.from[1] - 0.15, latest.from[2]);
  });

  return (
    <group name="tracers">
      <pointLight ref={light} intensity={0} distance={6} color="#ffd27a" />
      {shots.map((s) => <Streak key={s.id} shot={s} />)}
    </group>
  );
}
