/**
 * themeCrossTab.test.tsx
 * ======================
 *
 * The gate for the theme system's cross-tab contract: what a tab does when ANOTHER tab
 * writes the two theme storage keys.
 *
 * Companion suites, split out under Rule 4's 300-line cap:
 * - `themeWritePath.test.tsx` — what THIS tab writes
 * - `themeSystemPreference.test.tsx` — "Match system" off, and OS-preference freshness
 * - `themeCrossTabResets.test.tsx` — cleared/removed keys and non-authoritative events (S1)
 *
 * TWO MEASURED FAILURES THIS FILE LOCKS DOWN. The full account, with the numbers, is in
 * `useCrossTabThemeSync.ts`; this file asserts the behaviour.
 *
 * 1. THE REVERSE DIRECTION OF THE STORAGE SYNC WAS NEVER COVERED (round 4). An explicit
 *    pick writes both keys, producing two `storage` events. The listener skipped the theme
 *    event while `follow` was still true, and the follow event then only flipped the flag —
 *    so the tab kept the system theme while the picker read "Match system: off", and a
 *    reload jumped to the theme the user had actually chosen.
 *
 * 2. THE EVENT PAYLOAD IS HISTORICAL; STORAGE IS THE TRUTH (Astra R5, A1-01). Deciding
 *    from `event.newValue` let a DELAYED peer event resurrect a value this tab had already
 *    moved past, discarding the pick.
 *
 * Every event here is delivered through `deliverStorageEvent`, which sets `storageArea` to
 * the real `localStorage`. See that helper for why an event without it tests nothing.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY } from './UniversalThemeContext';
import { deliverStorageEvent, mountProbe } from './themeTestProbe';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('cross-tab theme sync', () => {
  it('adopts a theme picked in another tab, even while this tab follows the system', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { read } = mountProbe();
    expect(read().follow).toBe('true');

    // Exactly what another tab's explicit pick does: it WRITES both keys (which is what
    // makes the storage event truthful) and the browser then delivers one event per key.
    await act(async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'solar-gold', oldValue: 'crystalline-light' });
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'false', oldValue: 'true' });
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
  });

  it('adopts the stored theme when another tab turns follow-system OFF', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');

    const { read } = mountProbe();

    await act(async () => {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'false', oldValue: 'true' });
    });

    expect(read()).toEqual({ theme: 'enchanted-forest', follow: 'false' });
  });

  it('ignores a theme write while still following the system (unchanged contract)', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    const { read } = mountProbe();
    const before = read().theme;

    await act(async () => {
      // The write lands first, as it must in a real browser, then the event is delivered.
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'solar-gold', oldValue: null });
    });

    // The flag is authoritative while it is on; only the follow event may move us.
    expect(read()).toEqual({ theme: before, follow: 'true' });
  });

  it('tracks follow-system turning ON in another tab', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();
    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });

    await act(async () => {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'true', oldValue: 'false' });
    });

    const after = read();
    expect(after.follow).toBe('true');
    // On this machine the stubbed media query resolves to dark.
    expect(after.theme).toBe('crystalline-dark');
  });

  /**
   * The write ORDER is not what makes this work — the fresh read is.
   *
   * The comments used to claim the order was load-bearing: that writing the flag first
   * "left a window in which a peer read the stale theme". That does not hold.
   * `localStorage` is a synchronous, origin-shared store and `storage` events are queued
   * as tasks, so both writes have already landed before any peer listener runs, in either
   * order. This test delivers the two events in the OPPOSITE order and asserts the peer
   * still lands on the picked theme.
   */
  it('adopts the picked theme even when the two storage events arrive in the opposite order', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { read } = mountProbe();

    await act(async () => {
      // Both writes have landed before any event runs — that is the point.
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');

      // ...but the flag event is delivered first.
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'false', oldValue: 'true' });
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'solar-gold', oldValue: 'crystalline-light' });
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
  });
});

describe('the event payload is historical, storage is current', () => {
  it('a delayed follow-system event does not re-enable following over a local pick', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { read, setTheme } = mountProbe();

    // The local user picks a theme. That writes FOLLOW=false (an explicit pick outranks
    // follow-system), so storage now says the user is NOT following.
    await act(async () => {
      setTheme('solar-gold');
    });
    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });

    // A peer's earlier "follow-system ON" event arrives late. Its payload says `true`;
    // storage says `false`. Storage is the newer fact.
    await act(async () => {
      deliverStorageEvent({ key: FOLLOW_SYSTEM_STORAGE_KEY, newValue: 'true', oldValue: 'false' });
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
  });

  it('ignores a storage event raised by a different storage area', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();

    // `sessionStorage` uses the same key names and raises the same `storage` event.
    // Only `localStorage` is this contract's business.
    await act(async () => {
      deliverStorageEvent({
        key: THEME_STORAGE_KEY,
        newValue: 'enchanted-forest',
        oldValue: 'solar-gold',
        storageArea: window.sessionStorage,
      });
    });

    expect(read().theme).toBe('solar-gold');
  });
});
