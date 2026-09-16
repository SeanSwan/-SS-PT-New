/**
 * paramsCore — the numeric axis, family registry and builder factory.
 * @module pages/HomePage/three-worlds/scenes/paramsCore
 *
 * Split out of `families.ts` to respect the rule-4 line cap: `families.ts` owns
 * the scene construction, this file owns the numbers and the dispatch.
 *
 * The factory is the single place family parameters are merged, so every variant
 * resolves its numbers the same way and a bad merge cannot exist in one variant
 * but not another. `builderFor` throws on an unknown family rather than returning
 * a blank world, because a silently empty page reads as a design choice.
 */
import * as THREE from 'three';
import type { WorldBuilder, WorldContext, WorldHandle } from '../runtime';
import { pointsFamily, ringsFamily, orbitFamily, linesFamily } from './familiesA';
import { waveformFamily, instancedFamily, terrainFamily, shellsFamily } from './familiesB';

/** Numeric axis for a scene family. Every variant overrides at least three. */
export interface SceneParams {
  count: number;
  spread: number;
  size: number;
  speed: number;
  spin: number;
  drift: number;
  radius: number;
  thickness: number;
  gap: number;
  detail: number;
  cameraZ: number;
  dolly: number;
  wire: boolean;
  base: THREE.Color;
  accent: THREE.Color;
}

export type SceneFamily =
  | 'points' | 'rings' | 'orbit' | 'lines' | 'waveform' | 'instanced' | 'terrain' | 'shells';

/** Per-family baseline overrides applied over the shared defaults. */
export const FAMILY_PARAMS: Record<SceneFamily, (ctx: WorldContext) => Partial<SceneParams>> = {
  points: () => ({ count: 900, spread: 26, size: 0.05, speed: 0.4, cameraZ: 20, dolly: 8 }),
  rings: () => ({ count: 20, radius: 4, gap: 5, thickness: 0.16, speed: 0.4, cameraZ: 16, dolly: 10 }),
  orbit: () => ({ count: 6, radius: 3.4, detail: 2, size: 0.18, speed: 0.4, cameraZ: 16, dolly: 7 }),
  lines: () => ({ count: 30, spread: 20, drift: 0.6, speed: 0.3, cameraZ: 18, dolly: 6 }),
  waveform: () => ({ count: 72, spread: 4, size: 0.3, speed: 0.8, cameraZ: 18, dolly: 7 }),
  instanced: () => ({ count: 1200, spread: 20, size: 0.09, speed: 0.5, drift: 0.7, cameraZ: 22, dolly: 10 }),
  terrain: () => ({ spread: 50, detail: 48, speed: 0.4, drift: 1.2, cameraZ: 15, dolly: 11 }),
  shells: () => ({ count: 5, radius: 2.8, speed: 0.5, spin: 0.06, cameraZ: 13, dolly: 5 }),
};

const FAMILIES: Record<SceneFamily, (c: WorldContext, p: SceneParams) => WorldHandle> = {
  points: pointsFamily,
  rings: ringsFamily,
  orbit: orbitFamily,
  lines: linesFamily,
  waveform: waveformFamily,
  instanced: instancedFamily,
  terrain: terrainFamily,
  shells: shellsFamily,
};

/** Build a world for a named family, with optional numeric overrides. */
export function builderFor(
  family: SceneFamily,
  overrides: Partial<SceneParams> = {},
): WorldBuilder {
  const fn = FAMILIES[family];
  if (!fn) throw new Error(`unknown scene family: ${family}`);
  return (ctx: WorldContext) => {
    const defaults = defaultParams(ctx);
    const params: SceneParams = {
      ...defaults,
      ...FAMILY_PARAMS[family](ctx),
      ...overrides,
    };
    if (!(params.base instanceof THREE.Color)) params.base = defaults.base;
    if (!(params.accent instanceof THREE.Color)) params.accent = defaults.accent;
    return fn(ctx, params);
  };
}

/** What each family provably builds. Declared so it is testable without a GPU. */
export interface SceneSignature {
  /** The Three.js object this family instantiates. */
  object: string;
  /** The geometry class it allocates. */
  geometry: string;
  /** The material class it allocates. */
  material: string;
}

/**
 * What each family provably builds. Declared so it is testable without a GPU.
 *
 * THIS TABLE DRIFTED AND WAS CAUGHT. Every material below is MeshBasicMaterial /
 * PointsMaterial / LineBasicMaterial — that is what the builders actually construct,
 * because the fleet was moved off lit PBR materials so scenes render identically under
 * hardware and software GL. The table kept declaring MeshStandardMaterial and
 * MeshPhysicalMaterial long after the builders changed, so it described a fleet that
 * did not exist. Both GLM seats flagged it in review; the fix is to state what is
 * built, not what was once intended.
 *
 * The family formerly called `refract` is now `shells`: layered transparent
 * SphereGeometry under MeshBasicMaterial produces no transmission physics whatsoever,
 * and a taxonomy label is a claim. `shell-*` says what the geometry is.
 */
export const SCENE_SIGNATURES: Record<SceneFamily, SceneSignature> = {
  points: { object: 'THREE.Points', geometry: 'THREE.BufferGeometry', material: 'THREE.PointsMaterial' },
  rings: { object: 'THREE.Mesh', geometry: 'THREE.TorusGeometry', material: 'THREE.MeshBasicMaterial' },
  orbit: { object: 'THREE.Mesh', geometry: 'THREE.IcosahedronGeometry', material: 'THREE.MeshBasicMaterial' },
  lines: { object: 'THREE.Line', geometry: 'THREE.BufferGeometry', material: 'THREE.LineBasicMaterial' },
  waveform: { object: 'THREE.Mesh', geometry: 'THREE.BoxGeometry', material: 'THREE.MeshBasicMaterial' },
  instanced: { object: 'THREE.InstancedMesh', geometry: 'THREE.TetrahedronGeometry', material: 'THREE.MeshBasicMaterial' },
  terrain: { object: 'THREE.Mesh', geometry: 'THREE.PlaneGeometry', material: 'THREE.MeshBasicMaterial' },
  shells: { object: 'THREE.Mesh', geometry: 'THREE.SphereGeometry', material: 'THREE.MeshBasicMaterial' },
};

/** Baseline parameters; families override what they need. */
export function defaultParams(ctx: WorldContext): SceneParams {
  return {
    count: 800, spread: 24, size: 0.06, speed: 0.6, spin: 0.08, drift: 0.6,
    radius: 4, thickness: 0.16, gap: 5, detail: 20, cameraZ: 16, dolly: 6,
    wire: false, base: ctx.colors.midnightsapphire ?? new THREE.Color('#002060'), // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
    accent: ctx.colors.iceWing ?? new THREE.Color('#60C0F0'), // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  };
}
