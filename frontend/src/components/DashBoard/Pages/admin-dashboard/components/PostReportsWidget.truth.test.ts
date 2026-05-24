import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/PostReportsWidget.tsx'),
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
  resolve(process.cwd(), '../backend/routes/adminContentModerationRoutes.mjs'),
  'utf8',
);

describe('PostReportsWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by the content reports route', () => {
    expect(parentSource).toContain("import PostReportsWidget from '../components/PostReportsWidget'");
    expect(parentSource).toContain('<BentoThird><PostReportsWidget /></BentoThird>');
    expect(source).toContain("authAxios.get('/api/admin/content/reports'");
    expect(routeSource).toContain("router.get('/reports'");
  });

  it('routes View All to an active admin dashboard content path', () => {
    expect(source).toContain("navigate('/dashboard/admin/content')");
    expect(layoutSource).toContain("{ path: '/content'");
  });

  it('reads the nested backend reports response instead of treating it as an empty array', () => {
    expect(source).toContain('res.data?.data?.reports');
    expect(source).toContain('res.data?.data?.pagination?.total');
  });

  it('does not hide report fetch failures as a clean empty queue', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Reports data unavailable');
  });

  it('does not render unsupported Resolve/Dismiss report mutation controls', () => {
    expect(source).not.toContain('reportId,');
    expect(source).not.toContain('Fallback: remove from UI anyway');
    expect(source).not.toContain('<ActionBtn');
    expect(source).not.toContain('min-height: 36px');
  });
});
