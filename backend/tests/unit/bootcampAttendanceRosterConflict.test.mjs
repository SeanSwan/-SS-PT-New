/**
 * Attendance roster conflict (hostile review, round 129 MED — silent data loss).
 *
 * THE DEFECT THIS PINS. `recordBootcampAttendanceWithin` answered every submission after the first
 * with `{ alreadyRecorded: true, created: 0 }` — the guard was `if (classLog.attendance?.recordedAt)`
 * and nothing compared the SUBMITTED roster to the STORED one. Combined with the route's
 * `res.status(result.alreadyRecorded ? 200 : 201)` (`bootcampRoutes.mjs:357`), a trainer who lost the
 * response to `{attendees:[11]}` and then submitted the corrected `{attendees:[11,12,13]}` got
 * **200 success** while clients 12 and 13 silently received no `DailyWorkoutForm` — no chart, no
 * streak, no error, and no way to correct it short of DB access. The zero-attendance variant is
 * worse: an explicit no-show confirmation locks the class as "logged with nobody present", and every
 * later real roster is discarded just as quietly.
 *
 * WHY THIS IS THE PACKET'S OWN RULE, not a new one: §5 line 216 gives a changed payload under a used
 * identity its own answer — "differing date or performed payload is conflict, not an overwrite" — and
 * the taught-log sibling already implements exactly that (`bootcampCrud.mjs` `resolveIdempotentLog`
 * → 409). Attendance simply had no `payloadHash` and no comparison. This file asserts the missing
 * half: the record is the authority, and a resend that names a DIFFERENT roster is refused instead
 * of being reported as success.
 *
 * WHY A SEPARATE FILE rather than four more tests in `bootcampAttendance.test.mjs`: that file is
 * already over the rule-4 cap (316 lines, disclosed in the receipt's §5.7), and rule 4 says to
 * extract rather than grow a file past the limit.
 */
import { describe, expect, it, vi } from 'vitest';

import { recordBootcampAttendance } from '../../services/bootcamp/bootcampAttendance.mjs';

