/**
 * planDataBuilder regression tests
 * =================================
 *
 * AI Village (2026-05-02) flagged CRITICAL-4: the planner's prior in-component
 * `buildPlanData` discarded `generatedPlan.weeks[]` on save. A 12-month plan
 * generated via POST /api/workout-builder/plan would render in the UI but
 * persist only a one-week / one-day flattened payload to the database.
 *
 * These tests lock in the corrected contract:
 *   1. Manual mode preserves the existing one-week shape exactly.
 *   2. Generated mode persists the full multi-month shape — every L1
 *      additive field (weeks, mesocycles, weeklySchedule, recommendations,
 *      recommendationDetails, planSummary, rationale).
 *   3. Content signature changes when a different generated plan loads —
 *      so the "Update Plan" dirty-state guard fires correctly.
 *   4. Empty-array safety: weeks.length=0 doesn't crash and produces a
 *      payload the backend can store.
 */
import { describe, it, expect } from 'vitest';
import { buildPlanData, buildContentSignature } from './planDataBuilder';
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';

const buildManualExercise = (id: string, name: string, overrides: Partial<PlanExercise> = {}): PlanExercise => ({
  exerciseSlim: { id, name } as PlanExercise['exerciseSlim'],
  sets: 3, reps: '10', tempo: '2-0-2', restSeconds: 60, intensityPercent: 70,
  notes: '', ...overrides,
});

const buildGeneratedPlan = (overrides: Partial<GeneratedPlan> = {}): GeneratedPlan => ({
  clientId: 99, clientName: 'Test Client',
  planSummary: {
    durationWeeks: 24, sessionsPerWeek: 4, totalSessions: 96,
    primaryGoal: 'general_fitness', startingPhase: 2,
  },
  mesocycles: [
    { mesocycle: 1, weeks: '1-4', nasmPhase: 1, phaseName: 'Stabilization Endurance',
      focus: 'foundation', params: { sets: '3', reps: '12-15', intensity: 'low', tempo: '4-2-1', rest: '60s' },
      overloadStrategy: 'Add 1-2 reps per week', deloadWeek: null },
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
  weeks: Array.from({ length: 4 }, (_, w) => ({
    weekNumber: w + 1, focus: 'foundation',
    days: Array.from({ length: 3 }, (_, d) => ({
      dayNumber: d + 1, name: `W${w + 1}D${d + 1}`, focus: 'full body',
      exercises: [
        { exerciseId: `ex-${w}-${d}-1`, exerciseName: 'Squat', sets: 3, targetReps: '10', restSeconds: 60 },
        { exerciseId: `ex-${w}-${d}-2`, exerciseName: 'Push-Up', sets: 3, targetReps: '12', restSeconds: 45 },
      ],
    })),
  })),
  ...overrides,
});

describe('buildPlanData - manual mode (pre-existing contract)', () => {
  it('produces the legacy one-week / one-day shape from planExercises', () => {
    const result = buildPlanData({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: [
        buildManualExercise('ex-a', 'Squat'),
        buildManualExercise('ex-b', 'Bench Press', { sets: 4, reps: '8', restSeconds: 90 }),
      ],
    });

    const weeks = result.weeks as Array<{ days: Array<{ exercises: unknown[] }> }>;
    expect(weeks).toHaveLength(1);
    expect(weeks[0].days).toHaveLength(1);
    expect(weeks[0].days[0].exercises).toHaveLength(2);
    expect(result.goal).toBe('general_fitness');
    expect(result.category).toBe('full_body');
  });
});

describe('buildPlanData - generated mode (AI Village CRITICAL-4 fix)', () => {
  it('persists the full multi-month weeks[] structure (NOT a flattened first-week)', () => {
    const generatedPlan = buildGeneratedPlan();
    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });

    const weeks = result.weeks as unknown[];
    // 4 weeks survive (NOT collapsed to 1).
    expect(Array.isArray(weeks)).toBe(true);
    expect(weeks).toHaveLength(4);
    // Each week's day count survives.
    expect((weeks[0] as { days: unknown[] }).days).toHaveLength(3);
    // Exercise keys round-trip — no flattening to a single day.
    const firstDay = (weeks[0] as { days: Array<{ exercises: Array<{ exerciseId: string }> }> }).days[0];
    expect(firstDay.exercises[0].exerciseId).toBe('ex-0-0-1');
  });

  it('persists every L1 additive field verbatim', () => {
    const generatedPlan = buildGeneratedPlan();
    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });

    expect(result.mesocycles).toEqual(generatedPlan.mesocycles);
    expect(result.weeklySchedule).toEqual(generatedPlan.weeklySchedule);
    expect(result.recommendations).toEqual(generatedPlan.recommendations);
    expect(result.recommendationDetails).toEqual(generatedPlan.recommendationDetails);
    expect(result.planSummary).toEqual(generatedPlan.planSummary);
  });

  it('omits recommendationDetails when not present (backwards compat)', () => {
    const generatedPlan = buildGeneratedPlan({ recommendationDetails: undefined });
    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });
    expect(result).not.toHaveProperty('recommendationDetails');
  });

  it('handles empty weeks[] without crashing (degenerate generated plan)', () => {
    const generatedPlan = buildGeneratedPlan({ weeks: [] });
    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });
    expect(result.weeks).toEqual([]);
    expect(result.planSummary).toEqual(generatedPlan.planSummary);
  });
});

