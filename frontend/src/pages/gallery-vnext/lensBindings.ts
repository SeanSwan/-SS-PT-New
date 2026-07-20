/**
 * Gallery vNext — lensBindings. THE ONLY place gallery-vnext/ imports the Swan Lens / Lane-A surface.
 * Every other gallery-vnext file imports from here, so a lens API change lands in ONE file. Consumes the
 * SHIPPED lens (main cba39192b) — Crystallize/overlay/viewport are the lens's, never re-timed or
 * re-implemented here. Pure CONSUMER of `--world-*`/`--lens-*` (LAW 8 R6): never emits/modifies them.
 */
export { makeLensFrame } from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
export type { SurfaceCapabilityManifest } from '../../core/style-lens-os/v2/capability-manifest.schema';
export { CONTAINER_PROFILES } from '../../core/style-lens-os/v2/recipeV2';

export {
  useCrystallizeTransition,
  CrystallizeOverlay,
  useLensViewport,
  type LensViewport,
  type CrystallizeOverlayProps,
} from '../../adapters/style-lens-swan';
