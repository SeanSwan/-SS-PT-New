import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const activeRouteSource = readBackend('../../routes/gamificationV1Routes.mjs');
const legacyRouteSource = readBackend('../../routes/gamificationRoutes.mjs');

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
  it('classifies the old controller route as legacy while v1 owns active leaderboard traffic', () => {
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("// app.use('/api/gamification', gamificationRoutes);");
    expect(activeRouteSource).toContain("router.get('/leaderboard', progressController.getLeaderboard)");
    expect(legacyRouteSource).toContain("router.get('/leaderboard', gamificationController.getLeaderboard)");
  });

  it('removes permissive parsing and raw legacy error disclosure', () => {
    expect(leaderboardSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(leaderboardSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 10, 100);');
    expect(leaderboardSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(leaderboardSource).toContain('return sendGamificationError(res, \'Failed to get leaderboard\');');
    expect(leaderboardSource).not.toContain('parseInt(');
    expect(leaderboardSource).not.toContain('safeError(req, error)');
    expect(leaderboardSource).not.toContain('error: error.message');
  });
});
