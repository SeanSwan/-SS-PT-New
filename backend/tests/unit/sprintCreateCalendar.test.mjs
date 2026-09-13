/**
 * ============================================================================
 * FILE: sprintCreateCalendar.test.mjs — S07 / R-H06.
 *
 * Locks createSprint's admission and persistence behaviour:
 *   - invalid input opens NO transaction and performs NO writes
 *   - a valid save persists the UTC-correct calendar dates and exact counts
 *   - a late slot-write failure rolls the whole thing back
 *
 * SCOPE: the models are mocked. This proves the SERVICE's calendar and
 * transaction discipline; it does NOT prove PostgreSQL transaction behaviour.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sequelizeMock, models, calls } = vi.hoisted(() => {
  const calls = {
    transactions: 0, commits: 0, rollbacks: 0,
    sprintCreate: [], weekCreate: [], slotCreate: [], sprintUpdate: [],
  };
  const tx = {
    id: 'tx',
    commit: async () => { calls.commits += 1; },
    rollback: async () => { calls.rollbacks += 1; },
  };
  const models = {
    Sprint: {
      create: async (values) => { calls.sprintCreate.push(values); return { id: 77, ...values }; },
      // §6 line 258: createSprint now persists the resolved progression policy in the SAME
      // transaction as the scaffold.
      update: async (values, options) => { calls.sprintUpdate.push({ values, options }); return [1]; },
      // createSprint re-reads the sprint with its weeks/slots before returning.
      // The post-create read is ownership-checked, so the row needs a trainerId.
      findByPk: async (id) => ({ id, trainerId: TRAINER_ACTOR.userId, weeks: calls.weekCreate, slots: calls.slotCreate }),
      findAll: async () => [],
    },
    Week: { create: async (values) => { calls.weekCreate.push(values); return { id: 500 + calls.weekCreate.length, ...values }; } },
    Slot: { create: async (values) => { calls.slotCreate.push(values); return { id: 900 + calls.slotCreate.length, ...values }; } },
  };
  const sequelizeMock = {
    transaction: async () => { calls.transactions += 1; return tx; },
  };
  return { sequelizeMock, models, calls };
});

vi.mock('../../database.mjs', () => ({ default: sequelizeMock }));
vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => models.Sprint,
  getSprintWeek: () => models.Week,
  getSprintClassSlot: () => models.Slot,
  getSprintExerciseMemory: () => ({ findAll: async () => [] }),
  getBootcampSpaceProfile: () => null,
}));

const { createSprint } = await import('../../services/bootcamp/sprintService.mjs');
const { SprintCalendarValidationError } =
  await import('../../services/bootcamp/sprintCalendarContract.mjs');

// S08/R-H03: every exported service boundary now takes a trusted actor first.
const TRAINER_ACTOR = { userId: 7, role: 'trainer' };

const baseParams = (over = {}) => ({
  name: 'Synthetic Sprint',
  startDate: '2026-03-02',
  durationWeeks: 2,
  frequencyPattern: ['monday', 'wednesday', 'friday'],
  focusRotation: ['lower_body', 'upper_body', 'full_body'],
  ...over,
});

const totalWrites = () => calls.sprintCreate.length + calls.weekCreate.length + calls.slotCreate.length;

beforeEach(() => {
  calls.transactions = 0; calls.commits = 0; calls.rollbacks = 0;
  calls.sprintCreate = []; calls.weekCreate = []; calls.slotCreate = [];
  models.Slot.create = async (values) => { calls.slotCreate.push(values); return { id: 900 + calls.slotCreate.length, ...values }; };
});

describe('createSprint admission — invalid input writes nothing', () => {
  it.each([
    ['malformed start date', { startDate: '2026-02-30' }],
    ['timestamp instead of a date', { startDate: '2026-03-02T00:00:00Z' }],
    ['zero weeks', { durationWeeks: 0 }],
    ['53 weeks', { durationWeeks: 53 }],
    ['fractional weeks', { durationWeeks: 1.5 }],
    ['duplicate weekday', { frequencyPattern: ['monday', 'monday'] }],
    ['empty weekday list', { frequencyPattern: [] }],
    ['unknown weekday', { frequencyPattern: ['funday'] }],
    ['non-string weekday', { frequencyPattern: ['monday', 4] }],
    ['empty focus rotation', { focusRotation: [] }],
    ['unsupported focus', { focusRotation: ['moon_phase'] }],
    ['mismatched classesPerWeek', { classesPerWeek: 5 }],
  ])('rejects %s before opening a transaction', async (_label, over) => {
    await expect(createSprint(TRAINER_ACTOR, baseParams(over))).rejects.toBeInstanceOf(SprintCalendarValidationError);
    expect(calls.transactions).toBe(0);
    expect(totalWrites()).toBe(0);
  });
});

describe('createSprint persistence — the calendar that actually lands', () => {
  it('records the resolved progression policy in the SAME transaction (§6 line 258)', async () => {
    await createSprint(TRAINER_ACTOR, baseParams());

    const write = calls.sprintUpdate[0];
    expect(write).toBeDefined();
    expect(write.options.transaction.id).toBe('tx');
    expect(write.options.where).toEqual({ id: 77 });

    const policy = write.values.metadata.progressionPolicyV1;
    expect(policy.version).toBe(1);
    expect(policy.overrideByWeek).toEqual({});
    // One resolved entry per week the scaffold actually created — not for some other count.
    expect(Object.keys(policy.resolvedByWeek).sort()).toEqual(['1', '2']);
    // …and EXACTLY the Sprint's own duration, because `totalWeeks` is part of the `random`
    // seed: if the create-time count and `sprint.durationWeeks` could differ, a random week
    // would resolve one way at create and another at generation (round 103, F12).
    expect(Object.keys(policy.resolvedByWeek)).toHaveLength(calls.sprintCreate[0].durationWeeks);
    for (const entry of Object.values(policy.resolvedByWeek)) {
      expect(typeof entry.modifier).toBe('number');
      expect(typeof entry.source).toBe('string');
    }
  });

  it('persists the UTC-correct dates, chronological order and exact counts', async () => {
    await createSprint(TRAINER_ACTOR, baseParams());

    const sprint = calls.sprintCreate[0];
    expect(sprint.startDate).toBe('2026-03-02');
    expect(sprint.endDate).toBe('2026-03-15'); // start + 2*7 - 1
    expect(sprint.trainerId).toBe(7);
    expect(sprint.totalClassesPlanned).toBe(6);
    expect(sprint.classesPerWeek).toBe(3);
    expect(sprint.frequencyPattern).toEqual(['monday', 'wednesday', 'friday']);

    expect(calls.weekCreate.map(w => [w.weekNumber, w.startDate, w.endDate])).toEqual([
      [1, '2026-03-02', '2026-03-08'],
      [2, '2026-03-09', '2026-03-15'],
    ]);

    // The bug under R-H06 put week 1 on Tue/Thu/Sat when the host was west of UTC.
    expect(calls.slotCreate.map(s => s.scheduledDate)).toEqual([
      '2026-03-02', '2026-03-04', '2026-03-06',
      '2026-03-09', '2026-03-11', '2026-03-13',
    ]);
    expect(calls.slotCreate.map(s => s.dayOfWeek)).toEqual([1, 3, 5, 1, 3, 5]);
    expect(calls.slotCreate.map(s => s.dayType)).toEqual([
      'lower_body', 'upper_body', 'full_body',
      'lower_body', 'upper_body', 'full_body',
    ]);

    expect(calls.transactions).toBe(1);
    expect(calls.commits).toBe(1);
    expect(calls.rollbacks).toBe(0);
  });

  it('persists the normalized weekday order and the normalized focus', async () => {
    await createSprint(TRAINER_ACTOR, baseParams({
      frequencyPattern: ['  FRIDAY ', 'Monday'],
      focusRotation: ['UPPER_BODY', 'lower_body'],
      classesPerWeek: 2,
    }));

    expect(calls.sprintCreate[0].frequencyPattern).toEqual(['friday', 'monday']);
    expect(calls.sprintCreate[0].focusRotation).toEqual(['upper_body', 'lower_body']);
    // Chronological: Monday 03-02 precedes Friday 03-06.
    expect(calls.slotCreate.map(s => s.scheduledDate).slice(0, 2)).toEqual(['2026-03-02', '2026-03-06']);
    expect(calls.slotCreate.map(s => s.dayType).slice(0, 2)).toEqual(['upper_body', 'lower_body']);
  });

  it('applies the existing omitted-field defaults', async () => {
    await createSprint(TRAINER_ACTOR, { name: 'Defaults', startDate: '2026-03-02' });

    const sprint = calls.sprintCreate[0];
    expect(sprint.durationWeeks).toBe(12);
    expect(sprint.frequencyPattern).toEqual(['monday', 'wednesday', 'friday']);
    expect(sprint.focusRotation).toEqual(['lower_body', 'upper_body', 'full_body']);
    expect(sprint.classesPerWeek).toBe(3);
    expect(sprint.endDate).toBe('2026-05-24'); // 12 weeks from 2026-03-02
    expect(calls.weekCreate).toHaveLength(12);
    expect(calls.slotCreate).toHaveLength(36);
  });

  it('rolls back and rethrows when a late slot write fails', async () => {
    let written = 0;
    models.Slot.create = async (values) => {
      written += 1;
      if (written === 4) throw new Error('slot insert failed');
      calls.slotCreate.push(values);
      return { id: 900 + written, ...values };
    };

    await expect(createSprint(TRAINER_ACTOR, baseParams())).rejects.toThrow('slot insert failed');
    expect(calls.rollbacks).toBe(1);
    expect(calls.commits).toBe(0);
    // NOTE: this proves the service asked for a rollback. It does NOT prove
    // PostgreSQL rolled anything back — that needs the real database.
  });
});
