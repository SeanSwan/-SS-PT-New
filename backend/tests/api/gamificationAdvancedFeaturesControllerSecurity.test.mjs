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

const getAegisSource = functionSource('getAegisHud', 'replenishAegisHud');
const replenishAegisSource = functionSource('replenishAegisHud', 'setAegisHudNeed');
const setAegisNeedSource = functionSource('setAegisHudNeed', 'rollVaultDrop');
const setJobClassSource = functionSource('setJobClass', 'getJobClass');
const getJobClassSource = functionSource('getJobClass', 'getAegisHudConfig');

describe('advanced gamification controller security hardening', () => {
  it('locks the active Aegis HUD and job-class route wiring and frontend consumers', () => {
    const authPipelineTest = readFrontend('src/components/AdvancedGamification/AdvancedGamificationAuthPipeline.truth.test.ts');
    const aegisHookSource = readFrontend('src/components/AdvancedGamification/components/AegisHud/useAegisHud.ts');
    const jobSelectorSource = readFrontend('src/components/AdvancedGamification/components/JobClassSelector/JobClassSelector.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/aegis-hud', authenticate, authorizeResourceAccess('userId'), gamificationController.getAegisHud)");
    expect(routeSource).toContain("router.post('/users/:userId/aegis-hud/replenish', authenticate, authorizeResourceAccess('userId'), gamificationController.replenishAegisHud)");
    expect(routeSource).toContain("router.put('/users/:userId/aegis-hud/:needKey', authenticate, requireAdmin, gamificationController.setAegisHudNeed)");
    expect(routeSource).toContain("router.get('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.getJobClass)");
    expect(routeSource).toContain("router.put('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.setJobClass)");
    expect(aegisHookSource).toContain('`${API_BASE}/users/${userId}/aegis-hud`');
    expect(aegisHookSource).toContain('`${API_BASE}/users/${userId}/aegis-hud/replenish`');
    expect(jobSelectorSource).toContain('`/api/gamification/users/${userId}/job-class`');
    expect(authPipelineTest).toContain('mounts V1 backend routes for the active pet, Aegis HUD, and job-class endpoints');
  });

  it('strictly normalizes route ids for Aegis HUD and job-class handlers', () => {
    [
      getAegisSource,
      replenishAegisSource,
      setAegisNeedSource,
      setJobClassSource,
      getJobClassSource
    ].forEach((source) => {
      expect(source).toContain('const userId = parsePositiveInteger(req.params.userId);');
      expect(source).not.toContain('parseInt(');
    });
  });

  it('validates admin Aegis need overrides without permissive numeric parsing', () => {
    expect(controllerSource).toContain('const parseBoundedNumber =');
    expect(setAegisNeedSource).toContain('const normalizedValue = parseBoundedNumber(value, 0, 100);');
    expect(setAegisNeedSource).toContain('AegisHudService.setNeed(record, needKey, normalizedValue)');
    expect(setAegisNeedSource).not.toContain('parseFloat(value)');
  });

  it('keeps client-facing failures stable in advanced feature handlers', () => {
    const combined = [
      getAegisSource,
      replenishAegisSource,
      setAegisNeedSource,
      setJobClassSource,
      getJobClassSource
    ].join('\n');

    expect(combined).toContain('return sendGamificationError(res,');
    expect(combined).not.toContain('error: error.message');
    expect(combined).not.toContain('safeError(req, error)');
  });
});
