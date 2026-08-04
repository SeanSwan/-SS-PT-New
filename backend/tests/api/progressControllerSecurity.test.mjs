import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/progressController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('progress controller security hardening', () => {
  it('locks the active gamification progress and leaderboard routes', () => {
    const dashboardQueriesSource = readFrontend('src/hooks/useDashboardQueries.ts');
    const gamificationHookSource = readFrontend('src/hooks/gamification/useGamificationData.ts');
    const gamificationSliceSource = readFrontend('src/redux/slices/gamificationSlice.ts');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/stats', authenticate, authorizeResourceAccess('userId'), progressController.getUserStats)");
    expect(routeSource).toContain("router.get('/users/:userId/progress', authenticate, authorizeResourceAccess('userId'), progressController.getUserProgress)");
    expect(routeSource).toContain("router.post('/users/:userId/progress', authenticate, authorizeResourceAccess('userId'), progressController.recordProgressEntry)");
    expect(routeSource).toContain("router.get('/users/:userId/insights', authenticate, authorizeResourceAccess('userId'), progressController.getProgressInsights)");
    expect(routeSource).toContain("router.get('/leaderboard', authenticate, requireProfileReader, progressController.getLeaderboard)");
    expect(dashboardQueriesSource).toContain("authAxios.get('/api/v1/gamification/leaderboard'");
    expect(gamificationHookSource).toContain("authAxios.get('/api/v1/gamification/leaderboard'");
    expect(gamificationSliceSource).toContain('fetch(`/api/v1/gamification/users/${userId}/progress');
  });

  it('does not echo raw progress exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendProgressError =');
    expect(controllerSource).not.toContain('error: error.message');
    expect(controllerSource).not.toContain('error: req.user?.role ===');
  });

  it('strictly normalizes progress and leaderboard result limits', () => {
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 100, 500);');
    expect(controllerSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 100);');
    // The raw offset is still derived from the normalized page/limit, but a
    // member's reachable window is then CAPPED — an uncapped offset let any
    // authenticated account page the whole user table.
    expect(controllerSource).toContain('const rawOffset = (normalizedPage - 1) * normalizedLimit;');
    expect(controllerSource).toContain('MEMBER_MAX_ROWS');
    expect(controllerSource).toMatch(/offset = isStaffViewer\s*\?\s*rawOffset/);
    expect(controllerSource).toContain('limit: normalizedLimit');
    // `page` is no longer echoed back verbatim: a member's offset is clamped,
    // so reporting the REQUESTED page told them they were reading page 7 while
    // they were served rows 1-100. Staff still get the true page.
    expect(controllerSource).toContain('page: isStaffViewer ? normalizedPage :');
    expect(controllerSource).not.toContain('parseInt(');
  });
});
