/**
 * Player.jsx — the box you drive.
 *
 * TEACHING NOTE — useFrame IS THE UPDATE STEP:
 * The callback below runs once per frame, before the picture is drawn. `delta` is how many seconds
 * passed since the last one. This is the "update" half of the game loop you read about in
 * CONCEPTS/game-loop.md — for this one object.
 *
 * Notice what it does NOT do: it does not re-render React. It writes straight to the 3D object's
 * position (`ref.current.position`). Sixty React re-renders a second would be slow and pointless —
 * the 3D library is already redrawing every frame.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboard } from './useKeyboard.js';
import { step } from './movement.js';
import { usePlayerStore } from '../state/store.js';

export default function Player() {
  const ref = useRef();
  const keys = useKeyboard();
  const setPosition = usePlayerStore((s) => s.setPosition);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const now = { x: ref.current.position.x, z: ref.current.position.z };
    const next = step(now, keys.current, delta);
    ref.current.position.x = next.x;
    ref.current.position.z = next.z;
    // Publish for anything that needs to know where the player is (the camera; later, enemies).
    setPosition(next);
  });

  return (
    <mesh ref={ref} position={[0, 0.5, 0]} castShadow name="player">
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#60C0F0" />
    </mesh>
  );
}
