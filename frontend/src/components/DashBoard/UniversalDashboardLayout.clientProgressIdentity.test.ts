import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';

const layoutSourcePath = resolve(__dirname, './UniversalDashboardLayout.tsx');
const routeSourcePath = resolve(__dirname, './UniversalDashboardLayout.routes.tsx');
const routeComponentsSourcePath = resolve(__dirname, './UniversalDashboardLayout.routeComponents.tsx');
const layoutLogicPath = resolve(__dirname, './UniversalDashboardLayout.logic.ts');
const clientProgressPageSourcePath = resolve(__dirname, './Pages/client-dashboard/ClientProgressDashboardPage.tsx');

describe('UniversalDashboardLayout client detailed progress identity', () => {
  it('exports a strict positive integer dashboard user id parser', async () => {
    expect(existsSync(layoutLogicPath)).toBe(true);

    const logicModuleUrl = pathToFileURL(layoutLogicPath).href;
    const {
      dashboardDiagnosticMeta,
      parseDashboardUserId,
    } = await import(/* @vite-ignore */ logicModuleUrl);

    expect(parseDashboardUserId('77')).toBe(77);
    expect(parseDashboardUserId(' 77 ')).toBe(77);
    expect(parseDashboardUserId(77)).toBe(77);
    expect(parseDashboardUserId('77junk')).toBeNull();
    expect(parseDashboardUserId('0')).toBeNull();
    expect(parseDashboardUserId(Number.NaN)).toBeNull();
    expect(parseDashboardUserId(null)).toBeNull();

    expect(
      dashboardDiagnosticMeta('dashboard_initialization_failed', 'Dashboard initialization failed.', new TypeError('private detail'))
    ).toEqual({
      code: 'dashboard_initialization_failed',
      message: 'Dashboard initialization failed.',
      causeName: 'TypeError',
    });
  });

  it('does not pass zero or NaN user ids into detailed progress charts', () => {
    const layoutSource = readFileSync(layoutSourcePath, 'utf8');
    const routesSource = readFileSync(routeSourcePath, 'utf8');
    const routeComponentsSource = readFileSync(routeComponentsSourcePath, 'utf8');

    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes';");
    expect(routeComponentsSource).toContain("from './UniversalDashboardLayout.logic';");
    expect(routeComponentsSource).toContain('parseDashboardUserId');
    expect(routeComponentsSource).toContain('const clientId = parseDashboardUserId(user?.id);');
    expect(routeComponentsSource).toContain('if (!clientId) {');
    expect(routeComponentsSource).toContain('<NASMProgressCharts clientId={clientId} />');
    expect(routesSource).toContain("{ path: '/progress/detailed', component: ClientProgressWrapper");
    expect(routeComponentsSource).not.toContain('clientId={Number(user?.id || 0)}');
  });

  it('gates direct client detailed analytics links before paid charts mount', () => {
    const source = readFileSync(routeComponentsSourcePath, 'utf8');

    expect(source).toContain("import { useSubscription } from '../../hooks/useSubscription';");
    expect(source).toContain('const { isPro, isElite, loading: subscriptionLoading } = useSubscription();');
    expect(source).toContain("const isStaffRole = userRole === 'admin' || userRole === 'trainer';");
    expect(source).toContain('const hasDetailedProgressAccess = isStaffRole || isPro || isElite;');
    expect(source).not.toContain('const hasDetailedProgressAccess = isStaffRole || isPro || isElite || isTrial;');
    expect(source).toContain('if (subscriptionLoading && !isStaffRole) {');
    expect(source).toContain('if (!hasDetailedProgressAccess) {');
    expect(source).toContain('<h2>Guardian analytics required</h2>');
    expect(source).toContain('return <NASMProgressCharts clientId={clientId} />;');
  });

  it('keeps the client progress CTA gate aligned with backend charts.full Pro tier', () => {
    const source = readFileSync(clientProgressPageSourcePath, 'utf8');

    expect(source).toContain('const { isPro, isElite } = useSubscription();');
    expect(source).toContain('const hasAdvancedAccess = isPro || isElite;');
    expect(source).not.toContain('const hasAdvancedAccess = isPro || isElite || isTrial;');
  });
});