const classLog = (over = {}) => ({
  id: 42,
  trainerId: 7,
  classDate: '2026-08-03',
  dayType: 'lower_body',
  attendance: null,
  exercisesUsed: [
    { exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' },
    { exerciseName: 'Jumping Jacks', durationSec: 30, isCardioFinisher: true },
  ],
  ...over,
});

/** The same in-memory seam the sibling suite uses: no database, no route, no writes to disk. */
const deps = (log, over = {}) => {
  let formId = 100;
  const created = [];
  const saved = [];
  return {
    created,
    saved,
    getClassLog: vi.fn(async () => log),
    createWorkoutForm: vi.fn(async (form) => { created.push(form); formId += 1; return formId; }),
    saveClassLog: vi.fn(async (l, patch) => { saved.push(patch); }),
    verifyClientAccess: vi.fn(async () => true),
    now: () => new Date('2026-08-03T14:00:00Z'),
    ...over,
  };
};

const args = { classLogId: 42, trainerId: 7, requesterRole: 'trainer', attendees: [{ userId: 11 }] };
const stored = (attendance) => classLog({ attendance });

describe('recordBootcampAttendance — a resend must name the SAME roster to be a no-op', () => {
  it('an IDENTICAL resend is still a no-op returning the original record', async () => {
    const original = { recordedAt: 'earlier', attendees: [{ userId: 11 }], workoutFormIds: [90] };
    const d = deps(stored(original));

    const result = await recordBootcampAttendance(d, args);

    expect(result).toMatchObject({ alreadyRecorded: true, created: 0 });
    expect(result.attendance).toEqual(original);
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(d.saveClassLog).not.toHaveBeenCalled();
  });

  it('a resend naming a WIDER roster is a 409, not a silent success', async () => {
    const original = { recordedAt: 'earlier', attendees: [{ userId: 11 }], workoutFormIds: [90] };
    const d = deps(stored(original));

    await expect(recordBootcampAttendance(d, {
      ...args, attendees: [{ userId: 11 }, { userId: 12 }, { userId: 13 }],
    })).rejects.toMatchObject({ statusCode: 409 });

    // The forbidden outcome is not the error — it is a 2xx with nothing written.
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(d.saveClassLog).not.toHaveBeenCalled();
  });

  it('a confirmed NO-SHOW lock is not silently overwritten by a later real roster', async () => {
    const noShow = { recordedAt: 'earlier', attendees: [], workoutFormIds: [] };
    const d = deps(stored(noShow));

    // Re-confirming the same no-show is an honest retry …
    const retry = await recordBootcampAttendance(d, { ...args, attendees: [], noShowConfirmed: true });
    expect(retry).toMatchObject({ alreadyRecorded: true, created: 0 });

    // … while a real roster arriving afterwards is a conflict the trainer can see and act on.
    await expect(recordBootcampAttendance(d, args)).rejects.toMatchObject({ statusCode: 409 });
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
  });

  it('GUESTS are part of the roster comparison, not decoration', async () => {
    const original = {
      recordedAt: 'earlier',
      attendees: [{ userId: 11 }, { guest: 'Walk-in Jane' }],
      workoutFormIds: [90, 91],
    };
    const sameGuests = deps(stored(original));
    const retry = await recordBootcampAttendance(sameGuests, {
      ...args, attendees: [{ userId: 11 }, { guest: 'Walk-in Jane' }],
    });
    expect(retry).toMatchObject({ alreadyRecorded: true });

    const differentGuest = deps(stored(original));
    await expect(recordBootcampAttendance(differentGuest, {
      ...args, attendees: [{ userId: 11 }, { guest: 'Walk-in Bob' }],
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('a 409 message tells the trainer what happened, and exposes no internals', async () => {
    const original = { recordedAt: 'earlier', attendees: [{ userId: 11 }], workoutFormIds: [90] };
    const d = deps(stored(original));

    const error = await recordBootcampAttendance(d, {
      ...args, attendees: [{ userId: 12 }],
    }).catch((err) => err);

    expect(error.statusCode).toBe(409);
    expect(error.message).toMatch(/already recorded/i);
    // The stored record is not echoed back: the trainer gets a sentence, not a data dump.
    expect(error.message).not.toContain('90');
    expect(error.message).not.toMatch(/workoutFormIds|recordedAt/);
  });

  // A DELIBERATE ORDERING CHOICE, pinned so it cannot drift back by accident (hostile review,
  // round 132, residual A). The already-recorded check used to run FIRST, so ANY resend of an
  // already-recorded class was an unconditional no-op. Round 129 moved it after the pure payload
  // build so the roster comparison could reuse this module's own normalization instead of a second
  // copy — which means a resend whose BODY is malformed now answers 400 rather than 200.
  //
  // That is the better answer, and the reason is the same one that produced the round-129 fix: a
  // malformed body cannot be honoured, so answering "already recorded, nothing to do" would tell the
  // trainer their submission was fine while their actual intent — almost always a CORRECTION — was
  // neither applied nor understood. The 400 names the problem instead, and still writes nothing.
  it('answers a MALFORMED resend with 400 rather than a silent no-op, and writes nothing', async () => {
    const original = { recordedAt: 'earlier', attendees: [{ userId: 11 }], workoutFormIds: [90] };
    const d = deps(stored(original));

    // An empty roster without an explicit no-show confirmation is refused by the builder itself, so
    // this never reaches the roster comparison.
    await expect(recordBootcampAttendance(d, { ...args, attendees: [] }))
      .rejects.toMatchObject({ statusCode: 400 });

    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(d.saveClassLog).not.toHaveBeenCalled();
    // And the record is untouched: refusing a malformed resend must not rewrite the fact.
    expect(d.saved).toHaveLength(0);
  });
});
