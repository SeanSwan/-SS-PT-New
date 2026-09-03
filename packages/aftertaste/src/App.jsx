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
import { Canvas } from '@react-three/fiber';

import Ground from './world/Ground.jsx';
import Debris from './world/Debris.jsx';
import SunLight from './world/SunLight.jsx';
import Player from './player/Player.jsx';
import FpsRig from './player/FpsRig.jsx';
import Enemies from './enemies/Enemies.jsx';
import Hud from './ui/Hud.jsx';
import Tracers from './combat/Tracers.jsx';
import TriggerControl from './combat/TriggerControl.jsx';

export default function App() {
  return (
    <>
    <Canvas
      // First-person: FpsRig owns position and rotation every frame, so no initial pose matters.
      // fov 75 vertical is the FPS convention (Overwatch/Battlefield territory); the old 50 was a
      // telephoto look that reads claustrophobic from eye height.
      camera={{ fov: 75, near: 0.1 }}
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
      {/* Fog the same colour as the background: distance fades to void instead of ending at a
          visible floor edge. It starts past the whole spawn ring (18) so threats are never hidden,
          and ends at 46 — INSIDE the floor's 55-unit edge, so the edge is gone by construction.
          (The first floor was 50 wide and the old comment claimed full swallowing; arithmetic said
          19% fog at the edge — GLM-Flash finding 9. Sizes are now chosen to make the claim true,
          and MAX_RANGE in combat.js stays inside fog-far so nothing hittable is invisible.) */}
      <fog attach="fog" args={['#0b0b0e', 20, 46]} />

      {/* Two lights, because one is never enough:
          ambient  = flat fill so nothing is pure black
          directional = a "sun" that creates the shading which reads as shape.
          Ambient came up from 0.4 when the camera dropped to eye height — at ground level you
          mostly see the UNLIT side of things, and 0.4 read as near-black monsters. */}
      <ambientLight intensity={0.6} />
      <SunLight />

      <Ground />
      <Player />
      <Enemies />
      <Debris />
      <Tracers />

      {/* Slice 2 replaced OrbitControls with a follow camera; the FPS slice put it behind your eyes. */}
      <FpsRig />
      <TriggerControl />
    </Canvas>
    <Hud />
    </>
  );
}
