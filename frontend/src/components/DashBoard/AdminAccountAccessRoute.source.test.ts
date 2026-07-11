import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contract: the account-access ("skeleton key") switcher is remounted on the
 * ADMIN DASHBOARD as a first-class route, ADDITIVELY — without disturbing the
 * Coach Command Center ops-rail mount that AdminImpersonation.source.test.ts
 * locks. This test guards the remount wiring so it can't silently regress.
 */

const repoRoot = resolve(__dirname, '../../../..');
const read = (rel: string) => (existsSync(resolve(repoRoot, rel)) ? readFileSync(resolve(repoRoot, rel), 'utf8') : '');

const routeComponents = read('frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const routes = read('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
const page = read('frontend/src/components/DashBoard/Pages/admin-account-access/AdminAccountAccessPage.tsx');
const dashboardTabs = read('frontend/src/config/dashboard-tabs.ts');

describe('admin account-access route remount', () => {
  it('lazy-loads the AdminAccountAccessPage', () => {
    expect(routeComponents).toContain(
      "AdminAccountAccessPage = React.lazy(() => import('./Pages/admin-account-access/AdminAccountAccessPage'))"
    );
  });

  it('registers the /account-access admin route bound to the page', () => {
    expect(routes).toContain('AdminAccountAccessPage');
    expect(routes).toContain("path: '/account-access'");
    expect(routes).toContain('component: AdminAccountAccessPage');
  });

  it('renders the audited owner-gated switcher, not a fresh impersonation impl', () => {
    expect(page).toContain("import AdminAccountSwitcher from '../../../Admin/AdminAccountSwitcher'");
    expect(page).toContain('<AdminAccountSwitcher />');
    expect(page).toContain('Account Access');
  });

  it('is additive — does not remove the Coach Command Center route', () => {
    expect(routes).toContain("path: '/coach-assistant'");
  });

  it('surfaces the route in the live admin sidebar (WORKSPACE_CONFIG)', () => {
    // AdminStellarSidebar renders WORKSPACE_CONFIG, not ADMIN_DASHBOARD_TABS —
    // the route must have a matching sidebar entry or it is unreachable by nav.
    expect(dashboardTabs).toContain("id: 'account-access'");
    expect(dashboardTabs).toContain("prefix: '/dashboard/admin/account-access'");
  });
});
