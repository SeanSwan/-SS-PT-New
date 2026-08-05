import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.tsx'),
  'utf8',
);
const stylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.styles.ts'),
  'utf8',
);
const modalStylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.modalStyles.ts'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
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
    expect(parentSource).toContain('<BentoHalf><WidgetErrorBoundary name="Visitor geography"><VisitorGeoWidget /></WidgetErrorBoundary></BentoHalf>');
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-geo')");
    expect(source).toContain("authAxios.get('/api/admin/dashboard/anonymous-visitors')");
    expect(source).toContain("authAxios.get('/api/admin/dashboard/visitor-history'");
    expect(coreRoutesSource).toContain("app.use('/api/admin/dashboard', adminDashboardRoutes)");
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
    const combinedStyles = `${stylesSource}\n${modalStylesSource}`;
    expect(combinedStyles).toContain('width: 44px;');
    expect(combinedStyles).toContain('height: 44px;');
    expect(combinedStyles).toContain('min-width: 44px');
    expect(combinedStyles).toContain('min-height: 44px');
    expect(combinedStyles).not.toContain('min-height: 36px');
  });

  it('uses dashboard theme variables for its primary colors', () => {
    const combinedStyles = `${stylesSource}\n${modalStylesSource}`;
    expect(combinedStyles).toContain("const MIDNIGHT = 'var(--bg-elevated, #141419)'");
    expect(combinedStyles).toContain("const ICE_WING = 'var(--accent-primary, #60C0F0)'");
    expect(combinedStyles).toContain("const WING_PURPLE = 'var(--accent-secondary, #8B5CF6)'");
    expect(combinedStyles).toContain("const GILDED = 'var(--accent-gold, #C6A84B)'");
    expect(combinedStyles).toContain("const FROST = 'var(--text-primary, #E0ECF4)'");
    expect(combinedStyles).toContain("const SUCCESS_GREEN = 'var(--success, #22C55E)'");
    expect(`${source}\n${combinedStyles}`).not.toContain("const ICE_WING = '#60C0F0'");
    expect(`${source}\n${combinedStyles}`).not.toContain("const WING_PURPLE = '#8B5CF6'");
    expect(`${source}\n${combinedStyles}`).not.toContain("background: #22C55E;");
    expect(`${source}\n${combinedStyles}`).not.toContain("$recent ? '#22C55E'");
    expect(`${source}\n${combinedStyles}`).not.toMatch(/rgba\(/);
  });

  it('keeps the active visitor widget split below source file caps', () => {
    const sectionSource = readFileSync(
      resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.sections.tsx'),
      'utf8',
    );
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.detail.tsx'),
      'utf8',
    );
    const typesSource = readFileSync(
      resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/VisitorGeoWidget.types.ts'),
      'utf8',
    );

    for (const fileSource of [source, stylesSource, modalStylesSource, sectionSource, detailSource, typesSource]) {
      expect(fileSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }

    expect(source).toContain("from './VisitorGeoWidget.styles'");
    expect(source).toContain("from './VisitorGeoWidget.sections'");
    expect(source).toContain("from './VisitorGeoWidget.types'");
    expect(source).not.toContain("import styled");
  });
});
