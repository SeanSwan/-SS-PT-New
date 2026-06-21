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

const weeklyRecapSource = functionSource('getWeeklyRecap', 'getActivityFeed');

describe('gamification weekly recap controller security hardening', () => {
  it('locks the active weekly-recap route and frontend consumer', () => {
    const progressPageSource = readFrontend('src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx');
    const progressPageRecapSource = readFrontend('src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.recap.ts');
    const progressPageTestSource = readFrontend('src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.test.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/weekly-recap', authenticate, authorizeResourceAccess('userId'), gamificationController.getWeeklyRecap)");
    expect(progressPageSource).toContain('const weeklyRecapUserIdSegment = getSafeGamificationIdSegment(user.id);');
    expect(progressPageSource).toContain('loadClientWeeklyRecap(authAxios, weeklyRecapUserIdSegment)');
    expect(progressPageRecapSource).toContain('authAxios.get(');
    expect(progressPageRecapSource).toContain('`/api/gamification/users/${weeklyRecapUserIdSegment}/weekly-recap`');
    expect(progressPageTestSource).toContain('calls the canonical weekly-recap endpoint with the authenticated userId');
    expect(progressPageTestSource).toContain('reads weekly-recap from the real nested shape');
  });

  it('strictly normalizes the weekly-recap user id and keeps failures stable', () => {
    expect(weeklyRecapSource).toContain('const userId = parsePositiveInteger(req.params.userId);');
    expect(weeklyRecapSource).toContain('return sendGamificationError(res,');
    expect(weeklyRecapSource).not.toContain('parseInt(');
    expect(weeklyRecapSource).not.toContain('Number.parseInt(');
    expect(weeklyRecapSource).not.toContain('error: error.message');
    expect(weeklyRecapSource).not.toContain('safeError(req, error)');
  });

  it('reads current total XP from the central point ledger balance', () => {
    expect(weeklyRecapSource).toContain('const latestPointBalance = await PointTransaction.findOne({');
    expect(weeklyRecapSource).toContain("attributes: ['balance']");
    expect(weeklyRecapSource).toContain("order: [['createdAt', 'DESC'], ['id', 'DESC']]");
    expect(weeklyRecapSource).toContain('totalXP: latestPointBalance?.balance || 0');
    expect(weeklyRecapSource).not.toContain("attributes: ['streakCount', 'longestStreak', 'level', 'currentTier', 'totalXP']");
    expect(weeklyRecapSource).not.toContain('gamRecord?.totalXP || 0');
  });
});
