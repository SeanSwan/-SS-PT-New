/**
 * useWorkoutPlannerAiEvents.retirement.test.tsx — plan 58 P58-R2..R5/R7.
 * Real receiver hook bound to the REAL draft owner: no mocked setters, no
 * printed draft copy. Proves a delayed add/swap lookup cannot attach its result
 * to a later actor, day, draft revision or superseded operation, and that no
 * Added/Swapped claim is published without an actual local mutation.
 */
import React, { useLayoutEffect } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAIWorkoutEvent } from '../../../../utils/aiWorkoutEvents';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { OPT_PHASES, type GeneratedPlan, type PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerHorizonSelection } from './workoutPlannerAiEvents.types';
import { useWorkoutPlannerAiEvents } from './useWorkoutPlannerAiEvents';
import {
  useWorkoutPlannerDraftMutation, type PlannerDraftOwner, type PlannerDraftScope,
} from './plannerContexts/useWorkoutPlannerDraftMutation';

const slim = (id: string, name: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType: 'strength', bodyPartCategory: 'legs',
  primaryMuscles: [], difficulty: 1,
});
const horizonPlan = (): GeneratedPlan => ({
  clientId: 42, clientName: 'Client 42',
  planSummary: { durationWeeks: 4, sessionsPerWeek: 3, totalSessions: 12, primaryGoal: 'strength', startingPhase: 2 },
  mesocycles: [], weeklySchedule: [], recommendations: [],
  weeks: [{ weekNumber: 1, days: [
    { dayNumber: 1, exercises: [{ exerciseName: 'Bench Press', sets: 3, reps: 10 }] },
    { dayNumber: 2, exercises: [{ exerciseName: 'Leg Press', sets: 3, reps: 12 }] },
  ] }],
});

interface Setup {
  planExercises?: PlanExercise[];
  generatedPlan?: GeneratedPlan | null;
  selection?: PlannerHorizonSelection | null;
  search?: (query: string) => Promise<ExerciseSlim[]>;
}

