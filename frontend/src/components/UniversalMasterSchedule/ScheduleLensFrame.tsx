/**
 * Blueprint: ScheduleLensFrame
 * Parent: UniversalMasterSchedule
 * Purpose: Binds the shared SurfaceLensGate to the Universal Master
 * Schedule's capability manifest (SUPER-PROMPT §4 P0 item 4 — "ship behind
 * the appearance profile"). Gate behavior (fail-closed resolution, runtime
 * manifest validation, remount-free lens switching) lives in
 * SurfaceLensGate; this file only names the surface. Booking, session
 * writes, and calendar critical actions remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { MASTER_SCHEDULE_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

const ScheduleLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={MASTER_SCHEDULE_MANIFEST} ariaLabel="Schedule style frame">
    {children}
  </SurfaceLensGate>
);

ScheduleLensFrame.displayName = 'ScheduleLensFrame';
export default ScheduleLensFrame;
