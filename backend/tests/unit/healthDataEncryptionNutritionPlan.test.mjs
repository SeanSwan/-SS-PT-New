/**
 * Regression: ClientNutritionPlan encryption truth (S0.3, nutrition blueprint
 * 2026-08-04).
 *
 * The config previously named plan_details/restrictions — columns that do not
 * exist — so the attribute filter silently reduced coverage to `notes` and the
 * PHI-adjacent allergy/restriction lists sat in plaintext JSONB. This test
 * locks in: (1) real columns registered, (2) JSONB arrays encrypted
 * ELEMENT-WISE (never through encryptFields, whose String([...]) coercion
 * flattens an array to "a,b" and destroys it), (3) array shape preserved
 * round-trip, (4) legacy plaintext rows pass through decrypt unharmed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  encryptFields: vi.fn(),
  decryptFields: vi.fn(),
  encrypt: vi.fn((value) => `$ENC$${value}`),
  decrypt: vi.fn((value) => String(value).replace(/^\$ENC\$/, '')),
  isEncryptionEnabled: vi.fn(() => true),
}));

vi.mock('../../services/encryption/encryptionService.mjs', () => ({
  encryptFields: mocks.encryptFields,
  decryptFields: mocks.decryptFields,
  encrypt: mocks.encrypt,
  decrypt: mocks.decrypt,
  isEncryptionEnabled: mocks.isEncryptionEnabled,
}));

import { registerEncryptionHooks } from '../../services/encryption/healthDataEncryption.mjs';

const PLAN_ATTRS = {
  planName: {}, notes: {}, dietaryRestrictions: {}, allergies: {}, mealsJson: {},
};

function makeModel(hooks) {
  return {
    rawAttributes: PLAN_ATTRS,
    addHook: vi.fn((name, _key, callback) => hooks.set(name, callback)),
  };
}

function makeInstance(data, changedFields = null) {
  return {
    changed: vi.fn((field) => (changedFields ? changedFields.includes(field) : true)),
    getDataValue: vi.fn((field) => data[field]),
    setDataValue: vi.fn((field, value) => { data[field] = value; }),
  };
}

describe('ClientNutritionPlan health-data encryption mapping (S0.3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers only the real scalar column and never routes arrays through encryptFields', () => {
    const hooks = new Map();
    registerEncryptionHooks(makeModel(hooks), 'ClientNutritionPlan');

    const data = { notes: 'x', dietaryRestrictions: ['dairy-free'], allergies: ['peanuts'] };
    hooks.get('beforeCreate')(makeInstance(data));

    // Scalar path: only `notes` — the phantom plan_details/restrictions are gone.
    expect(mocks.encryptFields).toHaveBeenCalledWith(
      expect.anything(), ['notes'], 'health:nutrition_plan',
    );
    // Array fields never appear in an encryptFields call (String([]) would destroy them).
    for (const call of mocks.encryptFields.mock.calls) {
      expect(call[1]).not.toContain('dietaryRestrictions');
      expect(call[1]).not.toContain('allergies');
    }
  });

  it('encrypts allergy/restriction entries element-wise, preserving array shape', () => {
    const hooks = new Map();
    registerEncryptionHooks(makeModel(hooks), 'ClientNutritionPlan');

    const data = { dietaryRestrictions: ['dairy-free', 'low-sodium'], allergies: ['peanuts'] };
    hooks.get('beforeCreate')(makeInstance(data));

    expect(data.dietaryRestrictions).toEqual(['$ENC$dairy-free', '$ENC$low-sodium']);
    expect(data.allergies).toEqual(['$ENC$peanuts']);
    expect(mocks.encrypt).toHaveBeenCalledWith('peanuts', 'health:nutrition_plan:allergies');
  });

  it('decrypts arrays on read and passes legacy plaintext through unchanged', () => {
    const hooks = new Map();
    registerEncryptionHooks(makeModel(hooks), 'ClientNutritionPlan');

    // Mixed row: one encrypted entry, one legacy plaintext entry.
    const data = { allergies: ['$ENC$peanuts', 'shellfish'] };
    const instance = makeInstance(data);
    hooks.get('afterFind')(instance);

    expect(data.allergies).toEqual(['peanuts', 'shellfish']);
  });

  it('only re-encrypts arrays on update when the field actually changed', () => {
    const hooks = new Map();
    registerEncryptionHooks(makeModel(hooks), 'ClientNutritionPlan');

    const data = { allergies: ['peanuts'], dietaryRestrictions: ['vegan'] };
    hooks.get('beforeUpdate')(makeInstance(data, ['allergies']));

    expect(data.allergies).toEqual(['$ENC$peanuts']);
    expect(data.dietaryRestrictions).toEqual(['vegan']); // untouched — not changed
  });
});