const pending: Array<(results: ExerciseSlim[]) => void> = [];
const resolvePending = async (results: ExerciseSlim[]) => {
  await act(async () => { pending.splice(0).forEach((resolve) => resolve(results)); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

function setup(opts: Setup = {}) {
  const receipts: Array<{ ok: boolean; text: string }> = [];
  const searchExercises = vi.fn(opts.search ?? (() => new Promise<ExerciseSlim[]>((resolve) => { pending.push(resolve); })));
  const scope: PlannerDraftScope = {
    actorId: 7, actorRole: 'admin', targetClientId: 42, clientsLoading: false,
    day: { kind: 'builder' }, configurationKey: 'route|',
  };
  let ownerRef: PlannerDraftOwner | null = null;
  const rendered = { planExercises: [] as PlanExercise[], generatedPlan: null as GeneratedPlan | null };
  const Harness: React.FC = () => {
    const owner = useWorkoutPlannerDraftMutation();
    ownerRef = owner;
    rendered.planExercises = owner.planExercises;
    rendered.generatedPlan = owner.generatedPlan;
    useLayoutEffect(() => { owner.bindScope(scope); });
    useLayoutEffect(() => {
      if (opts.planExercises) owner.setPlanExercises(opts.planExercises);
      if (opts.generatedPlan) owner.setGeneratedPlan(opts.generatedPlan);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useWorkoutPlannerAiEvents({
      planExercises: owner.planExercises, setPlanExercises: owner.setPlanExercises,
      generatedPlan: owner.generatedPlan, setGeneratedPlan: owner.setGeneratedPlan,
      selectedHorizonTarget: opts.selection ?? null,
      searchExercises, onGenerate: vi.fn(),
      pushReceipt: (receipt) => receipts.push(receipt),
      phase: OPT_PHASES[1], draftMutation: owner,
    });
    return null;
  };
  const utils = render(<Harness />);
  return {
    receipts, searchExercises, rendered, scope,
    owner: () => ownerRef as PlannerDraftOwner,
    sync: () => utils.rerender(<Harness />),
    unmount: utils.unmount,
  };
}

const successTexts = (receipts: Array<{ ok: boolean; text: string }>) =>
  receipts.filter((receipt) => receipt.ok).map((receipt) => receipt.text);

beforeEach(() => { pending.length = 0; });

describe('useWorkoutPlannerAiEvents retirement (plan 58)', () => {
  it('P58-R2/R3: an add whose lookup resolves after the selected day changed edits nothing', async () => {
    const view = setup({ generatedPlan: horizonPlan(), selection: { weekNumber: 1, dayIndex: 0 } });
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    act(() => { view.scope.day = { kind: 'horizon', weekNumber: 1, dayIndex: 1 }; view.sync(); });
    await resolvePending([slim('gs1', 'Goblet Squat')]);

    expect(view.rendered.generatedPlan?.weeks?.[0].days?.[1].exercises).toHaveLength(1);
    expect(successTexts(view.receipts)).toHaveLength(0);
  });

  it('P58-R2/R3: an add resolving after actor A -> B -> A applies nothing and says nothing', async () => {
    const view = setup();
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    act(() => { view.scope.actorId = 8; view.scope.actorRole = 'trainer'; view.sync(); });
    act(() => { view.scope.actorId = 7; view.scope.actorRole = 'admin'; view.sync(); });
    await resolvePending([slim('gs1', 'Goblet Squat')]);

    expect(view.rendered.planExercises).toHaveLength(0);
    expect(view.receipts).toHaveLength(0);
  });

  it('P58-R2/R4: a same-tick manual edit queued after the await keeps the latest draft and the old op is refused', async () => {
    const view = setup();
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    await act(async () => {
      pending.splice(0).forEach((resolve) => resolve([slim('gs1', 'Goblet Squat')]));
      view.owner().setPlanExercises((prev) => [...prev, {
        id: 'manual', exerciseSlim: slim('m1', 'Manual Row'), sets: 3, reps: '8-12',
        tempo: '2/0/2', restSeconds: 60, intensityPercent: 70, notes: '',
      }]);
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(view.rendered.planExercises.map((row) => row.id)).toEqual(['manual']);
    expect(successTexts(view.receipts)).toHaveLength(0);
  });

  it('P58-R4: a second equivalent add while the first lookup is pending declines busy', async () => {
    const view = setup();
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    let second = true;
    await act(async () => { second = dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    await resolvePending([slim('gs1', 'Goblet Squat')]);

    expect(second).toBe(false);
    expect(view.rendered.planExercises).toHaveLength(1);
    expect(successTexts(view.receipts)).toEqual(['Added Goblet Squat — 2×8-12']);
  });

  it('P58-R3/R5: unmount retires the accepted lookup — no draft write and no receipt', async () => {
    const view = setup();
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    view.unmount();
    await resolvePending([slim('gs1', 'Goblet Squat')]);

    expect(view.receipts).toHaveLength(0);
  });

  it('P58-R5: a rejected lookup publishes one generic current failure and never rejects unhandled', async () => {
    const view = setup({ search: () => Promise.reject(new Error('library offline')) });
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(view.rendered.planExercises).toHaveLength(0);
    expect(view.receipts).toEqual([{ ok: false, text: 'The exercise library lookup failed — try again.' }]);
  });

  it('P58-R5: a malformed library result is unavailable — no fabricated exercise ID', async () => {
    const view = setup({ search: async () => [{ name: 'Goblet Squat' } as ExerciseSlim] });
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(view.rendered.planExercises).toHaveLength(0);
    expect(successTexts(view.receipts)).toHaveLength(0);
  });

  it('P58-R2/R4: retiring before the singular fallback means the second lookup never happens', async () => {
    let calls = 0;
    const view = setup({
      search: async () => {
        calls += 1;
        return new Promise<ExerciseSlim[]>((resolve) => { pending.push(resolve); });
      },
    });
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'goblet squats' }); });
    // Retire while the FIRST lookup is still in flight, then resolve it empty —
    // the singular fallback must never be issued for a retired operation.
    act(() => { view.scope.configurationKey = 'route|plan-2'; view.sync(); });
    await act(async () => { pending.splice(0).forEach((resolve) => resolve([])); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(calls).toBe(1);
    expect(view.receipts).toHaveLength(0);
  });

  it('P58-R5: a swap to the movement already in the slot is unchanged, not a success', async () => {
    const view = setup({ planExercises: [{
      id: 'r1', exerciseSlim: slim('lp1', 'Leg Press'), sets: 4, reps: '6-8',
      tempo: '3/1/1', restSeconds: 90, intensityPercent: 80, notes: '',
    }] });
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_SWAP_EXERCISE', { fromExerciseName: 'leg press', toExerciseName: 'Leg Press' }); });
    await resolvePending([slim('lp1', 'Leg Press')]);

    expect(view.rendered.planExercises[0].id).toBe('r1');
    expect(successTexts(view.receipts)).toHaveLength(0);
  });
});
