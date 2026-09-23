/**
 * themeWritePath.test.tsx
 * =======================
 *
 * What THIS tab writes. Split out of `themeCrossTab.test.tsx` under Rule 4's 300-line cap.
 *
 * THE POINT OF THIS FILE: every test in `themeCrossTab.test.tsx` hand-writes
 * `localStorage` and then dispatches a synthetic `StorageEvent`. That is a faithful model
 * of what a PEER receives — but it means none of them reaches `applyThemeChoice`'s own
 * write path, which is exactly where the round-4 write-order claim lived. That is why the
 * claim survived three review rounds: the suite proved the listener was right and said
 * nothing at all about the writer.
 *
 * These tests call the real setters and assert what actually landed.
 *
 * They deliberately do NOT assert the write ORDER. The order is not an invariant — it was
 * measured to make no difference to a peer (see the opposite-order test in
 * `themeCrossTab.test.tsx`). Asserting it would lock in a non-fact, which is the exact
 * defect this round corrected.
 *
 * MEASURED FAILURE ALSO LOCKED HERE: turning "Match system" off did not persist what was
 * on screen. `setFollowSystemTheme(false)` wrote the flag and nothing else, so
 * THEME_STORAGE_KEY kept whatever was last explicitly picked — a value the user had
 * already abandoned by turning follow-system on. The displayed theme and the persisted
 * theme therefore disagreed, and `resolveInitialTheme` reads the persisted one. Toggle the
 * switch off, reload, and the theme changes.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import {
  FOLLOW_SYSTEM_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ThemeId,
} from './UniversalThemeContext';
import { mountProbe } from './themeTestProbe';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('the write path itself (which the listener tests never reach)', () => {
  it('setTheme writes BOTH keys, so a peer has something truthful to read', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { setTheme } = mountProbe();
    await act(async () => {
      setTheme('solar-gold');
    });

    // Both keys, in one transaction. If either is missing, the peer's fresh read
    // (see useCrossTabThemeSync.ts) picks up a stale or absent value.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
    expect(window.localStorage.getItem(FOLLOW_SYSTEM_STORAGE_KEY)).toBe('false');
  });

  it('setTheme on an unknown id writes nothing and does not move the theme', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');

    const { setTheme, read } = mountProbe();
    await act(async () => {
      // Cast through unknown: this is the shape a bad URL param or a stale stored value
      // produces, and the `isKnownThemeId` guard in `setTheme` must reject it.
      setTheme('not-a-theme' as unknown as ThemeId);
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
    expect(read().theme).toBe('solar-gold');
  });
});

describe('turning "Match system" off keeps what is on screen', () => {
  it('persists the displayed theme, so a reload does not change it', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read, setFollow } = mountProbe();
    expect(read().theme).toBe('solar-gold');

    // Follow the system, then stop.
    await act(async () => {
      setFollow(true);
    });
    const displayed = read().theme;
    expect(displayed).toBe('crystalline-dark');

    await act(async () => {
      setFollow(false);
    });

    expect(read().follow).toBe('false');
    // The theme on screen is the theme that must survive the reload.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(displayed);
  });
});
