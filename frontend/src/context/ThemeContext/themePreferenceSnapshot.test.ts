/**
 * themePreferenceSnapshot.test.ts
 * ===============================
 *
 * T1 of Astra's S1 test plan (`09-tests.md`): the snapshot reader and the resolver.
 *
 * Named cases, all present below:
 *   `follow wins over stored theme`
 *   `invalid and missing values use supplied fallback`
 *   `getter and read denial return unavailable`
 *   `prototype names are rejected`
 *
 * These are pure-function tests plus real-storage tests, and the split is deliberate.
 * The resolver's matrix is exercised directly so a failure points at a rule rather than
 * at jsdom; the reader is exercised against the real `localStorage` for the readable
 * paths, and against a hostile REPLACEMENT for the two failures it exists for — a
 * throwing property getter, and a throwing `getItem`.
 *
 * It cannot be spied on. `vi.spyOn(window.localStorage, 'getItem')` reports a mock and
 * intercepts nothing, because jsdom's `Storage` proxy resolves its API members without
 * consulting own properties on the instance — so such a spy silently tests nothing.
 * Measured 2026-09-20; the case below carries the numbers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY } from './themePersistence';
import {
  readThemePreferenceSnapshot,
  resolveThemePreference,
  type ReadablePreferenceSnapshot,
} from './themePreferenceSnapshot';

const FALLBACK = 'crystalline-default';

/** A readable snapshot without touching storage — for the resolver's own matrix. */
const readable = (rawTheme: string | null, rawFollow: string | null): ReadablePreferenceSnapshot => ({
  kind: 'readable',
  rawTheme,
  rawFollow,
});

/** Narrow with a real assertion so a wrong `kind` fails loudly instead of silently. */
const expectReadable = (snapshot: ReturnType<typeof readThemePreferenceSnapshot>) => {
  expect(snapshot.kind).toBe('readable');
  if (snapshot.kind !== 'readable') throw new Error('unreachable: kind checked above');
  return snapshot;
};

let savedLocalStorage: PropertyDescriptor | undefined;

beforeEach(() => {
  // Captured BEFORE any case redefines it, so `afterEach` can put the real one back.
  savedLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore FIRST: a case that replaced `localStorage` with a throwing getter would make
  // the `clear()` below throw, turning cleanup into a second failure that hides the first.
  if (savedLocalStorage) Object.defineProperty(window, 'localStorage', savedLocalStorage);
  else delete (window as unknown as Record<string, unknown>).localStorage;
  window.localStorage.clear();
});

describe('resolveThemePreference — follow-system precedence', () => {
  it('follow wins over stored theme', () => {
    const snapshot = readable('solar-gold', 'true');

    // The stored theme is 'solar-gold' in both calls and is ignored in both.
    expect(resolveThemePreference(snapshot, true, FALLBACK)).toEqual({
      themeId: 'crystalline-dark',
      followSystem: true,
    });
    expect(resolveThemePreference(snapshot, false, FALLBACK)).toEqual({
      themeId: 'crystalline-light',
      followSystem: true,
    });
  });

  it('follow wins over stored theme, read through real storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');

    const snapshot = expectReadable(readThemePreferenceSnapshot());
    // The snapshot reports what storage HOLDS — both raw strings, unvalidated.
    expect(snapshot).toEqual({ kind: 'readable', rawTheme: 'solar-gold', rawFollow: 'true' });

    expect(resolveThemePreference(snapshot, true, FALLBACK).themeId).toBe('crystalline-dark');
  });
});

