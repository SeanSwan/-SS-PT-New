/**
 * themePreferenceSnapshot.ts
 * ==========================
 *
 * Read the two theme keys as ONE snapshot, and resolve that snapshot into a complete
 * preference. Astra R6 S1 — `03-contracts.md` §Preference types and signatures.
 *
 * WHY A SNAPSHOT TYPE RATHER THAN TWO INDEPENDENT READS
 * ----------------------------------------------------
 * The two keys are one logical value: "follow-system ON" makes the stored theme
 * irrelevant, and an explicit pick clears the flag. Reading them separately lets a
 * caller act on a torn pair — the stored theme from before a peer's write and the flag
 * from after it — which is the defect class `useCrossTabThemeSync.ts` already documents
 * for the event payload. A single call returns both as they were at one instant, and the
 * `kind` discriminant forces the caller to say what it does when storage is unavailable
 * instead of silently treating "cannot read" as "nothing stored".
 *
 * `resolveThemePreference` TAKES ONLY THE READABLE VARIANT, deliberately.
 *
 * The contract's resolution table has two DIFFERENT unavailable rules — rule 4, an
 * unavailable *startup* read uses the fallback with following false; rule 5, an
 * unavailable *active-session* read retains both current fields — and the function cannot
 * tell which situation it is in, because only the caller knows. `03-contracts.md` states
 * this outright: "unavailable handling belongs to the caller".
 *
 * Narrowing the parameter to `ReadablePreferenceSnapshot` makes that a compile error
 * rather than a comment: a caller that has not branched on `kind` cannot call this at all.
 * A prose note saying the same thing would be advice; this is enforcement.
 */

import {
  FOLLOW_SYSTEM_STORAGE_KEY,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  THEME_STORAGE_KEY,
  getLocalStorage,
  isKnownThemeId,
  prefersDarkColorScheme,
} from './themePersistence';
import type { ThemeId } from './themePalettes';

/** The complete, resolved preference. Both fields always present — no partial states. */
export interface ThemePreference {
  themeId: ThemeId;
  followSystem: boolean;
}

/**
 * What storage said, including the possibility that it could not be read at all.
 *
 * `raw*` values are the strings exactly as stored — unresolved, unvalidated. Validation
 * is `resolveThemePreference`'s job, so that "what storage holds" and "what we do about
 * it" stay separable and independently testable.
 */
export type PreferenceSnapshot =
  | { kind: 'readable'; rawTheme: string | null; rawFollow: string | null }
  | { kind: 'unavailable' };

/** The readable half, for callers that have already handled unavailability. */
export type ReadablePreferenceSnapshot = Extract<PreferenceSnapshot, { kind: 'readable' }>;

/**
 * Read both keys, or report that storage is unavailable.
 *
 * Catches BOTH failure modes named in the contract — "getter and read denial":
 *   - the `localStorage` property getter throwing — `getLocalStorage()` returns null
 *   - `getItem` throwing once the object was obtained — the `try` below
 *
 * Both branches return the same value, and only the second is independently load-bearing.
 * Deleting the early return leaves the suite green, because the `try` then catches the
 * `TypeError` from calling a method on null and produces the identical result — measured
 * 2026-09-20 by fault injection, not assumed. The early return is kept because it STATES
 * the intent and narrows the type; without it the reads need a non-null assertion, which
 * is the worse trade. Do not read this as two independent safety nets.
 *
 * A missing key is NOT unavailability: it is `rawTheme: null`, a readable snapshot with
 * nothing stored. Collapsing those two would make "fresh visitor" indistinguishable from
 * "storage blocked", and they resolve differently.
 */
export const readThemePreferenceSnapshot = (): PreferenceSnapshot => {
  const storage = getLocalStorage();
  if (!storage) return { kind: 'unavailable' };

  try {
    return {
      kind: 'readable',
      rawTheme: storage.getItem(THEME_STORAGE_KEY),
      rawFollow: storage.getItem(FOLLOW_SYSTEM_STORAGE_KEY),
    };
  } catch {
    return { kind: 'unavailable' };
  }
};

/**
 * Resolve a readable snapshot into a complete preference.
 *
 * Implements rules 1, 2, 3 and 6 of the contract's resolution table:
 *
 *   1. literal `'true'` follows the OS mapping
 *   2. otherwise a valid stored theme
 *   3. otherwise the supplied fallback
 *   6. invalid follow values behave as false
 *
 * Rule 1 is checked BEFORE rule 2, and the order is load-bearing rather than stylistic.
 * An explicit pick clears the follow flag (`applyThemeChoice(_, true)`), so a stored theme
 * can only coexist with `followSystem` on when it is STALE. Reading the theme first would
 * resolve to a theme the user is not using — the measured flash `resolveStartupPreference`
 * below documents, and `themePrePaint.test.ts` pins the two readers together.
 *
 * `systemDark` is passed in rather than read here so this stays pure: the OS observer is
 * `useSystemColorScheme`, and a pure function is what makes the matrix testable.
 */
