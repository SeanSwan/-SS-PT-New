/**
 * ============================================================================
 * FILE: sprintConfirmSlotExactlyOnce.test.mjs — R-H29 / R-H04 (slice C) + H29b.
 *
 * Split out of `sprintUpdateContract.test.mjs` (rule 4): that file reached 345 lines and the
 * two subjects are genuinely independent — the UPDATE-path poison chain there, and the
 * taught-confirmation unit here.
 *
 * WHAT THIS FILE PROVES
 *   Slice C: the conditional UPDATE is the claim, so a double-click counts ONCE.
 *   H29b (§5 line 216): the SAME confirmation writes exactly ONE class log keyed
 *   `sprint-slot:<slotId>` (§5 line 218), LINKS it on the slot, and does all of it inside
 *   the transaction it claims in — with a changed payload reported as a conflict and no
 *   snapshot invented for a planned or empty slot.
 *
 * The REAL atomicity of the conditional update is proven against PostgreSQL by
 * `backend/scripts/s06-slice-c-probe.mjs`.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const models = {};

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => models.Sprint,
  getSprintWeek: () => models.Week,
  getSprintClassSlot: () => models.Slot,
  getSprintExerciseMemory: () => models.Memory,
  getBootcampSpaceProfile: () => models.SpaceProfile,
  getBootcampClassLog: () => models.ClassLog,
  getBootcampTemplate: () => models.Template,
  getBootcampStation: () => ({ findAll: async () => [] }),
  getBootcampExercise: () => ({ findAll: async () => [] }),
  getBootcampOverflowPlan: () => ({ findAll: async () => [] }),
  getBootcampStretch: () => ({ findAll: async () => [] }),
  getExerciseTrend: () => ({}),
  getExercise: () => null,
}));

vi.mock('../../database.mjs', () => ({
  // Executed inline so the caller's commit boundary is observable. `LOCK` mirrors Sequelize's
  // transaction.LOCK so the row locks the service takes are assertable.
  default: { transaction: async (fn) => fn({ id: 'TX', LOCK: { UPDATE: 'UPDATE' } }) },
}));

const { confirmSlotUsed } = await import('../../services/bootcamp/sprintService.mjs');
const { SprintTaughtConflictError, SprintCalendarValidationError } = await import(
  '../../services/bootcamp/sprintCalendarContract.mjs'
);
const { buildSlotTaughtLogPayload } = await import('../../services/bootcamp/sprintSlotTaughtLog.mjs');
const { hashTaughtPayload } = await import('../../services/bootcamp/bootcampTaughtIdentity.mjs');

const TRAINER = { userId: 7, role: 'trainer' };

/** A snapshot the generator could really have written for a 4-station class. */
const snapshot = (over = {}) => ({
  dayType: 'full_body',
  stationCount: 4,
  rounds: 2,
  exerciseDurationSec: 35,
  targetDuration: 45,
  expectedParticipants: 12,
  exercises: [
    { exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 35, board: 'main' },
    { exerciseName: 'Push-Up', stationIndex: 1, durationSec: 35, board: 'main' },
    // An alternative is an OFFER, not something performed (§5 line 224).
    { exerciseName: 'Wall Sit', stationIndex: 1, durationSec: 35, board: 'alternative' },
  ],
  ...over,
});

