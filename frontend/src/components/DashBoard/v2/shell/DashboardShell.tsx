/**
 * Dashboards v2 — DashboardShell (KIMI-DASHBOARDS §2.2 + GAPFIX). Renders THROUGH the shipped lens
 * gate via `makeLensFrame` (NO `surfaceId` prop). No role branching here — a dispatch map keeps
 * `role ===` count at 0. Density gets the ONE server summary; charts/motion read the lens.
 */
import { createElement } from 'react';
import styled from 'styled-components';
import { useLensViewport } from '../lensBindings';
import type { DashboardSummary, MotionSurfaceId, Role } from '../types';
import { DENSITY_FRAMES } from './dashboardManifests';
import { DashboardShellTheme } from './DashboardShell.theme';
import { SkipLink, LiveRegion } from './DashboardShell.a11y';
import { DashboardTopBar, DashboardNav } from './DashboardShell.nav';
import { useDashboardSummary } from './useDashboardSummary';
import { AdminDensity } from '../densities/AdminDensity';
import { TrainerDensity } from '../densities/TrainerDensity';
import { ClientDensity } from '../densities/ClientDensity';
import { UserDensity } from '../densities/UserDensity';
import { EmptyState } from '../sections/EmptyState';

/** Motion tier key (dotted) + poll cadence per density — NOT the kebab manifest surfaceId. */
export const DENSITY_CONFIG: Record<Role, { motionSurfaceId: MotionSurfaceId; pollMs: number }> = {
  admin: { motionSurfaceId: 'dashboard.admin', pollMs: 60_000 },
  trainer: { motionSurfaceId: 'dashboard.trainer', pollMs: 30_000 },
  client: { motionSurfaceId: 'dashboard.client', pollMs: 0 },
  user: { motionSurfaceId: 'dashboard.user', pollMs: 0 },
};

// Densities receive the ONE server summary + onRefresh (client/user use it to refetch after a
// confirm-first Crystallize write; admin/trainer ignore it).
const DENSITIES: Record<Role, React.FC<{ summary: DashboardSummary; onRefresh: () => void }>> = {
  admin: AdminDensity,
  trainer: TrainerDensity,
  client: ClientDensity,
  user: UserDensity,
};

const Body = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 0;
  :root[data-viewport='hand'] &,
  :root[data-viewport='lap'] & {
    grid-template-columns: 1fr;
  }
`;
const Main = styled.main`
  min-width: 0;
  background: var(--dash-canvas, var(--dash-bg));
`;

export function DashboardShell({ role }: { role: Role }) {
  const viewport = useLensViewport();
  const { summary, isRefetching, refetch } = useDashboardSummary(role, DENSITY_CONFIG[role].pollMs);
  const Frame = DENSITY_FRAMES[role];
  const mobile = viewport === 'hand' || viewport === 'lap';

  return (
    <Frame>
      <DashboardShellTheme />
      <div className="dash-shell" data-density={role} data-testid="dash-shell">
        <SkipLink />
        <DashboardTopBar role={role} onRefresh={refetch} isRefetching={isRefetching} />
        <Body>
          {mobile ? null : <DashboardNav role={role} viewport={viewport} />}
          <Main id="dash-main">
            {summary ? (
              createElement(DENSITIES[role], { summary, onRefresh: refetch })
            ) : (
              <EmptyState icon="chart" title="Loading your dashboard" body="Pulling the latest, one moment." />
            )}
          </Main>
          {mobile ? <DashboardNav role={role} viewport={viewport} /> : null}
        </Body>
        <LiveRegion message={isRefetching ? 'Refreshing dashboard.' : ''} />
      </div>
    </Frame>
  );
}

export default DashboardShell;
