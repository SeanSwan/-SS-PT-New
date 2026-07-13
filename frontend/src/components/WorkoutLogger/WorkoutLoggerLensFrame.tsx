/**
 * Blueprint: WorkoutLoggerLensFrame
 * Parent: WorkoutLogger
 * Purpose: Binds the shared SurfaceLensGate to the Workout Logger's
 * capability manifest (SUPER-PROMPT §4 P0 rollout — "ship behind the
 * appearance profile"). All gate behavior (fail-closed resolution, runtime
 * manifest validation, remount-free lens switching) lives in
 * SurfaceLensGate; this file only names the surface. Set-row law grids,
 * write paths, and critical actions remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { WORKOUT_LOGGER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

const WorkoutLoggerLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={WORKOUT_LOGGER_MANIFEST} ariaLabel="Workout Logger style frame">
    {children}
  </SurfaceLensGate>
);

WorkoutLoggerLensFrame.displayName = 'WorkoutLoggerLensFrame';
export default WorkoutLoggerLensFrame;
