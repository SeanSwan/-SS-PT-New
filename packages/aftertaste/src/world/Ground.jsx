/**
 * Ground.jsx — the floor.
 *
 * TEACHING NOTE: a plane is created standing up (facing you), so it must be rotated flat.
 * -Math.PI / 2 is -90 degrees in radians. three.js uses radians everywhere, never degrees —
 * that trips up everyone once.
 */
export default function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#2a2a33" />
    </mesh>
  );
}
