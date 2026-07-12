import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contract: the Feature Access page (where an admin grants a user the
 * `store-prices` flag that reveals catalog pricing) must be reachable from the
 * admin SIDEBAR, not just by typing the URL. The live sidebar renders
 * WORKSPACE_CONFIG (ADMIN_DASHBOARD_TABS is @deprecated), so a route without a
 * WORKSPACE_CONFIG entry is invisible in the nav — the exact bug this guards.
 */

const repoRoot = resolve(__dirname, '../../../..');
const read = (rel: string) => (existsSync(resolve(repoRoot, rel)) ? readFileSync(resolve(repoRoot, rel), 'utf8') : '');

const routes = read('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
const dashboardTabs = read('frontend/src/config/dashboard-tabs.ts');
const sidebar = read('frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx');

describe('admin Feature Access nav findability', () => {
  it('keeps the /feature-access admin route mounted', () => {
    expect(routes).toContain("path: '/feature-access'");
    expect(routes).toContain('component: FeatureAccessPage');
  });

  it('surfaces Feature Access in the live admin sidebar (WORKSPACE_CONFIG)', () => {
    expect(dashboardTabs).toContain("id: 'feature-access'");
    expect(dashboardTabs).toContain("prefix: '/dashboard/admin/feature-access'");
  });

  it('registers the sidebar icon so it does not fall back to the generic Shield', () => {
    // AdminStellarSidebar resolves icons via a curated iconMap with `|| Shield`.
    expect(sidebar).toContain('Unlock');
  });
});
