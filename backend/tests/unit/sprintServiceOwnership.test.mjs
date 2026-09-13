/**
 * ============================================================================
 * FILE: sprintServiceOwnership.test.mjs — S08 / R-H03.
 *
 * Every exported sprintService boundary, exercised against the REAL service and
 * the REAL sprintAccess, with only the models mocked. Asserts that a denial
 * costs zero writes and zero memory reads, and that child rows are only
 * reachable through an authorized Sprint.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spies } = vi.hoisted(() => ({
  spies: {
    sprintFindByPk: vi.fn(),
    sprintFindOne: vi.fn(),
    sprintUpdate: vi.fn(async () => undefined),
    sprintDestroy: vi.fn(),
    weekFindOne: vi.fn(),
    weekUpdate: vi.fn(async () => undefined),
    slotFindOne: vi.fn(),
    slotUpdate: vi.fn(async () => undefined),
    slotDestroy: vi.fn(),
    memoryFindAll: vi.fn(async () => []),
    memoryDestroy: vi.fn(),
    sprintFindAll: vi.fn(async () => []),
  },
}));

vi.mock('../../database.mjs', () => ({
  // `LOCK` mirrors Sequelize's transaction.LOCK: H29b takes `SELECT … FOR UPDATE` row locks
  // (Sprint before slot), so the fake transaction must expose the same surface.
  default: { transaction: async (callback) => callback({ id: 'tx', LOCK: { UPDATE: 'UPDATE' } }) },
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({
    findByPk: spies.sprintFindByPk,
    findOne: spies.sprintFindOne,
    findAll: spies.sprintFindAll,
    create: async (values) => ({ id: 99, ...values }),
  }),
  getSprintWeek: () => ({ findOne: spies.weekFindOne, findAll: async () => [] }),
  getSprintClassSlot: () => ({ findOne: spies.slotFindOne, findAll: async () => [] }),
  getSprintExerciseMemory: () => ({ findAll: spies.memoryFindAll, destroy: spies.memoryDestroy }),
  getBootcampSpaceProfile: () => null,
  // H29b: confirming a Sprint class now writes the one class log §5 line 216 requires, which
  // reaches the class-log and template accessors through `logBootcampClass`.
  getBootcampClassLog: () => ({ create: async (row) => ({ id: 900, ...row }), findOne: async () => null, findByPk: async () => null }),
  getBootcampTemplate: () => ({ findOne: async () => null }),
  getBootcampStation: () => ({ findAll: async () => [] }),
  getBootcampExercise: () => ({ findAll: async () => [] }),
  getBootcampOverflowPlan: () => ({ findAll: async () => [] }),
  getBootcampStretch: () => ({ findAll: async () => [] }),
  getExerciseTrend: () => ({}),
  getExercise: () => null,
}));

const {
  archiveSprint, confirmSlotUsed, getSprintById, getSprintExerciseMemoryKeys,
  listSprints, updateSlot, updateSprint, updateWeek,
} = await import('../../services/bootcamp/sprintService.mjs');
const {
  SprintActorForbiddenError, SprintIdInvalidError, SprintObjectNotFoundError,
} = await import('../../services/bootcamp/sprintAccess.mjs');

const OWNER = { userId: 7, role: 'trainer' };
const FOREIGN = { userId: 8, role: 'trainer' };
const ADMIN = { userId: 99, role: 'admin' };

const ownedSprint = () => ({ id: 12, trainerId: 7, status: 'draft', update: spies.sprintUpdate });

const writeCount = () =>
  spies.sprintUpdate.mock.calls.length
  + spies.weekUpdate.mock.calls.length
  + spies.slotUpdate.mock.calls.length
  + spies.sprintDestroy.mock.calls.length
  + spies.memoryDestroy.mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
  spies.sprintFindByPk.mockResolvedValue(ownedSprint());
  spies.weekFindOne.mockResolvedValue(null);
  spies.slotFindOne.mockResolvedValue(null);
});

describe('every boundary denies a foreign actor with zero writes', () => {
  it.each([
    ['updateSprint', () => updateSprint(12, FOREIGN, { name: 'x' })],
    ['archiveSprint', () => archiveSprint(12, FOREIGN)],
    ['updateWeek', () => updateWeek(12, 3, FOREIGN, { theme: 'x' })],
    ['updateSlot', () => updateSlot(12, 4, FOREIGN, { status: 'taught' })],
    ['confirmSlotUsed', () => confirmSlotUsed(12, 4, FOREIGN, {})],
    ['getSprintExerciseMemoryKeys', () => getSprintExerciseMemoryKeys(12, FOREIGN)],
    ['getSprintById', () => getSprintById(12, FOREIGN)],
  ])('%s', async (_label, call) => {
    await expect(call()).rejects.toBeInstanceOf(SprintObjectNotFoundError);
    expect(writeCount()).toBe(0);
    // A denied caller must never reach another trainer's exercise memory.
    expect(spies.memoryFindAll).not.toHaveBeenCalled();
  });
});

describe('a bad actor or a malformed id fails before any model access', () => {
  it.each([
    ['missing actor', () => updateSprint(12, undefined, { name: 'x' })],
    ['wrong role', () => updateSprint(12, { userId: 7, role: 'client' }, { name: 'x' })],
    ['zero user id', () => updateSprint(12, { userId: 0, role: 'trainer' }, { name: 'x' })],
  ])('%s is forbidden with no model lookup', async (_label, call) => {
    await expect(call()).rejects.toBeInstanceOf(SprintActorForbiddenError);
    expect(spies.sprintFindByPk).not.toHaveBeenCalled();
    expect(writeCount()).toBe(0);
  });

  it.each(['12abc', '1e3', '0', '-4', '1.5', '   '])('id %s is rejected before lookup', async (badId) => {
    await expect(updateSprint(badId, OWNER, { name: 'x' })).rejects.toBeInstanceOf(SprintIdInvalidError);
    expect(spies.sprintFindByPk).not.toHaveBeenCalled();
    expect(writeCount()).toBe(0);
  });
});

describe('child rows are only reachable through an authorized Sprint', () => {
  it('refuses a week whose sprintId belongs to another Sprint', async () => {
    // The Sprint IS owned, but the week belongs to a different one.
    spies.weekFindOne.mockResolvedValue({ id: 3, sprintId: 13, update: spies.weekUpdate });

    await expect(updateWeek(12, 3, OWNER, { theme: 'x' }))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
    // The child query was constrained to the authorized Sprint id.
    expect(spies.weekFindOne).toHaveBeenCalledWith({ where: { id: 3, sprintId: 12 } });
    expect(spies.weekUpdate).not.toHaveBeenCalled();
  });

  it('refuses a slot whose sprintId belongs to another Sprint', async () => {
    spies.slotFindOne.mockResolvedValue({ id: 4, sprintId: 13, update: spies.slotUpdate });

    await expect(confirmSlotUsed(12, 4, OWNER, {})).rejects.toBeInstanceOf(SprintObjectNotFoundError);
    // The child query was constrained to the authorized Sprint id, and (H29b) the read takes
    // the slot row lock inside the confirmation's transaction.
    expect(spies.slotFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 4, sprintId: 12 },
      lock: 'UPDATE',
    }));
    expect(spies.slotUpdate).not.toHaveBeenCalled();
  });
});

describe('allowed paths still work and use the authorized Sprint', () => {
  it('lets the owner update their sprint', async () => {
    await expect(updateSprint('12', OWNER, { name: 'Mine' })).resolves.toBeDefined();
    expect(spies.sprintUpdate).toHaveBeenCalledWith({ name: 'Mine' });
  });

  it('lets an explicit admin operate another trainer\'s sprint without adopting it', async () => {
    await expect(updateSprint(12, ADMIN, { name: 'Admin edit' })).resolves.toBeDefined();
    // The write happened, but ownership was never rewritten.
    expect(spies.sprintUpdate).toHaveBeenCalledWith({ name: 'Admin edit' });
    expect(spies.sprintUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ trainerId: 99 }));
  });

  it('reads memory only for the authorized Sprint', async () => {
    spies.memoryFindAll.mockResolvedValue([{ exerciseKey: 'a' }, { exerciseKey: 'b' }]);
    const keys = await getSprintExerciseMemoryKeys('12', OWNER);
    expect([...keys]).toEqual(['a', 'b']);
    expect(spies.memoryFindAll).toHaveBeenCalledWith({
      where: { sprintId: 12 },
      attributes: ['exerciseKey'],
    });
  });

  it('scopes the list to the actor\'s own identity', async () => {
    // HOSTILE-REVIEW FIX (vacuous assertion): this used to assert
    // `expect(Sprint.findAll).toBeDefined()`, which stays green if the
    // `where:{trainerId}` scoping is deleted. Assert the WHERE clause itself.
    await listSprints(OWNER);
    expect(spies.sprintFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: 7 } }),
    );

    spies.sprintFindAll.mockClear();
    await expect(listSprints({ userId: 7, role: 'client' })).rejects.toBeInstanceOf(SprintActorForbiddenError);
    // A bad actor is refused BEFORE any listing query.
    expect(spies.sprintFindAll).not.toHaveBeenCalled();
  });
});
