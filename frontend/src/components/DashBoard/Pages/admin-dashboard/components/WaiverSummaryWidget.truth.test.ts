import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/WaiverSummaryWidget.tsx'),
  'utf8',
);
const stylePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/WaiverSummaryWidget.styles.ts',
);
const readStyleSource = () => (existsSync(stylePath) ? readFileSync(stylePath, 'utf8') : '');
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminWaiverRoutes.mjs'),
  'utf8',
);
const controllerSource = readFileSync(
  resolve(process.cwd(), '../backend/controllers/adminWaiverController.mjs'),
  'utf8',
);

describe('WaiverSummaryWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by the admin waiver list route', () => {
    expect(parentSource).toContain("import WaiverSummaryWidget from '../components/WaiverSummaryWidget'");
    expect(parentSource).toContain('<BentoThird><WidgetErrorBoundary name="Waiver summary"><WaiverSummaryWidget /></WidgetErrorBoundary></BentoThird>');
    expect(source).toContain("apiService.get('/api/admin/waivers?page=1&limit=5')");
    expect(routeSource).toContain("router.get('/', protect, adminOnly, listWaiverRecords)");
  });

  it('reads the nested backend waiver response shape', () => {
    expect(source).toContain('res.data?.data');
    expect(source).toContain('data?.records');
    expect(source).toContain('data?.pagination?.total');
    expect(controllerSource).toContain('records: rows');
    expect(controllerSource).toContain('pagination: { page, limit, total: count');
  });

  it('routes every row and the command button to the active waiver manager', () => {
    expect(source).toContain("navigate('/dashboard/admin/waivers')");
    expect(dashboardRoutesSource).toContain("{ path: '/waivers'");
  });

  it('does not present waiver fetch failures as a clean empty queue', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Waiver data unavailable');
    expect(source).not.toContain('} catch {\n      setRecords([]);');
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(`${source}\n${readStyleSource()}`).toContain('min-height: 44px');
  });

  it('keeps styles extracted under the line cap and connected to theme tokens', () => {
    expect(source).toContain("from './WaiverSummaryWidget.styles'");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(existsSync(stylePath)).toBe(true);

    const styleSource = readStyleSource();
    expect(styleSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(styleSource).toContain('color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)');
    expect(styleSource).toContain('var(--swan-lavender, #4070C0)');
    expect(styleSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(styleSource).not.toContain("color: #4070C0;");
    expect(styleSource).not.toContain("background: #002060;");
    expect(styleSource).not.toContain("color: ${({ $urgent }) => ($urgent ? '#E5C76B' : '#7DD3FC')};");
  });
});
