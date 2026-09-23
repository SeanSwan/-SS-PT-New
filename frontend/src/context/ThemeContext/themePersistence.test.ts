/**
 * themePersistence.test.ts
 * ========================
 *
 * The gate for first-render theme resolution, authored from the failure artefact:
 *
 *   "with follow-system ON, a cold load paints the stale stored theme and then
 *    visibly jumps to the system theme."
 *
 * Measured in the running app with the OS set to dark, after picking Solar Gold and
 * then enabling Match system:
 *
 *   at domcontentloaded : solar-gold       --bg-primary #120C05   <- what the user saw
 *   after settle        : crystalline-dark --bg-primary #0D1117
 *
 * The cause was precedence, not timing: `resolveInitialTheme` read the stored theme
 * FIRST and only consulted the follow flag when there was no stored theme. Because
 * an explicit pick clears the flag, a stored theme alongside `follow=true` is stale
 * by construction — so reading it first resolved to a theme the user was not using.
 *
 * Every one of the 35 tests in the suite was green while this was live. They tested
 * the swatch derivation and the palette copies; nothing drove the resolution rule.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOLLOW_SYSTEM_STORAGE_KEY,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  THEME_STORAGE_KEY,
  isKnownThemeId,
} from './themePersistence';
// Resolution moved to its own module under S1. The cases below are unchanged — only the
// import path is, because `resolveInitialTheme` now delegates to the shared resolver
// instead of restating the precedence rules.
import { resolveInitialTheme } from './themePreferenceSnapshot';

/** jsdom has no matchMedia; the module treats a throw as "prefers dark". */
const stubSystemPrefers = (prefersDark: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
};

const store = (entries: Record<string, string>) => {
  window.localStorage.clear();
  for (const [key, value] of Object.entries(entries)) {
    window.localStorage.setItem(key, value);
  }
};

describe('resolveInitialTheme — precedence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubSystemPrefers(true);
  });

  /**
   * THE load-bearing assertion. With the old (stored-theme-first) precedence this
   * returns 'solar-gold' and fails.
   */
  it('prefers the system theme when follow-system is on, even with a stored theme', () => {
    store({ [THEME_STORAGE_KEY]: 'solar-gold', [FOLLOW_SYSTEM_STORAGE_KEY]: 'true' });

    expect(resolveInitialTheme('crystalline-default')).toBe(SYSTEM_DARK_THEME);
  });

  it('uses the system LIGHT theme when the OS asks for light', () => {
    stubSystemPrefers(false);
    store({ [THEME_STORAGE_KEY]: 'solar-gold', [FOLLOW_SYSTEM_STORAGE_KEY]: 'true' });

    expect(resolveInitialTheme('crystalline-default')).toBe(SYSTEM_LIGHT_THEME);
  });

  it('uses the stored theme when follow-system is off', () => {
    store({ [THEME_STORAGE_KEY]: 'solar-gold', [FOLLOW_SYSTEM_STORAGE_KEY]: 'false' });

    expect(resolveInitialTheme('crystalline-default')).toBe('solar-gold');
  });

  it('uses the stored theme when no follow-system flag was ever written', () => {
    store({ [THEME_STORAGE_KEY]: 'enchanted-forest' });

    expect(resolveInitialTheme('crystalline-default')).toBe('enchanted-forest');
  });

  it('falls back when nothing is stored', () => {
    expect(resolveInitialTheme('crystalline-mono')).toBe('crystalline-mono');
  });

  it('ignores a stored value that is not a registered theme', () => {
    store({ [THEME_STORAGE_KEY]: 'not-a-theme' });

    expect(resolveInitialTheme('crystalline-default')).toBe('crystalline-default');
  });

  it('ignores a stored theme id that only exists on Object.prototype', () => {
    // `themes` is a plain object literal, so `themes['constructor']` resolves
    // through the prototype chain. isKnownThemeId must use hasOwnProperty.
    store({ [THEME_STORAGE_KEY]: 'constructor' });

    expect(isKnownThemeId('constructor')).toBe(false);
    expect(resolveInitialTheme('crystalline-default')).toBe('crystalline-default');
  });

  it('still resolves when localStorage throws', () => {
    const getItem = window.localStorage.getItem;
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked by policy');
    });

    expect(() => resolveInitialTheme('crystalline-default')).toBeTruthy();
    expect(resolveInitialTheme('crystalline-default')).toBe('crystalline-default');

    spy.mockRestore();
    expect(getItem).toBeTypeOf('function');
  });
});
