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

describe('DailyMacroLog health-data encryption mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the real description column instead of nonexistent aliases', () => {
    const hooks = new Map();
    const Model = {
      rawAttributes: { description: {}, calories: {} },
      addHook: vi.fn((name, _key, callback) => hooks.set(name, callback)),
    };

    registerEncryptionHooks(Model, 'DailyMacroLog');

    const instance = { changed: vi.fn(() => true) };
    hooks.get('beforeCreate')(instance);
    expect(mocks.encryptFields).toHaveBeenCalledWith(
      instance,
      ['description'],
      'health:nutrition',
    );
  });

  it('encrypts duplicate meal text inside items and decrypts create responses', () => {
    const hooks = new Map();
    const data = {
      description: 'Prescription shake',
      items: [{ name: 'Prescription shake', provider: 'USDA' }],
    };
    const Model = {
      rawAttributes: { description: {}, items: {} },
      addHook: vi.fn((name, _key, callback) => hooks.set(name, callback)),
    };
    const instance = {
      changed: vi.fn(() => true),
      getDataValue: vi.fn((field) => data[field]),
      setDataValue: vi.fn((field, value) => { data[field] = value; }),
    };

    registerEncryptionHooks(Model, 'DailyMacroLog');
    hooks.get('beforeCreate')(instance);

    expect(data.items).toEqual([{
      name: '$ENC$Prescription shake',
      provider: 'USDA',
    }]);
    hooks.get('afterCreate')(instance);
    expect(mocks.decryptFields).toHaveBeenCalledWith(
      instance,
      ['description'],
      'health:nutrition',
    );
    expect(data.items).toEqual([{
      name: 'Prescription shake',
      provider: 'USDA',
    }]);
  });
});
