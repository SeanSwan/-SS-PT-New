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

const getPetSource = functionSource('getPet', 'adoptPet');
const adoptPetSource = functionSource('adoptPet', 'interactWithPet');
const interactPetSource = functionSource('interactWithPet', 'recordPetActivity');
const recordPetActivitySource = functionSource('recordPetActivity', 'renamePet');
const renamePetSource = functionSource('renamePet', 'releasePet');
const releasePetSource = functionSource('releasePet', 'getPetConfig');

describe('gamification companion pet controller security hardening', () => {
  it('locks the active companion pet route wiring and frontend consumer', () => {
    const authPipelineTest = readFrontend('src/components/AdvancedGamification/AdvancedGamificationAuthPipeline.truth.test.ts');
    const companionHookSource = readFrontend('src/components/AdvancedGamification/components/CompanionPet/useCompanionPet.ts');

    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.getPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/adopt', authenticate, authorizeResourceAccess('userId'), gamificationController.adoptPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/interact', authenticate, authorizeResourceAccess('userId'), gamificationController.interactWithPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/activity', authenticate, authorizeResourceAccess('userId'), gamificationController.recordPetActivity)");
    expect(routeSource).toContain("router.put('/users/:userId/pet/rename', authenticate, authorizeResourceAccess('userId'), gamificationController.renamePet)");
    expect(routeSource).toContain("router.delete('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.releasePet)");
    expect(companionHookSource).toContain('`/users/${userId}/pet`');
    expect(companionHookSource).toContain('`/users/${userId}/pet/adopt`');
    expect(companionHookSource).toContain('`/users/${userId}/pet/interact`');
    expect(companionHookSource).toContain('`/users/${userId}/pet/rename`');
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
});
