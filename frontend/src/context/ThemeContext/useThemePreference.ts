/**
 * useThemePreference.ts
 * =====================
 *
 * The preference owner. Astra R6 S1 — `01-architecture.md` §Ownership:
 * *"`useThemePreference.ts`: current preference, pending local intent and persistence status."*
 *
 * ── WHAT OWNS WHAT ────────────────────────────────────────────────────────────
 *
 * Three modules share this concern and the boundaries are deliberate:
 *
 *   `themePreferenceSnapshot.ts`  what storage HOLDS, and what that means (pure)
 *   `themeStorageWrites.ts`       what a write DOES, and whether it persisted (pure)
 *   this file                     the live preference, and who may change it
 *
 * The cross-tab listener does NOT live here. `useCrossTabThemeSync.ts` decides **when**
 * to reconcile; this module decides **what** the result is. That split is what lets the
 * listener be a pure event filter while the resolution rules stay in one place.
 *
 * ── WHY THE PREFERENCE IS ONE STATE OBJECT, NOT TWO ───────────────────────────
 *
 * `themeId` and `followSystem` are one logical value — `followSystem: true` makes the
 * stored theme irrelevant, and an explicit pick clears the flag. The cross-tab contract
 * requires "apply a complete resolved preference in one state update", so it is one object
 * and one setter.
 *
 * The atomicity does NOT rest on React's batching. Measured 2026-09-20: injecting a
 * two-call reconcile (an intermediate pair, then the resolved one) still renders a single
 * pair, because React 18 batches updates made in the same tick. Batching would therefore
 * have HIDDEN such a defect rather than prevented it — and batching does not apply across
 * an `await` or an effect boundary. One object makes the split unrepresentable instead of
 * merely unobserved. Do not restate the old two-`useState` form as having been MEASURED to
 * tear; it was not.
 *
 * ── PENDING LOCAL INTENT ──────────────────────────────────────────────────────
 *
 * `pendingLocalWrite` is true only after a local persistence attempt FAILED. While it is
 * true, peer and foreground reconciliation must not overwrite the preference: the user's
 * choice is on screen and in memory, and a peer's older value must not silently discard
 * it. A successful retry, or any new local action, clears it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { themes, themeCycle, type ThemeId } from './themePalettes';
import {
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  isKnownThemeId,
} from './themePersistence';
import {
  readThemePreferenceSnapshot,
  resolveStartupPreference,
  resolveThemePreference,
  type ThemePreference,
} from './themePreferenceSnapshot';
import {
  writeThemePreference,
  type ThemeWriteOperation,
  type ThemeWriteStatus,
} from './themeStorageWrites';
import { useSystemColorScheme } from './useSystemColorScheme';

/** `unverified` is the state before any local write has been attempted or judged. */
export type PersistenceStatus = ThemeWriteStatus | 'unverified';

export interface ThemePreferenceController {
  currentTheme: ThemeId;
  followSystemTheme: boolean;
  systemPrefersDark: boolean;
  /** Whether the last local write is known to have persisted. */
  persistenceStatus: PersistenceStatus;
  /** True only after an unsuccessful local persistence attempt. */
  pendingLocalWrite: boolean;
  setTheme: (themeId: ThemeId) => void;
  /** Cycle one step; pass -1 to walk the cycle backwards. */
  toggleTheme: (direction?: 1 | -1) => void;
  setFollowSystemTheme: (follow: boolean) => void;
  /** One attempt to save the current desired preference. Never retries automatically. */
  retryThemePersistence: () => void;
  /** Called by the cross-tab listener when something relevant may have changed. */
  reconcileFromStorage: () => void;
}

