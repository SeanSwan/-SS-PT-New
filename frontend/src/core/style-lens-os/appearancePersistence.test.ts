import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_PROFILE,
  PROFILE_SCHEMA_VERSION,
  createAppearancePersistence,
  type AppearanceProfile,
  type StorageLike,
} from '.';

const createStorage = (): StorageLike & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
};

const profile = (
  styleLensId: string,
  updatedAt = '2026-07-11T20:00:00.000Z',
): AppearanceProfile => ({
  ...DEFAULT_APPEARANCE_PROFILE,
  styleLensId,
  updatedAt,
});

describe('appearance persistence', () => {
  it('loads Default with a non-blocking receipt for corrupt storage', () => {
    const storage = createStorage();
    storage.setItem(APPEARANCE_STORAGE_KEY, '{not-json');
    const persistence = createAppearancePersistence({
      storage,
      sourceId: 'tab-a',
    });

    expect(persistence.load()).toEqual({
      profile: DEFAULT_APPEARANCE_PROFILE,
      receipt: {
        code: 'profile_reset',
        message: 'Saved appearance was invalid and Default was restored.',
      },
    });
  });

  it('migrates legacy profile version zero sequentially', () => {
    const storage = createStorage();
    storage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({
        sourceId: 'legacy',
        profile: {
          profileSchemaVersion: 0,
          themeId: 'crystalline-dark',
          lensId: 'default-safety',
          reducedMotion: true,
          compact: true,
          updatedAt: '2026-07-10T20:00:00.000Z',
        },
      }),
    );
    const persistence = createAppearancePersistence({
      storage,
      sourceId: 'tab-a',
    });

    expect(persistence.load().profile).toMatchObject({
      profileSchemaVersion: PROFILE_SCHEMA_VERSION,
      paletteThemeId: 'crystalline-dark',
      styleLensId: 'default-safety',
      motionMode: 'reduced',
      density: 'compact',
    });
  });

  it('suppresses writes during view-as mode', () => {
    const storage = createStorage();
    const persistence = createAppearancePersistence({
      storage,
      sourceId: 'tab-a',
    });

    expect(persistence.save(profile('quiet-meridian'), { suppressed: true })).toBe(
      false,
    );
    expect(storage.values.size).toBe(0);
  });

  it('keeps structural appearance namespaced from color and motion storage', () => {
    expect(APPEARANCE_STORAGE_KEY).toBe('style-lens-os:appearance-profile');
    expect(APPEARANCE_STORAGE_KEY).not.toBe('swanstudios-theme');
    expect(APPEARANCE_STORAGE_KEY).not.toBe('swanstudios-motion');
  });

  it('fails closed when local storage rejects a quota write', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const persistence = createAppearancePersistence({ storage, sourceId: 'tab-a' });

    expect(
      persistence.save(profile('quiet-meridian'), { suppressed: false }),
    ).toBe(false);
  });

  it('writes an origin envelope and ignores its own storage event', () => {
    const storage = createStorage();
    const persistence = createAppearancePersistence({
      storage,
      sourceId: 'tab-a',
    });
    const target = profile('quiet-meridian');

    expect(persistence.save(target, { suppressed: false })).toBe(true);
    const value = storage.getItem(APPEARANCE_STORAGE_KEY);
    expect(value).toContain('"sourceId":"tab-a"');
    expect(persistence.readExternal(value, DEFAULT_APPEARANCE_PROFILE)).toBeNull();
  });

  it('accepts a newer external profile and ignores stale or malformed events', () => {
    const storage = createStorage();
    const persistence = createAppearancePersistence({
      storage,
      sourceId: 'tab-a',
    });
    const current = profile('default-safety', '2026-07-11T20:00:00.000Z');
    const newer = profile('quiet-meridian', '2026-07-11T20:01:00.000Z');
    const older = profile('quiet-meridian', '2026-07-11T19:59:00.000Z');

    const envelope = (value: AppearanceProfile) =>
      JSON.stringify({ sourceId: 'tab-b', profile: value });

    expect(persistence.readExternal(envelope(newer), current)).toEqual(newer);
    expect(persistence.readExternal(envelope(older), current)).toBeNull();
    expect(persistence.readExternal('bad-json', current)).toBeNull();
    expect(persistence.readExternal(null, current)).toBeNull();
  });

  it('suppresses external application while view-as is active', () => {
    const persistence = createAppearancePersistence({
      storage: createStorage(),
      sourceId: 'tab-a',
    });
    const current = profile('default-safety');
    const external = JSON.stringify({
      sourceId: 'tab-b',
      profile: profile('quiet-meridian', '2026-07-11T20:01:00.000Z'),
    });

    expect(
      persistence.readExternal(external, current, { suppressed: true }),
    ).toBeNull();
  });
});
