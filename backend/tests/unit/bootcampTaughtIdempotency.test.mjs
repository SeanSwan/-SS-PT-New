/**
 * ============================================================================
 * FILE: bootcampTaughtIdempotency.test.mjs — S-H29 acceptance (contract §8 line 303).
 *
 * The contract names THIS file as the acceptance surface for H29:
 *
 *   "lost response retry, same key changed payload, duplicate Sprint confirmation
 *    | Same log ID; one taught count/link; changed request 409; attendance retry
 *      stays same class identity"
 *
 * WHY IT EXISTS BESIDE THE OTHER TWO SUITES. The behaviour was already covered in pieces —
 * `tests/api/bootcampLogAndSpaceRoute.test.mjs` drives the ROUTE with the service mocked, and
 * `sprintConfirmSlotExactlyOnce.test.mjs` drives the CONFIRMATION with the database mocked —
 * but the fourth acceptance phrase, **"attendance retry stays same class identity"**, was owned
 * by no test at all, and the contract's traceability row pointed at a file that did not exist.
 * So this suite has three cases that assert the ACCEPTANCE rather than the internals, and one
 * that closes the unowned phrase.
 *
 * WHAT IS REAL HERE: the service functions themselves. Only the ORM surface is faked — an
 * in-memory class-log table keyed by `(trainerId, operationKey)`, which is exactly the
 * uniqueness the real unique index provides.
 *
 * NOT PROVEN HERE: PostgreSQL behaviour. Row locks, the unique index as the arbiter of a real
 * race, and rollback are `tests/integration/rolodexServerRepair.postgres.test.mjs` (opt-in,
 * separate selection) — a green run of this file does NOT substitute for it.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = {};

vi.mock('../../models/index.mjs', () => ({
  getBootcampClassLog: () => fakes.ClassLog,
  getBootcampTemplate: () => ({ findOne: async () => null }),
  getBootcampSprint: () => fakes.Sprint,
  getSprintWeek: () => ({ findOne: async () => null, findAll: async () => [] }),
  getSprintClassSlot: () => fakes.Slot,
  getSprintExerciseMemory: () => ({ findAll: async () => [], destroy: async () => 0 }),
  getBootcampSpaceProfile: () => null,
  getBootcampStation: () => ({ findAll: async () => [] }),
  getBootcampExercise: () => ({ findAll: async () => [] }),
  getBootcampOverflowPlan: () => ({ findAll: async () => [] }),
  getBootcampStretch: () => ({ findAll: async () => [] }),
  getExerciseTrend: () => ({}),
  getExercise: () => null,
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: async (callback) => callback({ id: 'TX', LOCK: { UPDATE: 'UPDATE' } }) },
}));

const { logBootcampClass } = await import('../../services/bootcamp/bootcampCrud.mjs');
const { confirmSlotUsed } = await import('../../services/bootcamp/sprintService.mjs');
const { buildAttendancePayloads } = await import('../../services/bootcamp/bootcampAttendancePayloads.mjs');

const TRAINER = { userId: 7, role: 'trainer' };
const SYNTHETIC_TRAINER_ID = 7;

/** The log body a caller sends; only the key changes between retries. */
const logBody = (over = {}) => ({
  trainerId: SYNTHETIC_TRAINER_ID,
  operationKey: 'run:00000000-0000-4000-8000-000000000009',
  templateId: null,
  classDate: '2026-09-01',
  dayType: 'full_body',
  exercisesUsed: [{ exerciseName: 'Goblet Squat', durationSec: 40 }],
  ...over,
});

/**
 * An in-memory class-log table. `create` enforces the (trainerId, operationKey) uniqueness the
 * real unique index enforces, so a retry cannot silently become a second row.
 */
function makeClassLogTable() {
  const rows = [];
  let nextId = 900;
  return {
    rows,
    create: async (values) => {
      const clash = values.operationKey != null
        && rows.some((row) => row.trainerId === values.trainerId && row.operationKey === values.operationKey);
      if (clash) {
        const err = new Error('duplicate key value violates unique constraint');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      }
      const row = { id: nextId++, ...values, update: async (patch) => Object.assign(row, patch) };
      rows.push(row);
      return row;
    },
    findOne: async ({ where }) => rows.find((row) => (
      row.trainerId === where.trainerId
      && (where.operationKey === undefined || row.operationKey === where.operationKey)
    )) ?? null,
    findByPk: async (id) => rows.find((row) => row.id === id) ?? null,
    count: async ({ where }) => rows.filter((row) => (
      row.trainerId === where.trainerId && row.operationKey === where.operationKey
    )).length,
  };
}

