/**
 * themePersistence.ts
 * ===================
 *
 * Storage PRIMITIVES for the theme: the two keys, guarded access to `localStorage`, the
 * known-theme test, and the dark-first OS default. Nothing here decides what a preference
 * MEANS.
 *
 * RESOLUTION MOVED OUT (Astra R6 S1). This module used to also own
 * `resolveInitialTheme`, which restated rules 1–3 of the precedence table. The resolver
 * lives in `themePreferenceSnapshot.ts` and this module's copy was a second implementation
 * of the same rule — the exact defect class that shipped the follow-system flash: the
 * provider and the inline `index.html` bootstrap each decided precedence independently.
 * Startup now calls the resolver (`resolveStartupPreference`), so there is ONE
 * implementation and `themePrePaint.test.ts` guards the remaining unavoidable copy in
 * `index.html`, which cannot import TypeScript.
 *
 * The primitives stay here rather than moving into the resolver module because the
 * resolver imports them; keeping them below it means the dependency runs one way and
 * there is no import cycle.
 */

import { themes, type ThemeId } from './themePalettes';

/**
 * `localStorage` throws in private mode, when storage is blocked by policy, and in
 * some sandboxed iframes. Unguarded, a throwing `getItem` aborted the mount effect
 * and left the app with NO CSS variables for the whole session, while a throwing
 * `setItem` made the theme switch silently do nothing. Both are now contained.
 */
export const THEME_STORAGE_KEY = 'swanstudios-theme';
export const FOLLOW_SYSTEM_STORAGE_KEY = 'swanstudios-theme-follow-system';

/** Theme applied when the OS asks for a dark colour scheme. */
export const SYSTEM_DARK_THEME: ThemeId = 'crystalline-dark';
/** Theme applied when the OS asks for a light colour scheme. */
export const SYSTEM_LIGHT_THEME: ThemeId = 'crystalline-light';

/**
 * Acquire `localStorage` inside a guarded boundary.
 *
 * TWO DIFFERENT FAILURES, and the theme contract needs to tell them apart:
 *
 *   1. the PROPERTY GETTER throws — `window.localStorage` itself can throw, e.g. in a
 *      sandboxed iframe whose storage access is denied. Nothing can be read or written.
 *   2. a READ or WRITE throws — the object was obtained but `getItem`/`setItem` throws
 *      (private mode, quota, policy).
 *
 * The `safe*` helpers below collapse both into "no storage", which is all they ever
 * needed. `readThemePreferenceSnapshot` must NOT collapse them silently, because the
 * contract resolves an unavailable *startup* read differently from an unavailable
 * *active-session* read (`03-contracts.md` §Storage schema, rules 4 and 5) — so the
 * snapshot reader uses this directly and reports `{ kind: 'unavailable' }`.
 *
 * Returns `null` instead of throwing, so a caller cannot forget the guard.
 */
export const getLocalStorage = (): Storage | null => {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export const safeReadStorage = (key: string): string | null => {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const safeWriteStorage = (key: string, value: string): void => {
  try {
    getLocalStorage()?.setItem(key, value);
  } catch {
    /* storage unavailable — the theme still applies for this session */
  }
};

export const isKnownThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(themes, value);

/** Dark-first default when the platform cannot answer. */
export const prefersDarkColorScheme = (): boolean => {
  try {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    return query ? query.matches : true;
  } catch {
    return true;
  }
};

/** True when the user has asked the app to track the OS colour scheme. */
export const shouldFollowSystem = (): boolean =>
  safeReadStorage(FOLLOW_SYSTEM_STORAGE_KEY) === 'true';

/** The theme the OS currently asks for. */
export const getSystemTheme = (): ThemeId =>
  prefersDarkColorScheme() ? SYSTEM_DARK_THEME : SYSTEM_LIGHT_THEME;

