import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/VisitorWorldMap.tsx',
);
const stylesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/VisitorWorldMap.styles.ts',
);
const source = readFileSync(
  componentPath,
  'utf8',
);
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${source}\n${stylesSource}`;
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminTelemetrySection.tsx'),
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

describe('VisitorWorldMap active surface truth contract', () => {
  it('is mounted by admin overview and backed by dashboard visitor endpoints', () => {
    expect(parentSource).toContain("const VisitorWorldMap = lazy(() => import('../components/VisitorWorldMap'))");
    expect(parentSource).toContain('<VisitorWorldMap />');
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-geo')");
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-history'");
    expect(routeSource).toContain("router.get('/visitor-geo'");
    expect(routeSource).toContain("router.get('/visitor-history'");
  });

  it('matches the map controller response fields used by markers and totals', () => {
    expect(controllerSource).toContain('totalVisitors: allResults.length');
    expect(controllerSource).toContain('byCity: Object.values(cityMap)');
    expect(controllerSource).toContain('total: count');
    expect(source).toContain('d.totalVisitors ?? 0');
    expect(source).toContain('(d.byCity ?? []).filter');
    expect(source).toContain('historyRes.value.data.total ?? 0');
  });

  it('does not silently turn map endpoint failures into a clean empty map', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Map data unavailable');
    expect(source).toContain('historyError');
    expect(source).toContain('All-time visitor count unavailable');
    expect(source).not.toContain('/* silent');
  });

  it('keeps map controls at explicit 44px touch target dimensions', () => {
    expect(combinedSource).toContain('width: 44px;');
    expect(combinedSource).toContain('height: 44px;');
    expect(combinedSource).toContain('min-height: 44px');
    expect(combinedSource).not.toContain('width: 36px;');
    expect(combinedSource).not.toContain('height: 36px;');
  });

  it('keeps map behavior split from tokenized styles below line caps', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toContain('keyframes');
    expect(source).not.toContain('style={{');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(combinedSource).not.toMatch(/rgba\(/);
    expect(combinedSource).not.toContain('color: #');
    expect(combinedSource).not.toContain('background: #');
  });

  it('does not make repeated-city marker labels unreachable', () => {
    expect(source).toContain('const max = 4;');
    expect(source).toContain('markerRadius(city.count) >= 3.2');
    expect(source).not.toContain('markerRadius(city.count) >= 4');
  });
});
