/**
 * useSystemColorScheme.ts
 * =======================
 *
 * The OS colour-scheme observer, on its own. Astra R6 S1 — `01-architecture.md`
 * §Ownership: *"`useSystemColorScheme.ts`: OS observation, independent of follow mode."*
 *
 * ── WHY THIS IS SEPARATE FROM THE PREFERENCE OWNER ────────────────────────────
 *
 * Two different questions live here, and they used to be answered by one effect:
 *
 *   1. What does the OS currently ask for?          <- this hook
 *   2. Should the active theme move because of it?  <- `useThemePreference`
 *
 * The provider used to do both in a single effect whose dependency array held
 * `followSystemTheme`. That coupling caused the R5 defect (A1-02): the effect exited
 * early while following was off, so the reported OS value FROZE at whatever it was the
 * last time following was on, while `ThemeLensPopover.tsx:190` renders it as current
 * ("Match system (dark)"). Measured: disable Match system, change the OS scheme, reopen
 * the picker — the label still showed the old value.
 *
 * Separating them is what fixes that structurally rather than by adding a guard. This
 * hook has NO dependency on `followSystemTheme`, so it cannot go stale when following
 * changes; the decision to apply belongs to the owner, which knows the flag.
 *
 * ── LIFECYCLE ─────────────────────────────────────────────────────────────────
 *
 * The subscription is removed on unmount and re-created under React 18 StrictMode's
 * double-invoke, leaving exactly one active listener. Both are asserted in
 * `themeSystemPreference.test.tsx` — with a stub that really removes, because a stub
 * whose `removeEventListener` is a no-op cannot tell one listener from two and would
 * have certified the leak as fixed.
 *
 * "True when unsupported or denied" is the contract (`03-contracts.md`): a platform with
 * no `matchMedia`, or one whose query throws, is treated as dark. That is the same
 * dark-first default as `prefersDarkColorScheme()` in `themePersistence.ts`, which is
 * reused here rather than restated — one definition of the default, not two.
 */

import { useEffect, useState } from 'react';
import { prefersDarkColorScheme } from './themePersistence';

/**
 * Acquire the dark-scheme query, or `null` when the platform cannot provide one.
 *
 * Returns `null` instead of throwing so the caller cannot forget the guard — the same
 * shape as `getLocalStorage()`. `matchMedia` is absent in jsdom and in some embedded
 * webviews; it can also be present and throw.
 */
export const acquireDarkSchemeQuery = (): MediaQueryList | null => {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  } catch {
    return null;
  }
};

/**
 * The OS's current dark preference. Re-renders when the OS changes it.
 *
 * Independent of `followSystemTheme` by construction: this hook is not told about
 * following at all, so no change to following can freeze the value it reports.
 */
export const useSystemColorScheme = (): boolean => {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => prefersDarkColorScheme());

  useEffect(() => {
    const query = acquireDarkSchemeQuery();

    /*
     * Re-read on mount rather than trusting the `useState` initialiser. The initialiser
     * ran during the render that first created this component, which can be a different
     * task from this effect — and the OS scheme is not ours to assume unchanged.
     * `true` is the unsupported/denied answer, matching `prefersDarkColorScheme()`.
     */
    setPrefersDark(query ? query.matches : true);

    if (!query) return;

    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener?.('change', handleChange);
    return () => query.removeEventListener?.('change', handleChange);
  }, []);

  return prefersDark;
};

export default useSystemColorScheme;