export const resolveThemePreference = (
  snapshot: ReadablePreferenceSnapshot,
  systemDark: boolean,
  fallback: ThemeId,
): ThemePreference => {
  // Rule 1 + 6. Only the exact string 'true' follows the system. 'TRUE', '1', '', null
  // and arbitrary garbage all behave as false rather than throwing or being coerced —
  // `Boolean(rawFollow)` would have accepted 'false', which is the bug this avoids.
  if (snapshot.rawFollow === 'true') {
    return {
      themeId: systemDark ? SYSTEM_DARK_THEME : SYSTEM_LIGHT_THEME,
      followSystem: true,
    };
  }

  // Rule 2 + 3. `isKnownThemeId` tests with `Object.prototype.hasOwnProperty`, so
  // prototype names — 'constructor', '__proto__', 'toString' — are rejected as themes
  // rather than resolving to something inherited off the prototype chain.
  if (isKnownThemeId(snapshot.rawTheme)) {
    return { themeId: snapshot.rawTheme, followSystem: false };
  }

  return { themeId: fallback, followSystem: false };
};

/**
 * Resolve the complete preference to use on FIRST RENDER.
 *
 * This is `resolveThemePreference` plus the one rule the resolver cannot apply itself:
 * **rule 4** — an unavailable STARTUP read uses the supplied fallback with following
 * false. Rule 5, the unavailable *active-session* rule, is the opposite (retain both
 * current fields) and belongs to the owner, which is the only place that knows a session
 * is already running. That asymmetry is exactly why `resolveThemePreference` refuses the
 * `unavailable` variant at the type level, and why this wrapper exists rather than the
 * caller branching on `kind` itself.
 *
 * PRECEDENCE, and why the order is load-bearing.
 *
 * Runs in a `useState` initialiser, not an effect, so the FIRST paint already carries the
 * right theme. It previously ran in an effect, which meant every cold load painted the
 * default theme — and, because `injectThemeVariables` is the only writer of `--bg-base`,
 * painted with no CSS variables at all.
 *
 * Follow-system is checked BEFORE the stored theme, and that order is the fix for a
 * measured defect. The first version did the reverse, on the reasoning that an explicit
 * choice outranks the system. It does — but an explicit choice also CLEARS the follow
 * flag, so a stored theme can only coexist with `follow-system=true` when it is STALE.
 * Reading it first therefore resolved to a theme the user was not using. Measured in the
 * running app with the OS set to dark, after picking Solar Gold and then enabling Match
 * system:
 *
 *   at domcontentloaded : solar-gold       --bg-primary #120C05   <- what the user saw
 *   after settle        : crystalline-dark --bg-primary #0D1117
 *
 * i.e. the wrong theme painted first and then visibly jumped — the exact flash this
 * module exists to prevent. The stored value is still the fallback for when follow-system
 * is off, which is the only case where it is not stale.
 *
 * This function is the SINGLE implementation of rules 1–4. It used to be duplicated in
 * `themePersistence.ts`, which is how the two readers drifted apart in the first place.
 */
export const resolveStartupPreference = (fallback: ThemeId): ThemePreference => {
  const snapshot = readThemePreferenceSnapshot();

  // Rule 4: an unavailable STARTUP read uses the fallback with following false.
  if (snapshot.kind === 'unavailable') return { themeId: fallback, followSystem: false };

  return resolveThemePreference(snapshot, prefersDarkColorScheme(), fallback);
};

/**
 * The first-render theme as a bare `ThemeId`.
 *
 * Kept because the inline bootstrap in `index.html` resolves the same rule in plain JS and
 * `themePrePaint.test.ts` pins the two readers against each other. Delegating to
 * `resolveStartupPreference` is what makes this reader and the owner agree BY
 * CONSTRUCTION rather than by test — the remaining test guards the unavoidable HTML copy,
 * which cannot import TypeScript, instead of guarding a second TypeScript implementation.
 */
export const resolveInitialTheme = (fallback: ThemeId): ThemeId =>
  resolveStartupPreference(fallback).themeId;

export default readThemePreferenceSnapshot;
