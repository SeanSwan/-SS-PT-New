/**
 * Blueprint: CoachSurfaceRoute
 * The single mount point for /dashboard/:role/coach-assistant. v4 Coach
 * Workspace by default; the legacy Command Center only when the build flag is
 * off or the visit carries ?coachLegacy=1 (coachWorkspaceFlag.ts). Both pages
 * are lazy, so a visitor downloads only the one they see.
 */
import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { coachWorkspaceV4Enabled } from './coachWorkspaceFlag';

const CoachWorkspacePage = React.lazy(() => import('./CoachWorkspacePage'));
const CoachCommandCenterPage = React.lazy(() => import('../coach-assistant/CoachCommandCenterPage'));

const CoachSurfaceRoute: React.FC = () => {
  const { search } = useLocation();
  const v4 = coachWorkspaceV4Enabled(import.meta.env as { VITE_COACH_WORKSPACE_V4?: string }, search);
  return (
    <Suspense fallback={<div role="status" aria-live="polite" style={{ padding: 24 }}>Opening Swan Coach…</div>}>
      {v4 ? <CoachWorkspacePage /> : <CoachCommandCenterPage />}
    </Suspense>
  );
};

export default CoachSurfaceRoute;
