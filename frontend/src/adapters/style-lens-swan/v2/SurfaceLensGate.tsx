/**
 * Blueprint: SurfaceLensGate (Swan adapter, Recipe v2)
 * Parents: WorkoutLoggerLensFrame + WorkoutPlannerLensFrame (+ every future
 * P0 rollout surface — bind, don't clone).
 * Purpose: THE shared appearance-profile gate for production surfaces.
 * Fail-closed twice: an unknown/v1 styleLensId resolves to no recipe (host
 * defaults, zero visual change), and a manifest that fails schema validation
 * is never worn. LensPlanFrame stays mounted in both states, so committing
 * or clearing a lens mid-session never remounts the surface underneath.
 */
import React, { useMemo } from 'react';
import LensPlanFrame from '../../../components/DashBoard/Pages/workout-design-lab/LensPlanFrame';
import { useOptionalStyleLensAppearance } from '../../../core/style-lens-os/StyleLensProvider';
import {
  validateSurfaceCapabilityManifest,
  type SurfaceCapabilityManifest,
} from '../../../core/style-lens-os/v2/capability-manifest.schema';
import { resolveRecipeForStyleLens } from './recipeResolution';
import { surfaceRepresentationStyles } from './surfaceRepresentationStyles';

interface SurfaceLensGateProps {
  manifest: SurfaceCapabilityManifest;
  ariaLabel: string;
  children: React.ReactNode;
}

const SurfaceLensGate: React.FC<SurfaceLensGateProps> = ({ manifest, ariaLabel, children }) => {
  const appearance = useOptionalStyleLensAppearance();
  const resolved = resolveRecipeForStyleLens(appearance?.state.committed.styleLensId);
  const recipe = useMemo(
    () => (resolved && validateSurfaceCapabilityManifest(manifest).length === 0 ? resolved : null),
    [resolved, manifest],
  );

  return (
    <LensPlanFrame
      recipe={recipe}
      manifest={manifest}
      representationStyles={surfaceRepresentationStyles}
      aria-label={ariaLabel}
    >
      {children}
    </LensPlanFrame>
  );
};

SurfaceLensGate.displayName = 'SurfaceLensGate';
export default SurfaceLensGate;
