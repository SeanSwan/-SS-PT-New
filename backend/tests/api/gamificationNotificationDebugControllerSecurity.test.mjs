import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const notificationSource = functionSource('markNotificationAsRead', 'debugSeedAchievements');
const seedSource = functionSource('debugSeedAchievements', 'getStreakFreezeStatus');

describe('gamification notification and debug controller security hardening', () => {
  it('locks the active notification and admin seed route wiring', () => {
    expect(routeSource).toContain("router.patch('/notifications/:notificationId/read', authenticate, requireUser, gamificationController.markNotificationAsRead)");
    expect(routeSource).toContain("router.post('/admin/seed-achievements', authenticate, requireAdmin, gamificationController.debugSeedAchievements)");
  });

  it('keeps notification failures stable', () => {
    expect(notificationSource).toContain("return sendGamificationError(res, 'Failed to mark notification as read');");
    expect(notificationSource).not.toContain('error: error.message');
    expect(notificationSource).not.toContain('safeError(req, error)');
  });

  it('keeps admin seeder failures free of paths, stacks, and raw exception messages', () => {
    expect(seedSource).toContain("return sendGamificationError(res, 'Failed to seed achievements');");
    expect(seedSource).toContain("error: INTERNAL_ERROR");
    expect(seedSource).not.toContain('error: error.message');
    expect(seedSource).not.toContain('stack: error.stack');
    expect(seedSource).not.toContain('seederErr.message');
    expect(seedSource).not.toContain('seederErr.stack');
    expect(seedSource).not.toContain('colErr.message');
    expect(seedSource).not.toContain('Seeder path: ${seederPath}');
  });
});
