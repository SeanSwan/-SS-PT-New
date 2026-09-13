/**
 * FILE: bootcampAttendancePayloads.mjs
 * WHY: the PURE half of attendance log-back, extracted from `bootcampAttendance.mjs` when the
 *      round-129 roster-conflict fix pushed that service past the rule-4 cap of 300 lines. This is
 *      the split rule 4 asks for — code MOVED, not comments trimmed — and the H28 rationale that
 *      travels with these functions is preserved verbatim from where it was written.
 * WHAT IS PURE HERE: validation and payload construction. Nothing in this file writes, reads a
 *      database, or knows about HTTP; the service owns the transaction and the response shape.
 */

const MAX_ATTENDEES = 60;

/**
 * The canonical `DailyWorkoutForm` validations that matter on THIS path (H28, §5 line 226). A
 * hostile verification (round 108) caught this comment claiming three mirrors when only two are
 * asserted: `dateNotFuture` (`DailyWorkoutForm.mjs:410-415`) is the check below on the same
 * UTC-day clock, the nonempty-exercises rule is the second check, `clientTrainerDifferent`
 * (:404-408) holds BY CONSTRUCTION (no form is emitted whose `clientId` equals its `trainerId`),
 * and `formDataStructure` (:417-427) has no counterpart — this module builds the shape rather
 * than accepting it. A non-string `classDate` is REJECTED, not skipped: the old
 * `typeof === 'string'` guard made the check a silent no-op and the model's own `dateNotFuture`
 * is always false for a non-string — a double miss (LOW-4).
 */
function assertCanonicalForms({ classLog, exercises, today }) {
  if (typeof classLog.classDate !== 'string') {
    throw badRequest('Attendance needs a class date');
  }
  if (classLog.classDate > today) {
    throw badRequest('Attendance cannot be recorded for a class dated in the future');
  }
  if (exercises.length === 0) {
    throw badRequest('Attendance needs at least one exercise to log');
  }
}

/**
 * PURE: build the per-attendee payloads from a class log's exercisesUsed.
 * Exercises become time-based entries (the bootcamp truth: durations, not
 * reps), shaped for DailyWorkoutForm.formData.
 */
export function buildAttendancePayloads({ classLog, attendees, nowIso, allowEmpty = false, formTrainerId }) {
  if (!Array.isArray(attendees)) {
    throw badRequest('attendees must be an array');
  }
  if (attendees.length === 0 && !allowEmpty) {
    throw badRequest('attendees must be a non-empty array unless no-show is explicitly confirmed');
  }
  if (attendees.length > MAX_ATTENDEES) {
    throw badRequest(`attendees exceeds the ${MAX_ATTENDEES} cap`);
  }

  const registered = [];
  const guests = [];
  const seenUsers = new Set();

  for (const [index, attendee] of attendees.entries()) {
    const userId = Number(attendee?.userId);
    const guest = typeof attendee?.guest === 'string' ? attendee.guest.trim() : '';

    if (Number.isInteger(userId) && userId > 0) {
      if (seenUsers.has(userId)) continue; // same person twice = once
      seenUsers.add(userId);
      registered.push(userId);
    } else if (guest) {
      guests.push(guest.slice(0, 60));
    } else {
      throw badRequest(`attendees[${index}] needs userId or guest`);
    }
  }

  // H28: the class log's trainer, NORMALIZED — the model's self-attendance rule is a STRICT
  // `clientId === trainerId` (DailyWorkoutForm.mjs:405); an unnormalized id is unrunnable.
  const logTrainerId = Number(classLog.trainerId);
  const trainerId = Number.isInteger(logTrainerId) && logTrainerId > 0 ? logTrainerId : null;
  // H28: the id the FORM will actually carry as `trainerId`. The route sets it from the
  // REQUESTER (`bootcampRoutes.mjs:264` hardcodes `Number(req.user.id)`), which is the
  // class log's trainer for a trainer but the ADMIN for an admin acting on someone else's
  // log. Keying the exclusion off the class log alone would miss the admin case and emit
  // exactly the `clientId === trainerId` form the model refuses.
  const requestedTrainerId = Number(formTrainerId);
  const formTrainer = Number.isInteger(requestedTrainerId) && requestedTrainerId > 0
    ? requestedTrainerId
    : (Number.isInteger(logTrainerId) && logTrainerId > 0 ? logTrainerId : null);
  const today = typeof nowIso === 'string' ? nowIso.slice(0, 10) : '';

  // §5 line 224: mixed-board input "must EXPLICITLY select" the performed exercise. Rows carry
  // no slot key (free-form JSONB), so a per-slot pairing cannot be derived — but silently
  // preferring `main` is the implicit selection the line forbids. Refusing is safe (the real
  // client sends `mainExercises` only) and §5 line 226 already specifies rollback on failure.
  const rows = (Array.isArray(classLog.exercisesUsed) ? classLog.exercisesUsed : [])
    .filter((ex) => ex && (ex.exerciseName || ex.name));
  const hasMain = rows.some((ex) => ex.board === 'main');
  const hasAlternative = rows.some((ex) => ex.board === 'alternative');
  if (hasMain && hasAlternative) {
    throw badRequest('Attendance input mixes main and alternative boards; select the performed exercise explicitly');
  }

  // §5 line 224: alternatives and lowImpact offers "never create extra completed sets", and old
  // no-board rows ARE the performed list. Allow-by-default (`board !== 'alternative'`) made every
  // Board-3 lowImpact OFFER a completed set, so this is a positive, fail-closed allowlist
  // (integration review, round 104).
  const isPerformed = (ex) => !ex.board || ex.board === 'main';
  const exercises = rows
    .filter(isPerformed)
    .map((ex, i) => ({
      name: ex.exerciseName ?? ex.name,
      order: i + 1,
      durationSec: ex.durationSec ?? null,
      isCardioFinisher: ex.isCardioFinisher ?? false,
      sets: [{ setNumber: 1, durationSec: ex.durationSec ?? null, completed: true }],
    }));

  assertCanonicalForms({ classLog, exercises, today });

  // §5 line 226: "Self-attendance is rejected for registered workout-form creation while that
  // existing model invariant stands; no special self exception is invented." The trainer STAYS
  // on the roster (they were there) but gets NO form: `clientId === trainerId` is what the
  // canonical model refuses.
  const formEligible = registered.filter((userId) => userId !== formTrainer);

  const workoutForms = formEligible.map((userId) => ({
    clientId: userId,
    // The SAME id the route will write, so the model's rule and this exclusion agree.
    trainerId: formTrainer,
    date: classLog.classDate,
    idempotencyKey: `bootcamp:${classLog.id}:${userId}`,
    formData: {
      source: 'bootcamp',
      bootcampClassLogId: classLog.id,
      dayType: classLog.dayType ?? null,
      title: `Bootcamp — ${classLog.dayType ? classLog.dayType.replace(/_/g, ' ') : 'class'}`,
      exercises,
      submittedVia: 'bootcamp_attendance',
    },
    sessionDeducted: false,
    mcpProcessed: false,
  }));

  return {
    registered,
    guests,
    workoutForms,
    attendanceRecord: {
      recordedAt: nowIso,
      attendees: [
        ...registered.map((userId) => ({ userId })),
        ...guests.map((guest) => ({ guest })),
      ],
      workoutFormIds: [], // filled by the persister
    },
  };
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
