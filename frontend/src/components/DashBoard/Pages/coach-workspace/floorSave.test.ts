/**
 * Floor's one save, held to the Workout Logger's contract (Astra review F1/F3):
 * a booked session carries its scheduledSessionId and date; today's plan day is
 * attached only when the logger's own rules prove it; an unreadable plan saves
 * nothing; one save per client at a time; success removes only what was sent.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginFloorSave, inflightFloorSave, takeUnseenFloorSave, type FloorSaveInput } from './floorSave';
import { localDateISO } from './floorSession';
import { useFloorSession } from './useFloorSession';

const submit = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/nasmApiService', () => ({ dailyWorkoutFormService: { submitWorkoutForm: submit } }));
vi.mock('../../../../services/api.service', () => ({ default: { get } }));
vi.mock('../../../../utils/workoutLoggedEvent', () => ({ dispatchWorkoutLogged: vi.fn() }));
vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({ useSessionPlannedWorkout: () => ({ status: 'none' }) }));

const today = localDateISO();
const squat = (sets: Array<[number, number]>) => ({ name: 'Box squat', targetSets: 4, targetReps: 6, sets: sets.map(([weight, reps]) => ({ weight, reps })) });
const input = (over: Partial<FloorSaveInput> = {}): FloorSaveInput => ({
  key: `k-${Math.random()}`, clientId: 84, day: today, exercises: [squat([[145, 6]])], link: null, planDay: null, ...over,
});
const assignment = (over: Record<string, unknown> = {}) => ({
  assignmentKey: 'plan-9:w6:d1', assignmentType: 'homework', weekNumber: 6, dayNumber: 1, status: 'pending', isLoggable: true, ...over,
});

beforeEach(() => {
  window.sessionStorage.clear();
  submit.mockReset(); get.mockReset();
  submit.mockResolvedValue({ success: true, data: { id: 901 } });
});

describe('beginFloorSave — identity', () => {
  it('a booked session carries its scheduledSessionId and its own date; no plan read without a seeded plan day', async () => {
    const link = { scheduledSessionId: '501', date: '2026-09-22', startsAt: '2026-09-22T16:00:00.000Z' };
    await beginFloorSave(input({ link, day: '2026-09-22' }))!.done;
    expect(submit.mock.calls[0][0]).toMatchObject({ clientId: 84, date: '2026-09-22', scheduledSessionId: '501' });
    expect(submit.mock.calls[0][0]).not.toHaveProperty('plannedAssignment');
    expect(get).not.toHaveBeenCalled();
  });

  it("today's homework day rides along when it is still the seeded week/day — the zero-credit exemption", async () => {
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment() } });
    await beginFloorSave(input({ planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    expect(get).toHaveBeenCalledWith('/api/workouts/84/current');
    expect(submit.mock.calls[0][0].plannedAssignment).toMatchObject({ assignmentType: 'homework', planId: '9', isBillable: false, weekNumber: 6, dayNumber: 1 });
  });

  it("a booked session attaches today's trainer-session day, never a homework one", async () => {
    const link = { scheduledSessionId: '501', date: today, startsAt: new Date().toISOString() };
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment({ assignmentType: 'trainer_session' }) } });
    await beginFloorSave(input({ link, planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    expect(submit.mock.calls[0][0]).toMatchObject({ scheduledSessionId: '501', plannedAssignment: { assignmentType: 'trainer_session', isBillable: true } });
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment() } }); // homework on a booked session: dropped
    await beginFloorSave(input({ link, planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    expect(submit.mock.calls[1][0]).not.toHaveProperty('plannedAssignment');
  });

  it('never invents an assignment: another week/day, a completed day, or a past session day sends none', async () => {
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment({ dayNumber: 2 }) } });
    await beginFloorSave(input({ planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment({ status: 'completed' }) } });
    await beginFloorSave(input({ planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    await beginFloorSave(input({ day: '2026-09-01', planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    expect(get).toHaveBeenCalledTimes(2); // the past day never reads today's plan
    for (const call of submit.mock.calls) expect(call[0]).not.toHaveProperty('plannedAssignment');
  });

  it('an unreadable plan saves NOTHING (a homework day must not be charged by omission) and keeps the sets', async () => {
    get.mockRejectedValue(new Error('offline'));
    const result = await beginFloorSave(input({ planDay: { weekNumber: 6, dayNumber: 1 } }))!.done;
    expect(result.kind).toBe('failed');
    expect(result.message).toMatch(/nothing was saved.*kept here/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it('a plan cursor on another day is DISCLOSED in the saved message, never guessed (planDayResolver)', async () => {
    get.mockResolvedValue({ data: { id: 9, todayAssignment: assignment({ weekNumber: 2, dayNumber: 2 }) } });
    const result = await beginFloorSave(input({ planDay: { weekNumber: 2, dayNumber: 3 } }))!.done;
    expect(submit.mock.calls[0][0]).not.toHaveProperty('plannedAssignment');
    expect(result.message).toMatch(/Not counted toward the plan: its current day is Week 2 · Day 2, not the day Floor used \(Week 2 · Day 3\)/);
  });

  it("the saved message is the logger's own billing receipt", async () => {
    submit.mockResolvedValue({ success: true, data: { id: 902, billing: { status: 'previously_deducted', sessionDeducted: true, creditsDeducted: 0 } } });
    const result = await beginFloorSave(input())!.done;
    expect(result).toEqual({ kind: 'saved', message: 'Workout saved. Scheduled credit was already deducted.' });
  });
});

describe('beginFloorSave — ownership', () => {
  it('one save per client at a time: a second start while the first is out sends nothing', async () => {
    let finish!: (value: unknown) => void;
    submit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const first = input({ key: 'same' });
    const transaction = beginFloorSave(first)!;
    expect(beginFloorSave(first)).toBeNull();
    expect(inflightFloorSave('same')).toBe(transaction);
    finish({ success: true, data: { id: 903 } });
    await transaction.done;
    expect(submit).toHaveBeenCalledTimes(1);
    expect(inflightFloorSave('same')).toBeNull(); // released for the next save
  });

  it('a save that does not answer in 30 s is reported as unknown, not as a sure failure', async () => {
    vi.useFakeTimers();
    submit.mockImplementation((_body: unknown, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const transaction = beginFloorSave(input())!;
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await transaction.done;
    vi.useRealTimers();
    expect(result.kind).toBe('failed');
    expect(result.message).toMatch(/may still have landed.*check the workout log/i);
  });
});

describe('beginFloorSave — honest outcomes', () => {
  it('a 4xx thrown refusal is "not saved"; a gateway error or dropped connection is unknown', async () => {
    submit.mockRejectedValueOnce(Object.assign(new Error('bad'), { response: { status: 422 } }));
    expect((await beginFloorSave(input())!.done).message).toMatch(/^The workout was not saved/);
    submit.mockRejectedValueOnce(Object.assign(new Error('gateway'), { response: { status: 504 } }));
    expect((await beginFloorSave(input())!.done).message).toMatch(/may still have landed/);
    submit.mockRejectedValueOnce(new Error('network down'));
    expect((await beginFloorSave(input())!.done).message).toMatch(/may still have landed/);
  });

  it('a result nobody saw waits for the next Floor, once', async () => {
    submit.mockResolvedValue({ success: false, message: 'Client has no available sessions remaining' });
    await beginFloorSave(input({ key: 'away' }))!.done;
    expect(takeUnseenFloorSave('away')).toMatchObject({ kind: 'failed', message: expect.stringMatching(/no available sessions/) });
    expect(takeUnseenFloorSave('away')).toBeNull();
  });
});

describe('useFloorSession — a save that outlives its Floor', () => {
  const key = 'swan-coach:floor:v2:1:trainer:84';
  const stored = (sets: Array<[number, number]>) => JSON.stringify({ day: today, index: 0, exercises: [squat(sets)] });

  it('a remount mid-save shows Saving, freezes Undo, then removes only the submitted sets', async () => {
    let finish!: (value: unknown) => void;
    submit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    window.sessionStorage.setItem(key, stored([[145, 6]]));
    const first = renderHook(() => useFloorSession('1:trainer', 84));
    act(() => { void first.result.current.endAndSave(); });
    first.unmount(); // the coach switches to Chat while it saves

    const second = renderHook(() => useFloorSession('1:trainer', 84));
    expect(second.result.current.save.phase).toBe('saving');
    act(() => { second.result.current.setDraft({ weight: 150, reps: 5 }); });
    act(() => { second.result.current.saveSet(); });
    act(() => { second.result.current.undoLastSet(); }); // frozen: the sent set cannot be taken back
    expect(second.result.current.loggedSets).toBe(2);
    expect(second.result.current.save.phase).toBe('saving'); // a new set never re-opens End session mid-save
    await act(async () => { finish({ success: true, data: { id: 904 } }); });
    await waitFor(() => expect(second.result.current.save.phase).toBe('saved'));
    expect(second.result.current.exercises[0].sets).toEqual([{ weight: 150, reps: 5 }]);
    expect(JSON.parse(window.sessionStorage.getItem(key)!).exercises[0].sets).toEqual([{ weight: 150, reps: 5 }]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('a stored booking outlives a refresh and beats a newer link; after it saves, later sets are unbooked', async () => {
    const booked = { scheduledSessionId: '501', date: today, startsAt: new Date().toISOString() };
    window.sessionStorage.setItem(key, JSON.stringify({ day: today, index: 0, exercises: [squat([[145, 6]])], link: booked }));
    const other = { scheduledSessionId: '777', date: today, startsAt: new Date().toISOString() };
    const { result } = renderHook(() => useFloorSession('1:trainer', 84, other));
    expect(result.current.link?.scheduledSessionId).toBe('501'); // the sets belong to the booking they were logged under
    await act(async () => { await result.current.endAndSave(); });
    expect(submit.mock.calls[0][0].scheduledSessionId).toBe('501');
    expect(result.current.link).toBeNull();
  });

  it('coming back after a save finished off screen shows what happened', async () => {
    submit.mockResolvedValue({ success: false, message: 'Client has no available sessions remaining' });
    window.sessionStorage.setItem(key, stored([[145, 6]]));
    const first = renderHook(() => useFloorSession('1:trainer', 84));
    act(() => { void first.result.current.endAndSave(); });
    first.unmount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const back = renderHook(() => useFloorSession('1:trainer', 84));
    await waitFor(() => expect(back.result.current.save.phase).toBe('failed'));
    expect(back.result.current.loggedSets).toBe(1); // a refusal keeps the sets
  });

  it("tapping a booking attaches it to UNBOOKED sets from the same day; a stale day's booking is ignored", () => {
    const booked = { scheduledSessionId: '600', date: today, startsAt: new Date().toISOString() };
    window.sessionStorage.setItem(key, stored([[145, 6]])); // unbooked, today
    expect(renderHook(() => useFloorSession('1:trainer', 84, booked)).result.current.link?.scheduledSessionId).toBe('600');
    window.sessionStorage.clear();
    const stale = { scheduledSessionId: '400', date: '2020-01-01', startsAt: '2020-01-01T16:00:00.000Z' };
    const fresh = renderHook(() => useFloorSession('1:trainer', 84, stale));
    expect(fresh.result.current.link).toBeNull();
    expect(fresh.result.current.day).toBe(today);
  });
});