export const useThemePreference = (fallback: ThemeId): ThemePreferenceController => {
  const [preference, setPreference] = useState<ThemePreference>(() => resolveStartupPreference(fallback));
  const systemPrefersDark = useSystemColorScheme();

  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('unverified');
  const [pendingLocalWrite, setPendingLocalWriteState] = useState(false);

  /*
   * Refs mirroring state that identity-stable callbacks must read.
   *
   * These are refs rather than dependencies so `reconcileFromStorage` keeps ONE identity
   * for the provider's lifetime: the cross-tab listener registers once and is never torn
   * down and rebuilt while the app runs. `themeRef` in the provider follows the same
   * pattern for the same reason.
   */
  const preferenceRef = useRef(preference);
  const pendingRef = useRef(false);
  const systemDarkRef = useRef(systemPrefersDark);
  systemDarkRef.current = systemPrefersDark;

  /** The single write point for the preference: state and mirror move together. */
  const applyPreference = useCallback((next: ThemePreference) => {
    preferenceRef.current = next;
    setPreference(next);
  }, []);

  const setPending = useCallback((value: boolean) => {
    // Written synchronously so a storage event delivered before React re-renders still
    // sees the truth — the listener is not allowed to adopt over an unsaved choice.
    pendingRef.current = value;
    setPendingLocalWriteState(value);
  }, []);

  /** The last thing the user asked for, so a retry re-attempts that rather than guessing. */
  const desiredRef = useRef<ThemeWriteOperation | null>(null);

  const runWrite = useCallback((operation: ThemeWriteOperation) => {
    desiredRef.current = operation;
    const { status } = writeThemePreference(operation);
    setPersistenceStatus(status);
    setPending(status === 'session-only');
  }, [setPending]);

  /**
   * Tell the app that the user explicitly selected a theme.
   *
   * Fired ONLY from the explicit-selection paths. `03-contracts.md` is explicit that this
   * event must not be extended to OS or peer updates without a separate consumer audit,
   * so neither the OS-apply effect nor `reconcileFromStorage` dispatches it: an OS change
   * and a peer's choice are not selections this tab made. The payload is unchanged —
   * `{ themeId, theme }`.
   */
  const announceSelection = useCallback((themeId: ThemeId) => {
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { themeId, theme: themes[themeId] },
    }));
  }, []);

  const setTheme = useCallback((themeId: ThemeId) => {
    // An unknown id is not a preference change: "invalid action changes nothing".
    if (!isKnownThemeId(themeId)) return;
    applyPreference({ themeId, followSystem: false });
    runWrite({ kind: 'manual', themeId });
    announceSelection(themeId);
  }, [applyPreference, runWrite, announceSelection]);

  const toggleTheme = useCallback((direction: 1 | -1 = 1) => {
    const currentIndex = themeCycle.indexOf(preferenceRef.current.themeId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + direction + themeCycle.length) % themeCycle.length;
    const themeId = themeCycle[nextIndex];
    applyPreference({ themeId, followSystem: false });
    runWrite({ kind: 'manual', themeId });
    announceSelection(themeId);
  }, [applyPreference, runWrite, announceSelection]);

  const setFollowSystemTheme = useCallback((follow: boolean) => {
    const displayed = preferenceRef.current.themeId;
    applyPreference({ themeId: displayed, followSystem: follow });
    /*
     * Disabling persists the DISPLAYED theme, not the stored one — they differ precisely
     * when following was on, and writing the stored one made the next reload jump back to
     * a theme the user had already left. Measured; see `themeStorageWrites.ts`.
     */
    runWrite(follow ? { kind: 'enable-follow' } : { kind: 'disable-follow', themeId: displayed });
  }, [applyPreference, runWrite]);

  /*
   * MEASURED 2026-09-20 — a one-frame inconsistency on the ENABLE path, deliberately left
   * for S3. Enabling following applies the flag here and the system theme in the effect
   * below, so the rendered pairs are:
   *
   *   (solar-gold, false) -> (solar-gold, true) -> (crystalline-dark, true)
   *                          ^^^^^^^^^^^^^^^^^^ follow is ON while the page still shows the
   *                          manual theme. `useEffect` runs after paint, so that frame is
   *                          visible, not merely internal.
   *
   * The DISABLE path is clean, because retaining the displayed theme is the correct result
   * there by definition.
   *
   * Not repaired in S1: no S1 acceptance case names it, and the switch and save-notice UI
   * that would expose it is S3's subject. Believed pre-existing — the original
   * `setFollowSystemTheme` had the same two-step shape (`setFollowSystemThemeState`, then a
   * `[followSystemTheme]`-dependent effect) — but the pre-refactor tree was NOT measured,
   * so "pre-existing" is UNVERIFIED.
   */

  const retryThemePersistence = useCallback(() => {
    const operation = desiredRef.current;
    // Nothing has been attempted yet, so there is nothing to retry. ONE attempt: the
    // contract forbids automatic retry, and a loop here would hammer a storage area that
    // is failing for a reason retrying cannot fix.
    if (!operation) return;
    runWrite(operation);
  }, [runWrite]);

  const reconcileFromStorage = useCallback(() => {
    // An unsaved local choice outranks a peer's write. Adopting here would discard the
    // user's pick — the measured A1-01 failure this guard exists for.
    if (pendingRef.current) return;

    const snapshot = readThemePreferenceSnapshot();
    /*
     * Rule 5: an unavailable ACTIVE-SESSION read retains both current fields. Only the
     * owner can tell this is a session read rather than a startup read, which is why the
     * snapshot is taken here and the listener only decides WHEN to call.
     */
    if (snapshot.kind === 'unavailable') return;

    const resolved = resolveThemePreference(snapshot, systemDarkRef.current, fallback);
    const current = preferenceRef.current;
    if (current.themeId === resolved.themeId && current.followSystem === resolved.followSystem) {
      /*
       * Nothing actually moved, so the persistence status is left alone. The architecture's
       * state machine returns to `unverified` only when an external preference is ADOPTED —
       * resetting it on every notification would erase a `saved` verdict for no reason.
       */
      return;
    }

    applyPreference(resolved);
    // Written by another tab, so this tab has no local attempt to report on.
    setPersistenceStatus('unverified');
    setPending(false);
  }, [applyPreference, setPending, fallback]);

  /**
   * Apply the OS preference to the active theme, but only while following.
   *
   * Does NOT persist: an OS change is not a user decision, and the contract writes only on
   * an explicit action. The observation itself is `useSystemColorScheme`, which is
   * deliberately unaware of following — see that module for the R5 defect (A1-02) that
   * coupling produced.
   */
  useEffect(() => {
    if (!preference.followSystem) return;
    const themeId = systemPrefersDark ? SYSTEM_DARK_THEME : SYSTEM_LIGHT_THEME;
    if (preference.themeId === themeId) return;
    applyPreference({ themeId, followSystem: true });
  }, [preference.followSystem, preference.themeId, systemPrefersDark, applyPreference]);

  return {
    currentTheme: preference.themeId,
    followSystemTheme: preference.followSystem,
    systemPrefersDark,
    persistenceStatus,
    pendingLocalWrite,
    setTheme,
    toggleTheme,
    setFollowSystemTheme,
    retryThemePersistence,
    reconcileFromStorage,
  };
};

export default useThemePreference;
