/**
 * Blueprint: WorkoutLoggerLensFrame
 * Parent: WorkoutLogger
 * Purpose: Appearance-profile-gated Recipe v2 frame for the Workout Logger
 * (SUPER-PROMPT §4 P0 rollout — "ship behind the appearance profile").
 * When the committed style lens maps to a v2 recipe, the logger content is
 * wrapped in LensPlanFrame compiled against WORKOUT_LOGGER_MANIFEST; when it
 * does not (all production lenses today), children render untouched — zero
 * visual change, fail-closed. Set-row grids, write paths, and critical
 * actions remain host-fixed regardless of the active recipe.
 */
import React from 'react';
import LensPlanFrame from '../DashBoard/Pages/workout-design-lab/LensPlanFrame';
import { useOptionalStyleLensAppearance } from '../../core/style-lens-os/StyleLensProvider';
import { resolveRecipeForStyleLens } from '../../adapters/style-lens-swan/v2/recipeResolution';
import { WORKOUT_LOGGER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';
import { surfaceRepresentationStyles } from '../../adapters/style-lens-swan/v2/surfaceRepresentationStyles';

interface WorkoutLoggerLensFrameProps {
  children: React.ReactNode;
}

const WorkoutLoggerLensFrame: React.FC<WorkoutLoggerLensFrameProps> = ({ children }) => {
  const appearance = useOptionalStyleLensAppearance();
  const recipe = resolveRecipeForStyleLens(appearance?.state.committed.styleLensId);

  if (!recipe) return <>{children}</>;

  return (
    <LensPlanFrame
      recipe={recipe}
      manifest={WORKOUT_LOGGER_MANIFEST}
      representationStyles={surfaceRepresentationStyles}
      aria-label="Workout Logger style frame"
    >
      {children}
    </LensPlanFrame>
  );
};

WorkoutLoggerLensFrame.displayName = 'WorkoutLoggerLensFrame';
export default WorkoutLoggerLensFrame;
