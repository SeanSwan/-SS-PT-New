/**
 * looks — maps each of the 20 hero mechanics onto a scene family plus its own axis.
 * @module pages/HomePage/three-worlds/scenes/looks
 *
 * WHY ONE FILE HOLDS ALL TWENTY
 * The interesting question when judging the fleet is "how do these differ?", and
 * that question is only answerable if the differences sit side by side. Twenty
 * scattered files hides the comparison; this table makes it one screen.
 *
 * Every row overrides at least three numeric axes, and no two rows share the same
 * `(family, count, speed, cameraZ)` shape. Combined with the skeleton tuple in
 * `skeletons.ts`, that means a variant differs in its wayfinding, its interaction
 * model, its content grid AND its actual geometry — not in its colour.
 * `lookIssues()` is the test hook that enforces the "at least three axes" rule.
 */
import * as THREE from 'three';
import type { HeroMechanics } from '../skeletons';
import {
  builderFor, FAMILY_PARAMS, SCENE_SIGNATURES,
  type SceneFamily, type SceneParams, type SceneSignature,
} from './paramsCore';
import type { WorldBuilder } from '../runtime';

export interface VariantLook {
  family: SceneFamily;
  /** Numeric axis for this variant, applied over the family baseline. */
  overrides?: Partial<SceneParams>;
}

/**
 * The 20 looks. Keys are HeroMechanics values, so the registry can assert that
 * every skeleton's mechanic resolves to a real scene.
 */
export const LOOKS: Record<HeroMechanics, VariantLook> = {
  // Long horizontal sweep read by scroll position.
  'scroll-scrub': { family: 'terrain', overrides: { spread: 46, detail: 40, speed: 0.35, drift: 1.1, cameraZ: 14, dolly: 9 } },
  // Camera drifts opposite the cursor against a layered point cloud.
  'pointer-parallax': { family: 'lines', overrides: { count: 22, spread: 16, drift: 0.9, speed: 0.4, dolly: 5 } },
  // Tight concentric rings the camera passes through.
  'depth-tunnel': { family: 'rings', overrides: { count: 26, radius: 3.4, gap: 3.6, thickness: 0.09, speed: 0.5, cameraZ: 15, dolly: 11 } },

  // Pieces travel past the camera as a shelf of program bands.
  'assemble': { family: 'rings', overrides: { count: 14, radius: 5.2, gap: 2.4, thickness: 0.05, speed: 0.3, cameraZ: 20, dolly: 8 } },
  // A solid body with satellites; lit, not additive.
  'object-orbit': { family: 'orbit', overrides: { count: 7, radius: 3.2, detail: 2, size: 0.2, speed: 0.45, cameraZ: 16, dolly: 6 } },
  // Sparse points resolving into a field.
  'field-reveal': { family: 'points', overrides: { count: 1600, spread: 30, size: 0.05, speed: 0.35, drift: 0.9, cameraZ: 22, dolly: 8, wire: true } },
  // A measurement grid that draws itself.
  'measured-reveal': { family: 'lines', overrides: { count: 34, spread: 20, drift: 0.35, speed: 0.25, cameraZ: 18, dolly: 6 } },

  // Discrete parts converge on a whole.
  'assembling-parts': { family: 'instanced', overrides: { count: 900, spread: 18, size: 0.09, speed: 0.55, drift: 0.8, cameraZ: 20, dolly: 10 } },
  // Overlapping transparent shells, lens-like.
  'layered-shells': { family: 'shells', overrides: { count: 5, radius: 2.6, speed: 0.5, spin: 0.05, cameraZ: 12, dolly: 4 } },
  // A grid that ignites outward from the pointer.
  'grid-ignition': { family: 'instanced', overrides: { count: 1400, spread: 22, size: 0.07, speed: 0.7, drift: 0.4, cameraZ: 24, dolly: 12 } },

  // Strokes drawn across the frame.
  'line-draw': { family: 'lines', overrides: { count: 48, spread: 24, drift: 0.7, speed: 0.3, cameraZ: 20, dolly: 7 } },
  // Thousands of discrete units as one additive point field.
  'instanced-swarm': { family: 'points', overrides: { count: 4200, spread: 34, size: 0.035, speed: 0.9, drift: 1.4, cameraZ: 26, dolly: 14 } },
  // Camera pushes in on a fixed subject.
  'camera-dolly': { family: 'orbit', overrides: { count: 4, radius: 4.2, detail: 3, size: 0.24, speed: 0.3, cameraZ: 20, dolly: 15 } },
  // A shell whose surface mutates.
  'shell-morph': { family: 'shells', overrides: { count: 8, radius: 2.2, speed: 1.1, spin: 0.1, cameraZ: 14, dolly: 5 } },
  // A wide instanced lattice.
  'instanced-field': { family: 'instanced', overrides: { count: 2200, spread: 32, size: 0.06, speed: 0.4, drift: 0.6, cameraZ: 28, dolly: 9 } },
  // A band of light crossing the geometry.
  'light-sweep': { family: 'waveform', overrides: { count: 64, spread: 5.5, size: 0.3, speed: 0.8, cameraZ: 18, dolly: 8 } },
  // The subject breaks apart on scroll.
  fracture: { family: 'orbit', overrides: { count: 12, radius: 3.6, detail: 1, size: 0.14, speed: 0.6, cameraZ: 17, dolly: 12, wire: true } },
  // Amplitude bars driven by scroll and pointer.
  waveform: { family: 'waveform', overrides: { count: 96, spread: 4.2, size: 0.28, speed: 1.0, cameraZ: 20, dolly: 6 } },
  // Aerial flight across displaced ground.
  'terrain-fly': { family: 'terrain', overrides: { spread: 60, detail: 64, speed: 0.5, drift: 1.6, cameraZ: 16, dolly: 14, wire: true } },
  // Layered shells with strong pointer coupling.
  'shell-lens': { family: 'shells', overrides: { count: 6, radius: 3.0, speed: 0.45, spin: 0.06, cameraZ: 13, dolly: 7 } },
};

