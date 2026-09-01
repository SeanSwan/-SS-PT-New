/**
 * App.jsx — the scene.
 *
 * TEACHING NOTE — THE GAME LOOP:
 * <Canvas> starts a loop that runs ~60 times a second: it updates, then it draws. You never write
 * that loop yourself in React Three Fiber; you describe WHAT is in the world, and the loop draws it.
 * Later (Slice 2) you will hook into a single frame with useFrame — that is where "movement" lives.
 *
 * Everything here is a normal React component, but the tags are 3D things instead of HTML:
 *   <mesh>          a thing you can see  = shape + material
 *   <planeGeometry> the shape (a flat square)
 *   <meshStandardMaterial> how light bounces off it
 * Lights matter: with no light, a standard material renders pure black. That is the single most
 * common "my scene is empty" mistake, and it is not an error — it draws perfectly, in black.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Ground from './world/Ground.jsx';
import Player from './player/Player.jsx';
import { usePlayerStore } from './state/store.js';
import { followPlayer } from './systems/cameraFollow.js';

/**
 * A component that renders nothing and only runs a per-frame system. This is a common and useful
 * shape: "logic that needs the frame, but is not a visible thing."
 */
function CameraRig() {
  const { camera } = useThree();
  useFrame((_s, delta) => {
    followPlayer(camera, usePlayerStore.getState().position, delta);
  });
  return null;
}

export default function App() {
  return (
    <Canvas
      // camera sits back and above, looking at the origin — the classic third-person framing.
      camera={{ position: [8, 6, 10], fov: 50 }}
      // Tell three.js we want webgl2 explicitly; the boot test asserts this context exists.
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0b0b0e']} />

      {/* Two lights, because one is never enough:
          ambient  = flat fill so nothing is pure black
          directional = a "sun" that creates the shading which reads as shape */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />

      <Ground />
      <Player />

      {/* Slice 2 replaced OrbitControls with a camera that follows the player. */}
      <CameraRig />
    </Canvas>
  );
}
