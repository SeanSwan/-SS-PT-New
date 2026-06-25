import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/sprintRoutes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('sprint routes security hardening', () => {
  it('locks the mounted Sprint Planner API and active frontend consumer', () => {
    const dashboardRoutesSource = readFrontend('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const hookSource = readFrontend('src/hooks/useSprintAPI.ts');

    expect(coreRoutesSource).toContain("app.use('/api/bootcamp/sprints', sprintRoutes)");
    expect(dashboardRoutesSource).toContain("{ path: '/sprint-planner', component: SprintPlannerPage");
    expect(hookSource).toContain("apiService.post('/api/bootcamp/sprints'");
    expect(hookSource).toContain('fetch(`/api/bootcamp/sprints/${sprintId}/generate`');
    expect(routeSource).toContain("router.post('/:id/generate'");
    expect(routeSource).toContain("router.post('/:sprintId/slots/:slotId/regenerate'");
  });

  it('does not echo service or generator exception details to sprint clients', () => {
    expect(routeSource).toContain("const SPRINT_INTERNAL_ERROR = 'internal_error';");
    expect(routeSource).toContain('const sendSprintRouteError =');
    expect(routeSource).toContain("sendSprintEventError(sendEvent, 'Sprint generation failed')");
    expect(routeSource).not.toContain('json({ success: false, error: err.message })');
    expect(routeSource).not.toContain("sendEvent({ type: 'error', error: err.message })");
  });
});
