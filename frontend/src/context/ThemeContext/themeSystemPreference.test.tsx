/**
 * themeSystemPreference.test.tsx
 * ==============================
 *
 * Astra R5, A1-02 — extended by R6 S1 (T2).
 *
 * The provider documents `systemPrefersDark` as *"what the OS currently asks for,
 * independent of the active theme"*, and `ThemeLensPopover.tsx:190` renders it as current:
 *
 *   Match system ({systemPrefersDark ? 'dark' : 'light'})
 *
 * The observer used to exit early while following was off, so the value froze at whatever
 * it was the last time following was on — the label could read "dark" after the OS had
 * moved to light. Measured: disable Match system, change the OS colour scheme, reopen the
 * picker, and the label still shows the old value.
 *
 * The fix observes the OS preference ALWAYS and applies it to the active theme only while
 * following. The first two cases lock both halves: the value stays fresh, and the theme
 * does NOT move while following is off.
 *
 * ── S1 ADDITIONS ──────────────────────────────────────────────────────────────
 *
 * S1 moved the observation into `useSystemColorScheme.ts` so it is structurally
 * independent of following rather than merely guarded against it, and this file gained
 * three cases for that hook: `StrictMode leaves one active listener`, `unmount removes
 * listener` and `unsupported media API uses dark fallback`.
 *
 * THE STUB NOW REMOVES LISTENERS, and that is a repair, not a refactor. It previously had
 * `removeEventListener: () => {}` — a no-op — and pushed into a plain array. A stub that
 * cannot unsubscribe cannot tell one live listener from two, so it could not have detected
 * a leak and would have certified one as fixed. The two retained cases did not depend on
 * removal; the three new ones do. A stub that cannot fail is not evidence.
 *
 * jsdom 27.4.0 has no `matchMedia` at all (measured — the provider treats absence and a
 * throw as "prefers dark"), so the two behaviour cases install a controllable stub and
 * fire a real change event through it.
 */

import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY } from './UniversalThemeContext';
import { useSystemColorScheme } from './useSystemColorScheme';
import { mountProbe } from './themeTestProbe';

interface MatchMediaHarness {
  /** How many listeners the stub currently holds. One means no leak; zero means clean. */
  activeListeners: () => number;
  /** Fire a change event through every live listener. */
  emit: (matches: boolean) => void;
  restore: () => void;
}

/**
 * A controllable `matchMedia` that really subscribes and really unsubscribes.
 *
 * The count is the point: `activeListeners()` is what separates "the effect cleaned up"
 * from "the effect ran twice and left both listeners attached".
 */
const installMatchMediaStub = (initialMatches = true): MatchMediaHarness => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const original = window.matchMedia;
  const query = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
  };

  window.matchMedia = ((media: string) => ({ ...query, media })) as unknown as typeof window.matchMedia;

  return {
    activeListeners: () => listeners.size,
    emit: (matches: boolean) => {
      query.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
    restore: () => {
      window.matchMedia = original;
    },
  };
};

/** Forces StrictMode so the double-invoke of effects is real, not assumed. */
const StrictModeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(StrictMode, null, children);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('the reported OS preference stays current while following is OFF', () => {
  it('tracks an OS change without moving the theme', async () => {
    const harness = installMatchMediaStub();

    try {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

      const { read, readSystemPrefersDark } = mountProbe();
      expect(readSystemPrefersDark()).toBe(true);

      await act(async () => {
        harness.emit(false);
      });

      // The OS preference is reported fresh...
      expect(readSystemPrefersDark()).toBe(false);
      // ...and the theme did NOT move, because following is off.
      expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
    } finally {
      harness.restore();
    }
  });

  it('applies the OS preference to the theme while following is ON', async () => {
    const harness = installMatchMediaStub();

    try {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

      const { read } = mountProbe();
      // Following is on, so the stubbed "prefers dark" wins over the stored theme.
      expect(read().theme).toBe('crystalline-dark');

      await act(async () => {
        harness.emit(false);
      });

      // The other half of the contract: while following, an OS change DOES move the theme.
      expect(read()).toEqual({ theme: 'crystalline-light', follow: 'true' });
    } finally {
      harness.restore();
    }
  });
});

describe('useSystemColorScheme — subscription lifecycle', () => {
  it('StrictMode leaves one active listener', () => {
    const harness = installMatchMediaStub();

    try {
      // StrictMode mounts, runs the effect, runs its cleanup, then runs the effect again.
      // Without the cleanup this leaves TWO live listeners and every OS change is applied
      // twice — invisible until something is stateful per listener, which is why the count
      // is asserted directly rather than inferred from a rendered value.
      renderHook(() => useSystemColorScheme(), { wrapper: StrictModeWrapper });

      expect(harness.activeListeners()).toBe(1);
    } finally {
      harness.restore();
    }
  });

  it('unmount removes listener', () => {
    const harness = installMatchMediaStub();

    try {
      const { unmount } = renderHook(() => useSystemColorScheme());
      expect(harness.activeListeners()).toBe(1);

      unmount();

      // The query object outlives the component, so a listener left behind fires into a
      // dead `setState`. React 18 no longer warns about that, so the count is the only
      // thing that shows it.
      expect(harness.activeListeners()).toBe(0);
    } finally {
      harness.restore();
    }
  });

  it('unsupported media API uses dark fallback', () => {
    const original = window.matchMedia;
    // "Unsupported" is made explicit rather than inherited from jsdom, so this case keeps
    // testing the branch it names even if a future jsdom ships `matchMedia`.
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    try {
      expect(window.matchMedia).toBeUndefined();

      const { result } = renderHook(() => useSystemColorScheme());

      // The contract: a platform that cannot answer is treated as DARK, not light. The app
      // is dark-first, so this is the direction whose wrong guess does not flash.
      expect(result.current).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
});
