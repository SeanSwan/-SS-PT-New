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
 */
export default function Ground({ onClick }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick} name="ground">
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#2a2a33" />
    </mesh>
  );
}
