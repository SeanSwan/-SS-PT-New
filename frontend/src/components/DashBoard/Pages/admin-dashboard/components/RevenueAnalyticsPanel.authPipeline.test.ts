import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('RevenueAnalyticsPanel auth pipeline', () => {
  it('is mounted as the admin revenue analytics route and backed by finance APIs', () => {
    const dashboardLayoutSource = readSource('src/components/DashBoard/UniversalDashboardLayout.tsx');
    const backendMounts = readSource('../backend/core/routes.mjs');
    const analyticsRoutes = readSource('../backend/routes/admin/analyticsRevenueRoutes.mjs');
    const financeRoutes = readSource('../backend/routes/admin/adminFinanceRoutes.mjs');

    expect(dashboardLayoutSource).toContain(
      "const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'))"
    );
    expect(dashboardLayoutSource).toContain("{ path: '/revenue', component: RevenueAnalyticsPanel");
    expect(backendMounts).toContain("app.use('/api/admin/analytics', analyticsRevenueRoutes)");
    expect(backendMounts).toContain("app.use('/api/admin/finance', adminFinanceRoutes)");
    expect(analyticsRoutes).toContain("router.get('/revenue'");
    expect(financeRoutes).toContain("router.get('/export'");
  });

  it('keeps revenue reads and CSV export on the shared API service', () => {
    const source = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.tsx');

    expect(source).toContain("import apiService from '../../../../../services/api.service';");
    expect(source).toContain('apiService.get(`/api/admin/analytics/revenue?timeRange=${timeRange}`)');
    expect(source).toContain("apiService.get(`/api/admin/finance/export?format=csv&timeRange=${timeRange}`, {");
    expect(source).toContain("responseType: 'blob'");
    expect(source).not.toContain("localStorage.getItem('token')");
    expect(source).not.toContain('Authorization');
    expect(source).not.toContain('fetch(');
  });
});
