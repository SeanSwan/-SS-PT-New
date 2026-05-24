import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/dashboard/adminDashboardRoutes.mjs'), 'utf8');

describe('admin dashboard route structure', () => {
  it('keeps admin dashboard routes thin while preserving protected route ownership', () => {
    expect(routeSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(routeSource).toMatch(/router\.get\('\/stats',\s*protect,\s*adminOnly,\s*getAdminDashboardStats\)/);
    expect(routeSource).toMatch(/router\.get\('\/health',\s*protect,\s*adminOnly,\s*getAdminDashboardHealth\)/);
    expect(routeSource).toMatch(/router\.get\('\/visitor-geo',\s*protect,\s*adminOnly,\s*getVisitorGeo\)/);
    expect(routeSource).toMatch(/router\.get\('\/anonymous-visitors',\s*protect,\s*adminOnly,\s*getAnonymousVisitors\)/);
    expect(routeSource).toMatch(/router\.get\('\/visitor-history',\s*protect,\s*adminOnly,\s*getVisitorHistory\)/);
  });
});
