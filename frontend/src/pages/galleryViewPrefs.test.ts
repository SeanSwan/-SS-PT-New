/**
 * galleryViewPrefs.test.ts
 * =======================
 * Covers the versioned/validated persistence for the net-new gallery view + size prefs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __TESTING__, SIZE_MIN_PX, SIZE_LABEL } from './galleryViewPrefs';

const { STORAGE_KEY, DEFAULTS, readStored, writeStored, LAYOUTS, SIZES } = __TESTING__;

describe('galleryViewPrefs persistence', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('returns defaults when nothing stored', () => {
    expect(readStored()).toEqual(DEFAULTS);
  });

  it('round-trips a valid preference', () => {
    writeStored({ layout: 'list', size: 'xl' });
    expect(readStored()).toEqual({ layout: 'list', size: 'xl' });
  });

  it('falls back on a stale/unknown enum value (never crashes)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: 'masonry', size: 'huge' }));
    expect(readStored()).toEqual(DEFAULTS); // both invalid → defaults, no throw
  });

  it('falls back on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(readStored()).toEqual(DEFAULTS);
  });

  it('partial-valid keeps the valid field, defaults the invalid one', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: 'list', size: 'nope' }));
    expect(readStored()).toEqual({ layout: 'list', size: DEFAULTS.size });
  });

  it('write is a no-op (no throw) when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => writeStored({ layout: 'grid', size: 's' })).not.toThrow();
    spy.mockRestore();
  });
});

describe('size presets', () => {
  it('every size has an ascending min-px + a label', () => {
    for (const s of SIZES) {
      expect(typeof SIZE_MIN_PX[s]).toBe('number');
      expect(SIZE_LABEL[s]).toBeTruthy();
    }
    expect(SIZE_MIN_PX.s).toBeLessThan(SIZE_MIN_PX.m);
    expect(SIZE_MIN_PX.m).toBeLessThan(SIZE_MIN_PX.l);
    expect(SIZE_MIN_PX.l).toBeLessThan(SIZE_MIN_PX.xl);
  });
  it('layout + size enums are the expected sets', () => {
    expect([...LAYOUTS].sort()).toEqual(['grid', 'list']);
    expect([...SIZES].sort()).toEqual(['l', 'm', 's', 'xl']);
  });
});
