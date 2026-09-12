import React, { StrictMode, useContext } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SessionContext, { SessionProvider, type WorkoutSession } from './SessionContext';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: '41', role: 'trainer', firstName: 'Synthetic A' } as { id: string; role: string; firstName: string } | null, isAuthenticated: true },
  get: vi.fn(), put: vi.fn(), post: vi.fn(),
}));
vi.mock('./AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../services/api.service', () => ({ default: { get: mocks.get, put: mocks.put, post: mocks.post } }));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn() } }));

function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type Pending = ReturnType<typeof deferred> & { url: string; config?: { signal?: AbortSignal } };
let reads: Pending[];
let context: React.ContextType<typeof SessionContext>;
let observations: Array<{ current: string | undefined; sessions: string[]; analytics: unknown; timer: number; error: unknown; loading: boolean }>;
const sample = (id = 'session_fixture', userId = '41', status: WorkoutSession['status'] = 'active'): WorkoutSession => ({
  id, userId, status, title: `Synthetic ${id}`, duration: 0, startTime: new Date().toISOString(),
  exercises: [], difficulty: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const analytics = (count: number) => ({ totalSessions: count, totalDuration: count * 10, averageDuration: 10,
  caloriesBurned: 0, favoriteExercises: [], weeklyProgress: [], currentStreak: 0, longestStreak: 0 });
const Probe = () => {
  context = useContext(SessionContext);
  observations.push({ current: context.currentSession?.userId, sessions: context.sessions.map(s => s?.userId),
    analytics: context.sessionAnalytics, timer: context.sessionTimer, error: context.error, loading: context.loading });
  return null;
};
const mount = (strict = false) => {
  const tree = () => strict ? <StrictMode><SessionProvider><Probe /></SessionProvider></StrictMode>
    : <SessionProvider><Probe /></SessionProvider>;
  const view = render(tree());
  return { ...view, refresh: () => view.rerender(tree()), switchActor: (id: string | null, role = 'trainer') => {
    mocks.auth.user = id === null ? null : { id, role, firstName: `Synthetic ${id}` };
    mocks.auth.isAuthenticated = id !== null;
    view.rerender(tree());
  } };
};
const matching = (url: string) => reads.filter(r => r.url === url);
const resolveRead = async (request: Pending, data: any) => { await act(async () => { request.resolve({ data }); }); };
const rejectRead = async (request: Pending) => { await act(async () => { request.reject(new Error('Synthetic unavailable')); }); };
const tickSeconds = async (seconds: number) => {
  for (let i = 0; i < seconds; i++) await act(async () => { vi.advanceTimersByTime(1000); });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  localStorage.clear();
  observations = [];
  reads = [];
  mocks.auth.user = { id: '41', role: 'trainer', firstName: 'Synthetic A' };
  mocks.auth.isAuthenticated = true;
  mocks.get.mockReset().mockImplementation((url, config) => {
    const request = { ...deferred(), url, config };
    reads.push(request);
    return request.promise;
  });
  mocks.put.mockReset().mockResolvedValue({ data: {} });
  mocks.post.mockReset().mockResolvedValue({ data: {} });
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('HR9-R1 bounded boot and current reads', () => {
  it('settles after one successful boot pair; explicit refresh still works', async () => {
    mount();
    await resolveRead(matching('/api/sessions')[0], { sessions: [sample('history')] });
    await resolveRead(matching('/api/sessions/analytics')[0], analytics(1));
    expect(matching('/api/sessions')).toHaveLength(1);
    expect(matching('/api/sessions/analytics')).toHaveLength(1);
    let refresh!: Promise<void>;
    act(() => { refresh = context.fetchSessions(); });
    await resolveRead(matching('/api/sessions')[1], { sessions: [] });
    await refresh;
    expect(context.sessions).toEqual([]);
    expect(matching('/api/sessions')).toHaveLength(2);
    expect(matching('/api/sessions/analytics')).toHaveLength(1);
  });
  it('same-actor profile replacement and session/timer updates do not reboot', async () => {
    const view = mount();
    mocks.auth.user = { ...mocks.auth.user!, firstName: 'Updated profile' };
    view.refresh();
    await act(async () => { await context.startSession(); });
    await tickSeconds(3);
    expect(matching('/api/sessions')).toHaveLength(1);
    expect(matching('/api/sessions/analytics')).toHaveLength(1);
  });
  it('StrictMode replay settles, ignores its retired read, and keeps a usable admission', async () => {
    mount(true);
    const initialSessions = [...matching('/api/sessions')];
    const initialAnalytics = [...matching('/api/sessions/analytics')];
    expect(initialSessions.length).toBeLessThanOrEqual(2);
    await resolveRead(initialSessions.at(-1)!, { sessions: [sample('current')] });
    await resolveRead(initialAnalytics.at(-1)!, analytics(1));
    if (initialSessions.length > 1) await resolveRead(initialSessions[0], { sessions: [sample('retired')] });
    expect(context.sessions[0]?.id).toBe('current');
    expect(matching('/api/sessions')).toHaveLength(initialSessions.length);
    expect(matching('/api/sessions/analytics')).toHaveLength(initialAnalytics.length);
    await act(async () => { await context.startSession(); });
    expect(context.currentSession?.userId).toBe('41');
  });
  it('fallback analytics reads the latest own history without causing another boot', async () => {
    const history = { ...sample('session_history'), duration: 12, caloriesBurned: 34 };
    localStorage.setItem('sessions_41', JSON.stringify([history]));
    mount();
    await rejectRead(matching('/api/sessions')[0]);
    await rejectRead(matching('/api/sessions/analytics')[0]);
    expect(context.sessionAnalytics).toMatchObject({ totalSessions: 1, totalDuration: 12, caloriesBurned: 34 });
    expect(matching('/api/sessions')).toHaveLength(1);
    expect(matching('/api/sessions/analytics')).toHaveLength(1);
  });
  it('aborts superseded reads and ignores old success/finally while a newer read is pending', async () => {
    mount();
    const old = matching('/api/sessions')[0];
    let refresh!: Promise<void>;
    act(() => { refresh = context.fetchSessions(); });
    const current = matching('/api/sessions')[1];
    expect(old.config?.signal?.aborted).toBe(true);
    await resolveRead(old, { sessions: [sample('old')] });
    expect(context.sessions).toEqual([]);
    expect(context.loading).toBe(true);
    await resolveRead(current, { sessions: [sample('new')] });
    await refresh;
    expect(context.sessions[0]?.id).toBe('new');
    expect(context.loading).toBe(false);
  });
  it('older analytics failure cannot replace the latest successful analytics', async () => {
    mount();
    const old = matching('/api/sessions/analytics')[0];
    let refresh!: Promise<void>;
    act(() => { refresh = context.fetchSessionAnalytics(); });
    await resolveRead(matching('/api/sessions/analytics')[1], analytics(9));
    await refresh;
    await rejectRead(old);
    expect(context.sessionAnalytics?.totalSessions).toBe(9);
  });
  it('fallback analytics follows history that resolves after the analytics failure without refetching', async () => {
    mount();
    await rejectRead(matching('/api/sessions/analytics')[0]);
    await resolveRead(matching('/api/sessions')[0], { sessions: [{ ...sample('late_history'), duration: 17 }] });
    expect(context.sessionAnalytics).toMatchObject({ totalSessions: 1, totalDuration: 17 });
    expect(matching('/api/sessions/analytics')).toHaveLength(1);
  });
});

describe('HR9-R2 actor admission and asynchronous retirement', () => {
  it.each(['actor', 'role', 'logout'] as const)('masks old private state on the first %s render and stops its timer', async (kind) => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample()));
    const view = mount();
    await resolveRead(matching('/api/sessions')[0], { sessions: [sample('history')] });
    await resolveRead(matching('/api/sessions/analytics')[0], analytics(7));
    await tickSeconds(2);
    const before = observations.length;
    view.switchActor(kind === 'logout' ? null : kind === 'actor' ? '42' : '41', kind === 'role' ? 'client' : 'trainer');
    expect(observations[before]).toEqual({ current: undefined, sessions: [], analytics: null, timer: 0, error: null, loading: false });
    if (kind !== 'role') {
      await tickSeconds(31);
      expect(context.currentSession).toBeNull();
      expect(context.sessionTimer).toBe(0);
      expect(localStorage.getItem('activeSession_42')).toBeNull();
    }
  });
  it('late success/failure after actor change cannot publish, restore fallback, or clear newer loading', async () => {
    const view = mount();
    const oldSessions = matching('/api/sessions')[0];
    const oldAnalytics = matching('/api/sessions/analytics')[0];
    localStorage.setItem('sessions_41', JSON.stringify([sample('private_backup')]));
    view.switchActor('42');
    await rejectRead(oldSessions);
    await resolveRead(oldAnalytics, analytics(41));
    expect(context.sessions).toEqual([]);
    expect(context.sessionAnalytics).toBeNull();
    expect(context.loading).toBe(true);
    expect(oldSessions.config?.signal?.aborted).toBe(true);
    await resolveRead(matching('/api/sessions').at(-1)!, { sessions: [sample('b', '42')] });
    expect(context.sessions[0]?.userId).toBe('42');
  });
  it('retained A callbacks never regain authority after A-B-A', async () => {
    const view = mount();
    const old = context;
    view.switchActor('42');
    view.switchActor('41');
    const before = mocks.get.mock.calls.length;
    let staleRead!: Promise<void>;
    act(() => { staleRead = old.fetchSessions(); });
    expect(mocks.get).toHaveBeenCalledTimes(before);
    await staleRead;
    await expect(old.startSession()).rejects.toThrow();
    expect(localStorage.getItem('activeSession_41')).toBeNull();
    expect(context.currentSession).toBeNull();
    await act(async () => { await context.startSession(); });
    expect(context.currentSession?.userId).toBe('41');
  });
  it.each([
    ['fetchClientSessions', '/api/sessions/client/42', []],
    ['fetchAllUserSessions', '/api/admin/all-sessions', []],
    ['fetchTrainerStats', '/api/trainer/stats', {}],
    ['fetchAdminStats', '/api/admin/session-stats', {}],
  ] as const)('%s does not return retired private data to its caller', async (method, url, empty) => {
    mocks.auth.user!.role = 'admin';
    const view = mount();
    const result = method === 'fetchClientSessions' ? context.fetchClientSessions('42') : context[method]();
    const request = matching(url)[0];
    view.switchActor(null);
    await resolveRead(request, { privateFixture: 'old actor' });
    expect(await result).toEqual(empty);
    expect(request.config?.signal?.aborted).toBe(true);
  });
  it('a retired booking completion has no success notice or refresh', async () => {
    const booking = deferred();
    mocks.post.mockReturnValue(booking.promise);
    const view = mount();
    let operation!: Promise<void>;
    act(() => { operation = context.bookAvailableSession('100'); });
    view.switchActor('42');
    const readsBefore = mocks.get.mock.calls.length;
    await act(async () => { booking.resolve({ data: {} }); });
    expect(mocks.get).toHaveBeenCalledTimes(readsBefore);
    await operation;
    expect(document.body.textContent).not.toContain('Session booked successfully');
    expect(context.loading).toBe(true);
  });
});

