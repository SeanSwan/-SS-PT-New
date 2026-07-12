/**
 * Cortex P0 Safety Truth — deterministic-path BLOCKING gate regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.3
 * Eval-suite tests 3, 4, 9:
 *   3. A safety-critical data-source failure blocks aggressive generation.
 *   4. Deterministic generateWorkout/generatePlan return the review contract when the gate fires.
 *   9. Trainer override requires a reason and lands in the audit record.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  enforceSwanCoachPlanningReview,
  SwanCoachPlanningReviewError,
} from '../../services/swanCoachPlanningReviewEnforcementService.mjs';

// ── Unit: enforcement contract ─────────────────────────────────────────

describe('enforceSwanCoachPlanningReview (unit)', () => {
  it('is a no-op when the gate is coach_review_ready', () => {
    const result = enforceSwanCoachPlanningReview({
      safetyGate: { status: 'coach_review_ready', reviewRequiredSignals: [] },
    });
    expect(result).toEqual({ required: false, acknowledgement: null });
  });

  it('throws 409 SWAN_COACH_REVIEW_REQUIRED when review_required is not acknowledged', () => {
    let caught;
    try {
      enforceSwanCoachPlanningReview({
        safetyGate: {
          status: 'review_required',
          reviewRequiredSignals: ['active_pain_review_required'],
          missingCriticalData: [],
        },
      });
    } catch (err) { caught = err; }
    expect(caught).toBeInstanceOf(SwanCoachPlanningReviewError);
    expect(caught.status).toBe(409);
    expect(caught.code).toBe('SWAN_COACH_REVIEW_REQUIRED');
    expect(caught.reviewRequiredSignals).toContain('active_pain_review_required');
  });

  it('test 9: acknowledgement without a written reason is refused (400)', () => {
    let caught;
    try {
      enforceSwanCoachPlanningReview({
        safetyGate: { status: 'review_required', reviewRequiredSignals: ['pain_exclusions_active'] },
        planningReviewAcknowledged: true,
        planningReviewReason: '   ',
      });
    } catch (err) { caught = err; }
    expect(caught.status).toBe(400);
    expect(caught.code).toBe('SWAN_COACH_REVIEW_REASON_REQUIRED');
  });

  it('test 9: acknowledged override returns an audit acknowledgement (who/when/why/signals)', () => {
    const result = enforceSwanCoachPlanningReview({
      safetyGate: { status: 'review_required', reviewRequiredSignals: ['pain_exclusions_active'] },
      planningReviewAcknowledged: true,
      planningReviewReason: 'Reviewed shoulder exclusion; substituting lower-body focus',
      actorUserId: 7,
      clientId: 42,
    });
    expect(result.required).toBe(true);
    expect(result.acknowledgement).toEqual(expect.objectContaining({
      acknowledged: true,
      reason: 'Reviewed shoulder exclusion; substituting lower-body focus',
      acknowledgedByUserId: 7,
      reviewRequiredSignals: ['pain_exclusions_active'],
    }));
    expect(typeof result.acknowledgement.acknowledgedAt).toBe('string');
  });
});

// ── Integration: generateWorkout / generatePlan block on the gate ─────

const registry = [
  { key: 'standing_band_press', muscles: ['chest', 'shoulders', 'triceps'], category: 'push', equipment: ['band'], nasmLevel: 2, movementPattern: 'push' },
  { key: 'supported_dumbbell_row', muscles: ['back', 'forearms'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'pull' },
  { key: 'bodyweight_squat', muscles: ['quads', 'glutes'], category: 'squat', equipment: [], nasmLevel: 1, movementPattern: 'squat' },
];

function baseContext(overrides = {}) {
  return {
    clientName: 'Client #42',
    criticalDataUnavailable: false,
    criticalFailures: [],
    constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [], estimated1RMs: null },
    equipment: [],
    pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeIssueCount: 0, staleActiveIssues: [] },
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
    ...overrides,
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
  vi.doMock('../../models/index.mjs', () => ({
    getExercise: () => null,
  }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));
  return import('../../services/workoutBuilderService.mjs');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workoutBuilderService deterministic blocking gate (Cortex P0 §5.3)', () => {
  it('test 4: generateWorkout throws the 409 review contract on active pain without acknowledgement', async () => {
    const { generateWorkout } = await loadWorkoutBuilder(baseContext({
      pain: {
        status: 'loaded_active_issue',
        exclusions: [],
        warnings: [{ bodyRegion: 'elbow', painLevel: 5, muscles: ['forearms'] }],
        activeIssueCount: 1,
        staleActiveIssues: [],
      },
    }));

    await expect(generateWorkout({ clientId: 42, trainerId: 7 })).rejects.toMatchObject({
      name: 'SwanCoachPlanningReviewError',
      status: 409,
      code: 'SWAN_COACH_REVIEW_REQUIRED',
    });
  });

  it('test 3: criticalDataUnavailable (pain fetch failure) blocks generation', async () => {
    const { generateWorkout } = await loadWorkoutBuilder(baseContext({
      criticalDataUnavailable: true,
      criticalFailures: ['pain_entries'],
      pain: { status: 'unavailable', exclusions: [], warnings: [] },
    }));

    await expect(generateWorkout({ clientId: 42, trainerId: 7 })).rejects.toMatchObject({
      status: 409,
      code: 'SWAN_COACH_REVIEW_REQUIRED',
    });
  });

  it('test 4 (plan): generatePlan blocks the same way', async () => {
    const { generatePlan } = await loadWorkoutBuilder(baseContext({
      pain: {
        status: 'loaded_active_issue',
        exclusions: [{ bodyRegion: 'shoulder', painLevel: 8, muscles: ['rotator_cuff'] }],
        warnings: [],
        activeIssueCount: 1,
        staleActiveIssues: [],
      },
    }));

    await expect(generatePlan({
      clientId: 42, trainerId: 7, durationWeeks: 4, sessionsPerWeek: 3,
    })).rejects.toMatchObject({ status: 409, code: 'SWAN_COACH_REVIEW_REQUIRED' });
  });

  it('alarm-fatigue guard: a brand-new client (no baseline, no history, pain never collected) generates WITHOUT acknowledgement', async () => {
    const { generateWorkout } = await loadWorkoutBuilder(baseContext({
      pain: { status: 'never_collected', exclusions: [], warnings: [], activeIssueCount: 0, staleActiveIssues: [] },
      workouts: { sessionsLast2Weeks: 0 },
      baseline: null,
    }));

    const workout = await generateWorkout({ clientId: 42, trainerId: 7, exerciseCount: 2 });
    expect(workout.swanCoachPlanning.safetyGate.status).toBe('coach_review_ready');
    expect(workout.swanCoachPlanning.safetyGate.advisorySignals).toEqual(expect.arrayContaining([
      'pain_intake_not_collected',
      'low_training_history',
    ]));
  });

  it('test 9: acknowledged generation persists the override audit in the planning fingerprint', async () => {
    const { generateWorkout } = await loadWorkoutBuilder(baseContext({
      pain: {
        status: 'loaded_active_issue',
        exclusions: [],
        warnings: [{ bodyRegion: 'elbow', painLevel: 5, muscles: ['forearms'] }],
        activeIssueCount: 1,
        staleActiveIssues: [],
      },
    }));

    const workout = await generateWorkout({
      clientId: 42,
      trainerId: 7,
      exerciseCount: 2,
      planningReviewAcknowledged: true,
      planningReviewReason: 'Elbow pain reviewed; pressing volume reduced',
    });
    expect(workout.swanCoachPlanning.safetyGate.acknowledgement).toEqual(expect.objectContaining({
      acknowledged: true,
      acknowledgedByUserId: 7,
      reason: 'Elbow pain reviewed; pressing volume reduced',
    }));
  });
});
