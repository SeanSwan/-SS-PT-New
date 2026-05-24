import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const dashboardLayoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);

describe('ContactNotifications active surface truth contract', () => {
  it('is mounted by the admin overview dashboard', () => {
    expect(parentSource).toContain("import ContactNotifications from '../components/ContactNotifications'");
    expect(parentSource).toContain('<ContactNotifications autoRefresh={true} showActions={true} />');
  });

  it('uses the mounted finance and contact notification endpoints', () => {
    expect(source).toContain('authAxios.get(`/api/admin/finance/notifications?limit=${pageSize}&offset=${fOffset}`)');
    expect(source).toContain('authAxios.get(`/api/contact?limit=${pageSize}&offset=${cOffset}`)');
  });

  it('does not synthesize unstable random finance notification ids', () => {
    expect(source).not.toContain('Math.random');
    expect(source).toContain('stableFinanceNotificationId');
  });

  it('routes notification actions to canonical admin dashboard destinations', () => {
    expect(dashboardLayoutSource).toContain("path: '/revenue'");
    expect(dashboardLayoutSource).toContain("path: '/pending-orders'");
    expect(dashboardLayoutSource).toContain("path: '/security'");
    expect(dashboardLayoutSource).toContain("path: '/messages'");
    expect(dashboardLayoutSource).toContain("path: '/client-management'");

    expect(source).not.toMatch(/\/dashboard\/(?:home|analytics|store|system)/);
    expect(source).not.toContain('window.open');
    expect(source).toContain('/dashboard/admin/revenue');
    expect(source).toContain('/dashboard/admin/pending-orders');
    expect(source).toContain('/dashboard/admin/security');
    expect(source).toContain('/dashboard/admin/messages');
    expect(source).toContain('/dashboard/admin/client-management');
  });

  it('keeps icon-only controls at the required minimum touch target size', () => {
    const controlButtonBlock = source.match(/const ControlButton[\s\S]*?`;/)?.[0] ?? '';

    expect(controlButtonBlock).toContain('min-height: 44px');
    expect(controlButtonBlock).toContain('min-width: 44px');
  });
});
