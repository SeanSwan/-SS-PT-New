/**
 * ============================================================================
 * FILE: bootcampAttendanceCanonicalForms.test.mjs — H28.
 *
 * Extracted from `bootcampAttendance.test.mjs` (rule 4: that file reached 333 lines).
 * These four cases are one subject — the canonical `DailyWorkoutForm` rules as they
 * apply to attendance payloads — while that file's remaining describe blocks are about
 * ownership, idempotency and atomicity.
 *
 * Contract §5 line 226 requires canonical validation of each prepared form
 * ("nonempty exercises, date, duration and trainer/client rules"); line 224 requires an
 * EXPLICIT performed identity rather than a silent preference. The mirror lives in
 * `services/bootcamp/bootcampAttendance.mjs`, and its agreement with the REAL model is
 * pinned in `tests/api/bootcampAttendanceRouteSafety.test.mjs`.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import { buildAttendancePayloads } from '../../services/bootcamp/bootcampAttendancePayloads.mjs';

const log = (over = {}) => ({
  id: 42,
  trainerId: 7,
  classDate: '2026-08-03',
  dayType: 'lower_body',
  exercisesUsed: [{ exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' }],
  ...over,
});

const build = (classLogOver = {}, payloadOver = {}) => buildAttendancePayloads({
  classLog: log(classLogOver),
  attendees: [{ userId: 11 }],
  nowIso: '2026-08-03T10:00:00.000Z',
  ...payloadOver,
});

const namesFor = (exercisesUsed) =>
  build({ exercisesUsed }).workoutForms[0].formData.exercises.map((e) => e.name);

describe('H28 — canonical form rules applied to attendance payloads', () => {
  it('rejects a class dated in the FUTURE, like the canonical model does', () => {
    // Mirrors `dateNotFuture` (DailyWorkoutForm.mjs:410-415), compared against the
    // INJECTED clock so the boundary is testable.
    expect(() => build({ classDate: '2026-08-04' })).toThrow(/future/);
    // The SAME day is fine — only a strictly later date is refused.
    expect(() => build({ classDate: '2026-08-03' }, { nowIso: '2026-08-03T23:59:00.000Z' }))
      .not.toThrow();
  });

  it('rejects a roster whose usable exercises are EMPTY, like the canonical model', () => {
    // :421-426 "At least one exercise must be logged".
    expect(() => build({ exercisesUsed: [{ exerciseName: 'Alt', board: 'alternative' }] }))
      .toThrow(/at least one exercise/i);
  });

  it('refuses MIXED-BOARD input instead of silently preferring main (§5 line 224)', () => {
    // "new mixed-board input must explicitly select the main or an authorized
    // alternative". Silently keeping `main` rewrites the record of a client who in fact
    // performed the alternative — exactly the implicit selection the line forbids.
    expect(() => build({
      exercisesUsed: [
        { exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' },
        { exerciseName: 'Wall Sit (knee-friendly)', durationSec: 40, board: 'alternative' },
      ],
    })).toThrow(/explicitly/i);
  });

  it('still accepts the shapes the real client sends: main-only, or no board at all', () => {
    // `useBootcampTaughtLog.ts` maps `mainExercises` only, so neither shape breaks.
    expect(namesFor([{ exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' }]))
      .toEqual(['Goblet Squat']);
    // "Old rows with no board are treated as the trainer-attested performed list."
    expect(namesFor([{ exerciseName: 'Jumping Jacks', durationSec: 30 }]))
      .toEqual(['Jumping Jacks']);
  });
});
