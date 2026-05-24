import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/OrientationIntakeWidget.tsx'),
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
  resolve(process.cwd(), '../backend/routes/orientationRoutes.mjs'),
  'utf8',
);

describe('OrientationIntakeWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by mounted orientation routes', () => {
    expect(parentSource).toContain("import OrientationIntakeWidget from '../components/OrientationIntakeWidget'");
    expect(parentSource).toContain('<BentoThird><OrientationIntakeWidget /></BentoThird>');
    expect(source).toContain("authAxios.get('/api/orientation/all')");
    expect(source).toContain("authAxios.post(`/api/orientation/${orientation.id}/link-user`");
    expect(routeSource).toContain("router.get('/all'");
    expect(routeSource).toContain("'/:id/link-user'");
  });

  it('routes the queue button to an active admin dashboard path', () => {
    expect(source).toContain("navigate('/dashboard/admin/unified-onboarding')");
    expect(layoutSource).toContain("{ path: '/unified-onboarding'");
  });

  it('does not present load failures as an empty orientation queue', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Orientation data unavailable');
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(source).toContain('min-height: 44px');
  });
});
