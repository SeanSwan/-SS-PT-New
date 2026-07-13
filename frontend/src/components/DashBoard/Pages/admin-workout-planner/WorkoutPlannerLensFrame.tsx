/**
 * Blueprint: WorkoutPlannerLensFrame
 * Parent: WorkoutPlannerPageLayout. Generation/save/PDF actions and panel wiring remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { WORKOUT_PLANNER_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';

export default makeLensFrame(WORKOUT_PLANNER_MANIFEST, 'Workout Planner style frame', 'WorkoutPlannerLensFrame');
