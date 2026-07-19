/**
 * Video V-next — lensBindings. THE ONLY place video-vnext/ imports the Swan Lens / Lane-A surface.
 * Consumes the SHIPPED lens (Crystallize/overlay/viewport); never re-implements it. Mirrors the shipped
 * Home/Store/About bindings. NOTE: video-vnext is 2 dirs under src (pages/video-vnext) → `../../` paths.
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
