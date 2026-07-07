/**
 * ============================================================================
 * FILE: workoutLogService.mjs
 * PURPOSE: Surviving date/error primitives of the RETIRED legacy workout
 *          write path (Phase 1.1b, Fable Vision arc).
 * ============================================================================
 *
 * WHAT REMAINS (and why):
 *   - parseWorkoutLogDate — local-calendar date parsing used by
 *     adminWorkoutLoggerController (editWorkout + request validation).
 *   - WorkoutLogError — typed error the controller maps to 400/409.
 *
 * WHAT WAS RETIRED (1.1b, 2026-07-06):
 *   The legacy Path-A write function and its private row builder. All three
 *   write lanes (admin HTTP, AI command dispatcher, coach approval) write
 *   through services/workout/aiWorkoutDailyFormService.mjs
 *   (submitAiWorkoutLogAsDailyForm): DailyWorkoutForm truth, billing
 *   decision lane, plan advance, challenges, idempotent single-post XP via
 *   workoutXpAwardStep. The legacy fn's duplicate auto-post died with it.
 *   Behavior coverage moved with the code — see
 *   tests/unit/workoutLogServiceRetirement.test.mjs.
 * ============================================================================
 */


// ── Typed error for callers to map to HTTP status codes ─────────────────────

export class WorkoutLogError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WorkoutLogError';
    this.code = code; // 'VALIDATION_ERROR' | 'DUPLICATE_DATE'
  }
}

// ── Phase 13.1 (2026-04-15): local-calendar date parsing ───────────────────
//
// Clients (admin, trainer, and the Coach Assistant transcript intake lane)
// send date-only strings in the form `YYYY-MM-DD`, meaning "the user's
// intended calendar day". The old implementation used `new Date(dateStr)`,
// which parses a bare YYYY-MM-DD as UTC midnight. On a UTC-hosted server
// (Render), that gets stored as 2026-04-15T00:00:00Z for a user who picked
// "2026-04-15" — but when the same user in PDT refetches, the display
// renders as 2026-04-14 (5 PM the prior day local). The duplicate-date
// guard then bounds its WHERE clause by server-local calendar day, which
// splits the difference inconsistently.
//
// Fix: when we receive a date-only string, anchor it to server-local NOON
// of that calendar day. Noon is robust against ±12h timezone drift — the
// stored instant always falls within the same calendar day on both the
// server and any realistic client timezone. Full ISO timestamps (which
// carry their own TZ anchor) keep their prior behavior untouched.
export function parseWorkoutLogDate(input) {
  if (input instanceof Date) {
    return input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      // Construct from local components → server-local midnight.
      // Add 12 hours so the instant lives at server-local noon, giving
      // >=12h safety against timezone differences when the same instant
      // is later bucketed by calendar day on the client.
      const dt = new Date(year, month - 1, day, 12, 0, 0, 0);
      // Guard against calendar overflow (Feb 30 etc).
      if (
        dt.getFullYear() === year &&
        dt.getMonth() === month - 1 &&
        dt.getDate() === day
      ) {
        return dt;
      }
      return new Date(NaN);
    }
    return new Date(trimmed);
  }
  return new Date(NaN);
}
