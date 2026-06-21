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
const aegisHudServiceSource = readBackend('../../services/gamification/AegisHudService.mjs');
const aegisHudConfigSource = readBackend('../../services/gamification/aegisHudConfig.mjs');
const aegisHudStateSource = readBackend('../../services/gamification/aegisHudState.mjs');

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
    expect(aegisHookSource).toContain("getGamificationUserPath(userId, '/aegis-hud')");
    expect(aegisHookSource).toContain("getGamificationUserPath(userId, '/aegis-hud/replenish')");
    expect(aegisHookSource).toContain('`${API_BASE}${aegisPath}`');
    expect(jobSelectorSource).toContain("getGamificationUserPath(userId, '/job-class')");
    expect(jobSelectorSource).toContain('`/api/gamification${jobClassPath}`');
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
    expect(setAegisNeedSource).toContain('AegisHudService.setNeed(record, needKey, normalizedValue, { transaction })');
    expect(setAegisNeedSource).not.toContain('parseFloat(value)');
  });

  it('serializes Aegis HUD state mutations on the active gamification row', () => {
    [
      [getAegisSource, 'AegisHudService.getNeeds(record, { transaction })'],
      [replenishAegisSource, 'AegisHudService.replenishFromAction(record, requestedActionType, { transaction })'],
      [setAegisNeedSource, 'AegisHudService.setNeed(record, needKey, normalizedValue, { transaction })']
    ].forEach(([source, serviceCall]) => {
      expect(source).toContain('transaction = await db.transaction();');
      expect(source).toContain('lock: transaction.LOCK.UPDATE');
      expect(source).toContain(serviceCall);
      expect(source).toContain('await transaction.commit();');
      expect(source).toContain('await transaction.rollback();');
    });

    expect(replenishAegisSource).toContain('const requestedActionType = normalizeBoundedString(actionType, 80);');
    expect(replenishAegisSource).toContain('if (!requestedActionType) return res.status(400).json({ success: false, error: \'actionType required\' });');
  });

  it('serializes job-class writes on the active gamification row', () => {
    expect(setJobClassSource).toContain('let transaction;');
    expect(setJobClassSource).toContain('const { jobClass } = req.body ?? {};');
    expect(setJobClassSource).toContain('transaction = await db.transaction();');
    expect(setJobClassSource).toContain('lock: transaction.LOCK.UPDATE');
    expect(setJobClassSource).toContain('await record.update({ jobClass }, { transaction });');
    expect(setJobClassSource).toContain('await transaction.commit();');
    expect(setJobClassSource).toContain('if (transaction) await transaction.rollback();');
  });

  it('normalizes persisted Aegis HUD state before decay, replenish, and response math', () => {
    expect(aegisHudServiceSource).toContain("from './aegisHudConfig.mjs';");
    expect(aegisHudServiceSource).toContain("from './aegisHudState.mjs';");
    expect(aegisHudConfigSource).toContain('export const NEED_CONFIG =');
    expect(aegisHudConfigSource).toContain('export const ACTION_REPLENISH =');
    expect(aegisHudConfigSource).toContain('export function calculateMoodlet(needValues)');
    expect(aegisHudStateSource).toContain("import { NEED_CONFIG } from './aegisHudConfig.mjs';");
    expect(aegisHudStateSource).toContain('export const normalizeNeedsState =');
    expect(aegisHudStateSource).toContain('export const clampNeedValue =');
    expect(aegisHudStateSource).toContain('Number.isFinite');
    expect(aegisHudStateSource).toContain('Date.parse');
    expect(aegisHudStateSource).toContain('Math.max(0, (now.getTime() - lastUpdatedTime)');
    expect(aegisHudServiceSource).toContain('static async getNeeds(gamificationRecord, updateOptions = {})');
    expect(aegisHudServiceSource).toContain('static async replenishFromAction(gamificationRecord, actionType, updateOptions = {})');
    expect(aegisHudServiceSource).toContain('static async setNeed(gamificationRecord, needKey, value, updateOptions = {})');
    expect(aegisHudServiceSource).toContain('await persistAegisUpdate(gamificationRecord, {');
    expect(aegisHudServiceSource).toContain('needsState: updatedNeeds');
    expect(aegisHudServiceSource).toContain('return this.formatResponse(updatedNeeds, moodlet, gamificationRecord);');
    expect(aegisHudStateSource).toContain('if (updateOptions?.transaction) throw err;');
    expect(aegisHudServiceSource).not.toContain('const NEED_CONFIG =');
    expect(aegisHudServiceSource).not.toContain('const ACTION_REPLENISH =');
    expect(aegisHudServiceSource).not.toContain('const normalizeNeedsState =');
    expect(aegisHudServiceSource).not.toContain('const needsState = gamificationRecord.needsState || this.getDefaultNeedsState();');
    expect(aegisHudServiceSource).not.toContain('const lastUpdated = new Date(need.lastUpdated);');
    expect(aegisHudServiceSource).not.toContain('let currentValue = need.value -');
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
