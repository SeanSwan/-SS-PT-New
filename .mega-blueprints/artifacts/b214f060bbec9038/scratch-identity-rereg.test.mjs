/**
 * HOSTILE PROBE — taught-class-log idempotency, Sprint path.
 *
 * Sequence: confirm slot 7 (writes `sprint-slot:7` log, links classLogId) ->
 * POST regenerate on the SAME taught slot (allowed: no taught guard) ->
 * confirm again.
 *
 * Real: sprintConfirmSlot.confirmSlotUsed, sprintRegenerateSlot.regenerateSlot,
 * sprintSlotWrite.persistGeneratedSlotAtomically, bootcampCrud.logBootcampClass,
 * bootcampTaughtIdentity, sprintSlotTaughtLog, sprintCalendarContract.
 * Faked: the ORM surface only.
 */

import { describe, expect, it, vi } from 'vitest';

const fakes = {};

vi.mock('../../../backend/models/index.mjs', () => ({
  getBootcampClassLog: () => fakes.ClassLog,
  getBootcampTemplate: () => ({ findOne: async () => ({ id: 1 }) }),
  getBootcampSprint: () => fakes.Sprint,
  getSprintWeek: () => ({
    findByPk: async () => ({ id: 3, weekNumber: 1, isDeloadWeek: false, intensityModifier: null }),
  }),
  getSprintClassSlot: () => fakes.Slot,
  getSprintExerciseMemory: () => fakes.Memory,
  getBootcampSpaceProfile: () => null,
  getBootcampStation: () => ({ findAll: async () => [] }),
  getBootcampExercise: () => ({ findAll: async () => [] }),
  getBootcampOverflowPlan: () => ({ findAll: async () => [] }),
  getBootcampStretch: () => ({ findAll: async () => [] }),
  getExerciseTrend: () => ({}),
  getExercise: () => null,
}));

vi.mock('../../../backend/database.mjs', () => ({
  default: { transaction: async (cb) => cb({ id: 'TX', LOCK: { UPDATE: 'UPDATE' } }) },
}));

vi.mock('../../../backend/services/bootcamp/sprintAccess.mjs', () => ({
  requireOwnedSprint: async (sprintId) => ({
    sprintId: Number(sprintId),
    dataOwnerTrainerId: 7,
    sprint: fakes.sprint,
  }),
  requireChildOfSprint: (slot) => {
    if (!slot) {
      const err = new Error('Sprint slot not found');
      err.status = 404;
      throw err;
    }
    return slot;
  },
  normalizePositiveSafeInteger: (value) => Number(value),
  SprintObjectNotFoundError: class SprintObjectNotFoundError extends Error {},
}));

vi.mock('../../../backend/services/bootcamp/bootcampGenerator.mjs', () => ({
  generateBootcampClass: async () => fakes.nextClassData,
}));

vi.mock('../../../backend/services/bootcamp/sprintProgression.mjs', () => ({
  resolveSprintWeekModifier: () => null,
}));

vi.mock('../../../backend/services/bootcamp/sprintService.mjs', () => ({
  getSprintExerciseMemoryKeys: async () => [],
}));

const { confirmSlotUsed } = await import('../../../backend/services/bootcamp/sprintConfirmSlot.mjs');
const { regenerateSlot } = await import('../../../backend/services/bootcamp/sprintRegenerateSlot.mjs');

const ACTOR = { userId: 7, role: 'trainer' };
const SLOT_ID = 7;

const snapshot = (label) => ({
  dayType: 'full_body',
  rounds: 3,
  stationCount: 2,
  exercisesPerStation: 2,
  exerciseDurationSec: 40,
  targetDuration: 30,
  expectedParticipants: 8,
  exercises: [
    { exerciseName: `${label} Goblet Squat`, stationIndex: 0, durationSec: 40, board: 'main' },
    { exerciseName: `${label} Push-Up`, stationIndex: 1, durationSec: 40, board: 'main' },
  ],
});

