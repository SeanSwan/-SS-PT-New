import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/challengeController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('challenge controller security hardening', () => {
  it('locks the active gamification challenge API and frontend consumers', () => {
    const adminGamificationSource = readFrontend(
      'src/components/DashBoard/Pages/admin-clients/components/GamificationOverview.tsx',
    );
    const useChallengesSource = readFrontend('src/hooks/useChallenges.ts');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/challenges', challengeController.getAllChallenges)");
    expect(routeSource).toContain("router.post('/challenges/:id/join', authenticate, requireUser, challengeController.joinChallenge)");
    expect(routeSource).toContain("router.get('/users/:userId/challenges', authenticate, authorizeResourceAccess('userId'), challengeController.getUserChallenges)");
    expect(adminGamificationSource).toContain("authAxios.get('/api/v1/gamification/challenges'");
    expect(adminGamificationSource).toContain('`/api/v1/gamification/users/${clientId}/challenges`');
    expect(useChallengesSource).toContain("apiService.get('/api/v1/gamification/challenges'");
  });

  it('does not echo raw challenge exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendChallengeError =');
    expect(controllerSource).not.toContain('error: error.message');
  });

  it('strictly normalizes challenge pagination, leaderboard limits, and difficulty filters', () => {
    expect(controllerSource).toContain('const normalizedDifficulty = parseOptionalBoundedPositiveInteger(difficulty, 1, 5);');
    expect(controllerSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(controllerSource).toContain('whereClause.difficulty = normalizedDifficulty;');
    expect(controllerSource).toContain('limit: normalizedLimit');
    expect(controllerSource).toContain('page: normalizedPage');
    expect(controllerSource).not.toContain('parseInt(');
  });
});
