/**
 * useWorkoutPlannerAiEvents — blueprint S3 acceptance suite.
 * Real useState harness: dispatched AI_PLANNER_* events mutate builder rows /
 * generated-plan weeks through the hook, receipts use the exact 03 §5 copy,
 * and every branch acknowledges with an honest handled flag.
 */
import React, { useState } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { dispatchAIWorkoutEvent } from '../../../../utils/aiWorkoutEvents';
import { buildContentSignature } from './planDataBuilder';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { OPT_PHASES, type GeneratedPlan, type PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerHorizonSelection } from './workoutPlannerAiEvents.types';
import { useWorkoutPlannerAiEvents } from './useWorkoutPlannerAiEvents';

const slim = (id: string, name: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType: 'strength', bodyPartCategory: 'legs',
  primaryMuscles: [], difficulty: 1,
});

const builderRow = (id: string, exercise: ExerciseSlim): PlanExercise => ({
  id, exerciseSlim: exercise, sets: 4, reps: '6-8', tempo: '3/1/1', restSeconds: 90,
  intensityPercent: 80, notes: '',
});

const horizonPlan = (): GeneratedPlan => ({
  clientId: 84, clientName: 'Client 84',
  planSummary: { durationWeeks: 4, sessionsPerWeek: 3, totalSessions: 12, primaryGoal: 'strength', startingPhase: 2 },
  mesocycles: [], weeklySchedule: [], recommendations: [],
  weeks: [
    { weekNumber: 1, days: [
      { dayNumber: 1, exercises: [{ exerciseName: 'Bench Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60 }] },
      { dayNumber: 2, exercises: [
        { exerciseName: 'Leg Press', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 60, rotationFallback: true },
        { exerciseName: 'Calf Raise', sets: 3, reps: 15 },
      ] },
    ] },
  ],
});

interface HarnessState {
  planExercises: PlanExercise[];
  generatedPlan: GeneratedPlan | null;
}

function setupHarness(opts: {
  planExercises?: PlanExercise[];
  generatedPlan?: GeneratedPlan | null;
  selection?: PlannerHorizonSelection | null;
  library?: ExerciseSlim[];
  searchImpl?: (query: string) => Promise<ExerciseSlim[]>;
}) {
  const receipts: Array<{ ok: boolean; text: string }> = [];
  const onGenerate = vi.fn();
  const searchExercises = vi.fn(opts.searchImpl ?? (async (query: string) => {
    const q = query.toLowerCase().trim();
    return (opts.library ?? []).filter((x) => x.name.toLowerCase().includes(q));
  }));
  const state: HarnessState = { planExercises: opts.planExercises ?? [], generatedPlan: opts.generatedPlan ?? null };

  const Harness: React.FC = () => {
    const [planExercises, setPlanExercises] = useState<PlanExercise[]>(state.planExercises);
    const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(state.generatedPlan);
    state.planExercises = planExercises;
    state.generatedPlan = generatedPlan;
    useWorkoutPlannerAiEvents({
      planExercises, setPlanExercises, generatedPlan, setGeneratedPlan,
      selectedHorizonTarget: opts.selection ?? null,
      searchExercises,
      onGenerate,
      pushReceipt: (r) => receipts.push(r),
      phase: OPT_PHASES[1], // phase 2: sets '2-4', reps '8-12', tempo '2/0/2', rest '0-60s'
    });
    return null;
  };
  render(<Harness />);
  return { receipts, onGenerate, searchExercises, state };
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('useWorkoutPlannerAiEvents (blueprint S3)', () => {
  it('ADD appends to the builder list with phase defaults when no generatedPlan is open', async () => {
    const { receipts, state } = setupHarness({ library: [slim('gs1', 'Goblet Squat')] });
    let handled = false;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'goblet squat' });
    });
    await flush();
    expect(handled).toBe(true);
    expect(state.planExercises).toHaveLength(1);
    expect(state.planExercises[0].exerciseSlim.name).toBe('Goblet Squat');
    expect(state.planExercises[0].sets).toBe(2); // phase 2 '2-4' → 2
    expect(state.planExercises[0].reps).toBe('8-12');
    expect(state.planExercises[0].restSeconds).toBe(60);
    expect(receipts).toContainEqual({ ok: true, text: 'Added Goblet Squat — 2×8-12' });
  });

  it('ADD targets the selected horizon day when a generatedPlan is open', async () => {
    const { receipts, state } = setupHarness({
      generatedPlan: horizonPlan(),
      selection: { weekNumber: 1, dayIndex: 1 },
      library: [slim('bs1', 'Box Squat')],
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Box Squat', sets: 3, reps: 12 });
    });
    await flush();
    const day2 = state.generatedPlan?.weeks?.[0].days?.[1];
    expect(day2?.exercises.map((x) => x.exerciseName)).toEqual(['Leg Press', 'Calf Raise', 'Box Squat']);
    expect(receipts).toContainEqual({ ok: true, text: 'Added Box Squat — 3×12 (Week 1 · Day 2)' });
  });

  it('SWAP keeps the slot programming and clears rotationFallback (horizon)', async () => {
    const { receipts, state } = setupHarness({
      generatedPlan: horizonPlan(),
      selection: { weekNumber: 1, dayIndex: 1 },
      library: [slim('bs1', 'Box Squat')],
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'leg press', toExerciseName: 'box squat' });
    });
    await flush();
    const swapped = state.generatedPlan?.weeks?.[0].days?.[1].exercises[0];
    expect(swapped?.exerciseName).toBe('Box Squat');
    expect(swapped?.sets).toBe(3);
    expect(swapped?.reps).toBe(12);
    expect(swapped?.tempo).toBe('2/0/2');
    expect(swapped?.restSeconds).toBe(60);
    expect(swapped?.rotationFallback).toBe(false);
    expect(receipts).toContainEqual({ ok: true, text: 'Swapped Leg Press → Box Squat (Week 1 · Day 2)' });
  });

  it('SWAP resolves the incoming name via search, exact match first', async () => {
    const { state } = setupHarness({
      planExercises: [builderRow('row1', slim('lp1', 'Leg Press'))],
      library: [slim('bsd1', 'Box Squat Deluxe'), slim('bs1', 'Box Squat')],
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'leg press', toExerciseName: 'Box Squat' });
    });
    await flush();
    expect(state.planExercises[0].exerciseSlim.name).toBe('Box Squat');
    expect(state.planExercises[0].sets).toBe(4); // programming kept on builder swap
    expect(state.planExercises[0].reps).toBe('6-8');
  });

  it('ambiguous target name → handled=false + exact ambiguity receipt', async () => {
    const { receipts } = setupHarness({
      planExercises: [builderRow('r1', slim('lp1', 'Leg Press')), builderRow('r2', slim('cp1', 'Chest Press'))],
    });
    let handled = true;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_REMOVE_EXERCISE', { exerciseName: 'press' });
    });
    expect(handled).toBe(false);
    expect(receipts).toContainEqual({ ok: false, text: 'Multiple matches for "press" — say more of the exercise name.' });
  });

  it('resolves dictated plurals against singular library names ("goblet squats" → "Goblet Squat")', async () => {
    const { receipts, state, searchExercises } = setupHarness({
      searchImpl: async (query: string) => (query.toLowerCase().includes('squats') ? [] : [slim('gs1', 'Goblet Squat')]),
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'goblet squats', sets: 3, reps: 12 });
    });
    await flush();
    expect(searchExercises).toHaveBeenCalledWith('goblet squats');
    expect(searchExercises).toHaveBeenCalledWith('goblet squat');
    expect(state.planExercises[0]?.exerciseSlim.name).toBe('Goblet Squat');
    expect(receipts).toContainEqual({ ok: true, text: 'Added Goblet Squat — 3×12' });
  });

  it('never mangles double-s words when singularizing ("leg press" stays intact)', async () => {
    const { state } = setupHarness({ library: [slim('lp1', 'Leg Press')] });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'leg press' });
    });
    await flush();
    expect(state.planExercises[0]?.exerciseSlim.name).toBe('Leg Press');
  });

  it('unresolvable library name → exact library-miss receipt', async () => {
    const { receipts, state } = setupHarness({ library: [] });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'blorp press' });
    });
    await flush();
    expect(state.planExercises).toHaveLength(0);
    expect(receipts).toContainEqual({ ok: false, text: 'Couldn\'t find "blorp press" in the exercise library.' });
  });

  it('REMOVE deletes the named builder row and acknowledges handled', async () => {
    const { receipts, state } = setupHarness({
      planExercises: [builderRow('r1', slim('lp1', 'Leg Press')), builderRow('r2', slim('cr1', 'Calf Raise'))],
    });
    let handled = false;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_REMOVE_EXERCISE', { exerciseName: 'leg press' });
    });
    expect(handled).toBe(true);
    expect(state.planExercises.map((p) => p.exerciseSlim.name)).toEqual(['Calf Raise']);
    expect(receipts).toContainEqual({ ok: true, text: 'Removed Leg Press' });
  });

  it('UPDATE changes only the provided fields', async () => {
    const { receipts, state } = setupHarness({
      planExercises: [builderRow('r1', slim('lp1', 'Leg Press'))],
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_UPDATE_EXERCISE', { exerciseName: 'leg press', sets: 2 });
    });
    expect(state.planExercises[0].sets).toBe(2);
    expect(state.planExercises[0].reps).toBe('6-8'); // untouched
    expect(state.planExercises[0].tempo).toBe('3/1/1'); // untouched
    expect(receipts).toContainEqual({ ok: true, text: 'Updated Leg Press — sets 2' });
  });

  it('unknown target name → handled=false + say-it-again receipt', async () => {
    const { receipts } = setupHarness({ planExercises: [builderRow('r1', slim('lp1', 'Leg Press'))] });
    let handled = true;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_UPDATE_EXERCISE', { exerciseName: 'blorp press', sets: 2 });
    });
    expect(handled).toBe(false);
    expect(receipts).toContainEqual({ ok: false, text: 'Couldn\'t find "blorp press" — say the exercise name again?' });
  });

  it('GENERATE pushes the status receipt and calls the existing generation action', async () => {
    const { receipts, onGenerate } = setupHarness({});
    let handled = false;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_GENERATE', { category: 'legs' });
    });
    expect(handled).toBe(true);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(receipts).toContainEqual({ ok: true, text: 'Generating a fresh workout…' });
  });

  it('duplicate add into the same horizon day is blocked with a receipt', async () => {
    const { receipts, state } = setupHarness({
      generatedPlan: horizonPlan(),
      selection: { weekNumber: 1, dayIndex: 1 },
      library: [slim('cr9', 'Calf Raise')],
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Calf Raise' });
    });
    await flush();
    expect(state.generatedPlan?.weeks?.[0].days?.[1].exercises).toHaveLength(2);
    expect(receipts).toContainEqual({ ok: false, text: 'Calf Raise is already in that day — pick a different replacement.' });
  });

  it('dictated edits change the dirty-state content signature (Save/Update lights up)', async () => {
    const { state } = setupHarness({
      generatedPlan: horizonPlan(),
      selection: { weekNumber: 1, dayIndex: 1 },
      library: [slim('bs1', 'Box Squat')],
    });
    const sigOf = (plan: GeneratedPlan) => buildContentSignature({ mode: 'generated', generatedPlan: plan, category: 'full_body', goal: 'general_fitness' });
    const before = sigOf(state.generatedPlan as GeneratedPlan);
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'leg press', toExerciseName: 'box squat' });
    });
    await flush();
    expect(sigOf(state.generatedPlan as GeneratedPlan)).not.toBe(before);
  });

  it('re-matches after the async search — a swap never hits a slot that changed mid-flight', async () => {
    let resolveSearch: (results: ExerciseSlim[]) => void = () => {};
    const { receipts, state } = setupHarness({
      planExercises: [builderRow('r1', slim('lp1', 'Leg Press'))],
      searchImpl: () => new Promise<ExerciseSlim[]>((resolve) => { resolveSearch = resolve; }),
    });
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'leg press', toExerciseName: 'box squat' });
    });
    // The row disappears while the library search is still in flight.
    await act(async () => {
      dispatchAIWorkoutEvent('AI_PLANNER_REMOVE_EXERCISE', { exerciseName: 'leg press' });
    });
    await act(async () => { resolveSearch([slim('bs1', 'Box Squat')]); });
    await flush();
    expect(state.planExercises).toHaveLength(0); // nothing resurrected or mis-swapped
    expect(receipts).toContainEqual({ ok: true, text: 'Removed Leg Press' });
    expect(receipts).toContainEqual({ ok: false, text: 'Couldn\'t find "leg press" — say the exercise name again?' });
  });

  it('events with missing required params acknowledge handled=false', async () => {
    setupHarness({});
    let addHandled = true; let swapHandled = true;
    await act(async () => {
      addHandled = dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', {});
      swapHandled = dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'x' });
    });
    expect(addHandled).toBe(false);
    expect(swapHandled).toBe(false);
  });
});