describe('confirmSlotUsed is exactly-once AND writes the one log §5 line 216 requires', () => {
  /**
   * Stands in for PostgreSQL: the conditional update matches only while `wasUsed` is still
   * false, which is what makes concurrent callers safe, and the row locks are recorded in
   * the order they were taken.
   */
  function confirmHarness({ alreadyTaught = false, classLogId = null, snapshotOverride } = {}) {
    const increments = [];
    const incrementOptions = [];
    const updates = [];
    const locks = [];
    const logWrites = [];
    const slot = {
      id: 9,
      sprintId: 77,
      scheduledDate: '2026-03-02',
      dayType: 'full_body',
      templateId: null,
      status: alreadyTaught ? 'taught' : 'generated',
      wasUsed: alreadyTaught,
      classLogId,
      generatedClassData: snapshotOverride === undefined ? snapshot() : snapshotOverride,
    };
    models.Sprint = {
      findByPk: async (id, options = {}) => {
        if (options.lock) locks.push('sprint');
        return {
          id: 77,
          trainerId: 7,
          increment: async (field, opts) => {
            increments.push(field);
            incrementOptions.push(opts);
          },
        };
      },
    };
    models.Week = { findOne: async () => null };
    models.Slot = {
      findOne: async (options = {}) => {
        if (options.lock) locks.push('slot');
        return Object.assign(Object.create(null), slot);
      },
      update: async (values, options) => {
        updates.push({ values, options });
        if (options.where.wasUsed === undefined) {
          // The link write, which is scoped by id and needs no claim guard.
          Object.assign(slot, values);
          return [1];
        }
        if (options.where.wasUsed !== false) throw new Error('guard must be conditional');
        if (slot.wasUsed) return [0];
        slot.wasUsed = true;
        slot.status = 'taught';
        return [1];
      },
    };
    models.Memory = {};
    models.SpaceProfile = { findOne: async () => null };
    models.Template = { findOne: async () => ({ id: 42, trainerId: 7 }) };
    models.ClassLog = {
      create: vi.fn(async (row, options) => {
        logWrites.push({ row, options });
        return { id: 900, ...row };
      }),
      findOne: vi.fn(async () => null),
      // A linked slot's log must exist and must hash to what this slot derives, or the
      // service correctly reports a conflict. The harness returns the matching hash so the
      // retry path is what is under test.
      findByPk: vi.fn(async (id) => (id ? { id, payloadHash: linkedHash() } : null)),
    };
    return { increments, incrementOptions, updates, locks, logWrites, slot };
  }

  it('counts a first confirmation and marks the slot taught', async () => {
    const h = confirmHarness();
    const returned = await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.increments).toEqual(['totalClassesCompleted']);
    expect(h.updates[0].values).toMatchObject({ wasUsed: true, status: 'taught' });
    // The RESPONSE must reflect the write. `SprintClassSlot.update` is a static model method
    // that does not mutate the instance, so returning the snapshot reported `planned`/`false`
    // while the row was `taught`/`true`.
    expect(returned.wasUsed).toBe(true);
    expect(returned.status).toBe('taught');
  });

  it('runs the claim, the counter AND the log in ONE transaction', async () => {
    // Untransacted, a failure of `increment` after the claim committed leaves the slot taught
    // with the counter short — and the retry matches zero rows and never counts, so the
    // under-count is permanent. Same argument for the log and the link (§5 line 216).
    const h = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.updates[0].options.transaction).toMatchObject({ id: 'TX' });
    expect(h.incrementOptions[0]).toMatchObject({ transaction: { id: 'TX' } });
    expect(h.logWrites[0].options.transaction).toMatchObject({ id: 'TX' });
  });

  it('a SECOND confirmation does not re-count and does not log again', async () => {
    const h = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, {});
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.increments).toHaveLength(1);
    expect(h.logWrites).toHaveLength(1);
  });

  it('THE RACE: two interleaved confirmations count ONCE and write ONE log', async () => {
    // Both read the slot BEFORE either commits — a double-click's actual shape.
    const h = confirmHarness();
    await Promise.all([
      confirmSlotUsed(77, 9, TRAINER, {}),
      confirmSlotUsed(77, 9, TRAINER, {}),
    ]);
    expect(h.increments).toHaveLength(1);
    expect(h.logWrites).toHaveLength(1);
  });

  it('the guard is CONDITIONAL, never an unconditional write', async () => {
    // If the claim ever becomes unconditional, the race test above is the only thing between
    // a double-click and an inflated counter — and the harness throws, so it fails loudly.
    const h = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.updates[0].options.where).toMatchObject({ id: 9, sprintId: 77, wasUsed: false });
  });

  it('locks the SPRINT before the SLOT (§5 line 216)', async () => {
    const h = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.locks).toEqual(['sprint', 'slot']);
  });

  it('is idempotent when the slot is ALREADY taught on arrival', async () => {
    // A legacy taught slot with a valid snapshot: §5 line 216 gives it its MISSING log and
    // link "without an extra transition" — and no second count.
    const h = confirmHarness({ alreadyTaught: true });
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(h.increments).toHaveLength(0);
    expect(h.logWrites).toHaveLength(1);
    expect(h.logWrites[0].row.operationKey).toBe('sprint-slot:9');
  });

  it('still refuses a foreign or malformed slot before any write', async () => {
    const h = confirmHarness();
    models.Slot = { ...models.Slot, findOne: async () => null };
    await expect(confirmSlotUsed(77, 9, TRAINER, {})).rejects.toThrow();
    expect(h.increments).toHaveLength(0);
    expect(h.updates).toHaveLength(0);
    expect(h.logWrites).toHaveLength(0);

    const h2 = confirmHarness();
    await expect(confirmSlotUsed(77, 'abc', TRAINER, {})).rejects.toThrow();
    expect(h2.increments).toHaveLength(0);
  });

  it('honours a supplied usedDate and falls back to the scheduled date', async () => {
    const withDate = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, { usedDate: '2026-03-03' });
    expect(withDate.updates[0].values.usedDate).toBe('2026-03-03');
    expect(withDate.logWrites[0].row.classDate).toBe('2026-03-03');

    const withoutDate = confirmHarness();
    await confirmSlotUsed(77, 9, TRAINER, {});
    expect(withoutDate.updates[0].values.usedDate).toBe('2026-03-02');
    expect(withoutDate.logWrites[0].row.classDate).toBe('2026-03-02');
  });

  // ── H29b: the log, the link and the truth about what was measured ──────────────
  describe('H29b — one class log, linked, keyed by the slot', () => {
    it('writes the canonical performed payload and LINKS it on the slot', async () => {
      const h = confirmHarness();
      const returned = await confirmSlotUsed(77, 9, TRAINER, {});

      const written = h.logWrites[0].row;
      expect(written.operationKey).toBe('sprint-slot:9'); // §5 line 218
      expect(written.trainerId).toBe(7);
      // Main board only: an alternative is an OFFER, not something performed (§5 line 224).
      expect(written.exercisesUsed).toEqual([
        { exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 35 },
        { exerciseName: 'Push-Up', stationIndex: 1, durationSec: 35 },
      ]);
      // §5 line 222: trainer-attested PRESCRIPTION, never measured elapsed time.
      expect(written.executionSummary).toMatchObject({
        kind: 'trainer_attested_prescription',
        prescribed: { workSec: 35, rounds: 2, stationCount: 4, targetDurationMin: 45 },
        expectedParticipants: 12,
        performedCount: 2,
      });
      // §5 line 222: "expectedParticipants is not actual attendance." Confirming a class
      // observes nobody, so the log asserts no attendance at all.
      expect(written.actualParticipants).toBeUndefined();
      expect(returned.classLogId).toBe(900);
      expect(h.updates[1].values).toEqual({ classLogId: 900 });
    });

    it('returns the EXISTING log on retry and writes nothing new', async () => {
      const h = confirmHarness({ alreadyTaught: true, classLogId: 900 });
      // The stored hash matches, because the payload is a PURE function of the slot row — the
      // property that makes a retry a retry instead of a conflict.
      models.ClassLog.findByPk = vi.fn(async () => ({ id: 900, payloadHash: linkedHash() }));

      const retry = await confirmSlotUsed(77, 9, TRAINER, {});

      expect(retry.classLogId).toBe(900);
      expect(h.logWrites).toHaveLength(0);
      expect(h.increments).toHaveLength(0);
      expect(h.updates).toHaveLength(0);
    });

    it('a retry whose payload CHANGED is a 409, not an overwrite', async () => {
      // §5 line 216: "differing date or performed payload is conflict, not an overwrite."
      const h = confirmHarness({ alreadyTaught: true, classLogId: 900 });
      models.ClassLog.findByPk = vi.fn(async () => ({ id: 900, payloadHash: 'hash-of-a-different-class' }));

      await expect(confirmSlotUsed(77, 9, TRAINER, {}))
        .rejects.toBeInstanceOf(SprintTaughtConflictError);
      expect(h.logWrites).toHaveLength(0);
      expect(h.updates).toHaveLength(0);
    });

    it('REFUSES a planned slot and an empty snapshot, writing nothing at all', async () => {
      // §5 line 216: "Confirmation of planned/empty data fails … absent snapshots require
      // manual review and no invented history."
      const planned = confirmHarness({ snapshotOverride: snapshot() });
      planned.slot.status = 'planned';
      models.Slot.findOne = async () => Object.assign(Object.create(null), planned.slot, { status: 'planned' });
      await expect(confirmSlotUsed(77, 9, TRAINER, {})).rejects.toBeInstanceOf(SprintCalendarValidationError);
      expect(planned.logWrites).toHaveLength(0);
      expect(planned.increments).toHaveLength(0);

      // `null` and not `undefined`: the harness reads `undefined` as "no override supplied"
      // and substitutes its default snapshot, which is how an earlier version of this test
      // asserted a rejection it was not actually exercising.
      for (const empty of [null, {}, { exercises: [] }, { exercises: [{ exerciseName: 'Wall Sit', board: 'alternative' }] }]) {
        const h = confirmHarness({ snapshotOverride: empty });
        await expect(confirmSlotUsed(77, 9, TRAINER, {})).rejects.toBeInstanceOf(SprintCalendarValidationError);
        expect(h.logWrites).toHaveLength(0);
        expect(h.updates).toHaveLength(0);
      }
    });

    it('a conflict from the unique index is reported as a conflict, not a 500', async () => {
      const h = confirmHarness();
      models.ClassLog.create = vi.fn(async () => {
        const err = new Error('duplicate key value violates unique constraint');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      });
      await expect(confirmSlotUsed(77, 9, TRAINER, {})).rejects.toBeInstanceOf(SprintTaughtConflictError);
      expect(h.logWrites).toHaveLength(0);
    });
  });
});

/**
 * The hash the service stores for slot 9. Computed from the REAL derivation rather than a
 * hand-copied literal: a literal would silently drift from the payload the service writes,
 * and the retry test would then pass for the wrong reason. The derivation itself is pinned
 * field by field in `sprintSlotTaughtLog.test.mjs`.
 */
const linkedHash = () => {
  const derived = buildSlotTaughtLogPayload({
    slot: { ...SLOT_FOR_HASH, generatedClassData: snapshot() },
    trainerId: 7,
    usedDate: null,
  });
  return hashTaughtPayload(derived.payload);
};

const SLOT_FOR_HASH = {
  id: 9,
  sprintId: 77,
  scheduledDate: '2026-03-02',
  dayType: 'full_body',
  templateId: null,
  status: 'taught',
  wasUsed: true,
  classLogId: 900,
};
