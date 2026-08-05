import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/OrientationIntakeWidget.tsx'),
  'utf8',
);
const stylesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/OrientationIntakeWidget.styles.ts'),
  'utf8',
);
const typesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/OrientationIntakeWidget.types.ts'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/orientationRoutes.mjs'),
  'utf8',
);

describe('OrientationIntakeWidget active surface truth contract', () => {
  it('is mounted by the admin overview and backed by mounted orientation routes', () => {
    expect(parentSource).toContain("import OrientationIntakeWidget from '../components/OrientationIntakeWidget'");
    expect(parentSource).toContain('<BentoThird><WidgetErrorBoundary name="Orientation intake"><OrientationIntakeWidget /></WidgetErrorBoundary></BentoThird>');
    expect(source).toContain("authAxios.get('/api/orientation/all')");
    expect(source).toContain("authAxios.post(`/api/orientation/${orientation.id}/link-user`");
    expect(routeSource).toContain("router.get('/all'");
    expect(routeSource).toContain("'/:id/link-user'");
  });

  it('routes the queue button to an active admin dashboard path', () => {
    expect(source).toContain("navigate('/dashboard/admin/unified-onboarding')");
    expect(dashboardRoutesSource).toContain("{ path: '/unified-onboarding'");
  });

  it('does not present load failures as an empty orientation queue', () => {
    expect(source).toContain('loadError');
    expect(source).toContain('Orientation data unavailable');
  });

  it('keeps widget buttons at the required minimum touch target size', () => {
    expect(stylesSource).toContain('min-height: 44px');
  });

  it('uses Crystalline Swan theme tokens for queue controls and state tags', () => {
    expect(stylesSource).toContain('color: var(--accent-primary, #60C0F0);');
    expect(stylesSource).toContain('color: var(--text-primary, #E0ECF4);');
    expect(stylesSource).toContain('color: var(--text-muted, #94A3B8);');
    expect(stylesSource).toContain("color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)");
    expect(stylesSource).toContain("$tone === 'ok' ? 'var(--success, #22C55E)'");
    expect(stylesSource).toContain("$tone === 'warn' ? 'var(--warning, #F59E0B)'");
    expect(stylesSource).not.toContain('color: #60C0F0;');
    expect(stylesSource).not.toContain('color: #7dd3fc;');
    expect(stylesSource).not.toContain('color: #dbeafe;');
    expect(stylesSource).not.toContain('color: #e2e8f0;');
    expect(stylesSource).not.toContain('color: #94a3b8;');
    expect(stylesSource).not.toContain("'#86efac'");
    expect(stylesSource).not.toContain("'#fcd34d'");
    expect(stylesSource).not.toContain("'#cbd5e1'");
    expect(stylesSource).not.toContain('rgba(14, 165, 233');
  });

  it('keeps the active orientation widget split into bounded files', () => {
    expect(source).toContain("from './OrientationIntakeWidget.styles'");
    expect(source).toContain("from './OrientationIntakeWidget.types'");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(190);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(190);
    expect(typesSource.split(/\r?\n/).length).toBeLessThanOrEqual(60);
  });
});
