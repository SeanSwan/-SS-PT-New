import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.tsx',
);
const stylesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.styles.ts',
);
const helpersPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.helpers.tsx',
);
const itemPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotificationItem.tsx',
);
const typesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.types.ts',
);
const source = readFileSync(
  componentPath,
  'utf8',
);
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const helpersSource = existsSync(helpersPath) ? readFileSync(helpersPath, 'utf8') : '';
const itemSource = existsSync(itemPath) ? readFileSync(itemPath, 'utf8') : '';
const typesSource = existsSync(typesPath) ? readFileSync(typesPath, 'utf8') : '';
const combinedSource = `${source}\n${stylesSource}\n${helpersSource}\n${itemSource}\n${typesSource}`;
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const dashboardLayoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(resolve(process.cwd(), '../backend/core/routes.mjs'), 'utf8');
const contactRouteSource = readFileSync(resolve(process.cwd(), '../backend/routes/contactRoutes.mjs'), 'utf8');
const financeRouteSource = readFileSync(resolve(process.cwd(), '../backend/routes/admin/adminFinanceRoutes.mjs'), 'utf8');

describe('ContactNotifications active surface truth contract', () => {
  it('is mounted by the admin overview dashboard', () => {
    expect(parentSource).toContain("import ContactNotifications from '../components/ContactNotifications'");
    expect(parentSource).toContain('<ContactNotifications autoRefresh={true} showActions={true} />');
  });

  it('uses the mounted finance and contact notification endpoints', () => {
    expect(source).toContain('authAxios.get(`/api/admin/finance/notifications?limit=${pageSize}&offset=${fOffset}`)');
    expect(source).toContain('authAxios.get(`/api/contact?limit=${pageSize}&offset=${cOffset}`)');
    expect(coreRoutesSource).toContain("app.use('/api/admin/finance', adminFinanceRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/contact', contactRoutes)");
    expect(financeRouteSource).toContain("router.get('/notifications'");
    expect(contactRouteSource).toContain('router.get("/", protect, adminOnly');
  });

  it('does not synthesize unstable random finance notification ids', () => {
    expect(combinedSource).not.toContain('Math.random');
    expect(combinedSource).toContain('stableFinanceNotificationId');
  });

  it('routes notification actions to canonical admin dashboard destinations', () => {
    expect(dashboardLayoutSource).toContain("path: '/revenue'");
    expect(dashboardLayoutSource).toContain("path: '/pending-orders'");
    expect(dashboardLayoutSource).toContain("path: '/security'");
    expect(dashboardLayoutSource).toContain("path: '/messages'");
    expect(dashboardLayoutSource).toContain("path: '/client-management'");

    expect(combinedSource).not.toMatch(/\/dashboard\/(?:home|analytics|store|system)/);
    expect(combinedSource).not.toContain('window.open');
    expect(combinedSource).toContain('/dashboard/admin/revenue');
    expect(combinedSource).toContain('/dashboard/admin/pending-orders');
    expect(combinedSource).toContain('/dashboard/admin/security');
    expect(combinedSource).toContain('/dashboard/admin/messages');
    expect(combinedSource).toContain('/dashboard/admin/client-management');
  });

  it('keeps icon-only controls at the required minimum touch target size', () => {
    const controlButtonBlock = stylesSource.match(/export const ControlButton[\s\S]*?`;/)?.[0] ?? '';

    expect(controlButtonBlock).toContain('min-height: 44px');
    expect(controlButtonBlock).toContain('min-width: 44px');
  });

  it('uses Crystalline Swan theme tokens for priority alert visuals', () => {
    expect(combinedSource).toContain('Crystalline Swan-themed professional aesthetics');
    expect(combinedSource).toContain('type NotificationPriority =');
    expect(combinedSource).toContain('const PRIORITY_COLOR_BY_LEVEL: Record<NotificationPriority, string> = {');
    expect(combinedSource).toContain("const PRIORITY_CRITICAL = 'var(--error, #EF4444)'");
    expect(combinedSource).toContain('critical: PRIORITY_CRITICAL');
    expect(combinedSource).toContain('color-mix(in srgb, ${({ $color }) => $color || PRIORITY_MEDIUM} 18%, transparent)');
    expect(combinedSource).not.toContain('Galaxy-themed');
    expect(combinedSource).not.toContain("low: '#6b7280'");
    expect(combinedSource).not.toContain("medium: '#3b82f6'");
    expect(combinedSource).not.toContain("high: '#f59e0b'");
    expect(combinedSource).not.toContain("critical: '#ef4444'");
    expect(combinedSource).not.toContain("$color || 'rgba(59, 130, 246, 0.2)'");
    expect(combinedSource).not.toContain("$color || '#3b82f6'");
  });

  it('keeps independent sources resilient when finance or contacts fail alone', () => {
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('readNotificationResult');
    expect(source).not.toContain('const [financeRes, contactRes] = await Promise.all([');
  });

  it('keeps behavior, item, helpers, types, and tokenized styles split below line caps', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(existsSync(helpersPath)).toBe(true);
    expect(existsSync(itemPath)).toBe(true);
    expect(existsSync(typesPath)).toBe(true);
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toContain('keyframes');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(helpersSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(itemSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(typesSource.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(combinedSource).not.toMatch(/rgba\(/);
    expect(combinedSource).not.toContain('color: #');
    expect(combinedSource).not.toContain('background: #');
  });
});
