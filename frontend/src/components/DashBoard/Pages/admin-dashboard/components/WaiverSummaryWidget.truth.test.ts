import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/WaiverSummaryWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const layoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
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
    expect(parentSource).toContain('<BentoThird><WaiverSummaryWidget /></BentoThird>');
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
    expect(layoutSource).toContain("{ path: '/waivers'");
  });

  it('does not present waiver fetch failures as a clean empty queue', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Waiver data unavailable');
    expect(source).not.toContain('} catch {\n      setRecords([]);');
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(source).toContain('min-height: 44px');
  });
});
