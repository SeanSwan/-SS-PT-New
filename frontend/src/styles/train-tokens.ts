/**
 * Blueprint: train-tokens
 * Purpose: ONE semantic color language for every Train (workout) surface —
 * the §12-C2 calm-down that ends the logger's mixed cyan/arctic/purple/gold
 * noise. State semantics, not decoration:
 *   pending  = dim Frost   (planned, not yet done — recedes)
 *   active   = Ice Wing    (the ONE thing you are doing now)
 *   done     = Gilded Fern (earned — gold's ONLY use on Train surfaces)
 *   coach    = Wing Purple (Swan Coach affordances ONLY — never set states)
 * Law (contract-tested): Train surface style files consume THESE tokens for
 * set/session state; they never re-declare local gold/purple/status colors,
 * and the Arctic data-only chart color stays in charts, never Train chrome.
 * Source: UNIFIED-WORKOUT-OS-FABLE-BLUEPRINT-2026-07-29.md §12.3-C2.
 */

export const TRAIN = {
  /** Planned / not-yet-logged — recedes into the surface. */
  pending: 'var(--train-pending, var(--text-muted, #94a3b8))',
  /** The set/session being worked RIGHT NOW — the single loud accent. */
  active: 'var(--train-active, var(--accent-primary, #60C0F0))',
  /** Logged / completed — the earned state. Gold's only Train use. */
  done: 'var(--train-done, var(--accent-gold, #C6A84B))',
  /** Swan Coach presence (docks, dictation, proposals). Never a set state. */
  coach: 'var(--train-coach, var(--accent-secondary, #8B5CF6))',
  /** PR / milestone moments — same earned-gold family as `done`. */
  pr: 'var(--train-pr, var(--accent-gold, #C6A84B))',
} as const;

export type TrainToken = keyof typeof TRAIN;
