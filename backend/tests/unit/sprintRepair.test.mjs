import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sprint: null, slots: [], writes: [], generate: vi.fn(), now: new Date('2026-09-13T12:00:00Z') }));
const models = vi.hoisted(() => ({
  sprint: { findOne: vi.fn(), findByPk: vi.fn(), update: vi.fn() },
  slot: { findAll: vi.fn(), findOne: vi.fn(), update: vi.fn(), count: vi.fn() },
  memory: { findAll: vi.fn(), destroy: vi.fn(), bulkCreate: vi.fn(), findOrCreate: vi.fn() },
  week: { findByPk: vi.fn() },
  log: { create: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => models.sprint, getSprintWeek: () => models.week,
  getSprintClassSlot: () => models.slot, getSprintExerciseMemory: () => models.memory,
  getBootcampSpaceProfile: () => ({ findOne: vi.fn() }), getBootcampClassLog: () => models.log,
}));
vi.mock('../../database.mjs', () => ({ default: {
  transaction: async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }),
  query: async () => [{ now: state.now }],
} }));
vi.mock('../../services/bootcamp/bootcampGenerator.mjs', () => ({ generateBootcampClass: (...args) => state.generate(...args) }));
const { generateSprintClasses, regenerateSlot } = await import('../../services/bootcamp/sprintGenerator.mjs');
const { confirmSlotUsed, updateSlot, getSprintById } = await import('../../services/bootcamp/sprintService.mjs');
const { withSprintClaim } = await import('../../services/bootcamp/sprintGenerationClaim.mjs');
const actor = { userId: 7, role: 'trainer' };
const request = { expectedGenerationVersion: 1, operationId: '11111111-1111-4111-8111-111111111111' };

beforeEach(() => {
  vi.clearAllMocks(); state.writes = []; state.slots = [];
  state.sprint = { id: 1, trainerId: 7, status: 'draft', generationVersion: 1, metadata: {}, weeks: [],
    update: vi.fn(async values => { Object.assign(state.sprint, values); state.writes.push(values); }),
    increment: vi.fn(),
  };
  models.sprint.findOne.mockImplementation(async ({ where }) => where.id === 1 && (where.trainerId == null || where.trainerId === 7) ? state.sprint : null);
  models.sprint.findByPk.mockImplementation(async () => state.sprint);
  models.sprint.update.mockResolvedValue([1]);
  models.slot.findAll.mockImplementation(async () => state.slots);
  models.memory.findAll.mockResolvedValue([]);
  models.memory.findOrCreate.mockResolvedValue([{}, true]);
});

describe('Sprint hostile repair service boundaries', () => {
  it('rejects expired and superseded workers before executing any slot write', async () => {
    const claim = { operationId: request.operationId, version: 1 };
    const write = vi.fn();
    Object.assign(state.sprint, { status: 'generating', metadata: { generationClaimV1: { ...claim, expiresAt: '2026-09-13T11:59:59Z' } } });
    await expect(withSprintClaim(1, actor, claim, write)).rejects.toThrow('claim lost');
    state.sprint.metadata.generationClaimV1.expiresAt = '2026-09-13T12:02:00Z';
    state.sprint.generationVersion = 2;
    await expect(withSprintClaim(1, actor, claim, write)).rejects.toThrow('claim lost');
    expect(write).not.toHaveBeenCalled();
  });
  it('confirmation retries return one linked log and exclude offered alternatives', async () => {
    const slot = { id: 3, sprintId: 1, status: 'generated', scheduledDate: '2026-09-12',
      generatedClassData: { exercises: [{ exerciseName: 'Main', board: 'main' }, { exerciseName: 'Option', board: 'alternative' }] },
      update: vi.fn(async values => Object.assign(slot, values)),
    };
    models.slot.findOne.mockResolvedValue(slot);
    models.slot.count.mockResolvedValue(1);
    models.log.create.mockResolvedValue({ id: 14 });
    await confirmSlotUsed(1, 3, 7, {});
    await confirmSlotUsed(1, 3, 7, {});
    expect(models.log.create).toHaveBeenCalledTimes(1);
    expect(models.log.create.mock.calls[0][0].exercisesUsed).toEqual([{ exerciseName: 'Main', board: 'main' }]);
    expect(slot.classLogId).toBe(14);
    await expect(confirmSlotUsed(1, 3, 7, { usedDate: '2026-09-11' })).rejects.toThrow('differs');
  });
  it('requires an actor for direct generation and reads', async () => {
    await expect(generateSprintClasses(1, null, null, request)).rejects.toThrow();
    await expect(getSprintById(1)).rejects.toThrow();
    expect(state.generate).not.toHaveBeenCalled();
  });
  it('cannot steal a live claim by reading its newer generationVersion', async () => {
    Object.assign(state.sprint, { status: 'generating', metadata: { generationClaimV1: {
      operationId: request.operationId, version: 1, expiresAt: '2026-09-13T12:02:00Z',
    } } });
    await expect(generateSprintClasses(1, null, actor, request)).rejects.toThrow(/progress|claim|conflict/i);
    expect(models.sprint.update).not.toHaveBeenCalled();
    expect(state.sprint.update).not.toHaveBeenCalled();
  });
  it('does not teach or regenerate a planned empty/taught slot', async () => {
    models.slot.findOne.mockResolvedValue({ id: 3, sprintId: 1, status: 'planned', update: vi.fn() });
    await expect(confirmSlotUsed(1, 3, 7, {})).rejects.toThrow();
    models.slot.findOne.mockResolvedValue({ id: 3, sprintId: 1, status: 'taught', update: vi.fn() });
    await expect(regenerateSlot(1, 3, 7, request)).rejects.toThrow();
    expect(state.generate).not.toHaveBeenCalled();
  });
  it('generic slot writes cannot fabricate taught status', async () => {
    const slot = { id: 3, sprintId: 1, status: 'planned', update: vi.fn() };
    models.slot.findOne.mockResolvedValue(slot);
    await expect(updateSlot(1, 3, 7, { status: 'taught' })).rejects.toThrow();
    expect(slot.update).not.toHaveBeenCalled();
  });
});
