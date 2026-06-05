import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const stylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.styles.ts'),
  'utf8',
);
const layoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const dashboardViewSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
  'utf8',
);

describe('AdminOverviewPanel analytics resilience contract', () => {
  it('is mounted by the canonical admin overview route', () => {
    expect(layoutSource).toContain("const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(layoutSource).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(dashboardViewSource).toContain("import AdminOverviewPanel from './overview/AdminOverviewPanel'");
    expect(dashboardViewSource).toContain('<AdminOverviewPanel />');
  });

  it('fetches independent analytics endpoints through mounted admin analytics routes', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsRevenueRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsUserRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsSystemRoutes)");
    expect(source).toContain("'/api/admin/analytics/statistics/revenue'");
    expect(source).toContain("'/api/admin/analytics/statistics/users'");
    expect(source).toContain("'/api/admin/analytics/statistics/workouts'");
    expect(source).toContain("'/api/admin/analytics/statistics/system-health'");
  });

  it('does not let one failed analytics endpoint zero the whole overview', () => {
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('readSettledData');
    expect(source).toContain('metricUnavailable');
    expect(source).toContain('Some admin overview metrics could not be loaded.');
    expect(source).toContain("service: 'System health API'");
    expect(source).not.toContain('const [revenueRes, usersRes, workoutsRes, healthRes] = await Promise.all([');
  });

  it('bridges overview shell status and shadow chrome through theme tokens', () => {
    expect(stylesSource).toContain("const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent))'");
    expect(stylesSource).toContain("const SHADOW_ELEVATION = 'var(--shadow-elevation, 0 4px 24px color-mix(in srgb, var(--bg-base, #030712) 20%, transparent))'");
    expect(stylesSource).not.toContain('rgba(');
    expect(stylesSource).not.toContain('color: var(--text-secondary, rgba(224,236,244,0.6));');
    expect(stylesSource).not.toContain('box-shadow: var(--shadow-elevation, 0 4px 24px rgba(0, 0, 0, 0.2));');
  });
});