describe('HR9-R3 autosave cadence and session snapshot fencing', () => {
  it('saves at 30 and 60 seconds with latest timer and edited session', async () => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample()));
    mount();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    await tickSeconds(20);
    await act(async () => { await context.addExercise({ exerciseId: 'bench', exerciseName: 'Synthetic bench', sets: [] }); });
    writes.mockClear();
    await tickSeconds(10);
    const savedAt30 = JSON.parse(localStorage.getItem('activeSession_41')!);
    expect(savedAt30.duration).toBe(30);
    expect(savedAt30.exercises).toHaveLength(1);
    await tickSeconds(30);
    expect(JSON.parse(localStorage.getItem('activeSession_41')!).duration).toBe(60);
    expect(writes.mock.calls.filter(([key]) => key === 'activeSession_41')).toHaveLength(2);
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it.each(['cancel', 'replace', 'actor'] as const)('late failed backend autosave cannot resurrect after %s', async (retirement) => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample('100')));
    const save = deferred();
    mocks.put.mockReturnValue(save.promise);
    const view = mount();
    const operation = context.saveSessionData();
    if (retirement === 'actor') view.switchActor('42');
    else {
      await act(async () => { await context.cancelSession(); });
      if (retirement === 'replace') await act(async () => { await context.startSession(undefined, 'Replacement'); });
    }
    const beforeA = localStorage.getItem('activeSession_41');
    const beforeB = localStorage.getItem('activeSession_42');
    await act(async () => { save.reject(new Error('Synthetic save failed')); await operation; });
    expect(localStorage.getItem('activeSession_41')).toBe(beforeA);
    expect(localStorage.getItem('activeSession_42')).toBe(beforeB);
  });
  it('an older failed save cannot overwrite a same-session edit', async () => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample('100')));
    const save = deferred();
    mocks.put.mockReturnValue(save.promise);
    mount();
    const operation = context.saveSessionData();
    await act(async () => { await context.addExercise({ exerciseId: 'row', exerciseName: 'Synthetic row', sets: [] }); });
    const before = localStorage.getItem('activeSession_41');
    await act(async () => { save.reject(new Error('Synthetic unavailable')); await operation; });
    expect(localStorage.getItem('activeSession_41')).toBe(before);
  });
  it('a current backend save failure still uses its own local fallback', async () => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample('100')));
    mocks.put.mockRejectedValue(new Error('Synthetic unavailable'));
    mount();
    await tickSeconds(2);
    await act(async () => { await context.saveSessionData(); });
    expect(JSON.parse(localStorage.getItem('activeSession_41')!).duration).toBe(2);
  });
  it('an older failed autosave cannot overwrite a newer elapsed-time fallback', async () => {
    localStorage.setItem('activeSession_41', JSON.stringify(sample('100')));
    const oldSave = deferred();
    const newSave = deferred();
    mocks.put.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(newSave.promise);
    mount();
    const oldOperation = context.saveSessionData();
    await tickSeconds(5);
    const newOperation = context.saveSessionData();
    await act(async () => { newSave.reject(new Error('Synthetic newer failure')); await newOperation; });
    expect(JSON.parse(localStorage.getItem('activeSession_41')!).duration).toBe(5);
    await act(async () => { oldSave.reject(new Error('Synthetic older failure')); await oldOperation; });
    expect(JSON.parse(localStorage.getItem('activeSession_41')!).duration).toBe(5);
  });
});

