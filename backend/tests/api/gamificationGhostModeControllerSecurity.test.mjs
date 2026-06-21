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
const ghostServiceSource = readBackend('../../services/gamification/GhostModeService.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const getGhostSource = functionSource('getGhost', 'compareGhost');
const compareGhostSource = functionSource('compareGhost', 'getGhostConfig');

describe('gamification ghost mode controller security hardening', () => {
  it('locks the active ghost mode route wiring and frontend consumer', () => {
    const authPipelineTest = readFrontend('src/components/AdvancedGamification/AdvancedGamificationAuthPipeline.truth.test.ts');
    const ghostHookSource = readFrontend('src/components/AdvancedGamification/components/GhostMode/useGhostMode.ts');

    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/ghost/config', authenticate, requireUser, gamificationController.getGhostConfig)");
    expect(routeSource).toContain("router.get('/users/:userId/ghost', authenticate, authorizeResourceAccess('userId'), gamificationController.getGhost)");
    expect(routeSource).toContain("router.post('/users/:userId/ghost/compare', authenticate, authorizeResourceAccess('userId'), gamificationController.compareGhost)");
    expect(ghostHookSource).toContain('authAxios.get(`${API_BASE}/ghost/config`)');
    expect(ghostHookSource).toContain('getGamificationUserPath(userId, `/ghost${query ? `?${query}` : \'\'}`)');
    expect(ghostHookSource).toContain('authAxios.get(url)');
    expect(ghostHookSource).toContain("getGamificationUserPath(userId, '/ghost/compare')");
    expect(ghostHookSource).toContain('authAxios.post(`${API_BASE}${comparePath}`');
    expect(authPipelineTest).toContain('mounts V1 backend routes for active ghost mode endpoints');
  });

  it('strictly normalizes ghost mode route ids and keeps failures stable', () => {
    [getGhostSource, compareGhostSource].forEach((source) => {
      expect(source).toContain('const userId = parsePositiveInteger(req.params.userId);');
      expect(source).toContain('return sendGamificationError(res,');
      expect(source).not.toContain('parseInt(');
      expect(source).not.toContain('safeError(req, error)');
      expect(source).not.toContain('error: error.message');
    });
  });

  it('keeps client-submitted ghost comparison cosmetic-only until server verified by workout session', () => {
    expect(compareGhostSource).toContain("comparison.rewardMode = 'cosmetic_only';");
    expect(compareGhostSource).toContain("comparison.trustStatus = 'client_submitted_comparison';");
    expect(compareGhostSource).toContain('comparison.bonusXP = 0;');
    expect(compareGhostSource).not.toContain('GamificationPointsService.recordLedgerEntry({');
    expect(compareGhostSource).not.toContain("description: 'Ghost mode bonus XP'");
    expect(compareGhostSource).not.toContain("reason: 'ghost_mode_compare'");
    expect(compareGhostSource).not.toContain('idempotencyKey: `ghost:${userId}:${ghostComparisonKey}`');
    expect(compareGhostSource).not.toContain('maxPoints: Number.MAX_SAFE_INTEGER');
    expect(controllerSource).not.toContain('const buildGhostComparisonKey =');
    expect(compareGhostSource).not.toContain('record.update({ totalXP:');
    expect(ghostServiceSource).toContain('const GHOST_REWARD_MODE = \'cosmetic_only\';');
    expect(ghostServiceSource).toContain('const GHOST_REWARD_TRUST = \'client_submitted_comparison\';');
    expect(ghostServiceSource).toMatch(/ghost_defeated:\s*0/);
    expect(ghostServiceSource).toMatch(/ghost_crushed:\s*0/);
    expect(ghostServiceSource).toMatch(/ghost_dominated:\s*0/);
    expect(ghostServiceSource).toMatch(/ghost_matched:\s*0/);
    expect(ghostServiceSource).not.toContain('earn bonus XP');
  });
});
