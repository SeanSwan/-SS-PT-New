/**
 * ============================================================================
 * FILE: sprintGeneratorOwnership.test.mjs — S08 / R-H03.
 *
 * The generator is the most expensive surface (provider calls), so it must
 * authorize BEFORE any claim, memory mutate, memory read or catalog access.
 * Real generator + real access; only the models are mocked.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spies } = vi.hoisted(() => ({
  spies: {
    sprintFindByPk: vi.fn(),
    slotFindByPk: vi.fn(),
    memoryDestroy: vi.fn(),
    memoryFindAll: vi.fn(async () => []),
    memoryCreate: vi.fn(),
    sprintUpdate: vi.fn(async () => [1]),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: async (callback) => callback({ id: 'tx' }) },
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({
    findByPk: spies.sprintFindByPk,
    findOne: vi.fn(),
    findAll: async () => [],
    update: spies.sprintUpdate,
  }),
  getSprintWeek: () => ({ findOne: vi.fn(), findAll: async () => [] }),
  getSprintClassSlot: () => ({ findByPk: spies.slotFindByPk, findOne: vi.fn(), findAll: async () => [] }),
  getSprintExerciseMemory: () => ({
    findAll: spies.memoryFindAll,
    destroy: spies.memoryDestroy,
    create: spies.memoryCreate,
  }),
  getBootcampSpaceProfile: () => null,
}));

const { generateSprintClasses, regenerateSlot } =
  await import('../../services/bootcamp/sprintGenerator.mjs');
const { SprintActorForbiddenError, SprintIdInvalidError, SprintObjectNotFoundError } =
  await import('../../services/bootcamp/sprintAccess.mjs');

const OWNER = { userId: 7, role: 'trainer' };
const FOREIGN = { userId: 8, role: 'trainer' };

const ownedSprint = { id: 12, trainerId: 7, status: 'draft', defaultFormat: 'stations_4x' };

beforeEach(() => {
  vi.clearAllMocks();
  spies.sprintFindByPk.mockResolvedValue(ownedSprint);
  spies.slotFindByPk.mockResolvedValue({ id: 4, sprintId: 12, scheduledDate: '2026-03-02' });
  spies.memoryFindAll.mockResolvedValue([]);
});

describe('regenerateSlot authorizes before any side effect', () => {
  it('refuses a foreign actor without mutating or reading memory', async () => {
    await expect(regenerateSlot(12, 4, FOREIGN)).rejects.toBeInstanceOf(SprintObjectNotFoundError);

    // The most important assertion in this file: a foreign caller must not be
    // able to DELETE another trainer's memory rows.
    expect(spies.memoryDestroy).not.toHaveBeenCalled();
    expect(spies.memoryFindAll).not.toHaveBeenCalled();
    expect(spies.memoryCreate).not.toHaveBeenCalled();
  });

  it('refuses a foreign SLOT even when the Sprint is owned', async () => {
    spies.slotFindByPk.mockResolvedValue({ id: 4, sprintId: 13 });
    await expect(regenerateSlot(12, 4, OWNER)).rejects.toBeInstanceOf(SprintObjectNotFoundError);
    expect(spies.memoryDestroy).not.toHaveBeenCalled();
  });

  it('rejects a bad actor and a malformed id before any model access', async () => {
    await expect(regenerateSlot(12, 4, { userId: 7, role: 'client' }))
      .rejects.toBeInstanceOf(SprintActorForbiddenError);
    await expect(regenerateSlot('12abc', 4, OWNER)).rejects.toBeInstanceOf(SprintIdInvalidError);
    expect(spies.sprintFindByPk).not.toHaveBeenCalled();
    expect(spies.memoryDestroy).not.toHaveBeenCalled();
  });

  it('still blocks regeneration while a full generation is in progress', async () => {
    spies.sprintFindByPk.mockResolvedValue({ ...ownedSprint, status: 'generating' });
    await expect(regenerateSlot(12, 4, OWNER)).rejects.toThrow(/generation is in progress/i);
    expect(spies.memoryDestroy).not.toHaveBeenCalled();
  });
});

describe('generateSprintClasses authorizes before any memory read', () => {
  it('refuses a foreign actor with no memory read', async () => {
    await expect(generateSprintClasses(12, FOREIGN, () => undefined))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
    expect(spies.memoryFindAll).not.toHaveBeenCalled();
  });

  it('refuses a bad actor and a malformed id before any model access', async () => {
    await expect(generateSprintClasses(12, null, () => undefined))
      .rejects.toBeInstanceOf(SprintActorForbiddenError);
    await expect(generateSprintClasses('nope', OWNER, () => undefined))
      .rejects.toBeInstanceOf(SprintIdInvalidError);
    expect(spies.memoryFindAll).not.toHaveBeenCalled();
  });
});

// ── FINDING 3 (hostile review): no generation claim for an unauthorized
//    previous Sprint. The claim used to be written BEFORE the previous Sprint
//    was authorized, and its only release was the finally INSIDE the try — so a
//    denial left the row stuck at status='generating' forever, permanently
//    blocking slot regeneration for that Sprint.
describe('FINDING 3 — the generation claim is not written before previous-Sprint authorization', () => {
  it('rejects a foreign previous Sprint and writes NO claim', async () => {
    spies.sprintFindByPk.mockImplementation(async (id) => {
      if (Number(id) === 12) return { ...ownedSprint, previousSprintId: 13, generationVersion: 3 };
      if (Number(id) === 13) return { id: 13, trainerId: 8 }; // foreign
      return null;
    });

    await expect(generateSprintClasses(12, OWNER, () => undefined))
      .rejects.toMatchObject({ status: 404 });

    expect(spies.sprintUpdate).not.toHaveBeenCalled();
    expect(spies.memoryFindAll).not.toHaveBeenCalled();
  });

  it('allows an OWNED previous Sprint through to the claim', async () => {
    spies.sprintFindByPk.mockImplementation(async (id) => (
      Number(id) === 12
        ? { ...ownedSprint, previousSprintId: 11, generationVersion: 3 }
        : { id: 11, trainerId: 7 }
    ));

    // The claim is reached (and may then fail deeper in the un-mocked generator
    // pipeline). The lock is that the gate itself no longer threw 404.
    const error = await generateSprintClasses(12, OWNER, () => undefined).catch((e) => e);
    expect(error?.status).not.toBe(404);
  });
});