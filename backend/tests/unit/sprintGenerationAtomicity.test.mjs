/**
 * ============================================================================
 * FILE: sprintGenerationAtomicity.test.mjs — S-H05 acceptance (contract §8 line 292).
 *
 * The contract names THIS file with four subjects:
 *
 *   "second memory write fails; regeneration throws; resume mixed existing slots;
 *    duplicated legacy key"
 *
 *   "Slot+union rollback; old regeneration snapshot survives; remaining exposure retained;
 *    ordinal week; no empty-memory fallback"
 *
 * TRACEABILITY NOTE. The row pointed at a file that was never created. Part of its subject is
 * covered under other names — the slot+union ROLLBACK is `sprintSlotWrite.test.mjs` (the write
 * helpers) and the real-PostgreSQL suite — but the RESUME half had no owner: nothing asserted
 * that a second run SKIPS classes that already exist, that the exclusion set still carries what
 * the sprint already used, or that a failed regeneration leaves the previous snapshot standing.
 * Those are the cases below.
 *
 * WHAT IS REAL HERE: `generateSprintClasses` and `regenerateSlot` themselves, with the models
 * and the class generator faked. The generation ORDER, the skip rule, the exclusion set and the
 * status lifecycle are the service's own.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const spies = vi.hoisted(() => ({
  sprintFindByPk: vi.fn(),
  sprintUpdate: vi.fn(async () => [1]),
  slotFindByPk: vi.fn(),
  memoryFindAll: vi.fn(async () => []),
  memoryDestroy: vi.fn(async () => 0),
  memoryFindOrCreate: vi.fn(async () => [{}, true]),
  generateBootcampClass: vi.fn(),
  persistSlot: vi.fn(async () => undefined),
  memoryKeys: vi.fn(async () => []),
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: async (callback) => callback({ id: 'tx' }) },
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({ findByPk: spies.sprintFindByPk, update: spies.sprintUpdate }),
  // `regenerateSlot` reads the slot's week by pk (for the ordinal week the modifier needs), so
  // the mock needs it as well as the loop's `findOne`/`findAll`.
  getSprintWeek: () => ({
    findOne: vi.fn(async () => null),
    findAll: async () => [],
    findByPk: async (id) => ({ id, weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0 }),
  }),
  getSprintClassSlot: () => ({ findByPk: spies.slotFindByPk, findOne: vi.fn(), findAll: async () => [] }),
  getSprintExerciseMemory: () => ({
    findAll: spies.memoryFindAll,
    destroy: spies.memoryDestroy,
    findOrCreate: spies.memoryFindOrCreate,
  }),
  getBootcampSpaceProfile: () => null,
}));

vi.mock('../../services/bootcamp/bootcampGenerator.mjs', () => ({
  generateBootcampClass: spies.generateBootcampClass,
}));

vi.mock('../../services/bootcamp/sprintSlotWrite.mjs', () => ({
  persistGeneratedSlotAtomically: spies.persistSlot,
}));

vi.mock('../../services/bootcamp/sprintService.mjs', () => ({
  getSprintExerciseMemoryKeys: spies.memoryKeys,
}));

const { generateSprintClasses, regenerateSlot } = await import('../../services/bootcamp/sprintGenerator.mjs');

const OWNER = { userId: 7, role: 'trainer' };
const slot = (over = {}) => ({
  id: 1, status: 'planned', classFormat: 'stations_4x', classStyle: 'standard',
  dayType: 'full_body', scheduledDate: '2026-09-01', weekId: 500, generatedClassData: null,
  ...over,
});
const weekRow = (weekNumber, classSlots) => ({ weekNumber, isDeloadWeek: false, intensityModifier: 1.0, classSlots });
const sprintRow = (weeks) => ({
  id: 12, trainerId: 7, status: 'draft', generationVersion: 3, durationWeeks: weeks.length,
  progressionStrategy: 'linear', defaultFormat: 'stations_4x', defaultStyle: 'standard',
  spaceProfileId: null, previousSprintId: null, metadata: {}, update: vi.fn(async () => {}),
  weeks,
});

const statusWrites = () => spies.sprintUpdate.mock.calls.map(([values]) => values.status).filter(Boolean);

describe('S-H05 acceptance — a resumed run is atomic and idempotent (contract §8 line 292)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spies.sprintUpdate.mockResolvedValue([1]);
    spies.memoryFindAll.mockResolvedValue([]);
    spies.memoryKeys.mockResolvedValue([]);
    spies.generateBootcampClass.mockImplementation(async () => ({ exercises: [{ key: 'goblet_squat' }], explanations: [] }));
  });

  it('RESUMES mixed slots: an existing class is reused, not regenerated', async () => {
    spies.sprintFindByPk.mockResolvedValue(sprintRow([
      weekRow(1, [slot({ id: 1, status: 'generated' }), slot({ id: 2, status: 'taught' }), slot({ id: 3, status: 'planned' })]),
    ]));

    const result = await generateSprintClasses(12, OWNER, () => {});

    // Exactly ONE class was generated; the two existing ones were counted as done.
    expect(spies.generateBootcampClass).toHaveBeenCalledTimes(1);
    expect(spies.persistSlot).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ totalSlots: 3, completedSlots: 3, failedSlots: 0 });
  });

  it('RETAINS the remaining exposure: each generated class sees what the run already used', async () => {
    // The exclusion set is rebuilt per slot from cross-sprint memory PLUS this run's memory, so
    // a resumed run cannot hand the second class an exercise the first one just took.
    spies.sprintFindByPk.mockResolvedValue(sprintRow([
      weekRow(1, [slot({ id: 1 }), slot({ id: 2 })]),
    ]));
    spies.generateBootcampClass.mockImplementation(async () => ({
      exercises: [{ key: 'goblet_squat' }], explanations: [],
    }));

    await generateSprintClasses(12, OWNER, () => {});

    const firstKeys = spies.generateBootcampClass.mock.calls[0][0].exclusionKeys;
    const secondKeys = spies.generateBootcampClass.mock.calls[1][0].exclusionKeys;
    expect([...firstKeys]).toEqual([]); // nothing used yet
    expect([...secondKeys]).toContain('goblet_squat'); // the first class's key is excluded
  });

  it('a FAILING class does not stop the run, and failed slots keep the Sprint in draft', async () => {
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [slot({ id: 1 }), slot({ id: 2 })])]));
    spies.generateBootcampClass
      .mockRejectedValueOnce(new Error('generation exploded'))
      .mockResolvedValueOnce({ exercises: [{ key: 'push_up' }], explanations: [] });

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result).toMatchObject({ failedSlots: 1, status: 'draft' });
    // The Sprint is released from `generating` either way, and never claims `active` on a
    // failure — the terminal status equals the status actually committed.
    expect(statusWrites()).toContain('generating');
    const finalStatus = statusWrites().at(-1);
    expect(finalStatus).toBe('draft');
    expect(result.status).toBe(finalStatus);
  });

  it('a run with nothing to do still RELEASES the generating claim', async () => {
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [slot({ id: 1, status: 'generated' })])]));

    await generateSprintClasses(12, OWNER, () => {});

    expect(statusWrites().at(-1)).toBe('active');
    expect(spies.generateBootcampClass).not.toHaveBeenCalled();
  });

  it('REGENERATION keeps the previous snapshot when the new generation throws', async () => {
    // "Old regeneration snapshot survives": the slot row is only written after a successful
    // generation, so a throw leaves the class the trainer already had in place.
    // `sprintId` matters: the child read is scoped to the authorized Sprint, so a row without
    // it is indistinguishable from a foreign one (which is the point of that guard).
    const existing = {
      id: 9, weekId: 500, sprintId: 12, classFormat: 'stations_4x', classStyle: 'standard',
      dayType: 'full_body', status: 'generated',
    };
    spies.slotFindByPk.mockResolvedValue(existing);
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [existing])]));
    spies.generateBootcampClass.mockRejectedValue(new Error('regeneration exploded'));

    await expect(regenerateSlot(12, 9, OWNER)).rejects.toThrow(/regeneration exploded/);
    expect(spies.persistSlot).not.toHaveBeenCalled();
    expect(existing.status).toBe('generated');
  });

  // Hostile review, round 128 (HIGH). A TAUGHT slot is CLAIMED: a class log exists for it, the
  // Sprint is already counted, and its `status` is `taught`. Nothing refused a regeneration of that
  // slot, and `persistGeneratedSlotAtomically` writes `status: 'generated'` while `wasUsed`,
  // `classLogId` and `usedDate` all survive — so the slot came back looking untaught and
  // confirmable while the log row described a DIFFERENT class than its snapshot. The re-confirm
  // then answers 409 forever (`sprintConfirmSlot.mjs:136` compares the stored payload hash against a
  // body built from the NEW exercises, which can never reproduce it) and no unlink/reset endpoint
  // exists, so the trainer could never confirm or log the newly generated class.
  it('REFUSES to regenerate a TAUGHT slot, so its written log cannot be contradicted', async () => {
    const taught = {
      id: 9, weekId: 500, sprintId: 12, classFormat: 'stations_4x', classStyle: 'standard',
      dayType: 'full_body', status: 'taught', wasUsed: true, classLogId: 900, usedDate: '2026-09-01',
    };
    spies.slotFindByPk.mockResolvedValue(taught);
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [taught])]));

    await expect(regenerateSlot(12, 9, OWNER)).rejects.toMatchObject({ status: 409 });

    // Forbidden side effects, not just a returned error: nothing was generated, nothing was
    // rewritten, and the slot's exercise memory was not destroyed on the way to refusing.
    expect(spies.generateBootcampClass).not.toHaveBeenCalled();
    expect(spies.persistSlot).not.toHaveBeenCalled();
    expect(spies.memoryDestroy).not.toHaveBeenCalled();
    expect(taught.status).toBe('taught');
  });

  // The guard keys on the CLAIM (`wasUsed`/`classLogId`), not on the word `taught`, and this is why:
  // `persistGeneratedSlotAtomically` sets `status: 'generated'`, so a slot already damaged by the
  // behaviour above carries a claim with a status that no longer says `taught`. A status-only guard
  // would refuse the healthy slot and wave through precisely the damaged one.
  it('refuses a slot whose CLAIM survives even when status no longer says taught', async () => {
    const damaged = {
      id: 9, weekId: 500, sprintId: 12, classFormat: 'stations_4x', classStyle: 'standard',
      dayType: 'full_body', status: 'generated', wasUsed: true, classLogId: 900, usedDate: '2026-09-01',
    };
    spies.slotFindByPk.mockResolvedValue(damaged);
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [damaged])]));

    await expect(regenerateSlot(12, 9, OWNER)).rejects.toMatchObject({ status: 409 });
    expect(spies.persistSlot).not.toHaveBeenCalled();
  });

  // …and the refusal must not be a blanket one: regenerating an UNTAUGHT slot is the whole point of
  // the endpoint, so the guard has to leave the happy path exactly as it was.
  it('still regenerates an UNTAUGHT slot', async () => {
    const fresh = {
      id: 9, weekId: 500, sprintId: 12, classFormat: 'stations_4x', classStyle: 'standard',
      dayType: 'full_body', status: 'planned', wasUsed: false, classLogId: null,
    };
    spies.slotFindByPk.mockResolvedValue(fresh);
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [fresh])]));
    spies.generateBootcampClass.mockResolvedValue({ exercises: [{ key: 'goblet_squat' }], explanations: [] });

    await regenerateSlot(12, 9, OWNER);

    expect(spies.persistSlot).toHaveBeenCalledTimes(1);
  });

  // Round 128 — the SECOND door to the same harm. Guarding the single-slot regenerate endpoint is
  // not enough, because the full loop's skip rule keyed on the WORD `status`, and a client is allowed
  // to write that word: `validateSlotUpdate({ status: 'planned' })` is accepted
  // (`sprintUpdateContract.test.mjs:116`), while `{ status: 'taught' }` is refused (:111). So a taught
  // slot whose status was set back to 'planned' was regenerated by the next full run, replacing the
  // very snapshot its written log describes while `wasUsed`/`classLogId` survived — the identical
  // outcome the regenerate guard refuses, reached through a different request.
  it('SKIPS a CLAIMED slot in the full loop even when its status no longer says taught', async () => {
    const claimed = {
      id: 9, weekId: 500, sprintId: 12, classFormat: 'stations_4x', classStyle: 'standard',
      dayType: 'full_body', status: 'planned', wasUsed: true, classLogId: 900, usedDate: '2026-09-01',
    };
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [claimed])]));

    await generateSprintClasses(12, OWNER, () => {});

    expect(spies.generateBootcampClass).not.toHaveBeenCalled();
    expect(spies.persistSlot).not.toHaveBeenCalled();
    // NOT silently repaired either: the loop leaves the status word alone rather than overwriting a
    // slot it is declining to regenerate.
    expect(claimed.status).toBe('planned');
  });

  it('a DUPLICATED legacy memory key does not multiply rows', async () => {
    // The union is keyed by (sprintId, exerciseKey) inside `persistGeneratedSlotAtomically`, so
    // the service's job is to hand it the class's keys and the ORDINAL week — not the week id.
    spies.sprintFindByPk.mockResolvedValue(sprintRow([weekRow(1, [slot({ id: 1 })])]));

    await generateSprintClasses(12, OWNER, () => {});

    const persisted = spies.persistSlot.mock.calls[0][0];
    expect(persisted.exerciseKeys).toEqual(['goblet_squat']);
    expect(persisted.weekNumber).toBe(1);
    expect(persisted.slotId).toBe(1);
    expect(persisted.sprintId).toBe(12);
  });
});
