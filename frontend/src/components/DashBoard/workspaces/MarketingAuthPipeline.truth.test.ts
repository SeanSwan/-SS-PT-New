import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('marketing workspace auth pipeline', () => {
  it('covers the mounted marketing workspace and backend publishing/calendar APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx');
    const analyticsSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialAnalyticsDashboard.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const socialRoutesSource = readSource('backend/routes/adminSocialPublishingRoutes.mjs');
    const calendarRoutesSource = readSource('backend/routes/adminMarketingCalendarRoutes.mjs');

    expect(layoutSource).toContain("const MarketingWorkspace = React.lazy(() => import('./workspaces/MarketingWorkspace'))");
    expect(layoutSource).toContain("{ path: '/marketing', component: MarketingWorkspace");
    expect(workspaceSource).toContain("const SocialPostGenerator = lazy(() => import('./marketing/SocialPostGenerator'))");
    expect(workspaceSource).toContain("const MarketingCalendar = lazy(() => import('./marketing/MarketingCalendar'))");
    expect(workspaceSource).toContain("const SocialAnalyticsDashboard = lazy(() => import('./marketing/SocialAnalyticsDashboard'))");
    expect(analyticsSource).toContain("import SocialConnectPanel from './SocialConnectPanel'");

    expect(coreRoutesSource).toContain("app.use('/api/admin/social-publishing', adminSocialPublishingRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin/marketing-calendar', adminMarketingCalendarRoutes)");
    expect(socialRoutesSource).toContain("router.get('/health'");
    expect(socialRoutesSource).toContain("router.get('/accounts'");
    expect(socialRoutesSource).toContain("router.post('/connect/:platform'");
    expect(socialRoutesSource).toContain("router.delete('/accounts/:integrationId'");
    expect(socialRoutesSource).toContain("router.post('/compliance-check'");
    expect(socialRoutesSource).toContain("router.post('/publish'");
    expect(socialRoutesSource).toContain("router.get('/history'");
    expect(calendarRoutesSource).toContain("router.get('/'");
    expect(calendarRoutesSource).toContain("router.post('/'");
    expect(calendarRoutesSource).toContain("router.put('/:id'");
  });

  it('keeps active marketing calls on the shared API service', () => {
    const generatorSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialPostGenerator.tsx');
    const calendarApiSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/MarketingCalendar.api.ts');
    const analyticsSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialAnalyticsDashboard.tsx');
    const connectSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialConnectPanel.tsx');
    const combinedSource = `${generatorSource}\n${calendarApiSource}\n${analyticsSource}\n${connectSource}`;

    expect(generatorSource).toContain("import apiService from '../../../../services/api.service'");
    expect(generatorSource).toContain("apiService.get('/api/admin/social-publishing/health')");
    expect(generatorSource).toContain("apiService.get('/api/admin/social-publishing/accounts')");
    expect(generatorSource).toContain("apiService.post('/api/admin/social-publishing/compliance-check'");
    expect(generatorSource).toContain("apiService.post('/api/admin/social-publishing/publish'");

    expect(calendarApiSource).toContain("import apiService from '../../../../services/api.service'");
    expect(calendarApiSource).toContain('apiService.get(`${API_PATH}?${params.toString()}`)');
    expect(calendarApiSource).toContain('apiService.post(API_PATH, payload)');
    expect(calendarApiSource).toContain('apiService.put(`${API_PATH}/${id}`, payload)');

    expect(analyticsSource).toContain("import apiService from '../../../../services/api.service'");
    expect(analyticsSource).toContain("apiService.get('/api/admin/social-publishing/health')");
    expect(analyticsSource).toContain("apiService.get('/api/admin/social-publishing/accounts')");
    expect(analyticsSource).toContain("apiService.get('/api/admin/social-publishing/history')");
    expect(analyticsSource).toContain('apiService.delete(`/api/admin/social-publishing/accounts/${integrationId}`)');

    expect(connectSource).toContain("import apiService from '../../../../services/api.service'");
    expect(connectSource).toContain("apiService.post('/api/admin/social-publishing/connect/bluesky'");
    expect(connectSource).toContain('apiService.post(`/api/admin/social-publishing/connect/${platform}`)');

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('getAuthHeaders');
    expect(combinedSource).not.toContain('fetch(');
    expect(combinedSource).not.toContain('Authorization');
  });
});
