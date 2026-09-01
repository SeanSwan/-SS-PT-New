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
 * verified to actually animate by scripts/assets/verify-clips.mjs). This component plays `move`,
 * and flinches with `hit` when the creature takes damage. `attack` and `death` are NOT wired yet:
 * both need a lifecycle this slice does not have — an enemy that is mid-attack or mid-death is
 * still on the board but must not damage you, block a wave from clearing, or be shot again. That
 * is a behaviour slice, not an asset one, and claiming it here would be claiming a state machine
 * that does not exist.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
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

export default function Fryling({ hp = 2 }) {
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
    });
    return copy;
  }, [scene]);

  const { actions } = useAnimations(animations, model);

  useEffect(() => {
    const move = actions?.move;
    if (!move) return undefined;
    move.reset().fadeIn(0.2).play();
    return () => { move.fadeOut(0.2); };
  }, [actions]);

  // Flinch on damage. Guarded by a ref so the FIRST render does not read as a hit — mounting is
  // not being shot, and a monster that flinches the moment it spawns looks broken.
  const previousHp = useRef(hp);
  useEffect(() => {
    if (hp < previousHp.current && actions?.hit) {
      actions.hit.reset().setLoop(2200, 1).play(); // THREE.LoopOnce
    }
    previousHp.current = hp;
  }, [hp, actions]);

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
