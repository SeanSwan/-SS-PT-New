/**
 * Slice 6 integration lock: a Swan Coach rearrangement persists through the
 * HUMAN-triggered Save path. The sequence engine only mutates local draft
 * state; buildPlanData must serialize that draft in its rearranged array
 * order (manual mode stamps 1-based orderInWorkout; generated mode carries
 * weeks[] structurally). This is the honest boundary required by the
 * canonical-training-plan architecture: AI drafts and proposes — only an
 * explicit authorized Save writes a plan.
 */
import { describe, expect, it } from 'vitest';
import { buildPlanData } from './planDataBuilder';
import { buildManualExercise, buildGeneratedPlan } from './planDataBuilder.testFixtures';
import {
  buildBuilderSequenceProposal,
  buildHorizonSequenceProposal,
} from './workoutPlannerSequenceEngine';
import type { PlanExercise } from './WorkoutPlannerTypes';

type SavedDay = { exercises: Array<{ exerciseName?: string; orderInWorkout?: number }> };
type SavedWeeks = Array<{ days: SavedDay[] }>;

const typedRow = (id: string, name: string, exerciseType: string): PlanExercise => (
  buildManualExercise(id, name, {
    exerciseSlim: {
      id, name, exerciseKey: id, exerciseType,
      bodyPartCategory: 'full_body', primaryMuscles: [], difficulty: 2,
    } as PlanExercise['exerciseSlim'],
  })
);

describe('sequence → save persistence (order truth)', () => {
  it('manual save serializes the rearranged builder order with fresh orderInWorkout', () => {
    const rows = [
      typedRow('curl', 'Biceps Curl', 'isolation'),
      typedRow('jump', 'Box Jump', 'plyometric'),
      typedRow('squat', 'Back Squat', 'compound'),
    ];
    const proposal = buildBuilderSequenceProposal(rows, 3);

    const planData = buildPlanData({
      mode: 'manual', phaseName: 'Hypertrophy', phaseNumber: 3,
      category: 'full_body', categoryLabel: 'Full Body', goal: 'strength',
      planExercises: proposal.items,
    });

    const day = (planData.weeks as SavedWeeks)[0].days[0];
    expect(day.exercises.map((e) => e.exerciseName)).toEqual([
      'Box Jump', 'Back Squat', 'Biceps Curl',
    ]);
    expect(day.exercises.map((e) => e.orderInWorkout)).toEqual([1, 2, 3]);
  });

  it('generated save carries a rearranged horizon day in its new order', () => {
    const plan = buildGeneratedPlan({
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          exercises: [
            { exerciseName: 'Triceps Extension', sets: 4, reps: 10 },
            { exerciseName: 'Medicine Ball Throw', sets: 3, reps: 5 },
            { exerciseName: 'Bench Press', sets: 4, reps: 6 },
          ],
        }],
      }],
    });
    const dayExercises = plan.weeks![0].days![0].exercises;
    const proposal = buildHorizonSequenceProposal(dayExercises, 4);
    const rearranged = {
      ...plan,
      weeks: [{ ...plan.weeks![0], days: [{ ...plan.weeks![0].days![0], exercises: proposal.items }] }],
    };

    const planData = buildPlanData({
      mode: 'generated', generatedPlan: rearranged, category: 'full_body', goal: 'strength',
    });

    const day = (planData.weeks as SavedWeeks)[0].days[0];
    expect(day.exercises.map((e) => e.exerciseName)).toEqual([
      'Medicine Ball Throw', 'Bench Press', 'Triceps Extension',
    ]);
  });
});