describe('buildPlanData - generated mode at every supported sessionsPerWeek (Sean 2026-05-02)', () => {
  // Sean's explicit ask after the CRITICAL-4 fix: persistence must hold
  // for 1, 2, 3, 4, 5, AND 6 sessions/week — not just the 4×/wk × 3 days
  // shape the original tests covered. The persistence module is purely
  // structural (it carries through whatever `weeks[]` shape it receives),
  // so these tests assert the round-trip preserves both the week count
  // AND the per-week day count for every frequency.
  const buildPlanAtFrequency = (sessionsPerWeek: number, durationWeeks: number): GeneratedPlan => ({
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
      { mesocycle: 1, weeks: `1-${durationWeeks}`, nasmPhase: 1, phaseName: 'Stabilization Endurance',
        focus: 'foundation', params: { sets: '3', reps: '12-15', intensity: 'low', tempo: '4-2-1', rest: '60s' },
        overloadStrategy: 'Add 1-2 reps per week', deloadWeek: null },
    ],
    weeklySchedule: Array.from({ length: sessionsPerWeek }, (_, d) => ({
      dayNumber: d + 1, focus: `day ${d + 1}`, category: d % 3 === 0 ? 'push' : d % 3 === 1 ? 'pull' : 'legs',
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

  for (const sessionsPerWeek of [1, 2, 3, 4, 5, 6] as const) {
    it(`persists a 4-week plan at ${sessionsPerWeek}×/wk - all weeks and all days survive`, () => {
      const generatedPlan = buildPlanAtFrequency(sessionsPerWeek, 4);
      const result = buildPlanData({
        mode: 'generated',
        generatedPlan,
        category: 'full_body',
        goal: 'general_fitness',
      });

      const weeks = result.weeks as Array<{
        weekNumber: number;
        days: Array<{ exercises: unknown[] }>;
      }>;
      // Week count survives.
      expect(weeks).toHaveLength(4);
      // Per-week day count matches sessionsPerWeek (NOT collapsed).
      weeks.forEach((week) => {
        expect(week.days).toHaveLength(sessionsPerWeek);
        // Per-day exercise count survives.
        week.days.forEach((day) => {
          expect(day.exercises).toHaveLength(6);
        });
      });
      // Total session count is week × sessionsPerWeek (4 × N).
      const totalSessions = weeks.reduce((sum, w) => sum + w.days.length, 0);
      expect(totalSessions).toBe(4 * sessionsPerWeek);
      // planSummary.totalSessions is preserved.
      expect((result.planSummary as { totalSessions: number }).totalSessions).toBe(4 * sessionsPerWeek);
    });
  }

  it('persists a full 12-month plan at 6×/wk (the heaviest realistic shape) - 48 weeks × 6 days = 288 sessions', () => {
    const generatedPlan = buildPlanAtFrequency(6, 48);
    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });

    const weeks = result.weeks as Array<{ days: Array<{ exercises: unknown[] }> }>;
    expect(weeks).toHaveLength(48);
    const totalSessions = weeks.reduce((sum, w) => sum + w.days.length, 0);
    expect(totalSessions).toBe(288);
    const totalExercises = weeks.reduce(
      (sum, w) => sum + w.days.reduce((daySum, d) => daySum + d.exercises.length, 0),
      0,
    );
    expect(totalExercises).toBe(288 * 6); // 1,728 prescriptions
  });

  it('content signature differs across frequencies (4 days/wk vs 5 days/wk plans don’t collide)', () => {
    const sig4 = buildContentSignature({
      mode: 'generated',
      generatedPlan: buildPlanAtFrequency(4, 4),
      category: 'full_body',
      goal: 'general_fitness',
    });
    const sig5 = buildContentSignature({
      mode: 'generated',
      generatedPlan: buildPlanAtFrequency(5, 4),
      category: 'full_body',
      goal: 'general_fitness',
    });
    const sig6 = buildContentSignature({
      mode: 'generated',
      generatedPlan: buildPlanAtFrequency(6, 4),
      category: 'full_body',
      goal: 'general_fitness',
    });
    expect(sig4).not.toBe(sig5);
    expect(sig5).not.toBe(sig6);
    expect(sig4).not.toBe(sig6);
  });
});

describe('buildContentSignature', () => {
  it('manual signatures are stable and equality-comparable', () => {
    const exercises = [buildManualExercise('a', 'Squat'), buildManualExercise('b', 'Row')];
    const sigA = buildContentSignature({
      mode: 'manual', phaseName: 'P', phaseNumber: 2, category: 'full_body',
      categoryLabel: 'Full Body', goal: 'general_fitness', planExercises: exercises,
    });
    const sigB = buildContentSignature({
      mode: 'manual', phaseName: 'P', phaseNumber: 2, category: 'full_body',
      categoryLabel: 'Full Body', goal: 'general_fitness', planExercises: exercises,
    });
    expect(sigA).toBe(sigB);
  });

  it('generated signatures change when a different plan loads (dirty-state lights up)', () => {
    const planA = buildGeneratedPlan();
    const planB = buildGeneratedPlan({
      planSummary: { ...planA.planSummary, durationWeeks: 12, totalSessions: 48 },
      weeks: planA.weeks!.slice(0, 2),
    });
    const sigA = buildContentSignature({ mode: 'generated', generatedPlan: planA, category: 'full_body', goal: 'general_fitness' });
    const sigB = buildContentSignature({ mode: 'generated', generatedPlan: planB, category: 'full_body', goal: 'general_fitness' });
    expect(sigA).not.toBe(sigB);
  });

  it('manual and generated signatures never collide', () => {
    const generatedSig = buildContentSignature({
      mode: 'generated', generatedPlan: buildGeneratedPlan(),
      category: 'full_body', goal: 'general_fitness',
    });
    const manualSig = buildContentSignature({
      mode: 'manual', phaseName: 'P', phaseNumber: 2, category: 'full_body',
      categoryLabel: 'Full Body', goal: 'general_fitness',
      planExercises: [buildManualExercise('a', 'Squat')],
    });
    expect(generatedSig).not.toBe(manualSig);
  });
});
