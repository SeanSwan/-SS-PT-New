/**
 * themeCrossTabResets.test.tsx
 * ============================
 *
 * Astra R6 S1, `09-tests.md` T2 — the reset and non-authority half of the cross-tab
 * contract. Split from `themeCrossTab.test.tsx` under Rule 4's 300-line cap, following the
 * precedent that file's own header records (`themeSystemPreference.test.tsx` was split out
 * of it the same way).
 *
 * WHY THESE CASES EXIST
 *
 * The S1 guard change made the listener STRICT: `event.storageArea !== storage`, against
 * the handle obtained inside the guarded boundary, replacing
 * `if (event.storageArea && event.storageArea !== window.localStorage) return;`.
 *
 * That old form was vacuously permissive. `&&` short-circuits on `null`, so a synthetic
 * event with no `storageArea` passed the guard and was reconciled — even though
 * `03-contracts.md` says null-area synthetic events "are not production authority". Four
 * cases in the companion suite were passing for that reason and went red the moment the
 * guard became strict. So the guard now needs cases that prove it DISCRIMINATES rather
 * than merely blocks: `null storage area is ignored` and `wrong storage area causes zero
 * reconciliation` both arrange for storage to genuinely contain a different theme, so a
 * listener that failed to filter would visibly move.
 *
 * The remaining cases cover the resets the contract names: a cleared store and a removed
 * key are MISSING values, which resolve by the normal fallback rules — not unavailability.
 * Collapsing those would make a cleared store indistinguishable from blocked storage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY } from './UniversalThemeContext';
import { deliverStorageEvent, mountProbe, snapshotStorage } from './themeTestProbe';

/** The provider's fallback on the mounted application (`defaultTheme`). */
const FALLBACK = 'crystalline-default';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('cross-tab resets', () => {
  it('clear resolves the supplied fallback', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();
    expect(read().theme).toBe('solar-gold');

    await act(async () => {
      // Another tab cleared the whole store. `key === null` is how the browser says so.
      window.localStorage.clear();
      deliverStorageEvent({ key: null, newValue: null, oldValue: null });
    });

    // Rules 2 and 3: no valid stored theme, so the supplied fallback. Following stays
    // false, because a cleared store has no flag saying otherwise.
    expect(read()).toEqual({ theme: FALLBACK, follow: 'false' });
  });

  it('theme removal resolves fallback', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();

    await act(async () => {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: null, oldValue: 'solar-gold' });
    });

    // A removed key is a MISSING key — readable-and-empty, not unavailability.
    expect(read()).toEqual({ theme: FALLBACK, follow: 'false' });
  });
});

describe('cross-tab non-authoritative events', () => {
  it('null storage area is ignored', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();

    await act(async () => {
      /*
       * Storage GENUINELY contains a different theme, so a reconciled event WOULD move the
       * theme. That is what lets this case fail: a null-area event is declared synthetic
       * rather than production authority, so it must not.
       */
      window.localStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');
      deliverStorageEvent({
        key: THEME_STORAGE_KEY,
        newValue: 'enchanted-forest',
        oldValue: 'solar-gold',
        storageArea: null,
      });
    });

    expect(read().theme).toBe('solar-gold');
  });

  /**
   * The case above covers a NULL area. This one covers a real `sessionStorage`, which shares
   * both key names and raises the same event type.
   *
   * It poisons `localStorage` before delivering the event, and that poison is what makes it
   * non-vacuous. Without it, "the theme did not move" is satisfied by the READ PATH alone —
   * reconciliation reads `localStorage`, which the `sessionStorage` write never touched — so
   * the assertion held even with the area guard deleted. **Measured**: deleting
   * `event.storageArea !== storage` left this case GREEN while the null-area case went RED.
   * With the poison, the assertion depends on the guard: a listener that reconciles on the
   * wrong area reads a value the mounted theme does not have, and the theme moves.
   */
  it('wrong storage area causes zero reconciliation', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    const { read } = mountProbe();

    // The poison: `localStorage` now disagrees with the mounted theme, and no event has been
    // delivered for it — so only a listener that reconciles on the WRONG area can observe it.
    window.localStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');

    await act(async () => {
      // `sessionStorage` shares both key names and raises the same event type.
      window.sessionStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');
      deliverStorageEvent({
        key: THEME_STORAGE_KEY,
        newValue: 'enchanted-forest',
        oldValue: 'solar-gold',
        storageArea: window.sessionStorage,
      });
    });
    expect(read().theme).toBe('solar-gold');

    // Positive control: the identical event through the CORRECT area does reconcile — and it
    // resolves to the poisoned value, so it also proves the listener is alive and that the
    // assertion above is about discrimination rather than about a dead listener.
    await act(async () => {
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'enchanted-forest' });
    });
    expect(read().theme).toBe('enchanted-forest');
  });

  it('peer adoption never writes', async () => {
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const { read } = mountProbe();

    await act(async () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'solar-gold', oldValue: 'crystalline-light' });
    });
    expect(read().theme).toBe('solar-gold');

    /*
     * Snapshot AFTER the peer's writes, then reconcile again through a foreground event —
     * a different trigger down the same path. The peer made the choice; this tab is only
     * catching up, so it must not persist anything. Asserting the WHOLE store is unchanged
     * rather than just the two theme keys also catches a stray write to any other key.
     */
    const before = snapshotStorage();
    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
    });

    expect(snapshotStorage()).toEqual(before);
    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
  });
});
