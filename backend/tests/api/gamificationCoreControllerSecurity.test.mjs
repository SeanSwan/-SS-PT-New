import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const profileSource = functionSource('getUserProfile', 'getLeaderboard');
const awardPointsSource = functionSource('awardPoints', 'getAllAchievements');
const transactionsSource = functionSource('getUserTransactions', 'recordWorkoutCompletion');
const activityFeedSource = functionSource('getActivityFeed', 'getComebackChallenge');

describe('core gamification controller security hardening', () => {
  it('locks the active profile, transaction, and activity-feed route wiring', () => {
    const gamificationHookSource = readFrontend('src/hooks/gamification/useGamificationData.ts');
    const clientDashboardSource = readFrontend('src/hooks/useClientDashboardMcp.ts');
    const profileHookSource = readFrontend('src/hooks/useGamificationProfile.ts');
    const recentActivitySource = readFrontend('src/components/DashBoard/Pages/admin-dashboard/components/RecentActivityFeed.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/profile', authenticate, requireUser, viewAsGuard, (req, res) => {");
    expect(routeSource).toContain('req.params.userId = getEffectiveReadUserId(req);');
    expect(routeSource).toContain("router.get('/users/:userId/profile', authenticate, authorizeResourceAccess('userId'), gamificationController.getUserProfile)");
    expect(routeSource).toContain("router.get('/users/:userId/transactions', authenticate, authorizeResourceAccess('userId'), gamificationController.getUserTransactions)");
    expect(routeSource).toContain("router.get('/activity-feed', authenticate, requireUser, gamificationController.getActivityFeed)");
    expect(gamificationHookSource).toContain("authAxios.get('/api/v1/gamification/profile'");
    expect(clientDashboardSource).toContain("apiService.get('/api/v1/gamification/profile')");
    expect(profileHookSource).toContain('`/api/v1/gamification/users/${targetUserId}/profile`');
    expect(recentActivitySource).toContain("authAxios.get('/api/gamification/activity-feed'");
  });

  it('uses stable client-facing errors for profile failures', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendGamificationError =');
    expect(profileSource).toContain('sendGamificationError(res,');
    expect(profileSource).not.toContain('error: error.message');
  });

  it('strictly normalizes profile and transaction user ids', () => {
    expect(controllerSource).toContain('const parsePositiveInteger =');
    expect(controllerSource).toContain('const parseBoundedPositiveInteger =');
    expect(profileSource).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(profileSource).toContain('User.findByPk(normalizedUserId');
    expect(profileSource).toContain('where: { userId: normalizedUserId }');
    expect(transactionsSource).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(transactionsSource).toContain('const whereClause = { userId: normalizedUserId };');
  });

  it('strictly normalizes transaction and activity-feed pagination', () => {
    expect(transactionsSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(transactionsSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 100);');
    expect(transactionsSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(transactionsSource).toContain('limit: normalizedLimit');
    expect(transactionsSource).toContain('page: normalizedPage');
    expect(transactionsSource).not.toContain('parseInt(');
    expect(activityFeedSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 50);');
    expect(activityFeedSource).toContain('limit: normalizedLimit');
    expect(activityFeedSource).not.toContain('parseInt(');
  });

  it('keeps active point mutation, transaction, and feed failures stable', () => {
    expect(awardPointsSource).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(awardPointsSource).toContain('userId: normalizedUserId,');
    expect(awardPointsSource).not.toContain('message: error.message');
    expect(awardPointsSource).toContain("return sendGamificationError(res, 'Failed to award points');");
    expect(transactionsSource).toContain("return sendGamificationError(res, 'Failed to get user transactions');");
    expect(activityFeedSource).toContain("return sendGamificationError(res, 'Failed to get activity feed');");
    expect([awardPointsSource, transactionsSource, activityFeedSource].join('\n')).not.toContain('safeError(req, error)');
  });
});
