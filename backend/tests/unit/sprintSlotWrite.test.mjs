/**
 * ============================================================================
 * FILE: sprintSlotWrite.test.mjs — R-H04 slice B (atomic memory union).
 *
 * THE DEFECT
 *   The slot was marked `generated` with its full `exerciseKeys`, and THEN
 *   `SprintExerciseMemory` was written one `findOrCreate` at a time with NO
 *   transaction. A failure part-way left the slot claiming `generated` while
 *   memory held only some of its keys — and memory is the cross-sprint exclusion
 *   source, so the next generation could re-pick exercises this class already
 *   used. The caller's `catch` swallowed the error but the slot UPDATE had
 *   already committed, so a partial write was indistinguishable from a complete
 *   one to any later reader.
 *
 * THE INVARIANT: the slot row and its memory rows are ONE unit carrying ONE
 * transaction, and a failure rejects rather than being absorbed.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock('../../database.mjs', () => ({
  default: { transaction: (fn) => mocks.transaction(fn) },
}));

const { persistGeneratedSlotAtomically } =
  await import('../../services/bootcamp/sprintSlotWrite.mjs');

const TX = { id: 'TX-1' };

function harness({ failOnKey = null } = {}) {
  const slotCalls = [];
  const memoryCalls = [];
  const SprintClassSlot = {
    update: vi.fn(async (values, options) => {
      slotCalls.push({ values, options });
      return [1];
    }),
  };
  const SprintExerciseMemory = {
    findOrCreate: vi.fn(async (options) => {
      memoryCalls.push(options);
      if (options.where.exerciseKey === failOnKey) throw new Error('memory write failed');
      return [{}, true];
    }),
  };
  return { SprintClassSlot, SprintExerciseMemory, slotCalls, memoryCalls };
}

const args = (h, exerciseKeys = ['squat', 'row', 'press']) => ({
  SprintClassSlot: h.SprintClassSlot,
  SprintExerciseMemory: h.SprintExerciseMemory,
  sprintId: 77,
  weekNumber: 2,
  slotId: 9,
  classData: { name: 'Synthetic' },
  exerciseKeys,
});

beforeEach(() => {
  mocks.transaction.mockReset();
  mocks.transaction.mockImplementation(async (fn) => fn(TX));
});

describe('the slot and its memory rows are one unit', () => {
  it('runs inside a transaction', async () => {
    const h = harness();
    await persistGeneratedSlotAtomically(args(h));
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('gives EVERY write the SAME transaction', async () => {
    // Pre-fix there was no transaction at all, so not one of these carried one.
    const h = harness();
    await persistGeneratedSlotAtomically(args(h));

    expect(h.slotCalls).toHaveLength(1);
    expect(h.slotCalls[0].options).toEqual({ where: { id: 9 }, transaction: TX });

    expect(h.memoryCalls).toHaveLength(3);
    for (const call of h.memoryCalls) {
      expect(call.transaction).toBe(TX);
    }
  });

  it('marks the slot generated with the full key list', async () => {
    const h = harness();
    await persistGeneratedSlotAtomically(args(h));
    expect(h.slotCalls[0].values).toMatchObject({
      exerciseKeys: ['squat', 'row', 'press'],
      status: 'generated',
    });
  });

  it('keys each memory row to the slot and week it came from', async () => {
    const h = harness();
    await persistGeneratedSlotAtomically(args(h));
    for (const call of h.memoryCalls) {
      expect(call.where.sprintId).toBe(77);
      expect(call.defaults).toEqual({ slotId: 9, weekNumber: 2 });
    }
  });

  it('PROPAGATES a mid-loop failure instead of absorbing it', async () => {
    // The old caller caught this, counted a failed slot, and left the slot
    // committed as `generated` with partial memory.
    const h = harness({ failOnKey: 'row' });
    await expect(persistGeneratedSlotAtomically(args(h))).rejects.toThrow('memory write failed');
  });

  it('writes memory AFTER the slot, so a rollback undoes both', async () => {
    const h = harness();
    await persistGeneratedSlotAtomically(args(h));
    expect(h.memoryCalls).toHaveLength(3);
    expect(h.slotCalls[0].options.transaction).toBe(TX);
  });

  it('still writes the slot when there are no exercise keys', async () => {
    const h = harness();
    await persistGeneratedSlotAtomically(args(h, []));
    expect(h.slotCalls).toHaveLength(1);
    expect(h.memoryCalls).toHaveLength(0);
  });

  it('tolerates a missing or malformed key list without crashing', async () => {
    for (const bad of [undefined, null, 'squat', 42]) {
      const h = harness();
      await persistGeneratedSlotAtomically({ ...args(h), exerciseKeys: bad });
      expect(h.slotCalls).toHaveLength(1);
      expect(h.memoryCalls).toHaveLength(0);
    }
  });
});
