import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('universal schedule service auth pipeline', () => {
  it('covers mounted schedule routes backed by sessions and user credit APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const sessionsRoutesSource = readSource('backend/routes/sessions.mjs');
    const userRoutesSource = readSource('backend/routes/userRoutes.mjs');

    expect(layoutSource).toContain("import UniversalSchedule from '../Schedule/UniversalSchedule'");
    expect(layoutSource).toContain("{ path: '/master-schedule', component: UniversalSchedule");
    expect(layoutSource).toContain("{ path: '/schedule', component: UniversalSchedule");
    expect(scheduleSource).toContain("import { universalMasterScheduleService } from '../../services/universal-master-schedule-service'");
    expect(scheduleSource).toContain("import { useSessionCredits } from './hooks/useSessionCredits'");

    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/user', userRoutes)");
    expect(sessionsRoutesSource).toContain('router.get("/", protect');
    expect(sessionsRoutesSource).toContain('router.post("/", protect');
    expect(sessionsRoutesSource).toContain('router.get("/stats"');
    expect(sessionsRoutesSource).toContain('router.post("/check-conflicts"');
    expect(sessionsRoutesSource).toContain('router.post("/recurring"');
    expect(sessionsRoutesSource).toContain('router.get("/users/trainers"');
    expect(sessionsRoutesSource).toContain('router.get("/users/clients"');
    expect(userRoutesSource).toContain("router.get('/credits'");
  });

  it('keeps the central schedule service and credit hook on the shared API service', () => {
    const serviceSource = readSource('frontend/src/services/universal-master-schedule-service.ts');
    const creditsSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionCredits.ts');
    const combinedSource = `${serviceSource}\n${creditsSource}`;

    expect(serviceSource).toContain("import apiService from './api.service'");
    expect(serviceSource).toContain('private api = apiService');
    expect(serviceSource).not.toContain('createApiClient');
    expect(serviceSource).not.toContain('axios.create');

    expect(creditsSource).toContain("import apiService from '../../../services/api.service'");
    expect(creditsSource).toContain("apiService.get('/api/user/credits')");

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('fetch(');
    expect(combinedSource).not.toContain('VITE_API_URL');
  });

  it('does not poll trainer/admin roster endpoints from the client schedule view', () => {
    const calendarDataSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useCalendarData.ts');

    expect(calendarDataSource).toContain("const canLoadClientRoster = user?.role === 'admin' || user?.role === 'trainer';");
    expect(calendarDataSource).toContain('if (!canLoadClientRoster) {');
    expect(calendarDataSource).toContain('setLoading(prev => ({ ...prev, clients: false }));');
    expect(calendarDataSource).toContain('setLoading(prev => ({ ...prev, assignments: false }));');
    expect(calendarDataSource).toContain('canLoadClientRoster ? [');
    expect(calendarDataSource).toContain("dataType: 'clients'");
    expect(calendarDataSource).toContain("dataType: 'assignments'");
  });
});
