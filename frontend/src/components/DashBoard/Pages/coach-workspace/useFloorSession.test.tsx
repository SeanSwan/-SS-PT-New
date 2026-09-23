/**
 * Floor mode's live session: the plan seeds it, sets survive a refresh on this
 * device, and "End session" saves once through the logger's own service — with
 * every non-save outcome keeping the sets.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloorSession } from './useFloorSession';

const plan = vi.hoisted(() => ({ current: { status: 'ready', exercises: [{ name: 'Box squat', setScheme: '4 × 6', tempo: null, rest: null }, { name: 'Step-up', setScheme: '3 × 10', tempo: null, rest: null }] } as Record<string, unknown> }));
const submit = vi.hoisted(() => vi.fn());
const logged = vi.hoisted(() => vi.fn());

vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({ useSessionPlannedWorkout: () => plan.current }));
vi.mock('../../../../services/nasmApiService', () => ({ dailyWorkoutFormService: { submitWorkoutForm: submit } }));
vi.mock('../../../../utils/workoutLoggedEvent', () => ({ dispatchWorkoutLogged: logged }));

beforeEach(() => {
  window.sessionStorage.clear();
  submit.mockReset(); logged.mockReset();
  plan.current = { status: 'ready', exercises: [{ name: 'Box squat', setScheme: '4 × 6', tempo: null, rest: null }, { name: 'Step-up', setScheme: '3 × 10', tempo: null, rest: null }] };
});

async function logTwoSets() {
  const hook = renderHook(() => useFloorSession('1:trainer', 84));
  await waitFor(() => expect(hook.result.current.exercises).toHaveLength(2));
  expect(hook.result.current.draft).toEqual({ weight: 0, reps: 6 }); // target reps seed the draft
  act(() => { hook.result.current.setDraft({ weight: 145, reps: 6 }); });
  act(() => { hook.result.current.saveSet(); });
  act(() => { hook.result.current.adjust('reps', -1); });
  act(() => { hook.result.current.saveSet(); });
  return hook;
}

describe('useFloorSession', () => {
  it('seeds from today’s plan and logs sets to the current exercise', async () => {
    const { result } = await logTwoSets();
    expect(result.current.exercises[0]).toMatchObject({ name: 'Box squat', targetSets: 4, targetReps: 6, sets: [{ weight: 145, reps: 6 }, { weight: 145, reps: 5 }] });
    expect(result.current.loggedSets).toBe(2);
    act(() => { result.current.undoLastSet(); });
    expect(result.current.exercises[0].sets).toEqual([{ weight: 145, reps: 6 }]);
  });

  it('a refresh keeps the sets: the stored session wins over the plan seed', async () => {
    const first = await logTwoSets();
    first.unmount();
    const again = renderHook(() => useFloorSession('1:trainer', 84));
    await waitFor(() => expect(again.result.current.loggedSets).toBe(2));
    expect(again.result.current.exercises[0].sets).toHaveLength(2);
  });

  it('End session saves once through the logger service, then clears', async () => {
    submit.mockResolvedValue({ success: true, data: { id: 901 } });
    const { result } = await logTwoSets();
    await act(async () => { await result.current.endAndSave(); });
    expect(submit).toHaveBeenCalledTimes(1);
    const body = submit.mock.calls[0][0];
    expect(body).toMatchObject({ clientId: 84, exercises: [{ exerciseName: 'Box squat' }] });
    expect(body.exercises).toHaveLength(1); // the untouched Step-up does not travel
    expect(logged).toHaveBeenCalledWith(expect.objectContaining({ clientId: 84, formId: 901 }));
    expect(result.current.save.phase).toBe('saved');
    expect(result.current.loggedSets).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('a workout that already owns today is a conflict: the sets are kept, nothing is cleared', async () => {
    submit.mockResolvedValue({ success: false, data: { id: 55 }, message: 'A workout already exists for this date.' });
    const { result } = await logTwoSets();
    await act(async () => { await result.current.endAndSave(); });
    // The server's message, plus what happened to the sets (the server never says that part).
    expect(result.current.save).toEqual({ phase: 'conflict', message: 'A workout already exists for this date. Your sets are kept here — add them in the workout logger.' });
    expect(result.current.loggedSets).toBe(2);
    expect(logged).not.toHaveBeenCalled();
  });

  it('a thrown save is a failure with the sets kept; offline never calls the server', async () => {
    submit.mockRejectedValue(new Error('500'));
    const { result } = await logTwoSets();
    await act(async () => { await result.current.endAndSave(); });
    expect(result.current.save.phase).toBe('failed');
    expect(result.current.loggedSets).toBe(2);
    submit.mockClear();
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => { await result.current.endAndSave(); });
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.save.phase).toBe('failed');
    online.mockRestore();
  });

  it('CONTROL: no plan day starts blank and lets the coach add an exercise; nothing to save means no call', async () => {
    plan.current = { status: 'none' };
    const { result } = renderHook(() => useFloorSession('1:trainer', 84));
    expect(result.current.exercises).toEqual([]);
    await act(async () => { await result.current.endAndSave(); });
    expect(submit).not.toHaveBeenCalled();
    act(() => { result.current.addExercise('Farmer carry'); });
    expect(result.current.current?.name).toBe('Farmer carry');
  });
});

describe('useFloorSession — day and seeding guards', () => {
  it('a stored session keeps the day it was trained on (midnight never strands its sets)', async () => {
    window.sessionStorage.setItem('swan-coach:floor:v2:1:trainer:84', JSON.stringify({
      day: '2026-09-22', index: 0, exercises: [{ name: 'Box squat', targetSets: 4, targetReps: 6, sets: [{ weight: 145, reps: 6 }] }],
    }));
    submit.mockResolvedValue({ success: true, data: { id: 902 } });
    const { result } = renderHook(() => useFloorSession('1:trainer', 84));
    expect(result.current.loggedSets).toBe(1);
    expect(result.current.exercises).toHaveLength(1); // the stored session wins over the plan seed
    await act(async () => { await result.current.endAndSave(); });
    expect(submit.mock.calls[0][0]).toMatchObject({ date: '2026-09-22', clientId: 84 });
  });

  it('absurd plan targets (distances read as reps) never seed the draft', async () => {
    plan.current = { status: 'ready', exercises: [{ name: 'Row', setScheme: '2 × 400m', tempo: null, rest: null }, { name: 'Carry', setScheme: '3 x 80', tempo: null, rest: null }] };
    const { result } = renderHook(() => useFloorSession('1:trainer', 84));
    await waitFor(() => expect(result.current.exercises).toHaveLength(2));
    expect(result.current.exercises[0].targetReps).toBeNull();
    expect(result.current.exercises[1].targetReps).toBeNull(); // 80 "reps" is not a rep target
    expect(result.current.draft.reps).toBe(0);
  });
});
