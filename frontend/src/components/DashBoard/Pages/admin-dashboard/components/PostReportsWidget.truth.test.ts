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
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminContentModerationRoutes.mjs'),
  'utf8',
);

describe('PostReportsWidget active surface truth contract (SWA-138 S2)', () => {
  it('is mounted by the admin overview (inside its crash boundary) and backed by the content reports route', () => {
    expect(parentSource).toContain("import PostReportsWidget from '../components/PostReportsWidget'");
    expect(parentSource).toContain(
      '<BentoThird><WidgetErrorBoundary name="Post reports"><PostReportsWidget /></WidgetErrorBoundary></BentoThird>',
    );
    expect(source).toContain("authAxios.get('/api/admin/content/reports'");
    expect(routeSource).toContain("router.get('/reports'");
  });

  it('renders REAL Resolve/Dismiss actions wired to registered PATCH routes — the S2 fix for the never-built blueprint promise', () => {
    expect(source).toContain('actOnReport(report.id, \'resolve\')');
    expect(source).toContain('actOnReport(report.id, \'dismiss\')');
    expect(source).toContain('authAxios.patch(`/api/admin/content/reports/${id}/${verb}`');
    expect(routeSource).toContain("router.patch('/reports/:id/resolve', adminContentModerationController.resolveReport)");
    expect(routeSource).toContain("router.patch('/reports/:id/dismiss', adminContentModerationController.dismissReport)");
  });

  it('quick-resolve declares its action honestly (content-flagged) and buttons meet the 44px/keyboard bar', () => {
    expect(source).toContain("{ actionTaken: 'content-flagged' }");
    expect(source).toContain('min-height: 44px');
    expect(source).not.toContain('min-height: 36px');
    expect(source).toContain('type="button"');
    expect(source).toContain('&:focus-visible');
  });

  it('routes View All to an active admin dashboard content path', () => {
    expect(source).toContain("navigate('/dashboard/admin/content')");
    expect(dashboardRoutesSource).toContain("{ path: '/content'");
  });

  it('reads the nested backend reports response instead of treating it as an empty array', () => {
    expect(source).toContain('res.data?.data?.reports');
    expect(source).toContain('res.data?.data?.pagination?.total');
  });

  it('uses the S1 WidgetShell so error, empty, and loading are distinct states', () => {
    expect(source).toContain("import { usePolledFetch, WidgetShell } from '../shell'");
    expect(source).toContain("error={error ? 'Reports data unavailable' : null}");
    expect(source).toContain('emptyMessage="No pending reports"');
  });

  it('uses Crystalline Swan theme tokens for report priority visuals', () => {
    expect(source).toContain("const REPORT_ERROR = 'var(--error, #EF4444)'");
    expect(source).toContain("const REPORT_WARNING = 'var(--warning, #F59E0B)'");
    expect(source).toContain("const REPORT_PRIMARY = 'var(--accent-primary, #60C0F0)'");
    expect(source).toContain('const REPORT_PRIORITY_STYLES: Record<string, ReportPriorityStyle> = {');
    expect(source).toContain('background: ${({ $level }) => getPriorityStyle($level).background};');
    expect(source).toContain('color: ${({ $level }) => getPriorityStyle($level).color};');
    expect(source).toContain('<Flag size={20} color={REPORT_ERROR} />');
    expect(source).not.toContain('rgba(201, 42, 84');
    expect(source).not.toContain('color="#ef4444"');
  });
});
