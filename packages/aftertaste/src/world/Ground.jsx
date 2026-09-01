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
 */
export default function Ground({ onClick }) {
  return (
    <group name="ground-group">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick} name="ground">
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#23232b" />
      </mesh>
      {/* Lifted a hair off the floor: two surfaces at exactly the same height fight over which is
          in front, and the result flickers as the camera moves ("z-fighting"). */}
      <gridHelper args={[50, 50, '#3d4356', '#2c313f']} position={[0, 0.01, 0]} />
    </group>
  );
}
