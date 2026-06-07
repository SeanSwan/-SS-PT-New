import { describe, expect, it } from 'vitest';
import type { GeneratedPlan } from '../../hooks/useWorkoutBuilderAPI';
import { buildWorkoutBuilderPlanSavePayload } from './WorkoutBuilderSavePlan.logic';

const swanCoachPlanning = {
  createdBy: 'swan_coach_planning',
  identityMode: 'client_id_only',
  horizonWeeks: 12,
  sessionsPerWeek: 3,
  primaryGoal: 'strength',
  nasmPhase: 2,
  nasmDomainsApplied: ['opt_phase'],
  safetyGate: {
    mode: 'deterministic_review_gate',
    status: 'coach_review_ready',
    reviewRequiredSignals: [],
    missingCriticalData: [],
    reviewMessage: 'Coach review ready.',
  },
  planInputsUsed: { pain: true, equipment: true, workoutHistory: true },
  dataCategoriesUsed: ['pain', 'equipment', 'workoutHistory'],
  missingDataCategories: [],
  rules: ['client_id_only'],
} satisfies GeneratedPlan['swanCoachPlanning'];

const generatedPlan = {
  clientId: 42,
  trainerId: 7,
  clientName: 'Client 42',
  generatedAt: '2026-06-06T15:00:00.000Z',
  planningSystem: 'swan_coach_planning',
  swanCoachPlanning,
  planSummary: {
    durationWeeks: 12,
    sessionsPerWeek: 3,
    totalSessions: 36,
    primaryGoal: 'strength',
    startingPhase: 2,
    equipmentProfileId: 9,
  },
  mesocycles: [{
    mesocycle: 1,
    weeks: '1-4',
    nasmPhase: 2,
    phaseName: 'Strength Endurance',
    focus: 'Foundation',
    params: { sets: '2-4', reps: '8-12', intensity: 'moderate', tempo: '3/1/2', rest: '60s' },
    overloadStrategy: 'Add load when form stays clean.',
    deloadWeek: 4,
  }],
  weeklySchedule: [{ dayNumber: 1, focus: 'Push', category: 'chest' }],
  weeks: [{
    weekNumber: 1,
    nasmPhase: 2,
    days: [{
      dayNumber: 1,
      name: 'Push Day',
      exercises: [{ exerciseId: 'bench', exerciseName: 'Bench Press', sets: 3, reps: '10' }],
    }],
  }],
  constraints: {
    excludedMuscles: [],
    compensationTypes: [],
    recentlyUsedExercises: [],
    nasmPhase: 2,
  },
  compensations: [{ type: 'knees_cave_in', trend: 'stable' }],
  recommendations: ['Prioritize controlled tempo.'],
  recommendationDetails: [{ type: 'progression', text: 'Progress only after clean reps.' }],
  rationale: ['Strength goal selected phase 2 loading.'],
  equipmentContext: {
    profileId: 9,
    availableEquipment: ['Dumbbell'],
    resistanceTypes: ['free_weight'],
  },
} satisfies GeneratedPlan;

describe('buildWorkoutBuilderPlanSavePayload', () => {
  it('targets the canonical workout-plans save contract as a draft AI plan', () => {
    const payload = buildWorkoutBuilderPlanSavePayload(generatedPlan);

    expect(payload).toMatchObject({
      userId: 42,
      title: 'Client 42 - 12-Week Swan Coach Plan',
      nasmPhase: 2,
      durationWeeks: 12,
      status: 'draft',
      createdBy: 'ai',
    });
    expect(payload.description).toContain('Strength plan');
    expect(payload.metadata).toMatchObject({
      source: 'workout_builder',
      planningSystem: 'swan_coach_planning',
      primaryGoal: 'strength',
      sessionsPerWeek: 3,
      totalSessions: 36,
      equipmentProfileId: 9,
      defaultAssignmentType: 'homework',
      billingIntent: 'non_billable_assignment',
      defaultShouldDeductSession: false,
    });
  });

  it('preserves generated plan truth inside planData for client vault reads', () => {
    const payload = buildWorkoutBuilderPlanSavePayload(generatedPlan);

    expect(payload.planData.weeks).toEqual(generatedPlan.weeks);
    expect(payload.planData.mesocycles).toEqual(generatedPlan.mesocycles);
    expect(payload.planData.weeklySchedule).toEqual(generatedPlan.weeklySchedule);
    expect(payload.planData.recommendations).toEqual(generatedPlan.recommendations);
    expect(payload.planData.recommendationDetails).toEqual(generatedPlan.recommendationDetails);
    expect(payload.planData.rationale).toEqual(generatedPlan.rationale);
    expect(payload.planData.equipmentContext).toEqual(generatedPlan.equipmentContext);
    expect(payload.planData.category).toBe('full_body');
    expect(payload.planData.assignmentDefaults).toEqual({
      defaultAssignmentType: 'homework',
      billingIntent: 'non_billable_assignment',
      shouldDeductSession: false,
    });
  });

  it('marks trainer-led generated plans without enabling automatic session deduction', () => {
    const payload = buildWorkoutBuilderPlanSavePayload(generatedPlan, {
      assignmentDefault: 'trainer_session',
    });

    expect(payload.metadata).toMatchObject({
      defaultAssignmentType: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      defaultShouldDeductSession: false,
    });
    expect(payload.planData.assignmentDefaults).toEqual({
      defaultAssignmentType: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      shouldDeductSession: false,
    });
  });
});
