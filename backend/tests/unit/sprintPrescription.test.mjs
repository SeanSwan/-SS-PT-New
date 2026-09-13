/**
 * F04 acceptance — the week prescription must reach generation.
 *
 * Receipt 19's open finding: `week.intensityModifier` / `isDeloadWeek` and
 * `sprint.progressionStrategy` are persisted and validated but had ZERO readers
 * on the generation path, so a coach flagging a deload week still generated
 * full-volume classes. The base sprint generator read them
 * (`git show c0cbe538d:backend/services/bootcamp/sprintGenerator.mjs`):
 * a per-week modifier folded into generation. This locks the restored reader:
 * deload wins, an explicit modifier wins over the strategy, and the
 * progression strategy is the fallback for weeks with no explicit modifier.
 *
 * The generator-side volume contract lives in bootcampGenerationSemantics.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sprint: null, slots: [], generate: vi.fn(), now: new Date('2026-09-13T12:00:00Z') }));
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
const { generateSprintClasses, regenerateSlot, __testing__ } = await import('../../services/bootcamp/sprintGenerator.mjs');
const actor = { userId: 7, role: 'trainer' };
const request = { expectedGenerationVersion: 1, operationId: '11111111-1111-4111-8111-111111111111' };

// exerciseKeys are seeded so the pre-generation rebuildMemory() pass has slot
// truth to read without any slot having been generated yet.
const slot = (id, weekId) => ({ id, sprintId: 1, weekId, status: 'planned', classFormat: '4x4_r2',
  dayType: 'full_body', exerciseKeys: ['seed-key'], update: vi.fn() });

const week = (id, weekNumber, prescription, slots) => ({
  id, weekNumber, isDeloadWeek: prescription.isDeload ?? false,
  intensityModifier: prescription.modifier ?? null,
  classSlots: slots.map(slotId => slot(slotId, id)),
});

beforeEach(() => {
  vi.clearAllMocks();
  state.generate.mockImplementation(async () => ({ exercises: [{ exerciseName: 'W', board: 'main', key: 'w' }], stations: [] }));
  state.sprint = { id: 1, trainerId: 7, status: 'draft', generationVersion: 1, metadata: {},
    progressionStrategy: 'linear', durationWeeks: 6, weeks: [],
    update: vi.fn(async values => Object.assign(state.sprint, values)) };
  models.sprint.findOne.mockImplementation(async ({ where }) => where.id === 1 && (where.trainerId == null || where.trainerId === 7) ? state.sprint : null);
  models.memory.findAll.mockResolvedValue([]);
  models.slot.findAll.mockImplementation(async () => state.slots);
  models.slot.findOne.mockImplementation(async ({ where }) => state.slots.find(s => s.id === where.id) ?? null);
  models.week.findByPk.mockImplementation(async id => state.sprint.weeks.find(w => w.id === id) ?? null);
  // linear(2, 6) = 1.0 + 0.05 = 1.05 — the strategy fallback for a week with no explicit modifier.
  state.sprint.weeks = [
    week(101, 1, { modifier: 1.0 }, [11]),
    week(102, 2, {}, [12]),
    week(103, 3, { isDeload: true, modifier: 0.7 }, [13]),
    week(104, 4, { modifier: 1.2 }, [14]),
  ];
  state.slots = state.sprint.weeks.flatMap(w => w.classSlots);
});

describe('F04: the week prescription reaches the generator', () => {
  it('sends deload 0.7, explicit modifier, and the strategy fallback per slot', async () => {
    await generateSprintClasses(1, null, actor, request);

    expect(state.generate).toHaveBeenCalledTimes(4);
    const intensities = state.generate.mock.calls.map(([options]) => options.prescriptionIntensity).sort((a, b) => a - b);
    expect(intensities).toEqual([0.7, 1, 1.05, 1.2]);
    // Exactly one deload slot, at exactly 0.7.
    expect(state.generate.mock.calls.filter(([options]) => options.prescriptionIntensity === 0.7))
      .toHaveLength(1);
  });

  it('uses the persisted 0.7 when a deload week has no explicit modifier', async () => {
    state.sprint.weeks = [week(103, 3, { isDeload: true }, [13])];
    state.slots = state.sprint.weeks.flatMap(w => w.classSlots);

    await generateSprintClasses(1, null, actor, request);

    expect(state.generate.mock.calls[0][0].prescriptionIntensity).toBe(0.7);
  });

  it('applies the same week prescription when regenerating a single slot', async () => {
    const deloadSlot = { id: 13, sprintId: 1, weekId: 103, status: 'generated',
      generatedClassData: { exercises: [{ exerciseName: 'Old', board: 'main', key: 'old' }] }, update: vi.fn() };
    models.slot.findOne.mockResolvedValue(deloadSlot);
    models.slot.findAll.mockResolvedValue([deloadSlot]);
    models.week.findByPk.mockResolvedValue({ id: 103, weekNumber: 3, isDeloadWeek: true, intensityModifier: 0.7 });

    await regenerateSlot(1, 13, actor, request);

    expect(models.week.findByPk).toHaveBeenCalledWith(103);
    expect(state.generate.mock.calls[0][0].prescriptionIntensity).toBe(0.7);
  });

  it('exposes the prescription decision as a pure function', () => {
    const { weekPrescription } = __testing__;
    expect(weekPrescription({ isDeloadWeek: true, intensityModifier: null })).toBe(0.7);
    expect(weekPrescription({ isDeloadWeek: true, intensityModifier: 0.8 })).toBe(0.8);
    expect(weekPrescription({ weekNumber: 2, intensityModifier: null }, 'linear', 6)).toBeCloseTo(1.05);
    expect(weekPrescription({ weekNumber: 1, intensityModifier: 1.3 }, 'random')).toBe(1.3);
    // Unknown strategy falls back to linear, never to undefined.
    expect(weekPrescription({ weekNumber: 3, intensityModifier: null }, 'mystery', 6)).toBeCloseTo(1.1);
  });
});
