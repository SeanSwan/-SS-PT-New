/**
 * Shared planDataBuilder test fixtures.
 * Keeps generated-plan fixture construction out of assertion files.
 */
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';

export const buildManualExercise = (
  id: string,
  name: string,
  overrides: Partial<PlanExercise> = {},
): PlanExercise => ({
  exerciseSlim: { id, name } as PlanExercise['exerciseSlim'],
  sets: 3,
  reps: '10',
  tempo: '2-0-2',
  restSeconds: 60,
  intensityPercent: 70,
  notes: '',
  ...overrides,
});

export const buildGeneratedPlan = (overrides: Partial<GeneratedPlan> = {}): GeneratedPlan => ({
  clientId: 99,
  clientName: 'Test Client',
  planSummary: {
    durationWeeks: 24,
    sessionsPerWeek: 4,
    totalSessions: 96,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [
    {
      mesocycle: 1,
      weeks: '1-4',
      nasmPhase: 1,
      phaseName: 'Stabilization Endurance',
      focus: 'foundation',
      params: { sets: '3', reps: '12-15', intensity: 'low', tempo: '4-2-1', rest: '60s' },
      overloadStrategy: 'Add 1-2 reps per week',
      deloadWeek: null,
    },
  ],
  weeklySchedule: [
    { dayNumber: 1, focus: 'chest + shoulders + triceps', category: 'push' },
    { dayNumber: 2, focus: 'back + biceps', category: 'pull' },
  ],
  recommendations: ['Hydrate 3L/day', 'Track RPE'],
  recommendationDetails: [
    { type: 'hydration', text: 'Hydrate 3L/day', sourceCitation: 'context.constraints.bodyWeight' },
    { type: 'tracking', text: 'Track RPE', sourceCitation: 'context.constraints.nasmPhase' },
  ],
  rationale: [
    'Goal: General Fitness.',
    'Starting NASM OPT phase: 2 (from client baseline assessment).',
    'Mesocycle phase sequence (1 blocks of 4 weeks): Stabilization Endurance.',
    'Plan length: 4 weeks at 3 sessions/week.',
  ],
  weeks: Array.from({ length: 4 }, (_, w) => ({
    weekNumber: w + 1,
    focus: 'foundation',
    days: Array.from({ length: 3 }, (_, d) => ({
      dayNumber: d + 1,
      name: `W${w + 1}D${d + 1}`,
      focus: 'full body',
      exercises: [
        { exerciseId: `ex-${w}-${d}-1`, exerciseName: 'Squat', sets: 3, targetReps: '10', restSeconds: 60 },
        { exerciseId: `ex-${w}-${d}-2`, exerciseName: 'Push-Up', sets: 3, targetReps: '12', restSeconds: 45 },
      ],
    })),
  })),
  ...overrides,
});

export const buildPlanAtFrequency = (
  sessionsPerWeek: number,
  durationWeeks: number,
): GeneratedPlan => ({
  clientId: 99,
  clientName: 'Frequency Test',
  planSummary: {
    durationWeeks,
    sessionsPerWeek,
    totalSessions: durationWeeks * sessionsPerWeek,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [
    {
      mesocycle: 1,
      weeks: `1-${durationWeeks}`,
      nasmPhase: 1,
      phaseName: 'Stabilization Endurance',
      focus: 'foundation',
      params: { sets: '3', reps: '12-15', intensity: 'low', tempo: '4-2-1', rest: '60s' },
      overloadStrategy: 'Add 1-2 reps per week',
      deloadWeek: null,
    },
  ],
  weeklySchedule: Array.from({ length: sessionsPerWeek }, (_, d) => ({
    dayNumber: d + 1,
    focus: `day ${d + 1}`,
    category: d % 3 === 0 ? 'push' : d % 3 === 1 ? 'pull' : 'legs',
  })),
  recommendations: ['Hydrate', 'Track RPE'],
  recommendationDetails: [
    { type: 'hydration', text: 'Hydrate', sourceCitation: 'context.bodyWeight' },
    { type: 'tracking', text: 'Track RPE', sourceCitation: 'context.nasmPhase' },
  ],
  weeks: Array.from({ length: durationWeeks }, (_, w) => ({
    weekNumber: w + 1,
    focus: 'foundation',
    days: Array.from({ length: sessionsPerWeek }, (_, d) => ({
      dayNumber: d + 1,
      name: `W${w + 1}D${d + 1}`,
      focus: 'full body',
      exercises: Array.from({ length: 6 }, (_, e) => ({
        exerciseId: `ex-${w}-${d}-${e}`,
        exerciseName: `Exercise W${w + 1}D${d + 1}E${e + 1}`,
        sets: 3,
        targetReps: '10',
        restSeconds: 60,
      })),
    })),
  })),
});
