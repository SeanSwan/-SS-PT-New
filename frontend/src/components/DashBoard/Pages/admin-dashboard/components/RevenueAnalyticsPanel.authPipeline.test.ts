import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('RevenueAnalyticsPanel auth pipeline', () => {
  it('is mounted as the admin revenue analytics route and backed by finance APIs', () => {
    const routeComponentsSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
    const dashboardRoutesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const backendMounts = readSource('../backend/core/routes.mjs');
    const analyticsRoutes = readSource('../backend/routes/admin/analyticsRevenueRoutes.mjs');
    const financeRoutes = readSource('../backend/routes/admin/adminFinanceRoutes.mjs');

    expect(routeComponentsSource).toContain(
      "export const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'))"
    );
    expect(dashboardRoutesSource).toContain("{ path: '/revenue', component: RevenueAnalyticsPanel");
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

  it('keeps the revenue surface split into bounded, testable files', () => {
    const component = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.tsx');
    const sections = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.sections.tsx');
    const styles = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.styles.ts');
    const feedbackStyles = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.feedbackStyles.ts');
    const chartConfig = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.chartConfig.ts');
    const types = readSource('src/components/DashBoard/Pages/admin-dashboard/components/RevenueAnalyticsPanel.types.ts');

    expect(component).toContain("from './RevenueAnalyticsPanel.sections'");
    expect(component).toContain("from './RevenueAnalyticsPanel.styles'");
    expect(component).toContain("from './RevenueAnalyticsPanel.types'");
    expect(component).not.toContain("from 'styled-components'");
    expect(component).not.toContain("from 'victory'");

    expect(styles).toContain("from 'styled-components'");
    expect(feedbackStyles).toContain("from 'styled-components'");
    expect(sections).toContain("from 'victory'");
    expect(sections).toContain("from './RevenueAnalyticsPanel.chartConfig'");

    [component, sections, styles, feedbackStyles, chartConfig, types].forEach((source) => {
      expect(lineCount(source)).toBeLessThanOrEqual(300);
    });
  });
});
