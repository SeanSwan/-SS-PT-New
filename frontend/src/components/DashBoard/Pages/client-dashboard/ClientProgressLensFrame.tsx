/**
 * COMPONENT: ClientProgressLensFrame
 * PARENT: ClientProgressDashboardPage
 * PURPOSE: Binds the shared SurfaceLensGate to the client progress
 * dashboard's capability manifest (SUPER-PROMPT §4 P0 item 6 — "ship
 * behind the appearance profile"). First chart-bearing host: the manifest
 * publishes chart.progress, and the Victory bridge (lensPalette) resolves
 * --world-accent/--world-action from inside this frame. Chart data truth,
 * endpoints, and tier locks remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { CLIENT_PROGRESS_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';

const ClientProgressLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={CLIENT_PROGRESS_MANIFEST} ariaLabel="Progress style frame">
    {children}
  </SurfaceLensGate>
);

ClientProgressLensFrame.displayName = 'ClientProgressLensFrame';
export default ClientProgressLensFrame;
