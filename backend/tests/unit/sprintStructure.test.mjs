/**
 * ============================================================================
 * FILE: sprintStructure.test.mjs — S07/S08.
 *
 * PURPOSE: direct tests for sprintStructure.mjs, which was extracted from
 *          sprintService.mjs and has carried its two invariants without any
 *          direct coverage since.
 *
 * THE INVARIANTS
 *   1. ATOMICITY IS A PROPERTY OF EVERY WRITE. `createSprint` opens one
 *      transaction and rolls it back on any failure. If a single scaffold write
 *      is issued WITHOUT `{ transaction }`, that row is created outside it and
 *      survives a rollback — a partially-created Sprint. Nothing else in the
 *      suite would notice, because every other test either mocks the models or
 *      checks the happy path.
 *   2. The scaffold's order is the schedule's order, and one week row is created
 *      per schedule entry with one slot row per slot entry.
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import {
  buildSprintReadOptions,
  createSprintScaffold,
} from '../../services/bootcamp/sprintStructure.mjs';

const SCHEDULE = [
  {
    weekNumber: 1,
    startDate: '2026-03-02',
    endDate: '2026-03-08',
    theme: null,
    isDeloadWeek: false,
    intensityModifier: 1.0,
    slots: [
      { dayOfWeek: 'monday', scheduledDate: '2026-03-02', dayType: 'lower_body' },
      { dayOfWeek: 'wednesday', scheduledDate: '2026-03-04', dayType: 'upper_body' },
    ],
  },
  {
    weekNumber: 2,
    startDate: '2026-03-09',
    endDate: '2026-03-15',
    theme: 'Deload & Recovery',
    isDeloadWeek: true,
    intensityModifier: 0.7,
    slots: [{ dayOfWeek: 'monday', scheduledDate: '2026-03-09', dayType: 'full_body' }],
  },
];

/** Records every create call and returns a stable id per week. */
function harness() {
  const weekCalls = [];
  const slotCalls = [];
  let weekSeq = 0;
  const SprintWeek = {
    create: vi.fn(async (row, options) => {
      weekCalls.push({ row, options });
      return { id: (weekSeq += 1), ...row };
    }),
  };
  const SprintClassSlot = {
    create: vi.fn(async (row, options) => {
      slotCalls.push({ row, options });
      return row;
    }),
  };
  return { SprintWeek, SprintClassSlot, weekCalls, slotCalls };
}

const build = (over = {}) => {
  const h = harness();
  return {
    ...h,
    promise: createSprintScaffold({
      SprintWeek: h.SprintWeek,
      SprintClassSlot: h.SprintClassSlot,
      sprintId: 77,
      schedule: SCHEDULE,
      defaultFormat: 'stations_4x',
      defaultStyle: 'standard',
      transaction: 'TX',
      ...over,
    }),
  };
};

describe('createSprintScaffold', () => {
  it('creates one week per schedule entry and one slot per slot entry', async () => {
    const { promise, weekCalls, slotCalls } = build();
    await promise;
    expect(weekCalls).toHaveLength(2);
    expect(slotCalls).toHaveLength(3);
  });

  it('threads the transaction into EVERY write', async () => {
    // The atomicity guard. A write issued without the transaction is not rolled
    // back with the rest of the Sprint.
    const { promise, weekCalls, slotCalls } = build();
    await promise;
    for (const { options } of [...weekCalls, ...slotCalls]) {
      expect(options).toEqual({ transaction: 'TX' });
    }
  });

  it('stamps sprintId on every row and parents each slot to its own week', async () => {
    const { promise, weekCalls, slotCalls } = build();
    await promise;
    expect(weekCalls.map(c => c.row.sprintId)).toEqual([77, 77]);
    expect(slotCalls.map(c => c.row.sprintId)).toEqual([77, 77, 77]);
    // Week 1 (id 1) owns the first two slots; week 2 (id 2) owns the third.
    expect(slotCalls.map(c => c.row.weekId)).toEqual([1, 1, 2]);
  });

  it('carries the schedule fields through unchanged', async () => {
    const { promise, weekCalls, slotCalls } = build();
    await promise;
    expect(weekCalls[1].row).toMatchObject({
      weekNumber: 2,
      startDate: '2026-03-09',
      endDate: '2026-03-15',
      theme: 'Deload & Recovery',
      isDeloadWeek: true,
      intensityModifier: 0.7,
    });
    expect(slotCalls[0].row).toMatchObject({
      dayOfWeek: 'monday',
      scheduledDate: '2026-03-02',
      dayType: 'lower_body',
      status: 'planned',
    });
  });

  it('applies the SAME validated vocabulary to every slot', async () => {
    const { promise, slotCalls } = build({ defaultFormat: 'circuit', defaultStyle: 'pyramid' });
    await promise;
    for (const { row } of slotCalls) {
      expect(row.classFormat).toBe('circuit');
      expect(row.classStyle).toBe('pyramid');
    }
  });

  it('writes nothing for an empty schedule', async () => {
    const { promise, weekCalls, slotCalls } = build({ schedule: [] });
    await promise;
    expect(weekCalls).toHaveLength(0);
    expect(slotCalls).toHaveLength(0);
  });

  it('creates no slots for a week with an empty slot list', async () => {
    const { promise, weekCalls, slotCalls } = build({ schedule: [{ weekNumber: 1, slots: [] }] });
    await promise;
    expect(weekCalls).toHaveLength(1);
    expect(slotCalls).toHaveLength(0);
  });
});

describe('buildSprintReadOptions', () => {
  it('orders weeks and slots deterministically', () => {
    const options = buildSprintReadOptions({ SprintWeek: 'W', SprintClassSlot: 'S' });

    expect(options.include).toHaveLength(1);
    expect(options.include[0]).toMatchObject({ model: 'W', as: 'weeks' });
    expect(options.include[0].include[0]).toMatchObject({ model: 'S', as: 'classSlots' });
    expect(options.include[0].order).toEqual([['weekNumber', 'ASC']]);

    // Ordering is applied at BOTH levels: a nested include without its own order
    // returns slots in whatever order the database chooses.
    expect(options.order).toEqual([
      [{ model: 'W', as: 'weeks' }, 'weekNumber', 'ASC'],
      [{ model: 'W', as: 'weeks' }, { model: 'S', as: 'classSlots' }, 'scheduledDate', 'ASC'],
    ]);
  });
});