describe('S-H29 acceptance — one log identity survives a retry (contract §8 line 303)', () => {
  beforeEach(() => {
    fakes.ClassLog = makeClassLogTable();
  });

  it('a LOST-RESPONSE RETRY returns the SAME log ID and writes no second row', async () => {
    const first = await logBootcampClass(logBody());
    const retry = await logBootcampClass(logBody());

    expect(retry.id).toBe(first.id);
    expect(fakes.ClassLog.rows).toHaveLength(1);
    expect(await fakes.ClassLog.count({
      where: { trainerId: SYNTHETIC_TRAINER_ID, operationKey: logBody().operationKey },
    })).toBe(1);
  });

  it('the SAME key with a CHANGED payload is a 409, not an overwrite', async () => {
    await logBootcampClass(logBody());

    await expect(logBootcampClass(logBody({
      exercisesUsed: [{ exerciseName: 'Completely Different', durationSec: 20 }],
    }))).rejects.toMatchObject({ status: 409 });
    expect(fakes.ClassLog.rows).toHaveLength(1);
  });

  it('a NON-CANONICAL date is the SAME identity, so a re-serialized retry still collapses', async () => {
    // `2026-9-1` and `2026-09-01` persist to the identical DATEONLY row, so they must hash
    // identically — otherwise an honest retry is a 409 for a body the database cannot tell apart.
    const first = await logBootcampClass(logBody({ classDate: '2026-9-1' }));
    const retry = await logBootcampClass(logBody({ classDate: '2026-09-01' }));

    expect(retry.id).toBe(first.id);
    expect(fakes.ClassLog.rows).toHaveLength(1);
  });

  it('a DUPLICATE Sprint confirmation adds one count and one link, never a second log', async () => {
    const slot = {
      id: 9,
      sprintId: 77,
      scheduledDate: '2026-09-01',
      dayType: 'full_body',
      templateId: null,
      status: 'generated',
      wasUsed: false,
      classLogId: null,
      generatedClassData: {
        exercises: [{ exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 40, board: 'main' }],
      },
    };
    const increments = [];
    const slotWrites = [];
    fakes.Sprint = {
      findByPk: async () => ({
        id: 77,
        trainerId: 7,
        increment: async (field, options) => { increments.push({ field, options }); },
      }),
    };
    fakes.Slot = {
      findOne: async () => Object.assign(Object.create(null), slot),
      update: async (values, options) => {
        slotWrites.push({ values, options });
        if (options.where.wasUsed === undefined) { Object.assign(slot, values); return [1]; }
        if (slot.wasUsed) return [0];
        slot.wasUsed = true;
        slot.status = 'taught';
        return [1];
      },
    };

    const first = await confirmSlotUsed(77, 9, TRAINER, {});
    const retry = await confirmSlotUsed(77, 9, TRAINER, {});

    expect(increments).toHaveLength(1);                 // one taught count
    expect(fakes.ClassLog.rows).toHaveLength(1);         // one log
    expect(first.classLogId).toBe(fakes.ClassLog.rows[0].id); // one link
    expect(retry.classLogId).toBe(first.classLogId);

    // THE LINK IS ASSERTED AT THE WRITE, not from the return value. A hostile verification
    // proved the earlier version of this case was HALF VACUOUS: it read `first.classLogId`
    // (which comes from the return statement) while the fake's `findOne` returned a COPY of the
    // slot, so deleting the `SprintClassSlot.update({ classLogId })` call outright left every
    // assertion green — a regression that nulls the link would have shipped against the
    // contract's own named acceptance file.
    const linkWrite = slotWrites.find(({ values }) => values.classLogId !== undefined);
    expect(linkWrite, 'the confirmation never wrote classLogId').toBeDefined();
    expect(linkWrite.values.classLogId).toBe(fakes.ClassLog.rows[0].id);
    expect(linkWrite.options.where).toEqual({ id: 9, sprintId: 77 });
    // …and it is written INSIDE the confirmation's transaction.
    expect(linkWrite.options.transaction).toMatchObject({ id: 'TX' });
    expect(slot.classLogId).toBe(fakes.ClassLog.rows[0].id);
  });
});

describe('S-H29 acceptance — an ATTENDANCE retry stays the same class identity', () => {
  it('keys every attendee off the CLASS LOG, so a retry cannot become a second class', () => {
    // The phrase no test owned. A duplicate class identity is what defeats attendance
    // deduplication, because the key is `bootcamp:<classLogId>:<userId>` — so this asserts the
    // key is a function of (log, user) ONLY: two builds of the same submission, and a rebuild
    // from the RELOADED log row, all produce the same key.
    const classLog = {
      id: 42,
      trainerId: 7,
      classDate: '2026-09-01',
      dayType: 'full_body',
      exercisesUsed: [{ exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' }],
    };
    const build = (log) => buildAttendancePayloads({
      classLog: log, attendees: [{ userId: 11 }, { userId: 12 }], nowIso: '2026-09-01T18:00:00.000Z',
    }).workoutForms.map((form) => form.idempotencyKey);

    const first = build(classLog);
    const retry = build(classLog);
    const afterReload = build({ ...classLog }); // same row, re-read

    expect(first).toEqual(['bootcamp:42:11', 'bootcamp:42:12']);
    expect(retry).toEqual(first);
    expect(afterReload).toEqual(first);
    // A DIFFERENT class log is a different identity — the assertion above is not vacuous.
    expect(build({ ...classLog, id: 43 })).toEqual(['bootcamp:43:11', 'bootcamp:43:12']);
  });
});
