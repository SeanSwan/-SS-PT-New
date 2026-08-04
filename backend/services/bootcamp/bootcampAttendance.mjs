/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampAttendance.mjs
 * PURPOSE: Attendance log-back — the slice that closes the Product Core Loop.
 *          SWA-105 Slice 8 (Sean-ratified: attendance AND workout entries).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * A bootcamp that never writes to client records is a broken loop: attendees
 * train, and their charts stay empty. After class the trainer submits who was
 * there; every REGISTERED attendee gets a real DailyWorkoutForm — the same
 * document the logger, charts and streaks read — and the class log records
 * the roster immutably.
 *
 * LAWS:
 *  - IDOR-safe: the class log must belong to the requesting trainer (admins
 *    pass) — same posture as the S0 /generate hotfix.
 *  - Idempotent at the CLASS level: attendance is recorded exactly once;
 *    a second submission is a no-op that returns the original record. No
 *    force flag — re-recording history is a data-integrity decision that
 *    belongs to a human with DB access, not a button.
 *  - GUESTS (R10c): a walk-in with no user record gets an attendance row
 *    ({guest: label}) and NO workout form — there is no record to write to.
 *    Guests never block the registered attendees' log-back.
 *  - Rule 8 does not bite here: this is a server-side DB write, no LLM in
 *    the path. Client IDs are legitimate.
 *  - DEFERRED, disclosed: gamification points/MCP processing are NOT awarded
 *    by this path (forms carry sessionDeducted:false, mcpProcessed:false and
 *    source metadata). Awarding rides the canonical route's engine in a later
 *    slice — double-award through a second path is the exact bug class the
 *    idempotency-key gotcha exists for.
 */

const MAX_ATTENDEES = 60;

/**
 * PURE: build the per-attendee payloads from a class log's exercisesUsed.
 * Exercises become time-based entries (the bootcamp truth: durations, not
 * reps), shaped for DailyWorkoutForm.formData.
 */
export function buildAttendancePayloads({ classLog, attendees, nowIso, allowEmpty = false }) {
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

  const exercises = (Array.isArray(classLog.exercisesUsed) ? classLog.exercisesUsed : [])
    .filter((ex) => ex && (ex.exerciseName || ex.name) && ex.board !== 'alternative')
    .map((ex, i) => ({
      name: ex.exerciseName ?? ex.name,
      order: i + 1,
      durationSec: ex.durationSec ?? null,
      isCardioFinisher: ex.isCardioFinisher ?? false,
      sets: [{ setNumber: 1, durationSec: ex.durationSec ?? null, completed: true }],
    }));

  const workoutForms = registered.map((userId) => ({
    clientId: userId,
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

/**
 * Record attendance for a class log. Dependency-injected for tests:
 * deps may provide runAtomically(operation); the route uses it to inject row-locked, transactional persistence functions.
 */
async function recordBootcampAttendanceWithin(deps, {
  classLogId, trainerId, requesterRole, attendees, noShowConfirmed = false,
}) {
  const {
    getClassLog,
    createWorkoutForm,
    createWorkoutForms,
    saveClassLog,
    verifyClientAccessBatch,
    now = () => new Date(),
    // SWA-105 security fix (Kimi-target #1): owning the class LOG is not
    // authority to write a workout onto an arbitrary client. Every registered
    // attendee must be a client this requester may write to — an active
    // assignment (trainer), self (client), or admin. Without this a trainer
    // who owns one class log can log a bootcamp DailyWorkoutForm onto ANY
    // userId. Defaults to deny-all so a missing wiring fails closed.
    verifyClientAccess = async () => false,
  } = deps;

  const classLog = await getClassLog(classLogId);
  // Existence is not confirmed to non-owners (same posture as SWA-75): the
  // wrong trainer gets the same 404 whether the log exists or not.
  const owned = classLog
    && (requesterRole === 'admin' || Number(classLog.trainerId) === Number(trainerId));
  if (!owned) throw notFound('Class log not found');

  if (classLog.attendance?.recordedAt) {
    return { alreadyRecorded: true, attendance: classLog.attendance, created: 0 };
  }

  const payload = buildAttendancePayloads({
    classLog,
    attendees,
    nowIso: now().toISOString(),
    allowEmpty: noShowConfirmed === true,
  });

  // Fail-closed authorization on EVERY registered client before any write.
  // Admins pass wholesale; everyone else is checked per-client. One
  // unauthorized attendee rejects the whole submission — partial writes of a
  // roster the trainer half-owns are worse than an error they can correct.
  if (requesterRole !== 'admin') {
    const clientsRequiringAssignment = payload.registered
      .filter((clientId) => Number(clientId) !== Number(trainerId));

    if (clientsRequiringAssignment.length > 0 && typeof verifyClientAccessBatch === 'function') {
      const allowed = await verifyClientAccessBatch(clientsRequiringAssignment);
      if (!allowed) throw forbidden('Not authorized to log attendance for one or more clients');
    } else {
      for (const clientId of clientsRequiringAssignment) {
        // Compatibility fallback for non-route callers. Production injects the
        // batch verifier so a 60-person roster costs one assignment query.
        // eslint-disable-next-line no-await-in-loop
        const allowed = await verifyClientAccess(clientId);
        if (!allowed) throw forbidden('Not authorized to log attendance for one or more clients');
      }
    }
  }

  let workoutFormIds = [];
  if (typeof createWorkoutForms === 'function') {
    const ids = await createWorkoutForms(payload.workoutForms);
    workoutFormIds = Array.isArray(ids)
      ? ids.filter((id) => id !== null && id !== undefined)
      : [];
  } else {
    for (const form of payload.workoutForms) {
      // Compatibility fallback for unit/non-route callers. Production uses
      // one bulk insert inside the class-row transaction.
      // eslint-disable-next-line no-await-in-loop
      const id = await createWorkoutForm(form);
      if (id !== null && id !== undefined) workoutFormIds.push(id);
    }
  }

  if (workoutFormIds.length !== payload.workoutForms.length) {
    throw new Error('Attendance workout form write count mismatch');
  }

  const attendance = { ...payload.attendanceRecord, workoutFormIds };
  await saveClassLog(classLog, {
    attendance,
    actualParticipants: payload.registered.length + payload.guests.length,
  });

  return { alreadyRecorded: false, attendance, created: workoutFormIds.length, guests: payload.guests.length };
}

/**
 * Execute attendance atomically when the caller supplies a transaction seam.
 * The production route injects a SELECT FOR UPDATE class-log reader, batched
 * assignment verifier, bulk form writer, and transactional class-log saver.
 */
export async function recordBootcampAttendance(deps, args) {
  if (typeof deps?.runAtomically === 'function') {
    return deps.runAtomically((atomicDeps = {}) =>
      recordBootcampAttendanceWithin(
        { ...deps, ...atomicDeps, runAtomically: undefined },
        args,
      ));
  }

  return recordBootcampAttendanceWithin(deps, args);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}
