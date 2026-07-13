/**
 * Blueprint: BootcampBuilderLensFrame
 * Parent: BootcampBuilderPageWithBoundary (composed on the boundary line —
 * the page file sits at its 300-line composition cap).
 * Purpose: Binds the shared SurfaceLensGate to the Bootcamp Creator's
 * capability manifest (SUPER-PROMPT §4 P0 item 7 — "ship behind the
 * appearance profile"). Gate behavior lives in SurfaceLensGate; this file
 * only names the surface. Generation, template saves, and class writes
 * remain host-fixed under any recipe.
 */
import React from 'react';
import SurfaceLensGate from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { BOOTCAMP_BUILDER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

const BootcampBuilderLensFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SurfaceLensGate manifest={BOOTCAMP_BUILDER_MANIFEST} ariaLabel="Bootcamp Creator style frame">
    {children}
  </SurfaceLensGate>
);

BootcampBuilderLensFrame.displayName = 'BootcampBuilderLensFrame';
export default BootcampBuilderLensFrame;
