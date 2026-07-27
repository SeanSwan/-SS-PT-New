import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const activeRouteSource = readBackend('../../routes/gamificationV1Routes.mjs');
const legacyRoutePath = resolve(__dirname, '../../routes/gamificationRoutes.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const leaderboardSource = functionSource('getLeaderboard', 'awardPoints');

describe('legacy gamification leaderboard controller hardening', () => {
  it('removes the dormant legacy route file and keeps v1 as the canonical leaderboard surface', () => {
    // gamificationRoutes.mjs was unmounted dead code (core/routes.mjs never mounted it)
    // carrying a missing-ownership IDOR pattern on its write routes. It has been deleted
    // so it can never be re-armed; gamificationV1Routes owns all live gamification traffic.
    expect(existsSync(legacyRoutePath), 'legacy gamificationRoutes.mjs should be deleted').toBe(false);
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).not.toContain("app.use('/api/gamification', gamificationRoutes)");
    expect(activeRouteSource).toContain("router.get('/leaderboard', authenticate, requireProfileReader, progressController.getLeaderboard)");
  });

  it('keeps the shared leaderboard controller hardened (safe parsing, no raw error disclosure)', () => {
    expect(leaderboardSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(leaderboardSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 10, 100);');
    expect(leaderboardSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(leaderboardSource).toContain('return sendGamificationError(res, \'Failed to get leaderboard\');');
    expect(leaderboardSource).not.toContain('parseInt(');
    expect(leaderboardSource).not.toContain('safeError(req, error)');
    expect(leaderboardSource).not.toContain('error: error.message');
  });
});
