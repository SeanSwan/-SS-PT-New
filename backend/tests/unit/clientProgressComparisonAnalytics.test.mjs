import { describe, expect, it } from 'vitest';
import { buildComparisonAnalytics } from '../../routes/clientProgressRoutes.mjs';

describe('client progress comparison analytics builder', () => {
  it('derives metrics from real ClientProgress level fields instead of fixed benchmark stories', () => {
    const result = buildComparisonAnalytics({
      comparisonType: 'average',
      timeframe: '3months',
      clientProgress: {
        overallLevel: 520,
        coreLevel: 700,
        balanceLevel: 300,
        stabilityLevel: 0,
        flexibilityLevel: 410,
      },
      cohortProgress: [
        { overallLevel: 420, coreLevel: 600, balanceLevel: 400, stabilityLevel: 100, flexibilityLevel: 510 },
        { overallLevel: 620, coreLevel: 800, balanceLevel: 500, stabilityLevel: 300, flexibilityLevel: 310 },
      ],
    });

    expect(result.subtitle).toContain('2 other real client progress records');
    expect(result.metrics.find((metric) => metric.name === 'Overall Level')).toMatchObject({
      client: 52,
      comparison: 52,
      trend: 'equal',
      improvement: '+0%',
    });
    expect(result.metrics.find((metric) => metric.name === 'Stability Level')).toMatchObject({
      client: 0,
      comparison: 20,
      trend: 'below',
      improvement: '-20%',
    });
    expect(JSON.stringify(result)).not.toMatch(/Bench 100kg|Run 5K under 25min|Compared to 12 clients|client":75/);
  });

  it('returns an honest empty state for comparison modes that need unavailable historical or goal data', () => {
    const historical = buildComparisonAnalytics({
      comparisonType: 'historical',
      timeframe: '6months',
      clientProgress: { overallLevel: 500 },
      cohortProgress: [{ overallLevel: 400 }],
    });

    expect(historical.metrics).toEqual([]);
    expect(historical.subtitle).toContain('stored progress snapshots');
  });
});
