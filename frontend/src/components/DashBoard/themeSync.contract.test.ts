import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('dashboard theme synchronization contract', () => {
  it('locks the canonical dashboard routes for the themed surfaces', () => {
    const routeComponents = readSource('src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
    const routes = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');

    expect(routeComponents).toContain("import UniversalSchedule from '../Schedule/UniversalSchedule'");
    expect(routeComponents).toContain("export const AdminPackagesView = React.lazy(() => import('./Pages/admin-packages/admin-packages-view'))");
    expect(routeComponents).toContain("export const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'))");
    expect(routeComponents).toContain("export const PendingOrdersAdminPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PendingOrdersAdminPanel'))");
    expect(routeComponents).toContain("export const NutritionWorkspaceLazy = React.lazy(() => import('./workspaces/NutritionWorkspace'))");
    expect(routes).toContain("{ path: '/master-schedule', component: UniversalSchedule");
    expect(routes).toContain("{ path: '/admin-packages', component: AdminPackagesView");
    expect(routes).toContain("{ path: '/revenue', component: RevenueAnalyticsPanel");
    expect(routes).toContain("{ path: '/pending-orders', component: PendingOrdersAdminPanel");
    expect(routes).toContain("{ path: '/meal-planner', component: NutritionWorkspaceLazy");
  });

  it('keeps shared dashboard shell controls on theme variables', () => {
    const universalStyles = readSource('src/components/DashBoard/UniversalDashboardLayout.styles.ts');
    const universalControls = readSource('src/components/DashBoard/UniversalDashboardLayout.controls.ts');
    const universalShell = [universalStyles, universalControls].join('\n');

    expect(universalStyles).toContain('var(--shadow-focus, 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent))');
    expect(universalControls).toContain('var(--shadow-subtle, 0 4px 16px color-mix(in srgb, var(--bg-base, #0A0A0F) 40%, transparent))');
    expect(universalControls).toContain('var(--shadow-accent, 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent))');
    expect(universalControls).toContain('var(--text-on-accent, #FFFFFF)');
    expect(universalControls).toContain('var(--danger-bg-soft, color-mix(in srgb, var(--danger, #C92A54) 20%, transparent))');
    expect(universalControls).toContain('var(--border-accent-soft');
    expect(universalControls).toContain('var(--border-accent-medium');

    [
      'border: 1px solid rgba(139, 92, 246, 0.3);',
      'border-color: rgba(139, 92, 246, 0.5);',
      'border: 1px solid rgba(96, 192, 240, 0.2);',
      'outline: 2px solid #60C0F0;',
      'color: #fff;',
      "color: 'rgba(255,255,255,0.7)'",
      "background: 'rgba(201, 42, 84, 0.2)'",
      'var(--shadow-focus, 0 0 16px rgba(96, 192, 240, 0.4))',
      'var(--shadow-subtle, 0 4px 16px rgba(0, 0, 0, 0.4))',
      'var(--shadow-accent-lift, 0 4px 20px rgba(139, 92, 246, 0.3))',
      'var(--shadow-accent-strong, 0 6px 28px rgba(139, 92, 246, 0.5))',
      'var(--shadow-primary-soft, 0 0 12px rgba(96, 192, 240, 0.2))',
      'var(--shadow-primary, 0 0 20px rgba(96, 192, 240, 0.3))',
    ].forEach((rawDeclaration) => {
      expect(universalShell).not.toContain(rawDeclaration);
    });

  });

  it('keeps the schedule shell connected to universal theme variables', () => {
    const masterSchedule = readSource('src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');

    expect(masterSchedule).toContain('background-color: var(--bg-base, #0A0A0F)');
    expect(masterSchedule).not.toContain('background-color: #002060');
  });

  it('keeps store and revenue shells dark-first instead of fixed bright blue panels', () => {
    const adminSessionsStyles = readSource('src/components/DashBoard/Pages/admin-sessions/AdminSessionsShell.styles.ts');
    const adminSessionsTheme = readSource('src/components/DashBoard/Pages/admin-sessions/AdminSessionsTheme.styles.ts');
    const adminPackages = readSource('src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx');
    const revenuePanel = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.styles.ts');
    const storeDesignSystem = readSource('src/components/DashBoard/Pages/store-shared/StoreDesignSystem.ts');
    const storeTokens = readSource('src/components/DashBoard/Pages/store-shared/StoreDesignSystem.tokens.ts');
    const storeLayout = readSource('src/components/DashBoard/Pages/store-shared/StoreDesignSystem.layout.tsx');
    const storeControls = readSource('src/components/DashBoard/Pages/store-shared/StoreDesignSystem.controls.tsx');
    const storeFeedback = readSource('src/components/DashBoard/Pages/store-shared/StoreDesignSystem.feedback.tsx');
    const pendingOrders = readSource('src/components/DashBoard/Pages/admin-dashboard/components/PendingOrdersAdminPanel.tsx');

    expect(adminSessionsTheme).toContain("deepSpace: 'var(--bg-base, #0A0A0F)'");
    expect(adminSessionsStyles).toContain('linear-gradient(180deg, ${executiveTheme.deepSpace} 0%, ${executiveTheme.commandNavy} 100%)');
    expect(adminPackages).toContain('var(--accent-primary, #60C0F0)');
    expect(revenuePanel).toContain('color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent)');
    expect(revenuePanel).not.toContain('rgba(0, 32, 96, 0.95)');
    expect(storeTokens).toContain("completed: 'var(--accent-primary, #60C0F0)'");
    expect(storeTokens).toContain("pending: 'var(--accent-gold, #C6A84B)'");
    expect(storeTokens).toContain("inactive: 'var(--danger, #C92A54)'");
    expect(storeDesignSystem).toContain("export * from './StoreDesignSystem.tokens'");
    expect(storeDesignSystem).toContain("export * from './StoreDesignSystem.layout'");
    expect(storeDesignSystem).toContain("export * from './StoreDesignSystem.controls'");
    expect(storeDesignSystem).toContain("export * from './StoreDesignSystem.feedback'");
    expect(storeDesignSystem).not.toContain('rgba(0,255,136');
    expect(storeDesignSystem).not.toContain('linear-gradient(135deg, #60C0F0, #8B5CF6)');
    [storeDesignSystem, storeTokens, storeLayout, storeControls, storeFeedback].forEach((source) => {
      expect(lineCount(source)).toBeLessThanOrEqual(300);
    });
    expect(pendingOrders).toContain('var(--bg-elevated, #141419)');
    expect(pendingOrders).not.toContain('background: #120d26');
    expect(pendingOrders).not.toContain('rgba(0,255,136');
  });

  it('keeps the mounted dashboard canvas independent from the active lens background', () => {
    const universalStyles = readSource('src/components/DashBoard/UniversalDashboardLayout.styles.ts');

    expect(universalStyles).toMatch(/body \{[\s\S]*?background: var\(--app-canvas, #0A0A0F\);/);
    expect(universalStyles).toMatch(/UniversalLayoutContainer[\s\S]*?background: var\(--app-canvas, #0A0A0F\);/);
    expect(universalStyles).toMatch(/UniversalMainContent[\s\S]*?background: var\(--app-canvas, #0A0A0F\);/);
  });

  it('keeps the hydration controls theme-responsive', () => {
    const hydration = readSource('src/components/DashBoard/workspaces/NutritionHydrationTab.tsx');

    expect(hydration).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)');
    expect(hydration).not.toContain("? 'rgba(96,192,240,0.12)'");
  });
});
