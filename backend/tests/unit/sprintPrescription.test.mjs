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
  models.slot.findAll.mockImplementation(async ({ where } = {}) => state.slots.filter(s => !where?.status || (Array.isArray(where.status) ? where.status : [where.status]).includes(s.status)));
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

describe('P1.2: the generation payload crosses no client PII to any model boundary', () => {
  // Fable D-8: the pain path aggregates server-side; this locks the payload
  // to a closed key set so a future field cannot smuggle identifiers or
  // free-text pain notes into generation without breaking this test.
  it('sends ONLY the allowlisted keys to generateBootcampClass', async () => {
    await generateSprintClasses(1, null, actor, request);
    const ALLOWLIST = new Set([
      'classFormat', 'classStyle', 'dayType', 'spaceProfileId', 'trainerId',
      'exclusionKeys', 'includeStretch', 'stretchDurationMin', 'prescriptionIntensity',
    ]);
    for (const [options] of state.generate.mock.calls) {
      const keys = Object.keys(options);
      expect(keys.filter(k => !ALLOWLIST.has(k))).toEqual([]);
      expect(options.exclusionKeys).toBeInstanceOf(Set);
    }
  });
});

describe('P1.4: PROGRESSION map reconciles with base c0cbe538d', () => {
  // Fable D-6: the restored map must EQUAL base, not approximate it. These
  // goldens are transcribed from `git show c0cbe538d:backend/services/
  // bootcamp/sprintGenerator.mjs` — any drift from a future repair fails here.
  it('reproduces the base multipliers exactly', () => {
    const { PROGRESSION } = __testing__;
    // linear: 1.0 + 0.05/week, capped 1.5
    expect(PROGRESSION.linear(1, 12)).toBe(1.0);
    expect(PROGRESSION.linear(5, 12)).toBeCloseTo(1.2);
    expect(PROGRESSION.linear(20, 12)).toBe(1.5);
    // undulating: [1.0, 0.85, 1.1] cycling
    expect(PROGRESSION.undulating(1)).toBe(1.0);
    expect(PROGRESSION.undulating(2)).toBe(0.85);
    expect(PROGRESSION.undulating(3)).toBe(1.1);
    expect(PROGRESSION.undulating(4)).toBe(1.0);
    // block: 0.9 (w1-3), 1.0 (w4-6), 1.1 (w7-9), 1.05 after
    expect(PROGRESSION.block(3)).toBe(0.9);
    expect(PROGRESSION.block(6)).toBe(1.0);
    expect(PROGRESSION.block(9)).toBe(1.1);
    expect(PROGRESSION.block(10)).toBe(1.05);
  });
  it('keeps random inside the base 0.85–1.15 band', () => {
    for (let i = 0; i < 200; i++) {
      const v = __testing__.PROGRESSION.random();
      expect(v).toBeGreaterThanOrEqual(0.85);
      expect(v).toBeLessThanOrEqual(1.15);
    }
  });
});

describe('U2: exercise-memory exclusion window', () => {
  it('excludes only keys whose week is inside the 4-week window', async () => {
    // Weeks 3-5 already generated; week 6 is being generated now. Window = 4
    // weeks: min week = 6 - 4 + 1 = 3. 'ex-w2' is OUTSIDE and must NOT be
    // excluded (back-half novelty), 'ex-w3' is INSIDE and must be.
    models.memory.findAll.mockResolvedValue([
      { exerciseKey: 'ex-w2', weekNumber: 2 },
      { exerciseKey: 'ex-w3', weekNumber: 3 },
    ]);
    state.sprint.weeks = [
      week(301, 3, {}, []),
      week(302, 4, {}, []),
      week(303, 5, {}, []),
      week(306, 6, {}, [16]),
    ];
    for (const w of state.sprint.weeks) for (const s of w.classSlots) { s.status = w.weekNumber < 6 ? 'generated' : 'planned'; s.exerciseKeys = s.status === 'generated' ? [`ex-slot-w${w.weekNumber}`] : []; s.generatedClassData = s.status === 'generated' ? { exercises: [{ exerciseName: 'G', board: 'main', key: `ex-slot-w${w.weekNumber}` }] } : null; }
    state.slots = state.sprint.weeks.flatMap(w => w.classSlots);

    await generateSprintClasses(1, null, actor, request);

    const opts = state.generate.mock.calls[0][0];
    // Seeded memory truth: ex-w2 (week 2, outside) vs ex-w3 (week 3, inside).
    // Slot keys enter memory via the real bulkCreate, which the mock no-ops.
    expect([...opts.exclusionKeys].sort()).toEqual(['ex-w3']);
  });
});
