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
const routeComponentsSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const dashboardViewSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx'),
  'utf8',
);
const adminDashboardCardsSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/AdminDashboardCards.tsx'),
  'utf8',
);
const adminDashboardThemeSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-theme.ts'),
  'utf8',
);
const adminOverviewStylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverview.styles.ts'),
  'utf8',
);
const coreRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
  'utf8',
);

describe('AdminOverviewPanel analytics resilience contract', () => {
  it('is mounted by the canonical admin overview route', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain(
      "export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))",
    );
    expect(dashboardRoutesSource).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
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

  it('keeps admin dashboard card chrome mapped to active theme variables', () => {
    expect(adminDashboardCardsSource).toContain('var(--bg-card');
    expect(adminDashboardCardsSource).toContain('var(--surface-secondary');
    expect(adminDashboardCardsSource).toContain('var(--shadow-elevation');
    expect(adminDashboardCardsSource).not.toContain('background: radial-gradient(120% 120% at 0% 0%, #1A1A24 0%, #141419 100%)');
    expect(adminDashboardCardsSource).not.toContain('rgba(');
    expect(adminOverviewStylesSource).toContain('PRIMARY_GRADIENT');
    expect(adminOverviewStylesSource).toContain('var(--bg-card');
    expect(adminOverviewStylesSource).not.toContain('#3b82f6');
    expect(adminOverviewStylesSource).not.toContain('rgba(');
    expect(adminDashboardThemeSource).toContain('color-mix(in srgb, var(--surface-primary');
    expect(adminDashboardThemeSource).not.toContain('rgba(');
  });
  it('bridges overview shell status and shadow chrome through theme tokens', () => {
    expect(stylesSource).toContain("const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent))'");
    expect(stylesSource).toContain("const SHADOW_ELEVATION = 'var(--shadow-elevation, 0 4px 24px color-mix(in srgb, var(--bg-base, #030712) 20%, transparent))'");
    expect(stylesSource).toContain('background-image:');
    expect(stylesSource).toContain('linear-gradient(45deg, transparent 50%, var(--accent-secondary');
    expect(stylesSource).not.toContain('data:image');
    expect(stylesSource).not.toContain('%2360C0F0');
    expect(stylesSource).not.toContain('rgba(');
    expect(stylesSource).not.toContain('color: var(--text-secondary, rgba(224,236,244,0.6));');
    expect(stylesSource).not.toContain('box-shadow: var(--shadow-elevation, 0 4px 24px rgba(0, 0, 0, 0.2));');
  });
});
