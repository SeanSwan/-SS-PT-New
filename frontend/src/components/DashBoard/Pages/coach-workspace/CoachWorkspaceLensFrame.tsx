/**
 * Blueprint: CoachWorkspaceLensFrame
 * Parent: CoachWorkspacePage. Approval sheets, confirm/cancel, and every write
 * path remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { COACH_WORKSPACE_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';

const CoachWorkspaceLensFrame = makeLensFrame(COACH_WORKSPACE_MANIFEST, 'Swan Coach style frame', 'CoachWorkspaceLensFrame');

export default CoachWorkspaceLensFrame;
