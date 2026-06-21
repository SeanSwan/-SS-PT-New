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
const vaultServiceSource = readBackend('../../services/gamification/VaultDecryptionService.mjs');
const vaultStateSource = readBackend('../../services/gamification/vaultDecryptionState.mjs');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const rollVaultSource = functionSource('rollVaultDrop', 'getVaultInventory');
const getInventorySource = functionSource('getVaultInventory', 'getVaultConfig');

describe('gamification vault controller security hardening', () => {
  it('locks the canonical vault routes and staged frontend hook', () => {
    const vaultHookSource = readFrontend('src/components/AdvancedGamification/components/VaultDecryption/useVaultDecryption.ts');

    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/vault/config', authenticate, requireUser, gamificationController.getVaultConfig)");
    expect(routeSource).toContain("router.post('/users/:userId/vault/roll', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.rollVaultDrop)");
    expect(routeSource).toContain("router.get('/users/:userId/vault/inventory', authenticate, authorizeResourceAccess('userId'), gamificationController.getVaultInventory)");
    expect(vaultHookSource).toContain("getGamificationUserPath(userId, '/vault/roll')");
    expect(vaultHookSource).toContain("getGamificationUserPath(userId, '/vault/inventory')");
    expect(vaultHookSource).toContain('const url = `${API_BASE}${path}`;');
  });

  it('keeps vault frontend transport on the shared API service', () => {
    const vaultHookSource = readFrontend('src/components/AdvancedGamification/components/VaultDecryption/useVaultDecryption.ts');

    expect(vaultHookSource).toContain("import apiService from '../../../../services/api.service'");
    expect(vaultHookSource).not.toContain("localStorage.getItem('token')");
    expect(vaultHookSource).not.toMatch(/\bfetch\s*\(/);
    expect(vaultHookSource).not.toMatch(/Authorization\s*:/);
  });

  it('strictly normalizes vault ids, validates action types, and rate-limits roll routes', () => {
    expect(rollVaultSource).toContain('const userId = parsePositiveInteger(req.params.userId);');
    expect(rollVaultSource).toContain('const requestedActionType = normalizeBoundedString(actionType, 80);');
    expect(rollVaultSource).toContain('if (!DROP_TRIGGERS[requestedActionType])');
    expect(rollVaultSource).toContain('const idempotencyKey = `vault_${userId}_${requestedActionType}_${new Date().toISOString().slice(0, 13)}`;');
    expect(getInventorySource).toContain('const userId = parsePositiveInteger(req.params.userId);');
    expect(rollVaultSource).not.toContain('parseInt(');
    expect(getInventorySource).not.toContain('parseInt(');
  });

  it('keeps vault drops cosmetic-only and never awards random xp bonuses', () => {
    expect(rollVaultSource).toContain('transaction = await db.transaction();');
    expect(rollVaultSource).toContain('lock: transaction.LOCK.UPDATE');
    expect(rollVaultSource).toContain('await VaultDecryptionService.recordDrop(record, drop, { transaction });');
    expect(rollVaultSource).toContain('await transaction.commit();');
    expect(rollVaultSource).toContain("xpBonus: 0");
    expect(rollVaultSource).toContain("rewardMode: 'cosmetic_only'");
    expect(rollVaultSource).not.toContain('GamificationPointsService.recordLedgerEntry({');
    expect(rollVaultSource).not.toContain('const vaultBonusXP = parsePositiveInteger(drop.xpBonus, 0);');
    expect(rollVaultSource).not.toContain('source: getVaultPointSource(requestedActionType)');
    expect(rollVaultSource).not.toContain("description: 'Vault drop bonus XP'");
    expect(rollVaultSource).not.toContain("reason: 'vault_drop'");
    expect(rollVaultSource).not.toContain('record.update({ totalXP:');
    expect(controllerSource).not.toContain('Variable-ratio reinforcement loot drops after actions');
  });

  it('locks vault service rewards to cosmetic loot only', () => {
    expect(vaultServiceSource).toContain('rewardMode: \'cosmetic_only\'');
    expect(vaultServiceSource).not.toMatch(/\bxpBonus:\s*(?:[1-9]|\d{2,})/);
    expect(vaultServiceSource).not.toContain("type: 'xp_boost'");
    expect(vaultServiceSource).not.toContain("type: 'streak_freeze'");
    expect(vaultServiceSource).not.toContain('variable-ratio');
    expect(vaultServiceSource).not.toContain('streak freezes');
    expect(vaultServiceSource).not.toContain('XP Boost');
    expect(vaultStateSource).toContain('rewardMode: \'cosmetic_only\'');
    expect(vaultStateSource).toContain('xpBonus: 0');
    expect(vaultStateSource).not.toContain("'xp_boost'");
    expect(vaultStateSource).not.toContain("'streak_freeze'");
  });

  it('keeps vault client-facing failures stable', () => {
    const combined = [rollVaultSource, getInventorySource].join('\n');

    expect(combined).toContain('return sendGamificationError(res,');
    expect(combined).not.toContain('error: error.message');
    expect(combined).not.toContain('safeError(req, error)');
  });

});
