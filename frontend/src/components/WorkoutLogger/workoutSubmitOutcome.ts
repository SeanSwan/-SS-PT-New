/**
 * MODULE: workoutSubmitOutcome
 * Parent: useWorkoutSubmit (Swan Coach V3 · S3 · F4).
 * PURPOSE: Name what actually happened to a workout save, so the AI command
 * bridge can stop guessing.
 *
 * WHY THIS EXISTS
 * `handleSubmit` returned `undefined` from every path — success, validation
 * refusal, offline queue, server rejection and timeout were indistinguishable to
 * any caller. The AI bridge therefore acknowledged the command as handled BEFORE
 * the save was attempted (`acknowledgeAIWorkoutEvent?.()` with no argument
 * defaults `didHandle` to true), and `resolveOutcome(true, true)` records that
 * in the coach intent log as `applied`.
 *
 * The outcomes below are the four the V3 build contract names, plus `busy`,
 * which the contract does not name but the code genuinely reaches: the
 * double-fire race lock returns early while an earlier save is still in flight.
 * Mapping that onto one of the four would have meant choosing a wrong label, so
 * it is named honestly instead.
 *
 * ONLY `saved` MAY EVER RENDER AS "Saved". Everything else means the workout is
 * not known to be on the server.
 */

export const WORKOUT_SUBMIT_OUTCOME = {
  /** Server accepted and returned a durable record. */
  SAVED: 'saved',
  /** No transport — persisted to the offline queue on this device only. */
  KEPT_LOCAL: 'kept_local',
  /** Authoritative rejection, timeout, or unknown outcome. */
  FAILED: 'failed',
  /** The user must change something first (validation, or a duplicate day). */
  NEEDS_REVIEW: 'needs_review',
  /** A previous save for this form is still in flight; this call did nothing. */
  BUSY: 'busy',
} as const;

export type WorkoutSubmitOutcome =
  (typeof WORKOUT_SUBMIT_OUTCOME)[keyof typeof WORKOUT_SUBMIT_OUTCOME];

/**
 * Did an effector genuinely decline this command, without attempting a save?
 *
 * This is the ONLY question the synchronous acknowledge seam can answer
 * truthfully for an async effector. `busy` and `needs_review` are settled
 * refusals known before any request leaves the browser, so they are honest
 * `noop`s in the coach intent log.
 *
 * `saved` / `kept_local` / `failed` are NOT knowable at acknowledge time —
 * see the seam limitation documented in useWorkoutSubmit.
 */
export const isSettledRefusal = (outcome: WorkoutSubmitOutcome): boolean =>
  outcome === WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW ||
  outcome === WORKOUT_SUBMIT_OUTCOME.BUSY;
