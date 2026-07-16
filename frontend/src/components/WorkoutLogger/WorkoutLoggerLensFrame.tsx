/**
 * Blueprint: WorkoutLoggerLensFrame
 * Parent: WorkoutLogger. Set-row law grids, write paths, and critical actions remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { WORKOUT_LOGGER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

const WorkoutLoggerLensFrame = makeLensFrame(WORKOUT_LOGGER_MANIFEST, 'Workout Logger style frame', 'WorkoutLoggerLensFrame');

export default WorkoutLoggerLensFrame;
