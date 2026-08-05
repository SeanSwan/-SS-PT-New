import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('WidgetSkeleton active admin overview theme bridge', () => {
  it('proves WidgetSkeleton is mounted by the canonical admin overview loading states', () => {
    const dashboardRoutesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const adminDashboardView = readSource('src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx');
    const adminOverviewPanel = readSource('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');
    const upcomingChecks = readSource('src/components/DashBoard/Pages/admin-dashboard/components/UpcomingChecksWidget.tsx');
    const widgetShell = readSource('src/components/DashBoard/Pages/admin-dashboard/shell/WidgetShell.tsx');

    expect(dashboardRoutesSource).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(adminDashboardView).toContain('<AdminOverviewPanel />');
    expect(adminOverviewPanel).toContain("import UpcomingChecksWidget from '../components/UpcomingChecksWidget'");
    expect(adminOverviewPanel).toContain('<BentoHalf><WidgetErrorBoundary name="Upcoming check-ins"><UpcomingChecksWidget /></WidgetErrorBoundary></BentoHalf>');
    // SWA-138 S1: skeleton rendering moved into the shared WidgetShell —
    // the theme bridge now flows widget → WidgetShell → WidgetSkeleton.
    expect(upcomingChecks).toContain("import { usePolledFetch, WidgetShell } from '../shell'");
    expect(widgetShell).toContain("import WidgetSkeleton from '../components/WidgetSkeleton'");
    expect(widgetShell).toContain('<WidgetSkeleton count={skeletonCount} />');
    expect(upcomingChecks).toContain("authAxios.get('/api/measurements/schedule/upcoming')");
  });

  it('keeps the shared widget skeleton loading chrome on theme variables', () => {
    const skeleton = readSource('src/components/DashBoard/Pages/admin-dashboard/components/WidgetSkeleton.tsx');

    expect(skeleton).toContain('var(--skeleton-base');
    expect(skeleton).toContain('var(--skeleton-highlight');
    expect(skeleton).toContain('var(--border-primary-faint');
    expect(skeleton).toContain('@media (prefers-reduced-motion: reduce)');
    expect(skeleton).not.toContain('background: #2a2a3a;');
    expect(skeleton).not.toContain('#3a3a4a');
    expect(skeleton).not.toContain('border-bottom: 1px solid rgba(59, 130, 246, 0.1);');
  });
});
