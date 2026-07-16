/**
 * Planner sequence event integration contract.
 * Proves selected-scope apply, compact actionable receipts, one-level Undo,
 * and stale-Undo fencing after any later edit.
 */
import React, { useState } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AI_PLANNER_REARRANGE,
  AI_PLANNER_UNDO,
  dispatchAIWorkoutEvent,
} from '../../../../utils/aiWorkoutEvents';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { CoachDockReceiptInput } from './useWorkoutPlannerCoachDock';
import { useWorkoutPlannerSequenceEvents } from './useWorkoutPlannerSequenceEvents';
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';

const slim = (id: string, name: string, exerciseType: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType, bodyPartCategory: 'full_body',
  primaryMuscles: [], difficulty: 2,
});

const row = (id: string, name: string, exerciseType: string): PlanExercise => ({
  id, exerciseSlim: slim(id, name, exerciseType), sets: 3, reps: '8-10', tempo: '2/0/2',
  restSeconds: 60, intensityPercent: 75, notes: '',
});

const generatedPlan = (): GeneratedPlan => ({
  clientId: 84,
  clientName: 'Client 84',
  planSummary: {
    durationWeeks: 4, sessionsPerWeek: 2, totalSessions: 8,
    primaryGoal: 'strength', startingPhase: 3,
  },
  mesocycles: [], weeklySchedule: [], recommendations: [],
  weeks: [{
    weekNumber: 1,
    nasmPhase: 3,
    days: [
      { dayNumber: 1, exercises: [
        { exerciseName: 'Biceps Curl', sets: 3, reps: 10 },
        { exerciseName: 'Box Jump', sets: 3, reps: 5 },
        { exerciseName: 'Back Squat', sets: 4, reps: 6 },
      ] },
      { dayNumber: 2, exercises: [{ exerciseName: 'Bench Press', sets: 4, reps: 6 }] },
    ],
  }],
});

function setup(initialRows: PlanExercise[], initialPlan: GeneratedPlan | null = null) {
  const receipts: CoachDockReceiptInput[] = [];
  const state: {
    rows: PlanExercise[];
    plan: GeneratedPlan | null;
    setRows?: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  } = { rows: initialRows, plan: initialPlan };

  const Harness: React.FC = () => {
    const [rows, setRows] = useState(initialRows);
    const [plan, setPlan] = useState(initialPlan);
    state.rows = rows;
    state.plan = plan;
    state.setRows = setRows;
    useWorkoutPlannerSequenceEvents({
      planExercises: rows,
      setPlanExercises: setRows,
      generatedPlan: plan,
      setGeneratedPlan: setPlan,
      selectedHorizonTarget: initialPlan ? { weekNumber: 1, dayIndex: 0 } : null,
      phaseNumber: 3,
      pushReceipt: (receipt) => receipts.push(receipt),
    });
    return null;
  };

  render(<Harness />);
  return { receipts, state };
}

describe('useWorkoutPlannerSequenceEvents', () => {
  it('applies a deterministic builder sequence and emits a compact Undo receipt', () => {
    const { receipts, state } = setup([
      row('curl', 'Biceps Curl', 'isolation'),
      row('jump', 'Box Jump', 'plyometric'),
      row('squat', 'Back Squat', 'compound'),
    ]);

    let handled = false;
    act(() => { handled = dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Best order.' }); });

    expect(handled).toBe(true);
    expect(state.rows.map((item) => item.exerciseSlim.name)).toEqual(['Box Jump', 'Back Squat', 'Biceps Curl']);
    expect(receipts.at(-1)).toMatchObject({
      ok: true,
      action: { label: 'Undo', eventName: AI_PLANNER_UNDO },
    });
    expect(receipts.at(-1)?.text).toMatch(/Reordered 3 exercises.*Box Jump.*#2.*#1/i);
  });

  it('undoes exactly the last sequencing change', () => {
    const { receipts, state } = setup([
      row('curl', 'Biceps Curl', 'isolation'),
      row('squat', 'Back Squat', 'compound'),
    ]);
    act(() => { dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Rearrange.' }); });
    let handled = false;
    act(() => { handled = dispatchAIWorkoutEvent(AI_PLANNER_UNDO, {}); });

    expect(handled).toBe(true);
    expect(state.rows.map((item) => item.exerciseSlim.name)).toEqual(['Biceps Curl', 'Back Squat']);
    expect(receipts.at(-1)).toEqual({ ok: true, text: 'Rearrangement undone.' });
  });

  it('refuses stale Undo after a later planner edit instead of overwriting it', () => {
    const { receipts, state } = setup([
      row('curl', 'Biceps Curl', 'isolation'),
      row('squat', 'Back Squat', 'compound'),
    ]);
    act(() => { dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Rearrange.' }); });
    act(() => { state.setRows?.((current) => [...current, row('plank', 'Plank', 'core')]); });
    let handled = true;
    act(() => { handled = dispatchAIWorkoutEvent(AI_PLANNER_UNDO, {}); });

    expect(handled).toBe(false);
    expect(state.rows.map((item) => item.exerciseSlim.name)).toEqual(['Back Squat', 'Biceps Curl', 'Plank']);
    expect(receipts.at(-1)).toEqual({
      ok: false,
      text: 'Undo expired because the workout changed after rearranging.',
    });
  });

  it('reorders only the selected generated-plan day', () => {
    const { state } = setup([], generatedPlan());
    act(() => { dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Best order.' }); });

    expect(state.plan?.weeks?.[0].days?.[0].exercises.map((item) => item.exerciseName)).toEqual([
      'Box Jump', 'Back Squat', 'Biceps Curl',
    ]);
    expect(state.plan?.weeks?.[0].days?.[1].exercises.map((item) => item.exerciseName)).toEqual([
      'Bench Press',
    ]);
  });

  it('does not claim a mutation when fewer than two exercises exist', () => {
    const { receipts, state } = setup([row('squat', 'Back Squat', 'compound')]);
    let handled = true;
    act(() => { handled = dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Rearrange.' }); });

    expect(handled).toBe(false);
    expect(state.rows).toHaveLength(1);
    expect(receipts.at(-1)).toEqual({
      ok: false,
      text: 'Add at least two exercises before asking Swan Coach to rearrange them.',
    });
  });

  it('reports an already-optimized order without creating Undo history', () => {
    const { receipts } = setup([
      row('jump', 'Box Jump', 'plyometric'),
      row('squat', 'Back Squat', 'compound'),
      row('curl', 'Biceps Curl', 'isolation'),
    ]);
    let handled = false;
    act(() => { handled = dispatchAIWorkoutEvent(AI_PLANNER_REARRANGE, { instruction: 'Rearrange.' }); });

    expect(handled).toBe(true);
    expect(receipts.at(-1)).toEqual({
      ok: true,
      text: 'Already in Swan Coach\'s recommended order - no changes made.',
    });
  });
});
