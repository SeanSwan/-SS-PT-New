/**
 * themeStorageWrites.ts
 * =====================
 *
 * The WRITE half of the two-key theme transaction. The READ half — the cross-tab
 * listener that has to interpret these writes — is `useCrossTabThemeSync.ts`.
 * The split is deliberate, and the two files describe one invariant: what the
 * reader may assume about what has been written. Extracted from
 * `UniversalThemeContext.tsx` under Rule 4's remedy list ("extract hooks, utils,
 * styles, types") after the provider reached 305 lines.
 *
 * The two keys:
 *
 *   1. THEME_STORAGE_KEY         <- the theme to restore
 *   2. FOLLOW_SYSTEM_STORAGE_KEY <- whether the OS colour scheme wins
 *
 * THEME IS WRITTEN FIRST, BUT THE ORDER IS NOT LOAD-BEARING — it is kept for
 * readability, and it is NOT the reason a peer tab stays correct.
 *
 * This file previously claimed the order was load-bearing: that writing the flag
 * first "left a window in which the peer read the stale theme and then corrected
 * itself a frame later". Measured, there is no such window. `localStorage` is a
 * synchronous, origin-shared store and `storage` events are queued as tasks, so by
 * the time a peer's listener runs, BOTH writes have already landed — in either
 * order. What actually makes the peer correct is that the follow branch RE-READS
 * THEME_STORAGE_KEY when it handles the event (see `useCrossTabThemeSync.ts`)
 * rather than trusting the event payload or the delivery order.
 *
 * `themeCrossTab.test.tsx` locks this down by delivering the two events in the
 * OPPOSITE order and asserting the peer still lands on the picked theme. Do not
 * reintroduce the ordering claim; it was verified false, and a false mechanism in
 * a comment is worse than no comment.
 *
 * ── S1: ONE WRITER, THREE OPERATIONS, WITH READBACK (Astra R6, `03-contracts.md`) ──
 *
 * This file used to expose two functions — `persistThemeChoice(themeId, clearFollow)`
 * and `persistFollowSystemChange(follow, currentTheme)` — that wrote keys and returned
 * nothing. A write that returns nothing cannot report that it failed, so the UI could
 * not distinguish "saved" from "this session only", and a write silently swallowed by
 * private mode or a quota error looked exactly like success.
 *
 * Both are replaced by `writeThemePreference`, which takes one of exactly three
 * operations, performs that operation's writes, READS BACK what it needs, and reports
 * `saved` or `session-only`. They are not kept as wrappers: nothing referenced them once
 * the provider moved over (`clearFollowSystem` was always `true` at its only call site),
 * and the contract's three operations cover every write this control performs.
 */

import {
  FOLLOW_SYSTEM_STORAGE_KEY,
  THEME_STORAGE_KEY,
  safeReadStorage,
  safeWriteStorage,
} from './themePersistence';
import type { ThemeId } from './themePalettes';

/**
 * The complete set of writes this control performs. Exactly one of:
 *
 *   - `manual`         — the user picked a theme; an explicit pick outranks following,
 *                        so the flag is cleared in the same operation.
 *   - `disable-follow` — the user turned Match system OFF; the DISPLAYED theme is
 *                        persisted so a reload does not jump (see the measured failure
 *                        below), and the flag is cleared.
 *   - `enable-follow`  — the user turned Match system ON. Writes ONLY the flag: the
 *                        stored theme is deliberately left alone as the value to restore
 *                        when following is later switched off.
 */
export type ThemeWriteOperation =
  | { kind: 'manual'; themeId: ThemeId }
  | { kind: 'disable-follow'; themeId: ThemeId }
  | { kind: 'enable-follow' };

/** `unverified` is the pre-first-write state and lives in the owner, not here. */
export type ThemeWriteStatus = 'saved' | 'session-only';

/**
 * Read back the pair a manual or disable-follow write is required to have produced.
 *
 * Both values must match the DESIRED ones, not merely be non-null: a write that was
 * silently dropped leaves the PREVIOUS value in place, which is the failure mode that
 * looks like success if you only check that a read did not throw.
 */
const readBackPair = (themeId: ThemeId): boolean =>
  safeReadStorage(THEME_STORAGE_KEY) === themeId &&
  safeReadStorage(FOLLOW_SYSTEM_STORAGE_KEY) === 'false';

/**
 * Perform one preference write and report whether it actually persisted.
 *
 * Order is deterministic (`03-contracts.md` §Write rules) for implementation simplicity,
 * NOT for atomicity — the contract says so explicitly. There are no compensating writes:
 * if the second write fails, the first is left in place, because another tab may have
 * changed storage in between and unwinding it would clobber that tab's decision.
 *
 * A failure at either write, or a readback that does not match, returns `session-only`.
 * The caller keeps the in-memory preference either way — the theme still applies, it just
 * will not survive a reload, and the UI says so.
 */
export const writeThemePreference = (
  operation: ThemeWriteOperation,
): { status: ThemeWriteStatus } => {
  switch (operation.kind) {
    /*
     * `manual` and `disable-follow` perform the same two writes and differ only in WHY —
     * which theme is being written. They are kept as separate operations rather than
     * collapsed because the intent is what the caller states, and the readback is
     * identical either way.
     */
    case 'manual':
    case 'disable-follow': {
      safeWriteStorage(THEME_STORAGE_KEY, operation.themeId);
      safeWriteStorage(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
      return { status: readBackPair(operation.themeId) ? 'saved' : 'session-only' };
    }

    /*
     * Enable-follow writes the flag ONLY, so requiring the theme key to match would fail
     * a write that is correct. It reads back just the value it wrote.
     */
    case 'enable-follow': {
      safeWriteStorage(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      return { status: safeReadStorage(FOLLOW_SYSTEM_STORAGE_KEY) === 'true' ? 'saved' : 'session-only' };
    }
  }
};
