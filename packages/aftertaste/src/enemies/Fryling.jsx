/**
 * Fryling.jsx — the first real monster. Replaces the red box with the rigged, animated GLB that
 * came out of the Blender pipeline.
 *
 * TEACHING NOTE — WHY A SKINNED MESH CANNOT JUST BE .clone()d:
 * three.js's ordinary `.clone()` copies the mesh but keeps pointing at the ORIGINAL skeleton. Give
 * forty enemies a plain clone and all forty animate identically, driven by whichever mixer ran
 * last, because they are all reading one skeleton. `SkeletonUtils.clone` is the version that
 * duplicates the bone hierarchy too. This is the single most common "why is my crowd moving as one
 * creature" bug in three.js, and it produces no error — just wrong-looking output.
 *
 * TEACHING NOTE — WHY THE MODEL NEEDS A SCALE AND AN OFFSET:
 * The GLB measures 2 x 3 x 2 with its origin at a CORNER (min 0,0,0 — measured from the position
 * accessor, not guessed). The box it replaces was 1 x 1 x 1 centred on its own origin. So the model
 * is scaled to 1 unit tall (1/3) and shifted back by half its footprint, which puts its feet on the
 * floor and its centre on the enemy's actual position. Skip that and the monster stands beside
 * where the game thinks it is — and every collision then looks unfair for reasons you cannot see.
 *
 * WHICH CLIPS PLAY HERE:
 * The GLB carries all five the skeleton contract names (idle, move, attack, hit, death; each one
 * verified to actually animate by scripts/assets/verify-clips.mjs). The LIFECYCLE decides which
 * plays: `state` maps 1:1 to a clip — spawning breathes `idle`, alive waddles `move`, attacking
 * lunges `attack` (once — the state lasts exactly the clip's 16 frames), dying topples `death`
 * and CLAMPS on the final frame until the machine removes the corpse. The component never decides
 * behaviour; it performs whatever state the machine put on its enemy. `hit` flinches on damage,
 * except while dying — a corpse that flinches un-dies in the viewer's eye.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { LoopOnce } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Imported by URL from the SINGLE source of truth: the validated asset directory. Not copied into
// the game's public/ folder — a second copy is a second thing to keep in sync, and the manifest's
// sha256 would then describe a file the game does not load.
import frylingUrl from '../../../../assets/runtime/enemy/fryling/lod0.glb?url';

/** Measured from the GLB's POSITION accessor: min (0,0,0) max (2,3,2). */
const MODEL_HEIGHT = 3;
const MODEL_FOOTPRINT = 2;
const SCALE = 1 / MODEL_HEIGHT;
const CENTRE_OFFSET = -(MODEL_FOOTPRINT / 2) * SCALE;

/** state → clip. The mapping IS the performance contract; behaviour lives in the state machine. */
const CLIP_FOR = { spawning: 'idle', alive: 'move', attacking: 'attack', dying: 'death' };

export default function Fryling({ hp = 2, state = 'alive' }) {
  const { scene, animations } = useGLTF(frylingUrl);
  const group = useRef();

  // Clone once per instance. Without useMemo this re-clones every render, which leaks skeletons.
  const model = useMemo(() => {
    const copy = cloneSkinned(scene);
    // Materials are shared by the clone, so tinting one enemy would tint every enemy. Give each
    // its own copy — the cost is one material per monster, the alternative is a whole flock
    // flashing when a single member is hit.
    copy.traverse((o) => {
      if (o.isMesh && o.material) o.material = o.material.clone();
      if (o.isMesh) o.castShadow = true;
      // A faint ember glow from within. A THREAT MUST ALWAYS READ: at FPS eye height most of what
      // you see is the unlit side of things, and a monster that fades into darkness is not
      // difficulty, it is a missing render. Emissive light ignores the sun entirely.
      if (o.isMesh && o.material?.emissive) o.material.emissive.set('#571510');
    });
    return copy;
  }, [scene]);

  const { actions } = useAnimations(animations, model);

  useEffect(() => {
    const action = actions?.[CLIP_FOR[state] ?? 'move'];
    if (!action) return undefined;
    if (state === 'attacking' || state === 'dying') {
      action.setLoop(LoopOnce, 1);
      // Without clampWhenFinished a finished death SNAPS BACK to the bind pose — the corpse
      // stands up for a frame before removal, and it reads as a resurrection bug.
      action.clampWhenFinished = true;
    }
    action.reset().fadeIn(0.15).play();
    return () => { action.fadeOut(0.15); };
  }, [actions, state]);

  // Flinch on damage. Guarded by a ref so the FIRST render does not read as a hit — mounting is
  // not being shot, and a monster that flinches the moment it spawns looks broken.
  const previousHp = useRef(hp);
  useEffect(() => {
    if (hp < previousHp.current && state !== 'dying' && actions?.hit) {
      actions.hit.reset().setLoop(LoopOnce, 1).play();
    }
    previousHp.current = hp;
  }, [hp, state, actions]);

  // Damaged monsters darken, exactly as the grey-box did — the cheapest possible "I hit it".
  useEffect(() => {
    model.traverse((o) => {
      if (o.isMesh && o.material?.color) o.material.color.set(hp > 1 ? '#C4462F' : '#7A2418');
    });
  }, [hp, model]);

  return (
    <group ref={group}>
      <primitive object={model} scale={SCALE} position={[CENTRE_OFFSET, 0, CENTRE_OFFSET]} />
    </group>
  );
}

// Start fetching before the first monster mounts, so wave 1 does not pop in.
useGLTF.preload(frylingUrl);
