/**
 * Blueprint: ScheduleLensFrame
 * Parent: UniversalMasterSchedule. Booking, session writes, and calendar critical actions remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { MASTER_SCHEDULE_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

export default makeLensFrame(MASTER_SCHEDULE_MANIFEST, 'Schedule style frame', 'ScheduleLensFrame');
