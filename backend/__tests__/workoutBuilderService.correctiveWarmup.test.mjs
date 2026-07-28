/**
 * V3c.3 — generateWorkout warmup uses V3b.3 corrective registry
 * ==============================================================
 *
 * Locks the V3c.3 enhancement: when a client has OHSA compensations,
 * the workout's warmup pulls real Exercise records from the
 * `ces-*` corrective registry instead of synthesizing fake names
 * from the legacy CES_MAP string lists.
 *
 * Coverage:
 *   - When registry has matches: warmup entries have real `name` +
 *     `exerciseKey` + `source: 'v3b3-corrective-registry'`.
 *   - When registry has no match for a comp: warmup falls back to
 *     the legacy CES_MAP synthetic name + `source: 'ces-map-fallback'`.
 *   - When the corrective service throws: warmup falls back cleanly
 *     (does not crash the workout generation).
 *   - When the client has zero compensations: only the static warmup
 *     template runs (no corrective entries added).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: vi.fn(),
}));
vi.mock('../services/variationEngine.mjs', () => ({
  getExerciseRegistry: vi.fn(),
  getExerciseRegistryFromDB: vi.fn(),
  generateSwapSuggestions: vi.fn(() => null),
  getNextSessionType: vi.fn((history = [], pattern = 'standard') => {
    const buildCount = pattern === 'aggressive' ? 1 : pattern === 'conservative' ? 3 : 2;
    let consecutiveBuilds = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i]?.sessionType !== 'build') break;
      consecutiveBuilds += 1;
    }
    return consecutiveBuilds >= buildCount ? 'switch' : 'build';
  }),
}));
vi.mock('../services/oneRepMaxService.mjs', () => ({
  getRecommendedWeight: vi.fn(() => null),
}));
vi.mock('../models/index.mjs', () => ({
  getExercise: vi.fn(() => ({ findAll: vi.fn() })),
  getModel: vi.fn(),
}));
vi.mock('../services/ai/correctiveExerciseService.mjs', () => ({
  getCorrectiveExercisesForCompensations: vi.fn(),
  mapCompensationToCesTags: vi.fn((type) => {
    const map = {
      knee_valgus: ['knees_cave', 'pronation_distortion_syndrome'],
      head_protrusion: ['forward_head', 'upper_crossed_syndrome'],
      low_back_arch: ['low_back_arch', 'lower_crossed_syndrome'],
    };
    return map[type] || [];
  }),
}));

const { getClientContext } = await import('../services/clientIntelligenceService.mjs');
const { getExerciseRegistryFromDB } = await import('../services/variationEngine.mjs');
const { getCorrectiveExercisesForCompensations } = await import(
  '../services/ai/correctiveExerciseService.mjs'
);
const { generateWorkout } = await import('../services/workoutBuilderService.mjs');

function fakeContext(compensations = []) {
  return {
    clientName: 'Test Client',
    constraints: {
      nasmPhase: 2,
      excludedMuscles: [],
      compensationTypes: compensations.map((c) => c.type),
      recentlyUsedExercises: [],
      estimated1RMs: null,
    },
    pain: { exclusions: [], warnings: [] },
    movement: { compensations },
    variation: { lastSessionType: null, currentPattern: 'BUILD/SWITCH' },
    equipment: [],
    goals: null,
    body: null,
    baseline: null,
    nutrition: null,
    progressLevels: null,
    streak: null,
    activeProgram: null,
    workouts: { sessionsLast2Weeks: 0, avgFormRating: null },
    criticalDataUnavailable: false,
    criticalFailures: [],
  };
}

function fakeRegistry() {
  return [
    { key: 'goblet_squat', name: 'Goblet Squat', muscles: ['quads'], category: 'squat', equipment: ['dumbbell'], nasmLevel: 2 },
    { key: 'plank',        name: 'Plank',        muscles: ['core'],  category: 'core',  equipment: ['bodyweight'], nasmLevel: 1 },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  getExerciseRegistryFromDB.mockResolvedValue(fakeRegistry());
});

describe('V3c.3 — warmup uses V3b.3 corrective registry', () => {
  it('uses real registry exercises when matches exist', async () => {
    getClientContext.mockResolvedValueOnce(
      fakeContext([
        {
          type: 'knee_valgus',
          frequency: 5,
          avgSeverity: 7,
          trend: 'worsening',
          cesStrategy: { inhibit: ['tfl'], activate: ['gluteus_medius'] },
        },
      ]),
    );
    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: ['knees_cave', 'pronation_distortion_syndrome'],
      matchedCount: 2,
      inhibit: [{
        id: '1', name: 'Foam Roll TFL', exercise_key: 'ces-foam-roll-tfl',
        nasmCorrectiveCategory: ['knees_cave', 'pronation_distortion_syndrome'],
        cesProtocolStep: 'inhibit',
      }],
      lengthen: [],
      activate: [{
        id: '2', name: 'Lateral Band Walks', exercise_key: 'ces-lateral-band-walks',
        nasmCorrectiveCategory: ['pronation_distortion_syndrome', 'knees_cave'],
        cesProtocolStep: 'activate',
      }],
      integrate: [],
    });

    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'legs', exerciseCount: 6,
    });

    // Filter to ONLY compensation-driven entries — the static warmup
    // template also adds non-compensation inhibit/activate entries.
    const compInhibit = workout.warmup.filter(
      (w) => w.type === 'inhibit' && w.reason?.includes('compensation'),
    );
    const compActivate = workout.warmup.filter(
      (w) => w.type === 'activate' && w.reason?.includes('compensation'),
    );

    expect(compInhibit.length).toBeGreaterThanOrEqual(1);
    expect(compInhibit[0]).toMatchObject({
      name: 'Foam Roll TFL',
      exerciseKey: 'ces-foam-roll-tfl',
      type: 'inhibit',
      source: 'v3b3-corrective-registry',
      reason: expect.stringContaining('knee_valgus'),
    });

    expect(compActivate.length).toBeGreaterThanOrEqual(1);
    expect(compActivate[0]).toMatchObject({
      name: 'Lateral Band Walks',
      exerciseKey: 'ces-lateral-band-walks',
      type: 'activate',
      source: 'v3b3-corrective-registry',
    });

    // Service must have been called once with the compensation list.
    expect(getCorrectiveExercisesForCompensations).toHaveBeenCalledTimes(1);
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.compensations).toHaveLength(1);
    expect(args.compensations[0].type).toBe('knee_valgus');
    expect(args.includeSteps).toEqual(['inhibit', 'activate']);
  });

  it('falls back to legacy CES_MAP synthesizer when registry has no match', async () => {
    getClientContext.mockResolvedValueOnce(
      fakeContext([
        {
          type: 'knee_valgus',
          frequency: 5, avgSeverity: 7, trend: 'stable',
          cesStrategy: { inhibit: ['tfl'], activate: ['gluteus_medius'] },
        },
      ]),
    );
    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: ['knees_cave', 'pronation_distortion_syndrome'],
      matchedCount: 0,
      inhibit: [], lengthen: [], activate: [], integrate: [],
    });

    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'legs', exerciseCount: 6,
    });
    const compInhibit = workout.warmup.filter(
      (w) => w.type === 'inhibit' && w.reason?.includes('compensation'),
    );
    const compActivate = workout.warmup.filter(
      (w) => w.type === 'activate' && w.reason?.includes('compensation'),
    );

    expect(compInhibit[0]).toMatchObject({
      name: 'Foam Roll Tfl',
      type: 'inhibit',
      source: 'ces-map-fallback',
    });
    expect(compInhibit[0].exerciseKey).toBeUndefined();

    expect(compActivate[0]).toMatchObject({
      name: 'Activate Gluteus Medius',
      type: 'activate',
      source: 'ces-map-fallback',
    });
  });

  it('falls back to legacy path when corrective service throws', async () => {
    getClientContext.mockResolvedValueOnce(
      fakeContext([
        {
          type: 'low_back_arch',
          frequency: 3, avgSeverity: 6, trend: 'improving',
          cesStrategy: { inhibit: ['hip_flexors'], activate: ['gluteus_maximus'] },
        },
      ]),
    );
    getCorrectiveExercisesForCompensations.mockRejectedValueOnce(new Error('DB lost'));

    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body', exerciseCount: 6,
    });

    // Service threw, but workout still generated cleanly.
    expect(workout).toBeDefined();
    expect(workout.warmup).toBeInstanceOf(Array);

    // Compensation-driven warmup falls back to legacy synthesis.
    const compInhibit = workout.warmup.filter(
      (w) => w.type === 'inhibit' && w.reason?.includes('compensation'),
    );
    expect(compInhibit[0]?.source).toBe('ces-map-fallback');
  });

  it('adds zero corrective warmup entries when client has no compensations', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext([]));

    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body', exerciseCount: 6,
    });

    // Static warmup template still present, but no inhibit/activate
    // entries from compensations.
    const compInhibit = workout.warmup.filter(
      (w) => w.type === 'inhibit' && w.reason?.includes('compensation'),
    );
    const compActivate = workout.warmup.filter(
      (w) => w.type === 'activate' && w.reason?.includes('compensation'),
    );
    expect(compInhibit).toEqual([]);
    expect(compActivate).toEqual([]);

    // Service must NOT have been called for an empty compensation list.
    expect(getCorrectiveExercisesForCompensations).not.toHaveBeenCalled();
  });

  it('mixes registry + fallback per compensation when registry covers some but not all', async () => {
    getClientContext.mockResolvedValueOnce(
      fakeContext([
        {
          type: 'knee_valgus', // Matched by registry
          frequency: 5, avgSeverity: 7, trend: 'stable',
          cesStrategy: { inhibit: ['tfl'], activate: ['gluteus_medius'] },
        },
        {
          type: 'head_protrusion', // No registry match in this fixture
          frequency: 3, avgSeverity: 5, trend: 'stable',
          cesStrategy: { inhibit: ['upper_trapezius'], activate: ['deep_cervical_flexors'] },
        },
      ]),
    );
    // Registry has knees_cave matches but no UCS/forward_head matches.
    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: ['knees_cave', 'pronation_distortion_syndrome', 'forward_head', 'upper_crossed_syndrome'],
      matchedCount: 1,
      inhibit: [{
        id: '1', name: 'Foam Roll TFL', exercise_key: 'ces-foam-roll-tfl',
        nasmCorrectiveCategory: ['knees_cave', 'pronation_distortion_syndrome'],
        cesProtocolStep: 'inhibit',
      }],
      lengthen: [],
      activate: [],
      integrate: [],
    });

    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body', exerciseCount: 6,
    });

    const inhibitEntries = workout.warmup.filter((w) => w.type === 'inhibit');

    // knee_valgus → registry hit (Foam Roll TFL).
    const kneeEntry = inhibitEntries.find((e) => e.reason?.includes('knee_valgus'));
    expect(kneeEntry?.source).toBe('v3b3-corrective-registry');
    expect(kneeEntry?.exerciseKey).toBe('ces-foam-roll-tfl');

    // head_protrusion → no registry hit → fallback synthetic.
    const headEntry = inhibitEntries.find((e) => e.reason?.includes('head_protrusion'));
    expect(headEntry?.source).toBe('ces-map-fallback');
    expect(headEntry?.name).toBe('Foam Roll Upper Trapezius');
  });
});
