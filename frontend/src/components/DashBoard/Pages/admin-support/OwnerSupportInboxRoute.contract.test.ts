/** Canonical owner inbox mount and navigation receipt. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), 'src');

describe('Owner Report Room route contract', () => {
  it('lazy-loads one admin support route and exposes it in the canonical sidebar config', () => {
    const components = readFileSync(resolve(root, 'components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'), 'utf8');
    const routes = readFileSync(resolve(root, 'components/DashBoard/UniversalDashboardLayout.routes.tsx'), 'utf8');
    const tabs = readFileSync(resolve(root, 'config/dashboard-tabs.ts'), 'utf8');

    expect(components).toContain("export const OwnerSupportInboxPage = React.lazy(() => import('./Pages/admin-support/OwnerSupportInboxPage'))");
    expect(routes).toContain('OwnerSupportInboxPage,');
    expect(routes).toContain("{ path: '/support', component: OwnerSupportInboxPage, title: 'Report Room Inbox'");
    expect(tabs).toContain("id: 'report-room'");
    expect(tabs).toContain("prefix: '/dashboard/admin/support'");
  });

  it('keeps the owner workspace free of mojibake markers', () => {
    const page = readFileSync(resolve(root, 'components/DashBoard/Pages/admin-support/OwnerSupportInboxPage.tsx'), 'utf8');
    const detail = readFileSync(resolve(root, 'components/DashBoard/Pages/admin-support/SupportIssueDetailPanel.tsx'), 'utf8');
    expect(`${page}${detail}`).not.toMatch(/\u00c2|\u00c3/);
  });
});
