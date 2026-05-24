import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/dashboard/adminDashboardRoutes.mjs'),
  'utf8',
);
const controllerSource = readFileSync(
  resolve(process.cwd(), '../backend/controllers/adminDashboardVisitorController.mjs'),
  'utf8',
);

describe('VisitorGeoWidget active surface truth contract', () => {
  it('is mounted by admin overview and backed by dashboard visitor endpoints', () => {
    expect(parentSource).toContain("import VisitorGeoWidget from '../components/VisitorGeoWidget'");
    expect(parentSource).toContain('<BentoHalf><VisitorGeoWidget /></BentoHalf>');
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-geo')");
    expect(source).toContain("authAxios.get('/api/admin/dashboard/anonymous-visitors')");
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-history'");
    expect(routeSource).toContain("router.get('/visitor-geo'");
    expect(routeSource).toContain("router.get('/anonymous-visitors'");
    expect(routeSource).toContain("router.get('/visitor-history'");
  });

  it('matches the visitor controller top-level response shape', () => {
    expect(controllerSource).toContain('totalVisitors: allResults.length');
    expect(controllerSource).toContain('recentVisitors: all');
    expect(controllerSource).toContain('visitors: rows');
    expect(source).toContain('geoRes.value.data?.success');
    expect(source).toContain('anonRes.value.data?.success');
    expect(source).toContain('res.data?.success');
  });

  it('does not silently turn visitor endpoint failures into empty metrics', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Visitor data unavailable');
    expect(source).toContain('historyError');
    expect(source).toContain('Visitor history unavailable');
    expect(source).not.toContain('catch { /* silent */ }');
  });

  it('keeps visitor controls at the required touch target size', () => {
    expect(source).toContain('width: 44px; height: 44px;');
    expect(source).toContain('min-width: 44px');
    expect(source).toContain('min-height: 44px');
    expect(source).not.toContain('min-height: 36px');
  });
});
