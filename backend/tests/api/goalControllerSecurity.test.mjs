import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/goalController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('goal controller security and route hardening', () => {
  it('locks the active gamification goal routes and frontend callers', () => {
    const useUserGoalsSource = readFrontend('src/hooks/useUserGoals.ts');
    const gamificationSliceSource = readFrontend('src/redux/slices/gamificationSlice.ts');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/goals', authenticate, authorizeResourceAccess('userId'), goalController.getUserGoals)");
    expect(routeSource).toContain("router.post('/users/:userId/goals', authenticate, authorizeResourceAccess('userId'), goalController.createGoal)");
    expect(routeSource).toContain("router.post('/goals', authenticate, requireUser, goalController.createGoal)");
    expect(useUserGoalsSource).toContain('apiService.get(`/api/v1/gamification/users/${targetUserId}/goals`)');
    expect(gamificationSliceSource).toContain('fetch(`/api/v1/gamification/users/${userId}/goals`)');
  });

  it('uses strict goal list pagination and non-parseInt category totals', () => {
    expect(controllerSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(controllerSource).toContain('limit: normalizedLimit');
    expect(controllerSource).toContain('page: normalizedPage');
    expect(controllerSource).toContain('const total = toNonNegativeNumber(stat.total);');
    expect(controllerSource).toContain('const completed = toNonNegativeNumber(stat.completed);');
    expect(controllerSource).not.toContain('parseInt(');
  });

  it('creates goals for the authorized route target when a user-scoped route is used', () => {
    expect(controllerSource).toContain('const goalOwnerId = parsePositiveInteger(req.params.userId ?? req.user?.id);');
    expect(controllerSource).toContain('userId: goalOwnerId');
    expect(controllerSource).not.toContain('const userId = req.user.id;');
  });
});
