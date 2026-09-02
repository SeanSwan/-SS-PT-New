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
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

/** One scratch vector, reused every shot — allocating in a frame loop feeds the garbage collector. */
const _dirScratch = new Vector3();
import Ground from './world/Ground.jsx';
import Debris from './world/Debris.jsx';
import Player from './player/Player.jsx';
import Enemies from './enemies/Enemies.jsx';
import Hud from './ui/Hud.jsx';
import { aim, applyLook, PITCH_LIMIT } from './player/aim.js';
import Tracers from './combat/Tracers.jsx';
import { useGameStore, usePlayerStore } from './state/store.js';
import { FRAME_ORDER } from './systems/frameOrder.js';

/** Eye height. Enemies are ~1 unit tall, so you look slightly DOWN at the swarm — CoD-zombies framing. */
const EYE_HEIGHT = 1.6;

// Frame ordering is DECLARED, not mount-order luck — see systems/frameOrder.js (GLM-5.3, finding 9).

/** Seconds between shots while the trigger is held. ~400 rounds/min — an Overwatch-ish auto. */
const FIRE_INTERVAL = 0.15;

/**
 * FpsRig — the camera goes behind your eyes (Sean's call: shoot like Overwatch/Battlefield).
 *
 * TEACHING NOTE — POINTER LOCK IS WHAT MAKES MOUSE-LOOK POSSIBLE:
 * A normal mouse cursor stops at the screen edge, so "keep turning right" would be impossible.
 * requestPointerLock() hides the cursor and starts reporting RELATIVE movement (movementX/Y)
 * forever, which is exactly what an aim wants. It must be requested from a user gesture — the
 * click — and Esc always releases it; the browser owns that, not us. Lock gates LOOKING only;
 * firing works regardless, which also keeps the game testable in browsers where lock is refused.
 *
 * TEACHING NOTE — A COMPONENT THAT RENDERS NOTHING and only runs a per-frame system is a normal
 * shape: "logic that needs the frame, but is not a visible thing."
 */
function FpsRig() {
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    // YXZ: spin (yaw) first, then tilt (pitch). Any other order makes diagonal looking "roll".
    camera.rotation.order = 'YXZ';
    const onMouseDown = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    };
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      Object.assign(aim, applyLook(aim, e.movementX, e.movementY));
    };
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    // Test seam: headless browsers refuse pointer lock, and a synthetic MouseEvent cannot carry
    // movementX. This is the same one-readable-global reasoning as __swanPlayerPos.
    if (typeof window !== 'undefined') {
      window.__swanAim = aim;
      window.__swanLook = (dx, dy) => Object.assign(aim, applyLook(aim, dx, dy));
    }
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, gl]);

  // View bob honours the user's reduced-motion preference — bob is feel for most, nausea for some.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const bobPhase = useRef(0);

  useFrame((state, delta) => {
    const p = usePlayerStore.getState().position;
    // Subtle view bob, driven by actual ground speed — standing still is perfectly still.
    let bob = 0;
    if (!reducedMotion && (p.grounded ?? true) && (p.speed ?? 0) > 0.5) {
      bobPhase.current += delta * (p.speed ?? 0) * 1.9;
      bob = Math.sin(bobPhase.current) * 0.022;
    }
    camera.position.set(p.x, EYE_HEIGHT + (p.y ?? 0) + bob, p.z);
    camera.rotation.set(aim.pitch, aim.yaw, 0);
    // Sprint widens the world a touch — the classic speed cue. Eased, never snapped.
    const wantFov = p.sprinting ? 81 : 75;
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, delta * 8);
      camera.updateProjectionMatrix();
    }
  }, FRAME_ORDER.camera);
  return null;
}

/**
 * TriggerControl — hold to fire.
 *
 * TEACHING NOTE — THE TRIGGER IS A FRAME SYSTEM, NOT A CLICK HANDLER:
 * A click handler fires once per click; Overwatch/BF6 guns fire while HELD, at a fixed rate. So
 * mousedown/mouseup only record intent, and the frame loop is what actually pulls the trigger —
 * first shot instantly, then one every FIRE_INTERVAL. The decision itself is a hitscan from the
 * camera (see combat.js): the ray IS the shot; any tracer would be decoration.
 */
/** Seconds a fresh unlocked click must be held before it fires. The click that GRABS the aim
 *  (requests pointer lock) must not also be a bullet down the pre-aim ray — cold start, every
 *  Esc, every restart, the crosshair sits wherever it sat and the "free shot" reads as a hit the
 *  player never authored (GLM-Flash finding 2). While already locked, clicks fire instantly. In
 *  a browser that refuses lock (headless tests), the still-held button simply starts firing when
 *  the window lapses — which is why every trigger test holds longer than this. */
const ARM_SECONDS = 0.25;

function TriggerControl() {
  const { camera, gl } = useThree();
  const held = useRef(false);
  const lastShot = useRef(-Infinity);
  const armedAt = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const down = (e) => {
      if (e.button === 2) {
        // THE PUNCH (playtest 2): right-click swings at everything in the facing arc.
        const p = usePlayerStore.getState().position;
        useGameStore.getState().melee({ x: p.x, z: p.z }, aim.yaw);
        return;
      }
      if (e.button !== 0) return;
      held.current = true;
      // An unlocked click is (also) the aim-grab — give the lock a beat before the gun believes it.
      armedAt.current = document.pointerLockElement === canvas ? 0 : performance.now() / 1000 + ARM_SECONDS;
    };
    const noMenu = (e) => e.preventDefault(); // right-click belongs to the fist, not the browser menu
    canvas.addEventListener('contextmenu', noMenu);
    const up = (e) => { if (e.button === 0) held.current = false; };
    // The keyboard has cleared its keys on window blur since Slice 2; the mouse path never did.
    // Alt-tab while firing left `held` true FOREVER (the mouseup lands on the other window), and
    // on refocus the gun fired autonomously with no button down (GLM-Flash finding 1).
    const blur = () => { held.current = false; };
    canvas.addEventListener('mousedown', down);
    document.addEventListener('mouseup', up);
    window.addEventListener('blur', blur);
    return () => {
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('mouseup', up);
      window.removeEventListener('blur', blur);
    };
  }, [gl]);

  useFrame((state) => {
    // Death opens the hand: without this, dying mid-burst leaves `held` true forever (the death
    // overlay swallows the mouseup) and "Go again" resumes firing uncommanded. shoot() itself
    // also refuses while over — belt AND braces, because they fail differently.
    if (useGameStore.getState().over) { held.current = false; return; }
    if (!held.current) return;
    if (performance.now() / 1000 < armedAt.current) return;
    const now = state.clock.elapsedTime;
    if (now - lastShot.current < FIRE_INTERVAL) return;
    lastShot.current = now;
    const dir = camera.getWorldDirection(_dirScratch);
    useGameStore.getState().shoot(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: dir.x, y: dir.y, z: dir.z },
    );
    // RECOIL (playtest 2: "tighten up the shooting"): a small upward kick the player fights.
    // Clamped by the same pitch limit the mouse obeys — recoil cannot look past straight up.
    aim.pitch = Math.min(aim.pitch + 0.008, PITCH_LIMIT);
    if (typeof window !== 'undefined') window.__swanShotsFired = (window.__swanShotsFired ?? 0) + 1;
  }, FRAME_ORDER.trigger);
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
