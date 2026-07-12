/**
 * Blueprint: WorkoutPlannerLensFrame
 * Parent: WorkoutPlannerPageLayout
 * Purpose: Appearance-profile-gated Recipe v2 frame for the Workout
 * Planner (SUPER-PROMPT §4 P0 item 2 — "ship behind the appearance
 * profile"). Identical gate contract to WorkoutLoggerLensFrame: when the
 * committed style lens maps to a v2 recipe the planner wears it via
 * LensPlanFrame compiled against WORKOUT_PLANNER_MANIFEST; otherwise
 * children render untouched (all production lenses today) — fail-closed,
 * zero visual change. Generation/save/PDF actions and panel wiring stay
 * host-fixed regardless of the active recipe.
 */
import React from 'react';
import LensPlanFrame from '../workout-design-lab/LensPlanFrame';
import { useOptionalStyleLensAppearance } from '../../../../core/style-lens-os/StyleLensProvider';
import { resolveRecipeForStyleLens } from '../../../../adapters/style-lens-swan/v2/recipeResolution';
import { WORKOUT_PLANNER_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';
import { surfaceRepresentationStyles } from '../../../../adapters/style-lens-swan/v2/surfaceRepresentationStyles';

interface WorkoutPlannerLensFrameProps {
  children: React.ReactNode;
}

const WorkoutPlannerLensFrame: React.FC<WorkoutPlannerLensFrameProps> = ({ children }) => {
  const appearance = useOptionalStyleLensAppearance();
  const recipe = resolveRecipeForStyleLens(appearance?.state.committed.styleLensId);

  if (!recipe) return <>{children}</>;

  return (
    <LensPlanFrame
      recipe={recipe}
      manifest={WORKOUT_PLANNER_MANIFEST}
      representationStyles={surfaceRepresentationStyles}
      aria-label="Workout Planner style frame"
    >
      {children}
    </LensPlanFrame>
  );
};

WorkoutPlannerLensFrame.displayName = 'WorkoutPlannerLensFrame';
export default WorkoutPlannerLensFrame;
