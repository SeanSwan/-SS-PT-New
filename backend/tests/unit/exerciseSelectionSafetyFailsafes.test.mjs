/**
 * Cortex P0 Safety Truth — exercise-selection fail-safe regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.6-§5.7
 * Eval-suite tests 7-8:
 *   7. A muscle-untagged exercise is excluded under active regional pain.
 *   8. A safety-class quality-gate rejection never stands down.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyExerciseQualityGate } from '../../services/exerciseQualityGate.mjs';

// ── Unit: quality gate safety class ────────────────────────────────────

describe('exerciseQualityGate safety class (Cortex P0 §5.7)', () => {
  const jumpSquat = { key: 'jump_squat', name: 'Jump Squat', muscles: ['quads', 'glutes'] };
  const pushup = { key: 'pushup', name: 'Pushup', muscles: ['chest', 'triceps'] };

  it('test 8: safety rejections are NOT restored when the pool empties (no stand-down)', () => {
    const result = applyExerciseQualityGate([pushup], {
      safetyRejector: () => 'targets pain-excluded muscles',
    });
    expect(result.allowed).toEqual([]);
    expect(result.gateStoodDown).toBe(false);
    expect(result.rejected).toEqual([
      expect.objectContaining({ key: 'pushup', class: 'safety' }),
    ]);
  });

  it('style rejections still fail-open when they would empty the pool (contract preserved)', () => {
    const result = applyExerciseQualityGate([jumpSquat], { nasmPhase: 2 });
    expect(result.allowed).toEqual([jumpSquat]);
    expect(result.gateStoodDown).toBe(true);
  });

  it('style fail-open restores the SAFETY-FILTERED pool, never the safety rejections', () => {
    const result = applyExerciseQualityGate([jumpSquat, pushup], {
      nasmPhase: 2,
      // pushup is safety-rejected; jumpSquat is the only style candidate left
      safetyRejector: (ex) => (ex.key === 'pushup' ? 'targets pain-excluded muscles' : null),
    });
    // Style gate would empty the remaining pool → stands down to the SAFE pool
    expect(result.allowed).toEqual([jumpSquat]);
    expect(result.gateStoodDown).toBe(true);
    expect(result.allowed).not.toContainEqual(pushup);
  });

  it('rejections carry a class label so trainer output can distinguish safety from style', () => {
    const result = applyExerciseQualityGate([jumpSquat, pushup], { nasmPhase: 2 });
    expect(result.rejected).toEqual([
      expect.objectContaining({ key: 'jump_squat', class: 'style' }),
    ]);
  });
});

// ── Integration: untagged-muscle fail-safe through generateWorkout ────

const registry = [
  { key: 'standing_band_press', name: 'Standing Band Press', muscles: ['chest', 'shoulders', 'triceps'], category: 'push', equipment: ['band'], nasmLevel: 2, movementPattern: 'push' },
  { key: 'mystery_custom_move', name: 'Mystery Custom Move', muscles: undefined, category: 'push', equipment: [], nasmLevel: 2, movementPattern: 'push' },
  { key: 'supported_dumbbell_row', name: 'Supported Dumbbell Row', muscles: ['back', 'forearms'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'pull' },
];

function contextWithShoulderExclusion() {
  return {
    clientName: 'Client #42',
    criticalDataUnavailable: false,
    criticalFailures: [],
    constraints: {
      nasmPhase: 2,
      recentlyUsedExercises: [],
      compensationTypes: [],
      estimated1RMs: null,
      excludedMuscles: ['shoulders', 'chest'],
    },
    equipment: [],
    pain: {
      status: 'loaded_active_issue',
      exclusions: [{ bodyRegion: 'shoulder', painLevel: 8, muscles: ['shoulders', 'chest'] }],
      warnings: [],
      activeIssueCount: 1,
      staleActiveIssues: [],
      excludedMuscles: ['shoulders', 'chest'],
    },
    movement: { compensations: [] },
    variation: { lastSessionType: null, currentPattern: 'standard' },
    workouts: { sessionsLast2Weeks: 5 },
    goals: { primaryGoal: 'strength' },
    body: null,
    baseline: { nasmAssessmentScore: 72 },
    nutrition: null,
    progressLevels: null,
    streak: null,
    activeProgram: null,
    trainingVault: null,
    sourcePolicy: null,
    safety: null,
    health: null,
    specialPopulation: null,
  };
}

async function loadWorkoutBuilder(context) {
  vi.resetModules();
  vi.doMock('../../services/clientIntelligenceService.mjs', () => ({
    getClientContext: vi.fn(async () => context),
  }));
  vi.doMock('../../services/variationEngine.mjs', () => ({
    getExerciseRegistry: vi.fn(() => registry),
    getExerciseRegistryFromDB: vi.fn(async () => registry),
    generateSwapSuggestions: vi.fn(() => []),
    getNextSessionType: vi.fn(() => 'build'),
  }));
  vi.doMock('../../models/index.mjs', () => ({ getExercise: () => null }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));
  return import('../../services/workoutBuilderService.mjs');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workoutBuilderService untagged-muscle fail-safe (Cortex P0 §5.6)', () => {
  it('test 7: an exercise with NO muscle tags is excluded under active pain exclusions', async () => {
    const { generateWorkout } = await loadWorkoutBuilder(contextWithShoulderExclusion());

    const workout = await generateWorkout({
      clientId: 42,
      trainerId: 7,
      category: 'full_body',
      exerciseCount: 6,
      planningReviewAcknowledged: true,
      planningReviewReason: 'Shoulder exclusion reviewed; pull/lower-body focus',
    });

    const keys = workout.exercises.map(e => e.exerciseKey);
    expect(keys).not.toContain('mystery_custom_move');
    expect(keys).not.toContain('standing_band_press');
    expect(keys).toContain('supported_dumbbell_row');

    // §5.7: exclusion reasons are surfaced to the trainer
    const gateExplanation = workout.explanations.find(e => e.type === 'quality_gate');
    expect(gateExplanation).toBeDefined();
    expect(JSON.stringify(gateExplanation.details)).toMatch(/untagged muscles|pain-excluded/);
  });
});
