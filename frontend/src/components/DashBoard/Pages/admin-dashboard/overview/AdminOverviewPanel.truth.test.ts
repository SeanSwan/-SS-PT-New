import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
  'utf8',
);

describe('AdminOverviewPanel analytics resilience contract', () => {
  it('fetches independent analytics endpoints through mounted admin analytics routes', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsRevenueRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsUserRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin/analytics', analyticsSystemRoutes)");
    expect(source).toContain("'/api/admin/analytics/statistics/revenue'");
    expect(source).toContain("'/api/admin/analytics/statistics/users'");
    expect(source).toContain("'/api/admin/analytics/statistics/workouts'");
    expect(source).toContain("'/api/admin/analytics/statistics/system-health'");
  });

  it('does not let one failed analytics endpoint zero the whole overview', () => {
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('readSettledData');
    expect(source).toContain('metricUnavailable');
    expect(source).toContain('Some admin overview metrics could not be loaded.');
    expect(source).toContain("service: 'System health API'");
    expect(source).not.toContain('const [revenueRes, usersRes, workoutsRes, healthRes] = await Promise.all([');
  });
});
