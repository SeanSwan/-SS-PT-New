/**
 * ============================================================================
 * FILE: sprintSlotTaughtLog.test.mjs — H29b (contract §5 lines 216, 218, 222).
 *
 * The derivation is pinned FIELD BY FIELD here rather than inferred from the confirmation
 * flow, because the two properties that matter are properties of this function alone:
 *
 *   1. It is PURE. The payload's hash is what makes a retry a retry (§5 line 220), so any
 *      field that changed between two calls on unchanged data would turn an honest retry
 *      into a 409. `sameSlotSameHash` below is the regression lock for that.
 *   2. It never INVENTS history. A planned slot, a missing snapshot, or a snapshot with no
 *      main-board work returns `ok:false` so the caller fails instead of writing a log.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';

import { hashTaughtPayload } from '../../services/bootcamp/bootcampTaughtIdentity.mjs';
import { TRAINER_ATTESTED_PRESCRIPTION } from '../../services/bootcamp/bootcampExecutionSummary.mjs';
import {
  NOT_CONFIRMABLE,
  buildSlotTaughtLogPayload,
} from '../../services/bootcamp/sprintSlotTaughtLog.mjs';

const snapshot = (over = {}) => ({
  dayType: 'lower_body',
  stationCount: 5,
  rounds: 2,
  exercisesPerStation: 4,
  exerciseDurationSec: 30,
  targetDuration: 45,
  expectedParticipants: 10,
  exercises: [
    { exerciseName: 'Back Squat', stationIndex: 0, durationSec: 30, board: 'main' },
    { exerciseName: 'Romanian Deadlift', stationIndex: 1, durationSec: 30 },
    { exerciseName: 'Low Box Step-Up', stationIndex: 0, durationSec: 30, board: 'alternative' },
    { exerciseName: 'Step-Up', stationIndex: 0, durationSec: 30, board: 'lowImpact' },
  ],
  ...over,
});

const slot = (over = {}) => ({
  id: 41,
  sprintId: 77,
  scheduledDate: '2026-09-13',
  dayType: 'lower_body',
  templateId: 12,
  status: 'generated',
  wasUsed: false,
  classLogId: null,
  generatedClassData: snapshot(),
  ...over,
});

const build = (over = {}, args = {}) => buildSlotTaughtLogPayload({
  slot: slot(over),
  trainerId: 7,
  usedDate: null,
  ...args,
});

describe('H29b — the taught-log payload a Sprint confirmation must write', () => {
  it('keys the log by the SLOT and carries the canonical performed list', () => {
    const { ok, payload } = build();

    expect(ok).toBe(true);
    expect(payload.operationKey).toBe('sprint-slot:41'); // §5 line 218
    expect(payload.trainerId).toBe(7);
    expect(payload.templateId).toBe(12);
    expect(payload.classDate).toBe('2026-09-13');
    expect(payload.dayType).toBe('lower_body');

    // Main board only, in slot order. §5 line 224: "Alternative/lowImpact offers alone never
    // create extra completed sets" — they are OFFERS, not performed movements.
    expect(payload.exercisesUsed).toEqual([
      { exerciseName: 'Back Squat', stationIndex: 0, durationSec: 30 },
      { exerciseName: 'Romanian Deadlift', stationIndex: 1, durationSec: 30 },
    ]);
    // A row with no board counts as performed (§5 line 224), which is why the second entry
    // above is included even though it declares no board.
    expect(payload.exercisesUsed.some((e) => e.exerciseName === 'Low Box Step-Up')).toBe(false);
  });

  it('records a trainer-attested PRESCRIPTION, never measured time or attendance', () => {
    const { payload } = build();

    expect(payload.executionSummary).toEqual({
      kind: TRAINER_ATTESTED_PRESCRIPTION,
      prescribed: {
        workSec: 30, rounds: 2, stationCount: 5, exercisesPerStation: 4, targetDurationMin: 45,
      },
      expectedParticipants: 10,
      performedCount: 2,
      notes: 'Prescribed values, not measured elapsed time or observed attendance.',
    });
    // §5 line 222: "expectedParticipants is not actual attendance." Confirming observes
    // nobody, so the log asserts no attendance at all.
    expect('actualParticipants' in payload).toBe(false);
  });

  it('is PURE: the same slot derives a byte-identical hash on every call', () => {
    // §5 line 220. If this ever fails, a legitimate retry becomes a 409 conflict.
    expect(hashTaughtPayload(build().payload)).toBe(hashTaughtPayload(build().payload));
    expect(hashTaughtPayload(build({}, { usedDate: '2026-09-14' }).payload))
      .toBe(hashTaughtPayload(build({}, { usedDate: '2026-09-14' }).payload));
  });

  it('lets usedDate override the scheduled date, and the hash follow it', () => {
    const moved = build({}, { usedDate: '2026-09-14' });
    expect(moved.payload.classDate).toBe('2026-09-14');
    // A DIFFERENT date must produce a DIFFERENT hash: that is what makes "differing date …
    // is conflict" (§5 line 216) detectable at all.
    expect(hashTaughtPayload(moved.payload)).not.toBe(hashTaughtPayload(build().payload));
  });

  it('refuses a planned, skipped, snapshot-less, or work-less slot', () => {
    expect(build({ status: 'planned' })).toEqual({ ok: false, reason: NOT_CONFIRMABLE.NOT_GENERATED });
    expect(build({ status: 'skipped' })).toEqual({ ok: false, reason: NOT_CONFIRMABLE.NOT_GENERATED });
    expect(build({ generatedClassData: null })).toEqual({ ok: false, reason: NOT_CONFIRMABLE.NO_SNAPSHOT });
    expect(build({ generatedClassData: [] })).toEqual({ ok: false, reason: NOT_CONFIRMABLE.NO_SNAPSHOT });
    expect(build({ generatedClassData: { exercises: [] } }))
      .toEqual({ ok: false, reason: NOT_CONFIRMABLE.NO_EXERCISES });
    // Alternatives only: an offer is not a performed movement.
    expect(build({
      generatedClassData: { exercises: [{ exerciseName: 'Step-Up', board: 'lowImpact' }] },
    })).toEqual({ ok: false, reason: NOT_CONFIRMABLE.NO_EXERCISES });
  });

  it('drops a nameless exercise rather than writing a log with a blank movement', () => {
    const { payload } = build({
      generatedClassData: snapshot({
        exercises: [
          { exerciseName: '   ', stationIndex: 0, durationSec: 30, board: 'main' },
          { exerciseName: 'Back Squat', stationIndex: 1, durationSec: 30, board: 'main' },
        ],
      }),
    });
    expect(payload.exercisesUsed).toEqual([
      { exerciseName: 'Back Squat', stationIndex: 1, durationSec: 30 },
    ]);
  });

  it('tolerates a snapshot that carries no prescription numbers', () => {
    // A legacy snapshot has exercises and little else. The log must still be writable — with
    // nulls where the prescription is unknown, never with invented numbers.
    const { payload } = build({
      generatedClassData: { exercises: [{ exerciseName: 'Back Squat', board: 'main' }] },
    });
    expect(payload.executionSummary.prescribed).toEqual({
      workSec: null, rounds: null, stationCount: null, exercisesPerStation: null, targetDurationMin: null,
    });
    expect(payload.executionSummary.expectedParticipants).toBeNull();
    expect(payload.exercisesUsed).toEqual([
      { exerciseName: 'Back Squat', stationIndex: null, durationSec: undefined },
    ]);
    expect(payload.dayType).toBe('lower_body'); // falls back to the slot's own day type
  });
});
