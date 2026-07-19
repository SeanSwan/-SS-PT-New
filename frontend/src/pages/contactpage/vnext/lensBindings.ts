/**
 * Contact V-next — lensBindings. THE ONLY place vnext/ imports the Swan Lens / Lane-A surface. Consumes
 * the SHIPPED lens (Crystallize/overlay); never re-implements it. Mirrors the 6 shipped surfaces' bindings.
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
