/**
 * V3c.5 — longHorizonContextBuilder corrective bias coverage
 * ===========================================================
 *
 * Locks the new `correctiveBias` field on the long-horizon AI
 * context output:
 *   - When a MovementProfile with non-empty commonCompensations
 *     exists, the bias is populated from V3c.1's service.
 *   - When the profile is missing or compensations are empty, the
 *     bias degrades to `available: false` with empty arrays.
 *   - When the registry lookup throws, plan generation must NOT
 *     fail — the bias is treated as a soft hint.
 *   - Output is PII-free: only exerciseKey/name/category/citation
 *     leaks; no user identifiers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the V3c.1 service so we can control what the bias path
// "sees" from the registry without standing up Sequelize.
vi.mock('../services/ai/correctiveExerciseService.mjs', () => ({
  getCorrectiveExercisesForCompensations: vi.fn(),
}));

const { buildLongHorizonContext } = await import(
  '../services/ai/longHorizonContextBuilder.mjs'
);
const { getCorrectiveExercisesForCompensations } = await import(
  '../services/ai/correctiveExerciseService.mjs'
);

// ─── Test harness ─────────────────────────────────────────────────

function makeModels({ movementProfile, hasExercise = true } = {}) {
  return {
    WorkoutSession: { findAll: vi.fn().mockResolvedValue([]) },
    ClientBaselineMeasurements: { findOne: vi.fn().mockResolvedValue(null) },
    Goal: { findAll: vi.fn().mockResolvedValue([]) },
    BodyMeasurement: { findAll: vi.fn().mockResolvedValue([]) },
    MovementProfile: movementProfile === 'no-model'
      ? undefined
      : { findOne: vi.fn().mockResolvedValue(movementProfile ?? null) },
    Exercise: hasExercise ? { findAll: vi.fn() } : undefined,
  };
}

function makeProfile(commonCompensations) {
  return {
    userId: 1,
    commonCompensations,
    totalAnalyses: 1,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

// ─── Tests ────────────────────────────────────────────────────────

describe('V3c.5 correctiveBias — populated path', () => {
  it('builds an allowlist when MovementProfile + Exercise + service all available', async () => {
    const profile = makeProfile([
      { type: 'knee_valgus', avgSeverity: 7, frequency: 5, trend: 'worsening' },
      { type: 'head_protrusion', avgSeverity: 4, frequency: 3, trend: 'stable' },
    ]);
    const models = makeModels({ movementProfile: profile });

    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: ['knees_cave', 'pronation_distortion_syndrome', 'forward_head', 'upper_crossed_syndrome'],
      matchedCount: 4,
      inhibit: [
        { id: '1', name: 'Foam Roll TFL', exercise_key: 'ces-foam-roll-tfl',
          bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7',
          primaryMuscles: '["TFL"]', cesProtocolStep: 'inhibit',
          nasmCorrectiveCategory: ['knees_cave'] },
        { id: '2', name: 'Foam Roll Pec', exercise_key: 'ces-foam-roll-pec',
          bodyPartCategory: 'recovery', sourceCitation: 'NASM-CPT 7th ed.',
          primaryMuscles: '["Pec"]', cesProtocolStep: 'inhibit',
          nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head'] },
      ],
      lengthen: [],
      activate: [
        { id: '3', name: 'Wall Slides', exercise_key: 'ces-wall-slides',
          bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7',
          primaryMuscles: '["LowerTrap"]', cesProtocolStep: 'activate',
          nasmCorrectiveCategory: ['upper_crossed_syndrome'] },
      ],
      integrate: [],
    });

    const ctx = await buildLongHorizonContext(1, 12, models);

    expect(ctx.correctiveBias.available).toBe(true);
    expect(ctx.correctiveBias.matchedCount).toBe(4);
    expect(ctx.correctiveBias.compensations).toEqual([
      { type: 'knee_valgus', frequency: 5, avgSeverity: 7, trend: 'worsening' },
      { type: 'head_protrusion', frequency: 3, avgSeverity: 4, trend: 'stable' },
    ]);

    // Allowlist rows MUST be projected to the prompt-ready shape —
    // primaryMuscles JSON strings must NOT leak.
    const inh = ctx.correctiveBias.allowlist.inhibit;
    expect(inh).toHaveLength(2);
    expect(inh[0]).toEqual({
      exerciseKey: 'ces-foam-roll-tfl',
      name: 'Foam Roll TFL',
      bodyPartCategory: 'recovery',
      sourceCitation: 'NASM-CES Ch. 7',
    });
    // Verify NO primaryMuscles / nasmCorrectiveCategory leaked into prompt projection.
    expect(inh[0]).not.toHaveProperty('primaryMuscles');
    expect(inh[0]).not.toHaveProperty('nasmCorrectiveCategory');

    expect(ctx.correctiveBias.allowlist.activate).toHaveLength(1);
    expect(ctx.correctiveBias.allowlist.lengthen).toEqual([]);
    expect(ctx.correctiveBias.allowlist.integrate).toEqual([]);

    // Service must be called once with the compensations from the profile.
    expect(getCorrectiveExercisesForCompensations).toHaveBeenCalledTimes(1);
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.compensations).toEqual(profile.commonCompensations);
  });

  it('parses commonCompensations when stored as a JSON string (raw-query callers)', async () => {
    const profile = makeProfile(JSON.stringify([
      { type: 'low_back_arch', avgSeverity: 8, frequency: 2, trend: 'stable' },
    ]));
    const models = makeModels({ movementProfile: profile });
    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: ['low_back_arch', 'lower_crossed_syndrome'],
      matchedCount: 1,
      inhibit: [], lengthen: [], activate: [],
      integrate: [{ id: '4', name: 'Squat to Row (Cable)', exercise_key: 'ces-squat-to-row-cable',
                   bodyPartCategory: 'core', sourceCitation: 'NASM-CES Ch. 8' }],
    });
    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias.available).toBe(true);
    expect(ctx.correctiveBias.allowlist.integrate).toHaveLength(1);
  });
});

describe('V3c.5 correctiveBias — graceful-degradation paths', () => {
  it('returns empty bias when no MovementProfile exists', async () => {
    const models = makeModels({ movementProfile: null });
    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias).toEqual({
      available: false,
      compensations: [],
      tags: [],
      matchedCount: 0,
      allowlist: { inhibit: [], lengthen: [], activate: [], integrate: [] },
    });
    expect(getCorrectiveExercisesForCompensations).not.toHaveBeenCalled();
  });

  it('returns empty bias when commonCompensations is empty/null', async () => {
    const profile = makeProfile([]);
    const models = makeModels({ movementProfile: profile });
    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias.available).toBe(false);
    expect(getCorrectiveExercisesForCompensations).not.toHaveBeenCalled();
  });

  it('returns empty bias when MovementProfile fetch throws', async () => {
    const models = makeModels();
    models.MovementProfile.findOne.mockRejectedValueOnce(new Error('DB lost'));
    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias.available).toBe(false);
  });

  it('surfaces compensations even when Exercise model is missing (no allowlist)', async () => {
    const profile = makeProfile([
      { type: 'knee_valgus', avgSeverity: 5, frequency: 2, trend: 'stable' },
    ]);
    const models = makeModels({ movementProfile: profile, hasExercise: false });

    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias.available).toBe(true);
    expect(ctx.correctiveBias.compensations).toHaveLength(1);
    expect(ctx.correctiveBias.matchedCount).toBe(0);
    expect(ctx.correctiveBias.allowlist.inhibit).toEqual([]);
    expect(getCorrectiveExercisesForCompensations).not.toHaveBeenCalled();
  });

  it('does NOT throw when corrective service rejects — falls back to empty allowlist', async () => {
    const profile = makeProfile([
      { type: 'knee_valgus', avgSeverity: 5, frequency: 2, trend: 'stable' },
    ]);
    const models = makeModels({ movementProfile: profile });
    getCorrectiveExercisesForCompensations.mockRejectedValueOnce(new Error('registry lookup failed'));

    const ctx = await buildLongHorizonContext(1, 12, models);
    expect(ctx.correctiveBias).toEqual({
      available: false,
      compensations: [],
      tags: [],
      matchedCount: 0,
      allowlist: { inhibit: [], lengthen: [], activate: [], integrate: [] },
    });
  });
});