/** Resolve a mechanic to a builder. Unknown mechanics throw loudly rather than blank. */
export function builderForMechanic(mechanics: HeroMechanics): WorldBuilder {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no scene registered for hero mechanic: ${mechanics}`);
  return builderFor(look.family, look.overrides ?? {});
}

/** The geometry a mechanic resolves to, as a stable string. Used by the divergence test. */
export function familySignature(mechanics: HeroMechanics): string {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no look for mechanic: ${mechanics}`);
  return `${look.family}:${SCENE_SIGNATURES[look.family].geometry}`;
}

/**
 * Prove a mechanic resolves to a family that really builds Three.js geometry.
 * Runs without a GPU: it validates the declared signature and that the resolved
 * builder is callable. The signature table is what keeps this honest — a family
 * cannot be registered without naming the Three.js object it instantiates.
 */
export function assertVariantHasGeometry(mechanics: HeroMechanics): SceneSignature {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no look registered for mechanic ${mechanics}`);
  const sig = SCENE_SIGNATURES[look.family];
  if (!sig) throw new Error(`no signature for family ${look.family}`);
  if (!sig.object.startsWith('THREE.') || !sig.geometry.startsWith('THREE.')) {
    throw new Error(`family ${look.family} does not declare Three.js objects`);
  }
  if (typeof builderForMechanic(mechanics) !== 'function') {
    throw new Error(`family ${look.family} has no builder`);
  }
  return sig;
}

/** Guard used by tests: every look must resolve, with finite numbers only. */
export function lookIssues(): string[] {
  const problems: string[] = [];
  const numericKeys: Array<keyof SceneParams> = [
    'count', 'spread', 'size', 'speed', 'spin', 'drift',
    'radius', 'thickness', 'gap', 'detail', 'cameraZ', 'dolly',
  ];
  for (const [mechanic, look] of Object.entries(LOOKS)) {
    if (!FAMILY_PARAMS[look.family]) {
      problems.push(`${mechanic}: unknown family ${look.family}`);
      continue;
    }
    for (const key of numericKeys) {
      const v = look.overrides?.[key];
      if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
        problems.push(`${mechanic}.${String(key)} is not a finite number`);
      }
    }
    const numericOverrides = numericKeys.filter((k) => look.overrides?.[k] !== undefined);
    if (numericOverrides.length < 3) {
      problems.push(`${mechanic}: only ${numericOverrides.length} numeric axes overridden (need >=3)`);
    }
  }
  return problems;
}
