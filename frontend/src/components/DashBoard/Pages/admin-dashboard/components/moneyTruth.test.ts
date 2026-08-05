/**
 * SWA-138 S6 — money-truth contracts.
 * Locks the three audit defects: client-summed KPIs over a capped page,
 * the unconditional CA-tax display, and synthetic self-referential targets.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/components/PendingOrdersAdminPanel.tsx');
const kpis = read('src/components/DashBoard/Pages/admin-dashboard/components/PendingOrdersKPIs.tsx');
const revenueRoute = read('../backend/routes/admin/analyticsRevenueRoutes.mjs');
const userRoute = read('../backend/routes/admin/analyticsUserRoutes.mjs');

describe('PendingOrdersAdminPanel money truth (S6)', () => {
  it('KPI cards read SERVER aggregates, never a client-side sum of the fetched page', () => {
    expect(panel).toContain("authAxios.get('/api/admin/orders/analytics'");
    expect(panel).toContain('<PendingOrdersKPIs analytics={analytics} pendingCount={pendingCount} />');
    expect(kpis).toContain('Revenue (30d, completed)');
    expect(kpis).toContain('Orders (30d, completed)');
    expect(panel).not.toContain('orders.reduce((sum, o) => sum + o.amount');
  });

  it('the unconditional CA tax display is gone until real jurisdiction logic exists', () => {
    expect(panel).not.toContain('CA_TAX_RATE');
    expect(panel).not.toContain('Tax Liability');
  });

  it('the queue count is labeled as queue-scoped, not presented as a business total', () => {
    expect(kpis).toContain('Pending Payment (in view)');
  });

  it('is split under the 300-line cap with styles and logic extracted', () => {
    expect(panel.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panel).toContain("from './PendingOrdersAdminPanel.styles'");
    expect(panel).toContain("from './PendingOrdersAdminPanel.logic'");
  });
});

describe('synthetic KPI targets are dead (S6)', () => {
  it('revenue and user statistics no longer invent targets from the metric itself', () => {
    expect(revenueRoute).toContain('target: null');
    expect(revenueRoute).not.toContain('* 1.15)');
    expect(userRoute).toContain('target: null');
    expect(userRoute).not.toContain('totalUsers * 1.1)');
  });
});
