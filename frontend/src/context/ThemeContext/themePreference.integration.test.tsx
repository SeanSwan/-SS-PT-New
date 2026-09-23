/**
 * themePreference.integration.test.tsx
 * ====================================
 *
 * Astra R6 S1, `09-tests.md` T3 — the cases that connect the preference owner to what a
 * user can actually observe: the injected CSS, the two storage keys, and a peer's update.
 *
 * These mount the REAL provider through `mountProbe` and assert on the real DOM and the
 * real `localStorage`. The lane's defects have all been in the wiring between a setter, a
 * write and a listener, and a mocked provider cannot have that class of bug.
 *
 * The failure cases (write denied, readback mismatch, pending intent) are the companion
 * suite `themeStorageFailures.test.tsx`; this file is the happy path plus the one case
 * that must change NOTHING.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY, type ThemeId } from './UniversalThemeContext';
import { deliverStorageEvent, mountProbe, snapshotStorage } from './themeTestProbe';

/** The stylesheet `injectThemeVariables` owns, read back out of the document. */
const injectedCss = (): string => document.getElementById('theme-variables')?.textContent ?? '';

const clearDom = () => {
  document.documentElement.removeAttribute('data-theme');
  document.getElementById('theme-variables')?.remove();
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearDom();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearDom();
});

describe('preference integration', () => {
  it('manual choice updates context CSS and storage', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { read, setTheme } = mountProbe();
    const cssBefore = injectedCss();
    expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-light');

    await act(async () => {
      // Through the probe, which calls the same setter the lens radio calls.
      setTheme('solar-gold');
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });

    // The injected stylesheet really changed — not merely the attribute. `data-theme` is
    // set by the same function, so asserting only on it would not distinguish "the CSS was
    // rewritten" from "the attribute was".
    expect(injectedCss()).not.toBe(cssBefore);
    expect(injectedCss().length).toBeGreaterThan(0);
    expect(document.documentElement.getAttribute('data-theme')).toBe('solar-gold');

    // Both keys, and the flag cleared — an explicit pick outranks following.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
    expect(window.localStorage.getItem(FOLLOW_SYSTEM_STORAGE_KEY)).toBe('false');
  });

  it('disabling following stores displayed theme', async () => {
    // Following is ON and the stored theme is deliberately NOT what is on screen: that is
    // the entire point of the case. A stored theme alongside follow=true is stale by
    // construction, because an explicit pick clears the flag.
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read, setFollow } = mountProbe();
    // jsdom has no matchMedia, so the OS answer is the dark-first default.
    expect(read()).toEqual({ theme: 'crystalline-dark', follow: 'true' });

    await act(async () => {
      setFollow(false);
    });

    // The DISPLAYED theme is retained and persisted — not the stale stored 'solar-gold'.
    // Persisting the stored value made the next reload jump back to a theme the user had
    // already left; that is the measured failure in `themeStorageWrites.ts`.
    expect(read()).toEqual({ theme: 'crystalline-dark', follow: 'false' });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('crystalline-dark');
    expect(window.localStorage.getItem(FOLLOW_SYSTEM_STORAGE_KEY)).toBe('false');
  });

  it('invalid action changes nothing', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read, setTheme, readPersistenceStatus } = mountProbe();
    const storageBefore = snapshotStorage();
    const statusBefore = readPersistenceStatus();

    await act(async () => {
      // Not a registered theme id. Cast rather than `as any` so the intent is visible:
      // this is exactly the kind of value that can arrive from stale storage or a typo.
      setTheme('not-a-registered-theme' as ThemeId);
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
    // Nothing written...
    expect(snapshotStorage()).toEqual(storageBefore);
    // ...and no write was even ATTEMPTED, so the persistence verdict is untouched. An
    // implementation that wrote first and validated later would flip this to `saved`.
    expect(readPersistenceStatus()).toBe(statusBefore);
  });

  it('peer update applies both fields together', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read, readHistory } = mountProbe();
    expect(read()).toEqual({ theme: 'crystalline-dark', follow: 'true' });

    await act(async () => {
      // A peer disables following, and the theme it was displaying is enchanted-forest.
      window.localStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'false', oldValue: 'true' });
    });

    expect(read()).toEqual({ theme: 'enchanted-forest', follow: 'false' });

    /*
     * The strong half: exactly two distinct pairs were rendered, so no torn pair — one
     * field new and the other stale — was ever visible.
     *
     * WHAT THIS DOES NOT CATCH, measured 2026-09-20 by fault injection: making
     * `reconcileFromStorage` call the setter twice (an intermediate pair, then the
     * resolved one) STILL PASSES, because React 18 batches both updates into a single
     * render. So this is a regression lock on the observed state sequence, not proof that
     * the implementation performs one state update. Do not restate it as the latter.
     *
     * It would catch a reconcile that crossed a render boundary between the two fields —
     * one applied in a handler and the other in an effect, say.
     */
    expect(readHistory()).toEqual([
      { theme: 'crystalline-dark', follow: 'true' },
      { theme: 'enchanted-forest', follow: 'false' },
    ]);
  });
});
