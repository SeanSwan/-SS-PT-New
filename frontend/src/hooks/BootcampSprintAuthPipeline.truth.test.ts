import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('bootcamp and sprint planner auth pipeline', () => {
  it('covers mounted bootcamp and sprint planner routes backed by bootcamp APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const routeComponentsSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
    const dashboardRoutesSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const bootcampPageSource = readSource('frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx');
    const sprintPageSource = readSource('frontend/src/components/SprintPlanner/SprintPlannerPage.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const bootcampRoutesSource = readSource('backend/routes/bootcampRoutes.mjs');
    const sprintRoutesSource = readSource('backend/routes/sprintRoutes.mjs');
    // R-H04 (slice D) moved the stream route into its own module (rule 4 cap).
    const sprintStreamSource = readSource('backend/routes/sprintStream.mjs');

    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain("export const BootcampBuilderPage = React.lazy(() => import('../BootcampBuilder/BootcampBuilderPage'))");
    expect(routeComponentsSource).toContain("export const SprintPlannerPage = React.lazy(() => import('../SprintPlanner/SprintPlannerPage'))");
    expect(dashboardRoutesSource).toContain("{ path: '/bootcamp', component: BootcampBuilderPage");
    expect(dashboardRoutesSource).toContain("{ path: '/sprint-planner', component: SprintPlannerPage");
    expect(bootcampPageSource).toContain('useBootcampAPI()');
    expect(sprintPageSource).toContain('useSprintAPI()');

    expect(coreRoutesSource).toContain("app.use('/api/bootcamp', bootcampRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/bootcamp/sprints', sprintRoutes)");
    expect(bootcampRoutesSource).toContain("router.post('/generate'");
    expect(bootcampRoutesSource).toContain("router.post('/save'");
    expect(bootcampRoutesSource).toContain("router.get('/templates'");
    expect(bootcampRoutesSource).toContain("router.post('/log'");
    expect(bootcampRoutesSource).toContain("router.get('/history'");
    expect(bootcampRoutesSource).toContain("router.get('/spaces'");
    expect(bootcampRoutesSource).toContain("router.post('/spaces'");
    expect(bootcampRoutesSource).toContain("router.get('/trends'");
    expect(bootcampRoutesSource).toContain("router.post('/trends/:id/approve'");
    expect(sprintRoutesSource).toContain("router.post('/'");
    expect(sprintRoutesSource).toContain("router.get('/'");
    expect(sprintRoutesSource).toContain("router.get('/:id'");
    expect(sprintRoutesSource).toContain("router.put('/:id'");
    expect(sprintRoutesSource).toContain("router.delete('/:id'");
    expect(sprintRoutesSource).toContain("router.post('/:id/generate'");
    // The stream route is DECLARED in sprintStream.mjs and MOUNTED from
    // sprintRoutes.mjs — asserting both keeps the wiring covered after the move.
    expect(sprintStreamSource).toContain("router.get('/:id/generate/stream'");
    expect(sprintRoutesSource).toContain('registerSprintStreamRoute(router, {');
    expect(sprintRoutesSource).toContain("router.put('/:sprintId/slots/:slotId/confirm'");
    expect(sprintRoutesSource).toContain("router.post('/:sprintId/slots/:slotId/regenerate'");
  });

  it('keeps normal bootcamp and sprint calls on apiService and centralizes stream auth', () => {
    const bootcampSource = readSource('frontend/src/hooks/useBootcampAPI.ts');
    const sprintSource = readSource('frontend/src/hooks/useSprintAPI.ts');
    // The SSE transport (the one place a raw `fetch` is legitimate) moved to its
    // own module in this slice, so the contract is asserted across both files:
    // the hook must DELEGATE, and the transport must live only there.
    const sprintTransportSource = readSource('frontend/src/hooks/sprintGenerationStream.ts');
    const combinedSource = `${bootcampSource}\n${sprintSource}\n${sprintTransportSource}`;

    expect(bootcampSource).toContain("import apiService from '../services/api.service'");
    expect(bootcampSource).toContain("apiService.post<T>(url, payload)");
    expect(bootcampSource).toContain("apiService.get<T>(url)");
    expect(bootcampSource).toContain("apiService.put<T>(url, payload)");
    expect(bootcampSource).not.toContain('fetch(');

    expect(sprintSource).toContain("import apiService, { ProductionTokenManager } from '../services/api.service'");
    expect(sprintSource).toContain("apiService.post('/api/bootcamp/sprints'");
    expect(sprintSource).toContain("apiService.get('/api/bootcamp/sprints')");
    expect(sprintSource).toContain('apiService.get(`/api/bootcamp/sprints/${id}`)');
    expect(sprintSource).toContain('apiService.put(`/api/bootcamp/sprints/${id}`');
    expect(sprintSource).toContain('apiService.delete(`/api/bootcamp/sprints/${id}`)');
    expect(sprintSource).toContain('apiService.put(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/confirm`');
    expect(sprintSource).toContain('apiService.post(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/regenerate`)');
    expect(sprintSource).toContain('ProductionTokenManager.getToken()');
    expect(sprintSource).toContain('streamSprintGeneration');
    expect(sprintTransportSource).toContain('fetch(`/api/bootcamp/sprints/${sprintId}/generate/stream`');
    expect(sprintTransportSource).toContain('fetch(`/api/bootcamp/sprints/${sprintId}/generate`');

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('getAuthHeaders');
    expect(combinedSource).not.toContain('getHeaders');
    expect(combinedSource).not.toContain('API_BASE_URL');
  });
});
