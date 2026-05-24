import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('dashboard theme synchronization contract', () => {
  it('locks the canonical dashboard routes for the themed surfaces', () => {
    const layout = readSource('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(layout).toContain("import UniversalSchedule from '../Schedule/UniversalSchedule'");
    expect(layout).toContain("const AdminPackagesView = React.lazy(() => import('./Pages/admin-packages/admin-packages-view'))");
    expect(layout).toContain("const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'))");
    expect(layout).toContain("const NutritionWorkspaceLazy = React.lazy(() => import('./workspaces/NutritionWorkspace'))");
    expect(layout).toContain("{ path: '/master-schedule', component: UniversalSchedule");
    expect(layout).toContain("{ path: '/admin-packages', component: AdminPackagesView");
    expect(layout).toContain("{ path: '/revenue', component: RevenueAnalyticsPanel");
    expect(layout).toContain("{ path: '/meal-planner', component: NutritionWorkspaceLazy");
  });

  it('keeps the schedule shell connected to universal theme variables', () => {
    const masterSchedule = readSource('src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const fallbackCalendar = readSource('src/components/UniversalMasterSchedule/CalendarFallback/CalendarFallback.tsx');
    const adminSchedule = readSource('src/components/UniversalMasterSchedule/AdminScheduleIntegration.tsx');

    expect(masterSchedule).toContain('background-color: var(--bg-base, #0A0A0F)');
    expect(masterSchedule).not.toContain('background-color: #002060');
    expect(fallbackCalendar).toContain('var(--accent-primary, #60C0F0)');
    expect(fallbackCalendar).not.toContain("props.$active ? '#3b82f6'");
    expect(adminSchedule).toContain('var(--bg-base, #0A0A0F)');
    expect(adminSchedule).not.toContain('background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)');
  });

  it('keeps store and revenue shells dark-first instead of fixed bright blue panels', () => {
    const adminSessionsStyles = readSource('src/components/DashBoard/Pages/admin-sessions/styled-admin-sessions.ts');
    const adminPackages = readSource('src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx');
    const revenuePanel = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.tsx');

    expect(adminSessionsStyles).toContain("deepSpace: 'var(--bg-base, #0A0A0F)'");
    expect(adminSessionsStyles).toContain('linear-gradient(180deg, ${executiveTheme.deepSpace} 0%, ${executiveTheme.commandNavy} 100%)');
    expect(adminPackages).toContain('var(--accent-primary, #60C0F0)');
    expect(revenuePanel).toContain('color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent)');
    expect(revenuePanel).not.toContain('rgba(0, 32, 96, 0.95)');
  });

  it('keeps the hydration controls theme-responsive', () => {
    const hydration = readSource('src/components/DashBoard/workspaces/NutritionHydrationTab.tsx');

    expect(hydration).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)');
    expect(hydration).not.toContain("? 'rgba(96,192,240,0.12)'");
  });
});
