/**
 * Dashboards v2 — dash-owned surface manifests (INTEGRATION-GAPFIX §2.2). Lane-A's
 * `v2/surfaceManifests.ts` is NOT touched. Each density binds its own minimal manifest via the
 * shipped `makeLensFrame`. The dashboard gets its look from the `--world-*`/`--lens-*` scoping the
 * gate provides (LensPlanFrame + `[data-style-lens-shell]`), NOT from recipe slots — so slots +
 * templates are intentionally empty (valid: fail-closed to host defaults, zero visual change).
 *
 * TWO surfaceId vocabularies, never conflated:
 *   · MANIFEST surfaceId (kebab): 'dashboard-admin' — frame identity, here only.
 *   · MOTION surfaceId  (dotted): 'dashboard.admin' — Lane-A tier key, in DashboardShell.tsx only.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from '../lensBindings';
import type { Role } from '../types';

const manifestFor = (surfaceId: string): SurfaceCapabilityManifest => ({
  surfaceId,
  hostId: 'dashboard-v2',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
});

export const DASHBOARD_MANIFESTS: Record<Role, SurfaceCapabilityManifest> = {
  admin: manifestFor('dashboard-admin'),
  trainer: manifestFor('dashboard-trainer'),
  client: manifestFor('dashboard-client'),
  user: manifestFor('dashboard-user'),
};

export const DENSITY_FRAMES: Record<Role, ReturnType<typeof makeLensFrame>> = {
  admin: makeLensFrame(DASHBOARD_MANIFESTS.admin, 'Admin dashboard', 'DashboardAdminFrame'),
  trainer: makeLensFrame(DASHBOARD_MANIFESTS.trainer, 'Trainer dashboard', 'DashboardTrainerFrame'),
  client: makeLensFrame(DASHBOARD_MANIFESTS.client, 'Client dashboard', 'DashboardClientFrame'),
  user: makeLensFrame(DASHBOARD_MANIFESTS.user, 'Your dashboard', 'DashboardUserFrame'),
};
