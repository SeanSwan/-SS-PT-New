/**
 * Blueprint: ClientsWorkspaceLensFrame
 * Parent: ClientsWorkspaceView (NOT the state container — it sits at its
 * 300-line cap; the view owns presentation).
 * Purpose: Binds the shared SurfaceLensGate to the Clients & Team hub's
 * capability manifest (SUPER-PROMPT §4 P0 item 5 — "ship behind the
 * appearance profile"). Gate behavior lives in SurfaceLensGate; this file
 * only names the surface. Client selection, account actions, and every
 * write path remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { CLIENTS_WORKSPACE_MANIFEST } from '../../../adapters/style-lens-swan/v2/surfaceManifests';

const ClientsWorkspaceLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={CLIENTS_WORKSPACE_MANIFEST} ariaLabel="Clients and Team style frame">
    {children}
  </SurfaceLensGate>
);

ClientsWorkspaceLensFrame.displayName = 'ClientsWorkspaceLensFrame';
export default ClientsWorkspaceLensFrame;
