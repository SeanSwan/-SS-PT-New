import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');
const readBackendOptional = (path) => {
  try {
    return readBackend(path);
  } catch {
    return '';
  }
};

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const companionPetServiceSource = readBackend('../../services/gamification/CompanionPetService.mjs');
const companionPetConfigSource = readBackendOptional('../../services/gamification/companionPetConfig.mjs');
const companionPetStateSource = readBackendOptional('../../services/gamification/companionPetState.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const getPetSource = functionSource('getPet', 'adoptPet');
const adoptPetSource = functionSource('adoptPet', 'interactWithPet');
const interactPetSource = functionSource('interactWithPet', 'recordPetActivity');
const recordPetActivitySource = functionSource('recordPetActivity', 'renamePet');
const renamePetSource = functionSource('renamePet', 'releasePet');
const releasePetSource = functionSource('releasePet', 'getPetConfig');

const serviceFunctionSource = (name, nextName) => {
  const startMarker = `  static async ${name}`;
  const asyncEndMarker = `\n  static async ${nextName}`;
  const syncEndMarker = `\n  static ${nextName}`;
  const start = companionPetServiceSource.indexOf(startMarker);
  const asyncEnd = companionPetServiceSource.indexOf(asyncEndMarker, start + startMarker.length);
  const syncEnd = companionPetServiceSource.indexOf(syncEndMarker, start + startMarker.length);
  const end = asyncEnd > -1 ? asyncEnd : syncEnd;

  expect(start, `${name} service start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} service end marker`).toBeGreaterThan(start);

  return companionPetServiceSource.slice(start, end);
};

const serviceRecordActivitySource = serviceFunctionSource('recordActivity', 'interact');
const serviceInteractSource = serviceFunctionSource('interact', 'renamePet');
const serviceRenamePetSource = serviceFunctionSource('renamePet', 'releasePet');
const serviceReleasePetSource = serviceFunctionSource('releasePet', 'getSpeciesCatalog');

describe('gamification companion pet controller security hardening', () => {
  it('locks the active companion pet route wiring and frontend consumer', () => {
    const authPipelineTest = readFrontend('src/components/AdvancedGamification/AdvancedGamificationAuthPipeline.truth.test.ts');
    const companionHookSource = readFrontend('src/components/AdvancedGamification/components/CompanionPet/useCompanionPet.ts');

    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.getPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/adopt', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.adoptPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/interact', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.interactWithPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/activity', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.recordPetActivity)");
    expect(routeSource).toContain("router.put('/users/:userId/pet/rename', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.renamePet)");
    expect(routeSource).toContain("router.delete('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.releasePet)");
    expect(companionHookSource).toContain("getGamificationUserPath(userId, '/pet')");
    expect(companionHookSource).toContain("getGamificationUserPath(userId, '/pet/adopt')");
    expect(companionHookSource).toContain("getGamificationUserPath(userId, '/pet/interact')");
    expect(companionHookSource).toContain("getGamificationUserPath(userId, '/pet/rename')");
    expect(companionHookSource).toContain('const url = `${API_BASE}${path}`;');
    expect(authPipelineTest).toContain('mounts V1 backend routes for the active pet, Aegis HUD, and job-class endpoints');
  });

  it('strictly normalizes companion pet route ids', () => {
    [
      getPetSource,
      adoptPetSource,
      interactPetSource,
      recordPetActivitySource,
      renamePetSource,
      releasePetSource
    ].forEach((source) => {
      expect(source).toContain('const userId = parsePositiveInteger(req.params.userId);');
      expect(source).not.toContain('parseInt(');
    });
  });

  it('validates companion pet request bodies before calling services', () => {
    expect(controllerSource).toContain('const normalizeBoundedString =');
    expect(controllerSource).toContain('const VALID_PET_INTERACTIONS = new Set');
    expect(adoptPetSource).toContain('const sanitizedPetName = normalizeBoundedString(petName, 50);');
    expect(adoptPetSource).toContain('if (!PET_SPECIES[species])');
    expect(interactPetSource).toContain('if (!VALID_PET_INTERACTIONS.has(requestedInteraction))');
    expect(recordPetActivitySource).toContain('const normalizedAmount = parseBoundedPositiveInteger(amount, 1, 100);');
    expect(renamePetSource).toContain('const sanitizedName = normalizeBoundedString(name, 50);');
  });

  it('keeps companion pet client-facing failures stable', () => {
    const combined = [
      getPetSource,
      adoptPetSource,
      interactPetSource,
      recordPetActivitySource,
      renamePetSource,
      releasePetSource
    ].join('\n');

    expect(combined).toContain('return sendGamificationError(res,');
    expect(combined).not.toContain('error: error.message');
    expect(combined).not.toContain('safeError(req, error)');
  });

  it('serializes companion pet state mutations with row locks', () => {
    [serviceRecordActivitySource, serviceInteractSource, serviceRenamePetSource, serviceReleasePetSource].forEach((source) => {
      expect(source).toContain('const transaction = await Gamification.sequelize.transaction();');
      expect(source).toContain('lock: transaction.LOCK.UPDATE');
      expect(source).toContain('await transaction.commit();');
      expect(source).toContain('await transaction.rollback();');
    });

    expect(serviceRecordActivitySource).toContain('await record.update({ petState: state, petInventory: inventory }, { transaction });');
    expect(serviceInteractSource).toContain('await record.update({ petState: state }, { transaction });');
    expect(serviceRenamePetSource).toContain('await record.update({ petName: safeName }, { transaction });');
    expect(serviceRenamePetSource).toContain('return { name: safeName };');
    expect(serviceReleasePetSource).toContain('}, { transaction });');
  });

  it('keeps companion pet config and persisted-state helpers split from the service', () => {
    expect(companionPetServiceSource).toContain("from './companionPetConfig.mjs'");
    expect(companionPetServiceSource).toContain("from './companionPetState.mjs'");
    expect(companionPetServiceSource).toContain("export { EVOLUTION_STAGES, PET_SPECIES } from './companionPetConfig.mjs';");

    expect(companionPetConfigSource).toContain('export const PET_SPECIES =');
    expect(companionPetConfigSource).toContain('export const EVOLUTION_STAGES =');
    expect(companionPetConfigSource).toContain('export const PET_MOODS =');
    expect(companionPetConfigSource).toContain('export const APPEARANCE_TRIGGERS =');
    expect(companionPetConfigSource).toContain("emoji: '\\u2728'");
    expect(companionPetConfigSource).toContain("emoji: '\\u{1F60A}'");
    expect(companionPetConfigSource).toContain("emoji: '\\u{1F642}'");
    expect(companionPetConfigSource).toContain("emoji: '\\u{1F610}'");
    expect(companionPetConfigSource).toContain("emoji: '\\u{1F622}'");
    expect(companionPetConfigSource).toContain("emoji: '\\u{1F480}'");
    expect(companionPetConfigSource).not.toMatch(/[\u0080-\u00FF]/);

    expect(companionPetStateSource).toContain('APPEARANCE_TRIGGERS');
    expect(companionPetStateSource).toContain("from './companionPetConfig.mjs';");
    expect(companionPetStateSource).toContain('export const PET_STATE_ATTRIBUTES =');
    expect(companionPetStateSource).toContain('export const normalizePetState =');
    expect(companionPetStateSource).toContain('export const normalizeActivityCounters =');
    expect(companionPetStateSource).toContain('export const normalizeActivityAmount =');
    expect(companionPetStateSource).toContain('export const calculateHealthFromNeeds =');
    expect(companionPetStateSource).toContain('export const getEvolutionStage =');
    expect(companionPetStateSource).toContain('export const getMood =');
    expect(companionPetStateSource).toContain('export const getActiveAppearanceMods =');

    expect(companionPetServiceSource).not.toContain('const PET_SPECIES =');
    expect(companionPetServiceSource).not.toContain('const EVOLUTION_STAGES =');
    expect(companionPetServiceSource).not.toContain('const PET_MOODS =');
    expect(companionPetServiceSource).not.toContain('const APPEARANCE_TRIGGERS =');
    expect(companionPetServiceSource).not.toContain('const normalizePetState =');
    expect(companionPetServiceSource).not.toContain('const normalizeActivityCounters =');
    expect(companionPetServiceSource).not.toContain('const normalizeActivityAmount =');
    expect(companionPetServiceSource).not.toContain('static _calculateHealthFromNeeds');
    expect(companionPetServiceSource).not.toContain('static _getEvolutionStage');
    expect(companionPetServiceSource).not.toContain('static _getActiveAppearanceMods');
  });

  it('normalizes persisted companion pet state numbers before mutation math', () => {
    expect(companionPetStateSource).toContain('export const normalizePetState =');
    expect(companionPetStateSource).toContain('export const normalizeActivityCounters =');
    expect(companionPetStateSource).toContain('export const normalizeActivityAmount =');

    expect(serviceRecordActivitySource).toContain('const state = normalizePetState(record.petState);');
    expect(serviceRecordActivitySource).toContain('const counters = normalizeActivityCounters(state.activityCounters);');
    expect(serviceRecordActivitySource).toContain('const activityAmount = normalizeActivityAmount(amount);');
    expect(serviceRecordActivitySource).toContain('counters[counterKey] = toPetNumber(counters[counterKey], 0) + activityAmount;');
    expect(serviceRecordActivitySource).toContain('state.happiness = clampPetStat(toPetNumber(state.happiness, 50) + affinityBonus);');
    expect(serviceRecordActivitySource).toContain('state.totalInteractions = toPetNumber(state.totalInteractions, 0) + 1;');
    expect(serviceInteractSource).toContain('const state = normalizePetState(record.petState);');
    expect(serviceInteractSource).toContain('state.happiness = clampPetStat(toPetNumber(state.happiness, 50) + boost);');
    expect(serviceInteractSource).toContain('state.totalInteractions = toPetNumber(state.totalInteractions, 0) + 1;');

    expect(serviceRecordActivitySource).not.toContain('(counters[counterKey] || 0) + amount');
    expect(serviceRecordActivitySource).not.toContain('(state.happiness || 50) + affinityBonus');
    expect(serviceRecordActivitySource).not.toContain('(state.totalInteractions || 0) + 1');
    expect(serviceInteractSource).not.toContain('(state.happiness || 50) + boost');
    expect(serviceInteractSource).not.toContain('(state.totalInteractions || 0) + 1');
  });
});
