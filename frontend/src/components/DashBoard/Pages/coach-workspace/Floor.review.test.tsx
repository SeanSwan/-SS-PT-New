/** Review-only regression probes for immutable source 9ac7f0369. */
import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloorSession } from './useFloorSession';
import FloorView from './FloorView';

const submit = vi.hoisted(() => vi.fn());
vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({
  useSessionPlannedWorkout: () => ({ status: 'none' }),
}));
vi.mock('../../../../services/nasmApiService', () => ({
  dailyWorkoutFormService: { submitWorkoutForm: submit },
}));
vi.mock('../../../../utils/workoutLoggedEvent', () => ({ dispatchWorkoutLogged: vi.fn() }));
vi.mock('./WorkspaceComposer', () => ({ default: () => <p>composer</p> }));
vi.mock('./TurnEntry', () => ({ default: () => null, turnKind: () => 'coach' }));
vi.mock('../coach-assistant/coachClientNames', () => ({
  useCoachClientNames: () => new Map(), nameClientTokens: (text: string) => text,
}));

beforeEach(() => {
  window.sessionStorage.clear();
  submit.mockReset();
});

describe('Floor review — save transaction ownership', () => {
  it('retains a set recorded after the submitted snapshot while End session is pending', async () => {
    let finish!: (result: unknown) => void;
    submit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useFloorSession('1:trainer', 84));
    act(() => result.current.addExercise('Box squat'));
    act(() => result.current.setDraft({ weight: 145, reps: 6 }));
    act(() => result.current.saveSet());
    let pending!: Promise<void>;
    act(() => { pending = result.current.endAndSave(); });
    expect(result.current.save.phase).toBe('saving');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].exercises[0].sets).toHaveLength(1);

    // The real FloorLive Save set button remains enabled while saving.
    act(() => result.current.setDraft({ weight: 150, reps: 5 }));
    act(() => result.current.saveSet());
    expect(result.current.loggedSets).toBe(2);
    expect(submit.mock.calls[0][0].exercises[0].sets).toHaveLength(1);
    await act(async () => {
      finish({ success: true, data: { id: 901 } });
      await pending;
    });

    // Only the 145 x 6 set reached the server; the later set must remain local.
    expect(result.current.exercises[0].sets).toEqual([{ weight: 150, reps: 5 }]);
    expect(result.current.loggedSets).toBe(1);
    const stored = JSON.parse(window.sessionStorage.getItem('swan-coach:floor:v2:1:trainer:84')!);
    expect(stored.exercises[0].sets).toEqual([{ weight: 150, reps: 5 }]);
  });

  it('CONTROL: a restored prior-day session saves under its original date', async () => {
    window.sessionStorage.setItem('swan-coach:floor:v2:1:trainer:84', JSON.stringify({
      day: '2026-09-22', index: 0,
      exercises: [{ name: 'Box squat', targetSets: 4, targetReps: 6, sets: [{ weight: 145, reps: 6 }] }],
    }));
    submit.mockResolvedValue({ success: true, data: { id: 902 } });
    const { result } = renderHook(() => useFloorSession('1:trainer', 84));
    await waitFor(() => expect(result.current.loggedSets).toBe(1));
    await act(async () => { await result.current.endAndSave(); });
    expect(submit.mock.calls[0][0]).toMatchObject({ clientId: 84, date: '2026-09-22' });
    expect(result.current.loggedSets).toBe(0);
  });
});

describe('Floor review — selection admission', () => {
  it('does not expose stored workouts for a denied route candidate', () => {
    window.sessionStorage.setItem('swan-coach:floor:v2:1:trainer:84', JSON.stringify({
      day: '2026-09-22', index: 0,
      exercises: [{ name: 'Private stored rehab exercise', targetSets: 4, targetReps: 6, sets: [{ weight: 145, reps: 6 }] }],
    }));
    const model = {
      isClientMode: false, user: { id: 1, role: 'trainer' }, scopeLabel: 'Client 84',
      floorSetSink: { current: null }, showView: vi.fn(), workoutLoggerRoute: null,
      controller: {
        clientPin: { selectedClientId: 84 }, commandText: '', logs: [],
        selectionPhase: 'denied',
        selection: { phase: 'denied', accepted: null, pending: null },
      },
    };
    render(<FloorView model={model as never} />);
    expect(screen.queryByRole('heading', { name: 'Private stored rehab exercise' })).toBeNull();
    expect(screen.queryByRole('button', { name: /End session.*save 1 set/ })).toBeNull();
  });
});