function reset() {
  fakes.ClassLog = (() => {
    const rows = [];
    let nextId = 900;
    return {
      rows,
      create: async (values) => {
        const clash = values.operationKey != null
          && rows.some((r) => r.trainerId === values.trainerId && r.operationKey === values.operationKey);
        if (clash) {
          const err = new Error('duplicate key value violates unique constraint');
          err.name = 'SequelizeUniqueConstraintError';
          throw err;
        }
        const row = { id: nextId++, ...values };
        rows.push(row);
        return row;
      },
      findOne: async ({ where }) => rows.find(
        (r) => r.trainerId === where.trainerId && r.operationKey === where.operationKey,
      ) ?? null,
      findByPk: async (id) => rows.find((r) => r.id === Number(id)) ?? null,
    };
  })();

  fakes.slot = {
    id: SLOT_ID,
    sprintId: 1,
    weekId: 3,
    status: 'generated',
    wasUsed: false,
    scheduledDate: '2024-01-15',
    usedDate: null,
    classLogId: null,
    classFormat: 'circuit',
    classStyle: 'standard',
    dayType: 'full_body',
    generatedClassData: snapshot('OLD'),
  };
  fakes.nextClassData = snapshot('NEW');

  fakes.Sprint = {
    findByPk: async () => fakes.sprint,
  };
  fakes.Slot = {
    findOne: async ({ where }) => (
      Number(where.id) === SLOT_ID && Number(where.sprintId) === 1 ? fakes.slot : null
    ),
    findByPk: async (id) => (Number(id) === SLOT_ID ? fakes.slot : null),
    update: async (values, { where }) => {
      if (Number(where.id) !== SLOT_ID) return [0];
      if (where.wasUsed === false && fakes.slot.wasUsed !== false) return [0];
      Object.assign(fakes.slot, values);
      return [1];
    },
  };
  fakes.Memory = { destroy: async () => 0, findOrCreate: async () => [{}, false] };

  fakes.sprint = {
    id: 1,
    trainerId: 7,
    status: 'active',
    spaceProfileId: null,
    defaultFormat: 'circuit',
    defaultStyle: 'standard',
    totalClassesCompleted: 0,
    increment: async () => { fakes.sprint.totalClassesCompleted += 1; },
  };
}

describe('PROBE: taught slot regenerated, then re-confirmed', () => {
  it('measures the reachable state', async () => {
    reset();

    const first = await confirmSlotUsed(1, SLOT_ID, ACTOR, { usedDate: '2024-01-15' });
    const afterConfirm = {
      classLogId: fakes.slot.classLogId,
      wasUsed: fakes.slot.wasUsed,
      status: fakes.slot.status,
      logs: fakes.ClassLog.rows.length,
      count: fakes.sprint.totalClassesCompleted,
    };
    console.log('STEP1 CONFIRM', JSON.stringify(afterConfirm));
    expect(first.classLogId).toBeTruthy();
    expect(afterConfirm.logs).toBe(1);

    // The REAL regeneration service, driven exactly as the route drives it.
    await regenerateSlot(1, SLOT_ID, ACTOR);
    const afterRegen = {
      status: fakes.slot.status,
      wasUsed: fakes.slot.wasUsed,
      classLogId: fakes.slot.classLogId,
      usedDate: fakes.slot.usedDate,
      exercises: fakes.slot.generatedClassData.exercises.map((e) => e.exerciseName),
      logs: fakes.ClassLog.rows.length,
      count: fakes.sprint.totalClassesCompleted,
    };
    console.log('STEP2 REGENERATE', JSON.stringify(afterRegen));

    let caught = null;
    try {
      await confirmSlotUsed(1, SLOT_ID, ACTOR, { usedDate: '2024-01-15' });
    } catch (err) {
      caught = err;
    }
    console.log('STEP3 RECONFIRM', caught
      ? `${caught.name} status=${caught.status ?? caught.statusCode} msg="${caught.message}"`
      : 'NO ERROR (silent success)');
    console.log('STEP3 STATE', JSON.stringify({
      classLogId: fakes.slot.classLogId,
      wasUsed: fakes.slot.wasUsed,
      status: fakes.slot.status,
      logs: fakes.ClassLog.rows.length,
      count: fakes.sprint.totalClassesCompleted,
    }));

    // No duplicate row and no double count — but the slot is now un-confirmable.
    expect(fakes.ClassLog.rows).toHaveLength(1);
    expect(fakes.sprint.totalClassesCompleted).toBe(1);
    expect(caught).not.toBeNull();
  });
});
