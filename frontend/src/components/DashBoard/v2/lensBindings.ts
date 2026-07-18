/**
 * Dashboards v2 — lensBindings (KIMI-DASHBOARDS-CORRECTED §2.1 + INTEGRATION-GAPFIX).
 *
 * THE ONLY place DashBoard/v2/ imports the Swan Lens / Lane-A surface. Every other v2 file imports
 * from here — so a future lens API change lands in ONE file. Consumes the SHIPPED lens (main
 * cba39192b); rebuilds none of it. Do NOT import lens/core/hooks anywhere else in v2.
 */
export { makeLensFrame } from '../../../adapters/style-lens-swan/v2/SurfaceLensGate';
export type { SurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';
export { CONTAINER_PROFILES } from '../../../core/style-lens-os/v2/recipeV2';

export {
  useCrystallizeTransition,
  CrystallizeOverlay,
  useLensViewport,
  resolveLensVictoryTheme,
  lensViewportCss,
  lensSurfaceCss,
  type LensViewport,
  type CrystallizeOverlayProps,
  type LensVictoryThemeBundle,
} from '../../../adapters/style-lens-swan';

export {
  resolveMotionTier,
  tierAllows,
  motionAffordances,
  type MotionTier,
  type AnimationCapability,
} from '../../../core/motion/surfaceMotionTiers';

export { useAnimationTier } from '../../../hooks/useAnimationTier';
