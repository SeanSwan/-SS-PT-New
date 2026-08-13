import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('marketing workspace auth pipeline', () => {
  it('covers the mounted marketing workspace and backend publishing/calendar APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const routeComponentsSource = readSource(
      'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx',
    );
    const dashboardRoutesSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx');
    const analyticsSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialAnalyticsDashboard.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const socialRoutesSource = readSource('backend/routes/adminSocialPublishingRoutes.mjs');
    const calendarRoutesSource = readSource('backend/routes/adminMarketingCalendarRoutes.mjs');

    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain(
      "export const MarketingWorkspace = React.lazy(() => import('./workspaces/MarketingWorkspace'))",
    );
    expect(dashboardRoutesSource).toContain("{ path: '/marketing', component: MarketingWorkspace");
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
    const publishHookSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/useSocialPublish.ts');
    const calendarApiSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/MarketingCalendar.api.ts');
    const analyticsSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialAnalyticsDashboard.tsx');
    const connectSource = readSource('frontend/src/components/DashBoard/workspaces/marketing/SocialConnectPanel.tsx');
    // The hook is part of the combined surface: the publish/compliance/retry
    // calls moved into it, so leaving it out would let a raw fetch() or a
    // hand-rolled Authorization header slip past the checks at the bottom of
    // this test — the very calls those checks exist to police.
    const combinedSource = `${generatorSource}\n${publishHookSource}\n${calendarApiSource}\n${analyticsSource}\n${connectSource}`;

    expect(generatorSource).toContain("import apiService from '../../../../services/api.service'");
    expect(generatorSource).toContain("apiService.get('/api/admin/social-publishing/health')");
    expect(generatorSource).toContain("apiService.get('/api/admin/social-publishing/accounts')");
    // RE-ANCHORED: the publish and compliance calls moved into useSocialPublish
    // when the composer hit the 300-line rule and could not grow a retry
    // affordance. The assertions follow them to their new home rather than
    // being relaxed — and they now also pin the retry route, so this test
    // covers MORE of the publishing surface than it did before the move.
    expect(publishHookSource).toContain("import apiService from '../../../../services/api.service'");
    expect(publishHookSource).toContain("apiService.post('/api/admin/social-publishing/compliance-check'");
    expect(publishHookSource).toContain("apiService.post('/api/admin/social-publishing/publish'");
    expect(publishHookSource).toContain('apiService.post(`/api/admin/social-publishing/publish/${target.jobId}/retry`)');
    // The composer must reach the API only through the hook — a direct publish
    // call reappearing here would bypass the draft-safety choke point.
    expect(generatorSource).toContain("import { useSocialPublish } from './useSocialPublish'");
    expect(generatorSource).not.toContain("apiService.post('/api/admin/social-publishing/publish'");

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
