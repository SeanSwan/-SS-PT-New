/**
 * About V-next — lensBindings. THE ONLY place v-next/ imports the Swan Lens / Lane-A surface. Consumes the
 * SHIPPED lens (Crystallize/overlay/viewport), never re-implements it. Mirrors the shipped Home/Store bindings.
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