describe('HR9-R4 standalone storage compatibility and cleanup', () => {
  it('creates, restores and completes local sessions without backend writes and keeps the 50-entry cap', async () => {
    const view = mount();
    await act(async () => { await context.startSession(undefined, 'Synthetic local'); });
    expect(context.currentSession?.id).toMatch(/^session_/);
    const saved = localStorage.getItem('activeSession_41');
    view.unmount();
    mount();
    expect(context.currentSession?.title).toBe('Synthetic local');
    expect(localStorage.getItem('activeSession_41')).toBe(saved);
    localStorage.setItem('sessions_41', JSON.stringify(Array.from({ length: 50 }, (_, i) => sample(`session_history_${i}`))));
    await act(async () => { await context.completeSession('Synthetic complete'); });
    expect(context.currentSession).toBeNull();
    expect(localStorage.getItem('activeSession_41')).toBeNull();
    expect(JSON.parse(localStorage.getItem('sessions_41')!)).toHaveLength(50);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it.each(['foreign', 'null', 'malformed', 'shape'] as const)('does not restore a %s record', (kind) => {
    const stored = kind === 'foreign' ? JSON.stringify(sample('session_foreign', '42'))
      : kind === 'null' ? 'null' : kind === 'shape' ? JSON.stringify({ userId: '41' }) : '{broken';
    localStorage.setItem('activeSession_41', stored);
    const foreign = JSON.stringify(sample('session_other', '42'));
    localStorage.setItem('activeSession_42', foreign);
    mount();
    expect(context.currentSession).toBeNull();
    expect(localStorage.getItem('activeSession_42')).toBe(foreign);
    if (kind === 'foreign') expect(localStorage.getItem('activeSession_41')).toBe(stored);
  });
  it('fallback history and storage events accept own records only', async () => {
    localStorage.setItem('sessions_41', JSON.stringify([sample('own'), sample('foreign', '42'), null]));
    mount();
    await rejectRead(matching('/api/sessions')[0]);
    expect(context.sessions.map(s => s?.id)).toEqual(['own']);
    localStorage.setItem('activeSessionTab', 'other-tab');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'activeSession_41', newValue: JSON.stringify(sample('foreign', '42')) })); });
    expect(context.currentSession).toBeNull();
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'activeSession_41', newValue: JSON.stringify(sample('own')) })); });
    expect(context.currentSession?.id).toBe('own');
  });
  it('retained callbacks and listeners cannot write after unmount; all owned timers/listeners are removed', async () => {
    const createdTimeout = vi.spyOn(globalThis, 'setTimeout');
    const createdInterval = vi.spyOn(globalThis, 'setInterval');
    const clearedTimeout = vi.spyOn(globalThis, 'clearTimeout');
    const clearedInterval = vi.spyOn(globalThis, 'clearInterval');
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const view = mount();
    await act(async () => { await context.startSession(); });
    const old = context;
    const stored = localStorage.getItem('activeSession_41');
    view.unmount();
    await old.saveSessionData();
    expect(localStorage.getItem('activeSession_41')).toBe(stored);
    // jsdom schedules native zero-delay storage notifications. First verify
    // every provider interval/notification timer was cleared, then deliver those events.
    for (const created of createdInterval.mock.results) expect(clearedInterval).toHaveBeenCalledWith(created.value);
    createdTimeout.mock.calls.forEach((args, index) => {
      if (Number(args[1]) > 0) expect(clearedTimeout).toHaveBeenCalledWith(createdTimeout.mock.results[index].value);
    });
    vi.advanceTimersByTime(0);
    expect(vi.getTimerCount()).toBe(0);
    for (const [type, callback] of addWindow.mock.calls.filter(([type]) => ['storage', 'beforeunload'].includes(type))) {
      expect(removeWindow.mock.calls.some(([removedType, removedCallback]) => removedType === type && removedCallback === callback)).toBe(true);
    }
    for (const [type, callback] of addDocument.mock.calls.filter(([type]) => type === 'visibilitychange')) {
      expect(removeDocument.mock.calls.some(([removedType, removedCallback]) => removedType === type && removedCallback === callback)).toBe(true);
    }
    expect(document.body.textContent).not.toContain('Workout session started');
    expect(reads.every(request => request.config?.signal?.aborted)).toBe(true);
  });
});
