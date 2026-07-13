/**
 * Blueprint: WorkoutPlannerLensFrame
 * Parent: WorkoutPlannerPageLayout
 * Purpose: Binds the shared SurfaceLensGate to the Workout Planner's
 * capability manifest (SUPER-PROMPT §4 P0 item 2 — "ship behind the
 * appearance profile"). All gate behavior (fail-closed resolution, runtime
 * manifest validation, remount-free lens switching) lives in
 * SurfaceLensGate; this file only names the surface. Generation/save/PDF
 * actions and panel wiring remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { WORKOUT_PLANNER_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';

const WorkoutPlannerLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={WORKOUT_PLANNER_MANIFEST} ariaLabel="Workout Planner style frame">
    {children}
  </SurfaceLensGate>
);

WorkoutPlannerLensFrame.displayName = 'WorkoutPlannerLensFrame';
export default WorkoutPlannerLensFrame;
