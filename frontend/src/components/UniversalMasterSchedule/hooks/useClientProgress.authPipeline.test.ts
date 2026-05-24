import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('useClientProgress auth pipeline', () => {
  it('is consumed by client and trainer progress surfaces backed by client progress APIs', () => {
    const clientPanelSource = readSource('frontend/src/components/DashBoard/Pages/client-dashboard/progress/ClientProgressPanel.tsx');
    const trainerViewSource = readSource('frontend/src/components/TrainerDashboard/ClientProgress/ClientProgressView.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const progressRoutesSource = readSource('backend/routes/clientProgressApiRoutes.mjs');
    const clientDashboardRoutesSource = readSource('backend/routes/clientDashboardRoutes.mjs');

    expect(clientPanelSource).toContain("} from '../../../../UniversalMasterSchedule/hooks/useClientProgress'");
    expect(clientPanelSource).toContain('useClientProgress(resolvedUserId, isClient)');
    expect(trainerViewSource).toContain("from '../../UniversalMasterSchedule/hooks/useClientProgress'");
    expect(trainerViewSource).toContain('useClientProgress(resolvedClientId, true)');

    expect(coreRoutesSource).toContain("app.use('/api/client', clientDashboardRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/client', clientProgressApiRoutes)");
    expect(clientDashboardRoutesSource).toContain("router.get('/progress'");
    expect(progressRoutesSource).toContain("router.get('/:userId/progress', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientProgress)");
  });

  it('loads progress through the shared API service auth pipeline', () => {
    const hookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useClientProgress.ts');

    expect(hookSource).toContain("import apiService from '../../../services/api.service';");
    expect(hookSource).toContain("apiService.get(`/api/client/${userId}/progress`)");
    expect(hookSource).not.toContain("localStorage.getItem('token')");
    expect(hookSource).not.toContain('Authorization');
    expect(hookSource).not.toContain('fetch(');
    expect(hookSource).not.toContain('VITE_API_BASE_URL');
  });
});
