/**
 * Blueprint: ClientsWorkspaceLensFrame
 * Parent: ClientsWorkspaceView (the state container sits at its line cap). Client selection, account actions, and every write path remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { CLIENTS_WORKSPACE_MANIFEST } from '../../../adapters/style-lens-swan/v2/surfaceManifests';

const ClientsWorkspaceLensFrame = makeLensFrame(CLIENTS_WORKSPACE_MANIFEST, 'Clients and Team style frame', 'ClientsWorkspaceLensFrame');

export default ClientsWorkspaceLensFrame;
