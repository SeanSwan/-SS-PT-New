import { describe, expect, it } from 'vitest';
import {
  getCompanionDockStorageKey,
  isCompanionDockEnabled,
  readCompanionDockCollapsed,
  writeCompanionDockCollapsed,
} from './companionDockPreferences';

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('companionDockPreferences', () => {
  it('defaults the dock on unless explicitly disabled', () => {
    expect(isCompanionDockEnabled(undefined)).toBe(true);
    expect(isCompanionDockEnabled('true')).toBe(true);
    expect(isCompanionDockEnabled('false')).toBe(false);
    expect(isCompanionDockEnabled('0')).toBe(false);
    expect(isCompanionDockEnabled('off')).toBe(false);
  });

  it('persists collapsed state per safe user segment', () => {
    const storage = createStorage();
    const key = getCompanionDockStorageKey('42');

    expect(readCompanionDockCollapsed('42', storage)).toBe(false);
    writeCompanionDockCollapsed('42', true, storage);
    expect(storage.getItem(key)).toBe('true');
    expect(readCompanionDockCollapsed('42', storage)).toBe(true);
    writeCompanionDockCollapsed('42', false, storage);
    expect(readCompanionDockCollapsed('42', storage)).toBe(false);
  });
});
