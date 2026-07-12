/**
 * stripeAnalyticsNetRevenue.test.mjs
 * ==================================
 * Admin KPI data-truth regressions (hostile review round 5, 2026-07-11).
 *
 *  - Revenue must be NET of refunds. A refunded-but-succeeded charge keeps
 *    status:'succeeded' and a positive charge.amount; the refunded portion is in
 *    charge.amount_refunded, which the old reduce ignored -> gross reported as revenue.
 *  - MRR must sum ALL active subscriptions, not the first 100 (the fetch now paginates;
 *    calculateFinancialMetrics already summed whatever array it was handed, so here we
 *    just assert the reduce is correct across a >100 array).
 *
 * calculateFinancialMetrics is a pure-ish instance method; getPreviousPeriodRevenue reads
 * the DB, so we pass an equal-length prior window (revenueChange math is not under test).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const svc = (await import('../../services/analytics/StripeAnalyticsService.mjs')).default;

const baseArgs = (overrides) => ({
  charges: [],
  customers: [],
  subscriptions: [],
  localTransactions: [],
  localUsers: [],
  timeRange: '30d',
  startDate: new Date('2026-06-01T00:00:00Z'),
  endDate: new Date('2026-06-30T00:00:00Z'),
  ...overrides,
});

describe('StripeAnalyticsService.calculateFinancialMetrics — data truth', () => {
  it('reports NET revenue (subtracts amount_refunded), not gross', async () => {
    // Force getPreviousPeriodRevenue to a no-op so revenueChange math stays out of the way.
    vi.spyOn(svc, 'getPreviousPeriodRevenue').mockResolvedValue(0);
    vi.spyOn(svc, 'generateDailyTrend').mockResolvedValue([]);
    vi.spyOn(svc, 'calculateTopPackages').mockResolvedValue([]);
    vi.spyOn(svc, 'formatRecentTransactions').mockResolvedValue([]);

    const charges = [
      { status: 'succeeded', amount: 800000, amount_refunded: 0, created: 1717200000 },      // $8,000
      { status: 'succeeded', amount: 200000, amount_refunded: 200000, created: 1717200000 }, // $2,000 fully refunded
      { status: 'succeeded', amount: 100000, amount_refunded: 40000, created: 1717200000 },  // $1,000 - $400 = $600
      { status: 'failed', amount: 500000, amount_refunded: 0, created: 1717200000 },         // excluded
    ];

    const res = await svc.calculateFinancialMetrics(baseArgs({ charges }));
    // Gross succeeded = 8000 + 2000 + 1000 = 11,000. NET = 8000 + 0 + 600 = 8,600.
    expect(res.data.overview.totalRevenue).toBe(8600);
    // transactionCount is still the count of succeeded charges (3), refunds don't change it.
    expect(res.data.overview.transactionCount).toBe(3);
  });

  it('sums MRR across ALL active subscriptions handed to it (not capped at 100)', async () => {
    vi.spyOn(svc, 'getPreviousPeriodRevenue').mockResolvedValue(0);
    vi.spyOn(svc, 'generateDailyTrend').mockResolvedValue([]);
    vi.spyOn(svc, 'calculateTopPackages').mockResolvedValue([]);
    vi.spyOn(svc, 'formatRecentTransactions').mockResolvedValue([]);

    // 130 subs at $150/mo — this is exactly the set the paginated fetch now returns.
    const subscriptions = Array.from({ length: 130 }, () => ({
      items: { data: [{ price: { unit_amount: 15000 } }] },
    }));

    const res = await svc.calculateFinancialMetrics(baseArgs({ subscriptions }));
    expect(res.data.overview.activeSubscriptions).toBe(130);
    expect(res.data.overview.monthlyRecurringRevenue).toBe(130 * 150); // 19,500 — not the 100-capped 15,000
  });
});
