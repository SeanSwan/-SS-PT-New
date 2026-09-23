/**
 * useCrossTabThemeSync.ts
 * =======================
 *
 * Keeps every open tab on the same theme. Extracted from `UniversalThemeContext.tsx`
 * under Rule 4's own remedy list ("extract hooks, utils, styles, types") after the
 * round-4 fix pushed the provider to 344 lines.
 *
 * THIS HOOK DECIDES **WHEN**. IT DOES NOT DECIDE **WHAT**.
 *
 * Under S1 the resolution moved to `useThemePreference.reconcileFromStorage`, which takes
 * a guarded snapshot and applies the complete resolved preference in one update. The
 * listener's whole job is now event filtering: is this event one this tab must act on?
 * That split is what stops the writer and the listener from drifting into two copies of
 * the precedence rules, which is the defect class this lane keeps re-producing.
 *
 * ── WHY THIS IS NOT JUST "SYNC localStorage" ──────────────────────────────────
 *
 * An explicit pick writes TWO keys — THEME_STORAGE_KEY (the chosen theme) and
 * FOLLOW_SYSTEM_STORAGE_KEY ('false') — which the browser delivers as two separate
 * `storage` events. Treating them in isolation produced the round-4 defect:
 *
 *   tab A: follow-system ON, showing the system theme
 *   tab B: user picks Solar Gold
 *   tab A: start                 {theme: crystalline-dark, follow: true}
 *          after tab B picks     {theme: crystalline-dark, follow: false}   <- wrong
 *          expected              {theme: solar-gold,      follow: false}
 *
 * Tab A then displayed the system theme while the picker's switch read "off", and a reload
 * jumped to the theme the user had actually chosen. The FORWARD direction always worked,
 * because a change to the follow flag re-ran the OS observer — which is why only the
 * reverse direction was broken, and why it survived three review rounds.
 *
 * Delegating to a snapshot-based reconcile handles this by construction: either event
 * triggers a read of BOTH keys as they are NOW, so the order the events arrive in cannot
 * matter. `themeCrossTab.test.tsx` delivers them in the opposite order to prove it.
 *
 * ── THE EVENT PAYLOAD IS A HINT; STORAGE IS THE TRUTH (Astra R5, A1-01) ───────
 *
 * This hook used to decide from `event.newValue`. That is a SNAPSHOT taken when the write
 * happened, and `storage` events are queued as tasks — so this tab can write its own key
 * in between the peer's write and the event's delivery. Measured: the user picks a theme
 * (which writes follow=false), then a delayed peer "follow-system ON" event lands with
 * `newValue: 'true'`, and the tab re-enabled following and reverted to the system theme —
 * **discarding the pick**. The payload is now ignored entirely.
 *
 * ── THE STORAGE-AREA GUARD IS NOW STRICT (S1) ─────────────────────────────────
 *
 * It read `if (event.storageArea && event.storageArea !== window.localStorage) return;`.
 * That is vacuously permissive in two ways, and both were reachable:
 *
 *   - a synthetic event with `storageArea: null` passed the guard and was reconciled, even
 *     though `03-contracts.md` says null-area synthetic events "are not production
 *     authority";
 *   - `window.localStorage` was re-read per event rather than being the object this hook
 *     actually reads through, so the comparison was against a second acquisition of the
 *     same global rather than against the guarded handle.
 *
 * The guard is now `event.storageArea !== storage`, against the handle obtained inside the
 * guarded boundary. `themeCrossTab.test.tsx` covers both: a wrong area causes ZERO
 * reconciliation, and a null area is ignored. `sessionStorage` shares both key names and
 * raises the same event, so a sessionStorage theme write used to move the theme — measured.
 */

import { useEffect } from 'react';
import {
  FOLLOW_SYSTEM_STORAGE_KEY,
  THEME_STORAGE_KEY,
  getLocalStorage,
} from './themePersistence';

export interface CrossTabThemeSyncOptions {
  /**
   * Read storage and apply a complete resolved preference, or do nothing.
   *
   * Owned by `useThemePreference`. It is responsible for the "no pending local save" gate
   * and for rule 5 (an unavailable active-session read retains both current fields) —
   * neither of which the listener can evaluate.
   */
  reconcile: () => void;
}

export const useCrossTabThemeSync = ({ reconcile }: CrossTabThemeSyncOptions): void => {
  useEffect(() => {
    // The handle this hook compares against AND reads through — one acquisition, inside
    // the guarded boundary, so a denied `localStorage` getter cannot throw here.
    const storage = getLocalStorage();

    const isRelevant = (event: StorageEvent): boolean => {
      /*
       * STRICT equality. A null area is not production authority, and `sessionStorage`
       * raises the same event with the same keys — see the header.
       */
      if (event.storageArea !== storage) return false;

      // `key === null` means the whole store was cleared: reconcile rather than ignore.
      return (
        event.key === THEME_STORAGE_KEY ||
        event.key === FOLLOW_SYSTEM_STORAGE_KEY ||
        event.key === null
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (!isRelevant(event)) return;
      // The payload is never read. See the A1-01 failure in the header.
      reconcile();
    };

    /*
     * `pageshow` covers the bfcache path, where a page is resumed without a reload and no
     * `storage` event is delivered for changes made while it was frozen. Return-to-visible
     * covers a backgrounded tab, which is the same gap reached a different way. Both
     * reconcile; neither writes, and a hidden page does neither.
     */
    const reconcileWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      reconcile();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pageshow', reconcileWhenVisible);
    document.addEventListener('visibilitychange', reconcileWhenVisible);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', reconcileWhenVisible);
      document.removeEventListener('visibilitychange', reconcileWhenVisible);
    };
  }, [reconcile]);
};

export default useCrossTabThemeSync;
