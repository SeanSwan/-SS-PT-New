/**
 * Monster.jsx — ANY monster from the roster, one component. (Generalised from Fryling.jsx once
 * the roster grew past one face; the fryling-specific version lives in git history.)
 *
 * TEACHING NOTE — WHY A SKINNED MESH CANNOT JUST BE .clone()d:
 * three.js's ordinary `.clone()` copies the mesh but keeps pointing at the ORIGINAL skeleton. Give
 * forty enemies a plain clone and all forty animate identically, driven by whichever mixer ran
 * last. `SkeletonUtils.clone` duplicates the bone hierarchy too. The most common crowd bug in
 * three.js, and it produces no error — just wrong-looking output.
 *
 * TEACHING NOTE — SCALE AND OFFSET COME FROM MEASUREMENT:
 * Each GLB's bounds were read from its POSITION accessor and recorded in the roster (min/max per
 * axis, feet at y=0, origin wherever the author left it). The component normalises every monster
 * to ONE unit tall and centres its footprint on the enemy's logical position. Skip that and the
 * monster stands beside where the game thinks it is — collisions look unfair for invisible reasons.
 *
 * WHICH CLIPS PLAY:
 * The LIFECYCLE decides — `state` maps 1:1 to a clip. The component never decides behaviour; it
 * performs whatever state the machine put on its enemy. See CONCEPTS/enemy-lifecycle.md.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { LoopOnce } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ROSTER } from './roster.js';
import { MODEL_URLS } from './models.js';

/** state → clip. The mapping IS the performance contract; behaviour lives in the state machine. */
const CLIP_FOR = { spawning: 'idle', alive: 'move', attacking: 'attack', dying: 'death' };

export default function Monster({ type = 'fryling', hp = 2, state = 'alive' }) {
  const spec = ROSTER[type];
  const { scene, animations } = useGLTF(MODEL_URLS[type]);
  const group = useRef();

  // Normalise to 1 unit tall; centre the measured footprint on the logical position.
  const scale = 1 / spec.model.height;
  const offsetX = -((spec.model.minX + spec.model.maxX) / 2) * scale;
  const offsetZ = -((spec.model.minZ + spec.model.maxZ) / 2) * scale;

  // Clone once per instance. Without useMemo this re-clones every render, which leaks skeletons.
  const model = useMemo(() => {
    const copy = cloneSkinned(scene);
    copy.traverse((o) => {
      // Materials are shared by the clone; tinting one enemy would tint the whole flock.
      if (o.isMesh && o.material) o.material = o.material.clone();
      if (o.isMesh) o.castShadow = true;
      // A faint ember glow from within: at FPS eye height you mostly see the unlit side of
      // things, and a threat that fades into darkness is a missing render, not difficulty.
      if (o.isMesh && o.material?.emissive) o.material.emissive.set(spec.ember);
    });
    return copy;
  }, [scene, spec]);

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
  // not being shot. Suppressed while dying: a corpse that flinches un-dies in the viewer's eye.
  const previousHp = useRef(hp);
  useEffect(() => {
    if (hp < previousHp.current && state !== 'dying' && actions?.hit) {
      actions.hit.reset().setLoop(LoopOnce, 1).play();
    }
    previousHp.current = hp;
  }, [hp, state, actions]);

  // Damage darkening, thresholded at half the roster hp so a 4-hp bruiser darkens midway
  // through, exactly as a 2-hp fryling always did at 1.
  useEffect(() => {
    const damagedLook = hp <= spec.hp / 2;
    model.traverse((o) => {
      if (o.isMesh && o.material?.color) o.material.color.set(damagedLook ? spec.tint[1] : spec.tint[0]);
    });
  }, [hp, model, spec]);

  return (
    <group ref={group}>
      <primitive object={model} scale={scale} position={[offsetX, 0, offsetZ]} />
    </group>
  );
}

// Start fetching every face before its first wave, so nothing pops in mid-round.
for (const url of Object.values(MODEL_URLS)) useGLTF.preload(url);
