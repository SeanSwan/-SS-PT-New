/**
 * useWorkoutPlannerDraftMutation — plan 58 owner CAS contract (P58-R1..R6).
 * Exercises the SINGLE draft authority directly: admission, scope/day/actor
 * generations, revision and epoch fencing, single consumption, honest
 * publication, and setter compatibility with the two state values it replaced.
 */
import React, { useLayoutEffect } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseSlim } from '../../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlan, PlanExercise } from '../WorkoutPlannerTypes';
import {
  useWorkoutPlannerDraftMutation,
  type PlannerAsyncEditToken,
  type PlannerDraftScope,
  type PlannerDraftOwner,
} from './useWorkoutPlannerDraftMutation';

const slim = (id: string, name: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType: 'strength', bodyPartCategory: 'legs',
  primaryMuscles: [], difficulty: 1,
});
const row = (id: string, exercise: ExerciseSlim): PlanExercise => ({
  id, exerciseSlim: exercise, sets: 3, reps: '8-12', tempo: '2/0/2', restSeconds: 60,
  intensityPercent: 70, notes: '',
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

interface HarnessHandle {
  owner: () => PlannerDraftOwner;
  rendered: () => { planExercises: PlanExercise[]; generatedPlan: GeneratedPlan | null };
  scope: PlannerDraftScope;
}
let handle: HarnessHandle;

function mountOwner(scope: PlannerDraftScope) {
  let ownerRef: PlannerDraftOwner | null = null;
  const rendered = { planExercises: [] as PlanExercise[], generatedPlan: null as GeneratedPlan | null };
  const Harness: React.FC = () => {
    const owner = useWorkoutPlannerDraftMutation();
    ownerRef = owner;
    rendered.planExercises = owner.planExercises;
    rendered.generatedPlan = owner.generatedPlan;
    useLayoutEffect(() => { owner.bindScope(handle.scope); });
    return null;
  };
  handle = { owner: () => ownerRef as PlannerDraftOwner, rendered: () => rendered, scope };
  const utils = render(<Harness />);
  return { ...utils, sync: () => utils.rerender(<Harness />) };
}

const baseScope = (over: Partial<PlannerDraftScope> = {}): PlannerDraftScope => ({
  actorId: 7, actorRole: 'admin', targetClientId: 42, clientsLoading: false,
  day: { kind: 'builder' }, configurationKey: 'route|', ...over,
});

const add = (name: string) => (current: { planExercises: PlanExercise[]; generatedPlan: GeneratedPlan | null }) => ({
  kind: 'applied' as const,
  next: { planExercises: [...current.planExercises, row(`${name}-row`, slim(name, name))], generatedPlan: current.generatedPlan },
});

afterEach(() => { vi.useRealTimers(); });

describe('useWorkoutPlannerDraftMutation (plan 58 owner)', () => {
  it('P58-R1: admission declines denied role, absent actor, null/loading target and mismatched clientId', () => {
    const view = mountOwner(baseScope());
    const owner = handle.owner();
    expect(owner.capture({ kind: 'add' })).toHaveProperty('operation');

    act(() => { handle.scope = baseScope({ actorRole: 'client' }); view.sync(); });
    expect(owner.capture({ kind: 'add' })).toEqual({ kind: 'declined', reason: 'denied' });
    act(() => { handle.scope = baseScope({ actorId: ' ' }); view.sync(); });
    expect(owner.capture({ kind: 'add' })).toEqual({ kind: 'declined', reason: 'denied' });
    act(() => { handle.scope = baseScope({ targetClientId: null }); view.sync(); });
    expect(owner.capture({ kind: 'add' })).toEqual({ kind: 'declined', reason: 'denied' });
    act(() => { handle.scope = baseScope({ clientsLoading: true }); view.sync(); });
    expect(owner.capture({ kind: 'add' })).toEqual({ kind: 'declined', reason: 'denied' });
    act(() => { handle.scope = baseScope(); view.sync(); });
    expect(owner.capture({ kind: 'add', clientId: 43 })).toEqual({ kind: 'declined', reason: 'invalid' });
  });

  it('P58-R1: an explicit missing/invalid week-day declines instead of silently retargeting', () => {
    mountOwner(baseScope({ day: { kind: 'horizon', weekNumber: 1, dayIndex: 0 } }));
    const owner = handle.owner();
    act(() => { owner.setGeneratedPlan(horizonPlan()); });
    expect(owner.capture({ kind: 'add', weekNumber: 1, dayNumber: 9 })).toEqual({ kind: 'declined', reason: 'missing' });
    expect(owner.capture({ kind: 'add', weekNumber: 0, dayNumber: 1 })).toEqual({ kind: 'declined', reason: 'invalid' });
    expect(owner.capture({ kind: 'add', weekNumber: 1, dayNumber: 2 })).toHaveProperty('operation');
  });

  it('P58-R2/R3: a same-tick queued mutation refuses the captured operation, even when values return equal', () => {
    mountOwner(baseScope());
    const owner = handle.owner();
    const token = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    act(() => { owner.setPlanExercises([row('manual', slim('m1', 'Manual'))]); });
    act(() => { owner.setPlanExercises((prev) => prev.filter((r) => r.id !== 'manual')); });
    expect(owner.tryApply(token, add('Goblet Squat'))).toEqual({ kind: 'retired' });
    expect(handle.rendered().planExercises).toHaveLength(0);
  });

  it('P58-R3: actor, day and target A-B-A retire the accepted operation permanently', () => {
    const view = mountOwner(baseScope());
    const owner = handle.owner();
    const viaActor = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    act(() => { handle.scope = baseScope({ actorId: 8 }); view.sync(); });
    act(() => { handle.scope = baseScope({ actorId: 7 }); view.sync(); });
    expect(owner.isCurrent(viaActor)).toBe(false);
    expect(owner.tryApply(viaActor, add('Goblet Squat'))).toEqual({ kind: 'retired' });

    const viaDay = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    act(() => { handle.scope = baseScope({ day: { kind: 'horizon', weekNumber: 1, dayIndex: 1 } }); view.sync(); });
    act(() => { handle.scope = baseScope(); view.sync(); });
    expect(owner.tryApply(viaDay, add('Goblet Squat'))).toEqual({ kind: 'retired' });

    const viaTarget = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    act(() => { handle.scope = baseScope({ targetClientId: 43 }); view.sync(); });
    act(() => { handle.scope = baseScope(); view.sync(); });
    expect(owner.tryApply(viaTarget, add('Goblet Squat'))).toEqual({ kind: 'retired' });
  });

  it('P58-R3: beginReplacement retires even when the replacement keeps identical content', () => {
    mountOwner(baseScope());
    const owner = handle.owner();
    const token = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    act(() => { owner.beginReplacement(); });
    expect(owner.tryApply(token, add('Goblet Squat'))).toEqual({ kind: 'retired' });
  });

  it('P58-R4: one live operation, consumed once, and a second capture declines busy', () => {
    mountOwner(baseScope());
    const owner = handle.owner();
    const token = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    expect(owner.capture({ kind: 'swap' })).toEqual({ kind: 'declined', reason: 'busy' });
    let applied: ReturnType<PlannerDraftOwner['tryApply']> = { kind: 'retired' };
    act(() => { applied = owner.tryApply(token, add('Goblet Squat')); });
    expect(applied).toEqual({ kind: 'applied', appliedRevision: expect.any(Number) });
    expect(owner.tryApply(token, add('Goblet Squat'))).toEqual({ kind: 'retired' });
    expect(handle.rendered().planExercises).toHaveLength(1);
    // Consuming the operation releases the single pending slot for fresh work.
    expect(owner.capture({ kind: 'add' })).toHaveProperty('operation');
  });

  it('P58-R5: canPublishResult survives an immediate publication and dies with later content', () => {
    mountOwner(baseScope());
    const owner = handle.owner();
    const token = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    const applied = owner.tryApply(token, add('Goblet Squat'));
    if (applied.kind !== 'applied') throw new Error('expected applied');
    expect(owner.canPublishResult(token, applied.appliedRevision)).toBe(true);
    act(() => { owner.setPlanExercises((prev) => [...prev]); });
    expect(owner.canPublishResult(token, applied.appliedRevision)).toBe(false);
  });

  it('P58-R6: no-op writes preserve content and revision, and ref agrees with rendered state', () => {
    mountOwner(baseScope());
    const owner = handle.owner();
    const before = owner.snapshot();
    act(() => { owner.setPlanExercises((prev) => prev); });
    expect(owner.snapshot()).toBe(before);
    act(() => {
      // Two same-tick functional setters: both intentional changes, in order.
      owner.setPlanExercises((prev) => [...prev, row('a', slim('a1', 'Alpha'))]);
      owner.setPlanExercises((prev) => [...prev, row('b', slim('b1', 'Beta'))]);
    });
    expect(handle.rendered().planExercises.map((r) => r.id)).toEqual(['a', 'b']);
    expect(owner.snapshot().planExercises).toBe(handle.rendered().planExercises);
    act(() => { owner.setGeneratedPlan(horizonPlan()); });
    expect(handle.rendered().generatedPlan).toBe(owner.snapshot().generatedPlan);
  });

  it('P58-R7: the mount lifecycle is a generation — an unmounted token is inadmissible', () => {
    const view = mountOwner(baseScope());
    const owner = handle.owner();
    const token = owner.capture({ kind: 'add' }) as PlannerAsyncEditToken;
    view.unmount();
    expect(owner.livenessOf(token)).toBe('scope_stale');
    expect(owner.tryApply(token, add('Goblet Squat'))).toEqual({ kind: 'retired' });
  });

  it('P58-R5: the local deadline fires once while current and never for a retired operation', () => {
    vi.useFakeTimers();
    mountOwner(baseScope());
    const owner = handle.owner();
    const onDeadline = vi.fn();
    const token = owner.capture({ kind: 'add' }, { deadlineMs: 5000, onDeadline }) as PlannerAsyncEditToken;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDeadline).toHaveBeenCalledTimes(1);
    expect(owner.tryApply(token, add('Goblet Squat'))).toEqual({ kind: 'retired' });

    const retired = vi.fn();
    owner.capture({ kind: 'add' }, { deadlineMs: 5000, onDeadline: retired });
    act(() => { owner.setPlanExercises((prev) => [...prev]); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(retired).not.toHaveBeenCalled();
  });
});
