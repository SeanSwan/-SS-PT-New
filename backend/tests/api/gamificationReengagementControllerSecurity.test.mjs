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

const streakStatusSource = functionSource('getStreakFreezeStatus', 'useStreakFreeze');
const useStreakSource = functionSource('useStreakFreeze', 'getWeeklyRecap');
const comebackStatusSource = functionSource('getComebackChallenge', 'acceptComebackChallenge');
const acceptComebackSource = functionSource('acceptComebackChallenge', 'getAegisHud');

describe('gamification re-engagement controller security hardening', () => {
  it('locks the active streak-freeze and comeback challenge route wiring', () => {
    const comebackBannerSource = readFrontend('src/components/Celebrations/ComebackBanner.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/streak-freeze/:userId', authenticate, authorizeResourceAccess('userId'), gamificationController.getStreakFreezeStatus)");
    expect(routeSource).toContain("router.post('/streak-freeze/use', authenticate, requireUser, gamificationController.useStreakFreeze)");
    expect(routeSource).toContain("router.get('/comeback-challenge/:userId', authenticate, authorizeResourceAccess('userId'), gamificationController.getComebackChallenge)");
    expect(routeSource).toContain("router.post('/comeback-challenge/accept', authenticate, requireUser, gamificationController.acceptComebackChallenge)");
    expect(comebackBannerSource).toContain('onAccept: (challengeId: number) => void;');
  });

  it('uses guarded route ids for read endpoints and authenticated actor ids for writes', () => {
    expect(streakStatusSource).toContain('const userId = parsePositiveInteger(req.params.userId ?? req.user?.id);');
    expect(comebackStatusSource).toContain('const userId = parsePositiveInteger(req.params.userId ?? req.user?.id);');
    expect(useStreakSource).toContain('const userId = parsePositiveInteger(req.user?.id);');
    expect(acceptComebackSource).toContain('const userId = parsePositiveInteger(req.user?.id);');
    expect(acceptComebackSource).toContain('const challengeId = parsePositiveInteger(req.body.challengeId);');
    expect(useStreakSource).not.toContain('req.body.userId');
    expect(acceptComebackSource).not.toContain('req.body.userId');
  });

  it('does not use permissive integer parsing or raw exception responses in these handlers', () => {
    const combined = [
      streakStatusSource,
      useStreakSource,
      comebackStatusSource,
      acceptComebackSource
    ].join('\n');

    expect(combined).not.toContain('parseInt(');
    expect(combined).not.toContain('Number.parseInt(');
    expect(combined).not.toContain('error: error.message');
    expect(combined).toContain('sendGamificationError(res,');
  });
});
