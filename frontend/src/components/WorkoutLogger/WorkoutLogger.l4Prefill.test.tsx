/**
 * L4 (2026-05-02) — WorkoutLogger plan pre-fill test
 * ====================================================
 *
 * Locks in the Long-Horizon L4 contract: when the user clicks
 * "Load Today's Plan", the logger MUST prefer the cursor-driven
 * `currentSession.exercises[]` over the legacy day-of-week match
 * against `plan.days[]`.
 *
 * Two branches under test:
 *   1. cursor path  — response has currentSession.exercises[] populated.
 *      Toast must announce "Week N — DayLabel" and the prefilled
 *      exercises must come from currentSession, not plan.days[].
 *
 *   2. fallback path — response has currentSession=null but plan.days[]
 *      populated. Toast must announce "{day}'s plan" (legacy behavior).
 *
 * The test mocks ApiService and toast — the assertion lives on toast
 * + on the rendered exercise card text (the SUT's only public surface
 * for "what was prefilled").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Full WorkoutLogger mounts are heavy (~3s isolated); under a loaded parallel
// pool they can exceed vitest's 5s default. Latency headroom, not behavior.
vi.setConfig({ testTimeout: 15000 });

// ─────────────────────────────────────────────────────────────
// Mocks (must precede SUT import for vi.mock hoisting)
// ─────────────────────────────────────────────────────────────

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '88', email: 'trainer@example.com', username: 'trainer',
      firstName: 'Test', lastName: 'Trainer', role: 'trainer',
      isActive: true, createdAt: '', updatedAt: '',
    },
    isAuthenticated: true, loading: false,
    authAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    services: {},
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../services/nasmApiService', async () => {
  const actual = await vi.importActual<any>('../../services/nasmApiService');
  return {
    ...actual,
    dailyWorkoutFormService: {
      submitWorkoutForm: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
  };
});

// vi.mock calls are hoisted to the top of the file by Vitest, so any
// in-scope identifiers they reference must come from `vi.hoisted` rather
// than plain `const`. (See https://vitest.dev/api/vi.html#vi-hoisted.)
const { apiGetMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastMock: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/api.service', async () => {
  const actual = await vi.importActual<any>('../../services/api.service');
  class MockApiService {
    get = apiGetMock;
    post = vi.fn().mockResolvedValue({ data: { success: true } });
    put = vi.fn().mockResolvedValue({ data: { success: true } });
    delete = vi.fn().mockResolvedValue({ data: { success: true } });
  }
  return { ...actual, ApiService: MockApiService, default: new MockApiService() };
});

vi.mock('../../services/pdfExportService', () => ({ exportWorkoutLoggerPDF: vi.fn() }));

vi.mock('react-toastify', () => ({
  toast: toastMock,
  ToastContainer: () => null,
}));

vi.mock('./useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    exercises: [], isLoading: false, error: null, searchQuery: '',
    setSearchQuery: vi.fn(), filteredExercises: [], refetch: vi.fn(),
  }),
}));

vi.mock('./NASMExerciseRolodex', () => ({ default: () => null }));
vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({ default: () => null }));

// ─────────────────────────────────────────────────────────────
// SUT + RTL
// ─────────────────────────────────────────────────────────────

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from './WorkoutLogger';

const CLIENT_ID = 99;

// Default ApiService.get behavior — answers the client-info call with a
// minimal payload, lets each test override the /current branch via
// `apiGetMock.mockImplementation(...)`.
const defaultClientInfoPayload = {
  data: {
    success: true,
    client: {
      id: CLIENT_ID,
      firstName: 'Test',
      lastName: 'Client',
      email: 'tc@example.com',
      availableSessions: 5,
      phone: '',
      hasWorkoutToday: false,
    },
  },
};

const buildCurrentResponse = (body: any) => ({ data: body });

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  apiGetMock.mockReset();
});

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('L4 — WorkoutLogger.loadTodaysPlan prefers currentSession.exercises', () => {
  it('uses cursor-driven currentSession.exercises and announces "Week N — DayLabel"', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: {
            weekNumber: 3,
            dayNumber: 2,
            dayLabel: 'Week 3 Day 2: pull',
            session: { exercises: [{ exerciseId: 'fx-row', exerciseName: 'Row' }] },
            exercises: [
              { exerciseId: 'fx-row', exerciseName: 'Row', sets: 3, targetReps: '10-12', restTime: 60 },
              { exerciseId: 'fx-pullup', exerciseName: 'Pull-Up', sets: 3, targetReps: '5-8', restTime: 90 },
            ],
            totalWeeks: 24, totalSessionsThisWeek: 4,
            isLastSessionOfWeek: false, isLastWeek: false,
          },
          // Also has the legacy day-of-week shape — must NOT be used
          // when currentSession has populated exercises.
          plan: {
            id: 'plan-A', name: 'Plan A',
            days: [{ dayNumber: 1, dayName: 'Sunday', exercises: [
              { exerciseId: 'wrong-1', exerciseName: 'WRONG_FALLBACK_DAY', sets: 1, reps: '1' },
            ]}],
            currentSession: null,
          },
          data: { id: 'plan-A', name: 'Plan A', days: [], plan: null, currentSession: null },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    const loadBtn = await screen.findByRole('button', { name: /load today/i });
    fireEvent.click(loadBtn);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(/Week 3/);
    expect(successMsg).toMatch(/Week 3 Day 2: pull/);
    expect(successMsg).toMatch(/2 exercises/);
    // Legacy day-of-week branch must NOT have fired.
    expect(toastMock.info).not.toHaveBeenCalledWith(expect.stringContaining('No exercises'));
    expect(successMsg).not.toContain('WRONG_FALLBACK_DAY');
  });

  it('auto-loads today plan from the client start-workout route intent', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: {
            weekNumber: 4,
            dayNumber: 1,
            dayLabel: 'Auto Start Day',
            exercises: [
              { exerciseId: 'fx-auto', exerciseName: 'Auto Loaded Row', sets: 2, targetReps: '8', restTime: 75 },
            ],
            session: { exercises: [] },
            totalWeeks: 12,
            totalSessionsThisWeek: 3,
            isLastSessionOfWeek: false,
            isLastWeek: false,
          },
          plan: { id: 'plan-auto', name: 'Auto Plan', days: [] },
          data: { id: 'plan-auto', name: 'Auto Plan', days: [] },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/client/log-workout?loadPlan=today']}>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(/Week 4/);
    expect(successMsg).toMatch(/Auto Start Day/);
    expect(successMsg).toMatch(/1 exercises/);
    expect(apiGetMock).toHaveBeenCalledWith(`/api/workouts/${CLIENT_ID}/current`);
  });

  it('auto-loads today plan from the embedded Client Hub saved-plan signal', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: {
            weekNumber: 6,
            dayNumber: 4,
            dayLabel: 'Embedded Plan Day',
            exercises: [
              { exerciseId: 'fx-embedded', exerciseName: 'Embedded Loaded Press', sets: 3, targetReps: '10', restTime: 90 },
            ],
            session: { exercises: [] },
            totalWeeks: 26,
            totalSessionsThisWeek: 4,
            isLastSessionOfWeek: false,
            isLastWeek: false,
          },
          plan: { id: 'plan-embedded', name: 'Embedded Plan', days: [] },
          data: { id: 'plan-embedded', name: 'Embedded Plan', days: [] },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=99&tab=training&trainingSection=plans']}>
        <WorkoutLogger clientId={CLIENT_ID} loadTodayPlanSignal={1} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(/Week 6/);
    expect(successMsg).toMatch(/Embedded Plan Day/);
    expect(successMsg).toMatch(/1 exercises/);
    expect(apiGetMock).toHaveBeenCalledWith(`/api/workouts/${CLIENT_ID}/current`);
  });

  it('falls back to legacy day-of-week match when currentSession is null', async () => {
    // The legacy branch resolves the day name via `new Date().getDay()`,
    // so the response fixture seeds `dayName` from whatever today's
    // system clock reports. We assert structural shape (day name appears,
    // and Week-N format does NOT) rather than pinning the calendar.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[new Date().getDay()];

    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: null,                       // cursor unavailable
          plan: {
            id: 'plan-B', name: 'Plan B',
            days: [
              { dayNumber: 1, dayName: todayName, exercises: [
                { exerciseId: 'fx-legacy-1', exerciseName: 'LegacyExercise', sets: 3, reps: '10' },
              ]},
            ],
            currentSession: null,
          },
          data: { id: 'plan-B', name: 'Plan B', days: [], plan: null, currentSession: null },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    const loadBtn = await screen.findByRole('button', { name: /load today/i });
    fireEvent.click(loadBtn);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(new RegExp(`${todayName}'s plan`));
    expect(successMsg).not.toMatch(/Week \d+ —/);
  });

  it('shows the no-active-plan toast when neither currentSession nor plan.days[] are usable', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: null,
          plan: null,
          data: null,
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    const loadBtn = await screen.findByRole('button', { name: /load today/i });
    fireEvent.click(loadBtn);

    await waitFor(() => expect(toastMock.info).toHaveBeenCalled());
    const infoMsg = toastMock.info.mock.calls.map((c) => c[0]).join(' | ');
    expect(infoMsg).toMatch(/No active workout plan/);
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('reads cursor from data.data.currentSession when top-level is missing (round-2 fallback)', async () => {
    // L4 round-2 (Codex 2026-05-02 final review LOW): defensive
    // fallback chain. The backend currently emits `currentSession`
    // at THREE levels (top, data, plan) all deep-equal post-JSON.
    // If a future tweak ever drops the top-level copy, this test
    // proves the consumer survives by falling through to data.data
    // (and then data.plan).
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          // No top-level currentSession.
          plan: { id: 'plan-Z', name: 'Plan Z', days: [] },
          data: {
            id: 'plan-Z', name: 'Plan Z', days: [],
            currentSession: {
              weekNumber: 5, dayNumber: 3, dayLabel: 'Mid-Plan Day',
              session: { exercises: [{ exerciseId: 'fx-from-data', exerciseName: 'FromData' }] },
              exercises: [
                { exerciseId: 'fx-from-data', exerciseName: 'FromData', sets: 3, targetReps: '10', restTime: 60 },
              ],
              totalWeeks: 24, totalSessionsThisWeek: 4,
              isLastSessionOfWeek: false, isLastWeek: false,
            },
          },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    const loadBtn = await screen.findByRole('button', { name: /load today/i });
    fireEvent.click(loadBtn);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(/Week 5 — Mid-Plan Day/);
    expect(successMsg).toMatch(/1 exercises/);
  });

  it('treats currentSession.exercises=[] as empty and falls through to legacy match', async () => {
    // Empty cursor must not block the fallback — an empty array is not
    // a hit. Pin the legacy day to today so the regex assertion holds
    // regardless of the test machine's calendar.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[new Date().getDay()];

    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve(buildCurrentResponse({
          success: true,
          currentSession: {
            weekNumber: 1, dayNumber: 1, dayLabel: 'Day 1',
            session: { exercises: [] }, exercises: [],
            totalWeeks: 1, totalSessionsThisWeek: 0,
            isLastSessionOfWeek: true, isLastWeek: true,
          },
          plan: {
            id: 'plan-C', name: 'Plan C',
            days: [{ dayNumber: 1, dayName: todayName, exercises: [
              { exerciseId: 'fx-fallback', exerciseName: 'FallbackEx', sets: 3, reps: '10' },
            ]}],
          },
        }));
      }
      return Promise.resolve(defaultClientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    const loadBtn = await screen.findByRole('button', { name: /load today/i });
    fireEvent.click(loadBtn);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(new RegExp(`${todayName}'s plan`));
    expect(successMsg).not.toMatch(/Week 1 —/);
  });
});
