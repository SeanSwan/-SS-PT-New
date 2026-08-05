/**
 * Regression: macro-log audit trail (S0.5, nutrition blueprint 2026-08-04).
 * PATCH/DELETE /api/macros/:id and the reviewer verify flip were hard
 * mutations with no history. Locks in: before-state capture, encryption-at-rest
 * parity in snapshots (route handlers hold DECRYPTED instances), and the
 * best-effort contract — an audit failure never propagates to the caller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  isEncryptionEnabled: vi.fn(() => true),
  encrypt: vi.fn((value, ctx) => `$ENC[${ctx}]$${value}`),
  encryptNutritionItems: vi.fn((items) => items.map((i) => ({ ...i, name: `$ENC$${i.name}` }))),
}));

vi.mock('../../models/NutritionLogRevision.mjs', () => ({
  default: { create: mocks.create },
}));

vi.mock('../../services/encryption/encryptionService.mjs', () => ({
  encrypt: mocks.encrypt,
  isEncryptionEnabled: mocks.isEncryptionEnabled,
}));

vi.mock('../../services/encryption/healthDataEncryption.mjs', () => ({
  encryptNutritionItems: mocks.encryptNutritionItems,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { recordMacroLogRevision } from '../../services/nutrition/nutritionLogRevisionService.mjs';

const makeEntry = (row) => ({ get: vi.fn(() => ({ ...row })) });

const ROW = {
  id: 5,
  userId: 42,
  description: 'Chicken bowl',
  calories: 640,
  items: [{ name: 'Chicken bowl', provider: 'USDA' }],
};

describe('recordMacroLogRevision (S0.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEncryptionEnabled.mockReturnValue(true);
    mocks.create.mockResolvedValue({ id: 1 });
  });

  it('captures the before-state with actor attribution', async () => {
    await recordMacroLogRevision({
      entry: makeEntry(ROW), action: 'update', actorUserId: 7, actorRole: 'trainer',
    });

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      macroLogId: 5,
      ownerUserId: 42,
      actorUserId: 7,
      actorRole: 'trainer',
      action: 'update',
    }));
  });

  it('re-encrypts description and items text in the snapshot (encryption-at-rest parity)', async () => {
    await recordMacroLogRevision({ entry: makeEntry(ROW), action: 'delete', actorUserId: 42 });

    const { snapshot } = mocks.create.mock.calls[0][0];
    expect(snapshot.description).toBe('$ENC[health:nutrition:description]$Chicken bowl');
    expect(snapshot.items[0].name).toBe('$ENC$Chicken bowl');
    expect(snapshot.calories).toBe(640); // numeric macros stay queryable
  });

  it('stores plaintext when encryption is disabled (matches the live table)', async () => {
    mocks.isEncryptionEnabled.mockReturnValue(false);
    await recordMacroLogRevision({ entry: makeEntry(ROW), action: 'update', actorUserId: 42 });
    expect(mocks.create.mock.calls[0][0].snapshot.description).toBe('Chicken bowl');
  });

  it('is best-effort: a DB failure logs and returns null, never throws', async () => {
    mocks.create.mockRejectedValue(new Error('db down'));
    const result = await recordMacroLogRevision({ entry: makeEntry(ROW), action: 'update', actorUserId: 42 });
    expect(result).toBeNull();
  });

  it('refuses invalid actions and malformed entries without touching the DB', async () => {
    expect(await recordMacroLogRevision({ entry: makeEntry(ROW), action: 'destroy-all', actorUserId: 1 })).toBeNull();
    expect(await recordMacroLogRevision({ entry: null, action: 'update', actorUserId: 1 })).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
