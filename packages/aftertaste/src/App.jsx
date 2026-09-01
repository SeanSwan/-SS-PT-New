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
import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Ground from './world/Ground.jsx';
import Player from './player/Player.jsx';
import Enemies from './enemies/Enemies.jsx';
import Hud from './ui/Hud.jsx';
import { useShoot } from './combat/Shooting.jsx';
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

/**
 * The sun follows the player, exactly as the floor does (see Ground.jsx) and for the same reason:
 * the shadow camera is a fixed box in the LIGHT's space, and anything that walks out of the box
 * simply stops casting a shadow — no error, no warning, the shadow just is not there. Anchoring
 * the box to the player means "inside the box" is always true. A directional light's DIRECTION is
 * what creates the shading, and direction is preserved: position and target move together.
 */
function SunLight() {
  const light = useRef();
  useFrame(() => {
    const p = usePlayerStore.getState().position;
    const l = light.current;
    if (!l) return;
    l.position.set(p.x + 12, 18, p.z + 8);
    l.target.position.set(p.x, 0, p.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      position={[12, 18, 8]}
      intensity={1.4}
      castShadow
      // The shadow camera is an orthographic box; anything outside it casts no shadow at all.
      // It must cover the play area, or monsters lose their shadow as they walk in.
      shadow-camera-left={-30}
      shadow-camera-right={30}
      shadow-camera-top={30}
      shadow-camera-bottom={-30}
      shadow-mapSize={[1024, 1024]}
    />
  );
}

export default function App() {
  const shoot = useShoot();
  return (
    <>
    <Canvas
      // camera sits back and above, looking at the origin — the classic third-person framing.
      camera={{ position: [0, 13, 15], fov: 50 }}
      // Tell three.js we want webgl2 explicitly; the boot test asserts this context exists.
      gl={{ antialias: true }}
      // TEACHING NOTE: meshes have carried castShadow/receiveShadow since Slice 1, and they did
      // NOTHING -- shadows are off at the renderer unless you ask for them here. It is not an
      // error, it just silently draws no shadow. A contact shadow under a box is the strongest
      // single cue for WHERE a thing is on the floor, which is why it is worth the draw cost.
      shadows
      // Test seam, same reasoning as __swanPlayerPos: a browser test cannot reach into R3F's
      // internals, and "a SkinnedMesh is actually in the scene" is unprovable from the DOM alone.
      onCreated={(state) => {
        if (typeof window !== 'undefined') {
          window.__swanScene = state.scene;
          window.__swanCamera = state.camera;
        }
      }}
    >
      <color attach="background" args={['#0b0b0e']} />

      {/* Two lights, because one is never enough:
          ambient  = flat fill so nothing is pure black
          directional = a "sun" that creates the shading which reads as shape */}
      <ambientLight intensity={0.4} />
      <SunLight />

      <Ground onClick={shoot} />
      <Player />
      <Enemies />

      {/* Slice 2 replaced OrbitControls with a camera that follows the player. */}
      <CameraRig />
    </Canvas>
    <Hud />
    </>
  );
}
