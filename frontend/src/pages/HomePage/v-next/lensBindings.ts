/**
 * Home V-next — lensBindings. THE ONLY place v-next/ imports the Swan Lens / Lane-A surface. The hero's
 * signature moment IS the shipped Crystallize (Kimi direction (d)): we consume useCrystallizeTransition /
 * CrystallizeOverlay, never re-implement them (the overlay is a self-contained body portal, no children,
 * owns `announcement`). A lens API change lands in this one file.
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