describe('resolveThemePreference — invalid and missing values', () => {
  it('invalid and missing values use supplied fallback', () => {
    // Missing entirely.
    expect(resolveThemePreference(readable(null, null), true, FALLBACK))
      .toEqual({ themeId: FALLBACK, followSystem: false });

    // Present but not a registered theme.
    expect(resolveThemePreference(readable('not-a-theme', null), true, FALLBACK))
      .toEqual({ themeId: FALLBACK, followSystem: false });

    // The fallback is the SUPPLIED one, not a hardcoded constant.
    expect(resolveThemePreference(readable(null, null), false, 'enchanted-forest'))
      .toEqual({ themeId: 'enchanted-forest', followSystem: false });
  });

  it('invalid follow values behave as false', () => {
    // Rule 6. Only the exact string 'true' enables following. `Boolean(raw)` would have
    // accepted 'false' — the whole reason this is an equality check and not a coercion.
    for (const bad of ['false', 'TRUE', 'True', '1', '0', 'yes', ' true', 'true ', '', 'null']) {
      expect(
        resolveThemePreference(readable('solar-gold', bad), true, FALLBACK),
        `follow value ${JSON.stringify(bad)} must not enable following`,
      ).toEqual({ themeId: 'solar-gold', followSystem: false });
    }
  });

  it('a valid stored theme resolves with following false', () => {
    expect(resolveThemePreference(readable('void-crystal', 'false'), true, FALLBACK))
      .toEqual({ themeId: 'void-crystal', followSystem: false });
    expect(resolveThemePreference(readable('void-crystal', null), true, FALLBACK))
      .toEqual({ themeId: 'void-crystal', followSystem: false });
  });
});

describe('readThemePreferenceSnapshot — unavailability', () => {
  it('getter and read denial return unavailable', () => {
    // 1. The PROPERTY GETTER throws — storage access denied outright.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage access denied');
      },
    });
    expect(readThemePreferenceSnapshot()).toEqual({ kind: 'unavailable' });

    // Put the real object back before testing the other failure mode. The restore works
    // because `localStorage` is an own, configurable accessor on `window`, so
    // `beforeEach` captured a real descriptor to put back.
    if (savedLocalStorage) Object.defineProperty(window, 'localStorage', savedLocalStorage);

    // 2. The object is obtained but `getItem` throws — the contract's "read denial".
    //
    // This REPLACES the object instead of spying on it, and the reason is measured
    // (probe, 2026-09-20), not stylistic:
    //
    //   vi.spyOn(window.localStorage, 'getItem')  -> reports a mock, but is INERT
    //   a.getItem('x') after the spy              -> does NOT throw
    //   own descriptor for getItem on the instance-> undefined (it is on Storage.prototype)
    //   getLocalStorage() === window.localStorage -> true (so not a stale-reference issue)
    //
    // jsdom implements `Storage` behind a proxy whose `get` trap resolves the API members
    // (`getItem`, `setItem`, …) itself, so the own property a spy installs on the instance
    // is never consulted. A spy here does not fail loudly — it silently tests nothing,
    // which is why the first version of this case failed with `readable`. A stub is the
    // only way to reach the guard, and it reaches it directly: `getLocalStorage()` returns
    // the stub, and the reader's `try` catches.
    //
    // Everything except the read works, so the ONLY thing that can produce `unavailable`
    // below is the throwing `getItem` — not a missing member.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem() {
          throw new Error('read denied');
        },
        setItem() {},
        removeItem() {},
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });
    expect(readThemePreferenceSnapshot()).toEqual({ kind: 'unavailable' });
  });

  it('a missing key is READABLE, not unavailable', () => {
    // "Nothing stored" and "cannot read" resolve differently under the contract
    // (rules 4 and 5), so collapsing them here would make a fresh visitor
    // indistinguishable from a blocked-storage session.
    expect(readThemePreferenceSnapshot()).toEqual({
      kind: 'readable',
      rawTheme: null,
      rawFollow: null,
    });
  });
});

describe('resolveThemePreference — prototype safety', () => {
  it('prototype names are rejected', () => {
    // `isKnownThemeId` tests with `Object.prototype.hasOwnProperty`, so a stored
    // 'constructor' must not resolve to something inherited off the prototype chain —
    // and must not throw on the way. Both directions are asserted.
    for (const proto of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      expect(
        resolveThemePreference(readable(proto, null), true, FALLBACK),
        `${proto} must not resolve as a theme`,
      ).toEqual({ themeId: FALLBACK, followSystem: false });
    }
  });

  it('prototype names are rejected when they arrive through storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, '__proto__');
    const snapshot = expectReadable(readThemePreferenceSnapshot());

    expect(snapshot.rawTheme).toBe('__proto__');
    expect(resolveThemePreference(snapshot, true, FALLBACK))
      .toEqual({ themeId: FALLBACK, followSystem: false });
  });
});
