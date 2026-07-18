/**
 * Store V4 — lensBindings (KIMI-STORE-CORRECTED F3). THE ONLY place store-v4/ imports the Swan Lens /
 * Lane-A surface. Every other store-v4 file imports from here, so a lens API change lands in ONE file.
 * Consumes the SHIPPED lens (main cba39192b) — Crystallize/overlay/viewport are the lens's, never
 * re-timed or re-implemented here (the reground's F3: no second dialect of a shipped behavior).
 */
export { makeLensFrame } from '../../../adapters/style-lens-swan/v2/SurfaceLensGate';
export type { SurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';
export { CONTAINER_PROFILES } from '../../../core/style-lens-os/v2/recipeV2';

export {
  useCrystallizeTransition,
  CrystallizeOverlay,
  useLensViewport,
  type LensViewport,
  type CrystallizeOverlayProps,
} from '../../../adapters/style-lens-swan';
