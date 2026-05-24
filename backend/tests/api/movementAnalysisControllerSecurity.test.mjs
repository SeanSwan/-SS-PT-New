import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/movementAnalysisController.mjs');

describe('movement analysis controller security hardening', () => {
  it('locks the live movement-analysis mount and active dashboard consumers', () => {
    const coreRoutesSource = readBackend('../../core/routes.mjs');
    const wizardSource = readFrontend('src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx');
    const trainerAssessmentsSource = readFrontend('src/components/DashBoard/Pages/trainer-dashboard/TrainerAssessmentsPage.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/movement-analysis', movementAnalysisRoutes)");
    expect(wizardSource).toContain('`/api/movement-analysis/${id}`');
    expect(wizardSource).toContain("authAxios.post<MovementAnalysisCreateResponse>('/api/movement-analysis', payload)");
    expect(trainerAssessmentsSource).toContain("authAxios.post('/api/movement-analysis', payload)");
    expect(trainerAssessmentsSource).toContain("authAxios.get('/api/movement-analysis')");
  });

  it('does not echo raw create/update exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendInternalError =');
    expect(controllerSource).not.toContain("message: error.message || 'Failed to create assessment'");
    expect(controllerSource).not.toContain("message: error.message || 'Failed to update assessment'");
  });

  it('strictly normalizes list pagination and user-link ids', () => {
    expect(controllerSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(controllerSource).toContain('limit: normalizedLimit');
    expect(controllerSource).toContain('const parsedUserId = parsePositiveInteger(userId);');
    expect(controllerSource).toContain('where: { userId: parsedUserId }');
    expect(controllerSource).toContain("await analysis.update({ userId: parsedUserId, status: 'linked' });");
    expect(controllerSource).not.toContain('Number(page)');
    expect(controllerSource).not.toContain('Number(limit)');
  });
});
