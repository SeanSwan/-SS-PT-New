/**
 * Surface-classification + hardening lock for gamification.
 *
 * UPDATED 2026-07-27 (launch audit): this file used to read
 * `routes/gamificationRoutes.mjs` and assert its mount was commented out. That
 * legacy module has been DELETED — its mount had been commented out at
 * core/routes.mjs:105 while a stale comment claimed it was "kept for backward
 * compatibility", which sent a security audit chasing a file no request could
 * reach. The assertions below now lock the STRONGER guarantee: the legacy
 * module does not exist at all, and v1 owns /api/gamification outright.
 *
 * The controller-hardening assertions are unchanged and still load-bearing —
 * gamificationController.mjs remains live via gamificationV1Routes.mjs:12.
 */
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
  it('gives v1 outright ownership of /api/gamification', () => {
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(activeRouteSource).toContain("router.get('/leaderboard', authenticate, requireProfileReader, progressController.getLeaderboard)");
  });

  // A commented-out mount is not inertness — it is a trap that reads as live
  // code. The legacy modules are gone, and must not come back.
  it('keeps the deleted legacy gamification modules deleted', () => {
    expect(existsSync(resolve(__dirname, '../../routes/gamificationRoutes.mjs'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../routes/gamificationApiRoutes.mjs'))).toBe(false);
  });

  it('carries no resurrected legacy gamification mount, live or commented', () => {
    expect(coreRoutesSource).not.toContain("app.use('/api/gamification', gamificationRoutes)");
    expect(coreRoutesSource).not.toContain("app.use('/api/gamification', gamificationApiRoutes)");
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
