import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Full WorkoutLogger mounts are heavy (~3s isolated); under a loaded parallel
// pool they can exceed vitest's 5s default. Latency headroom, not behavior.
vi.setConfig({ testTimeout: 15000 });

import WorkoutLogger from './WorkoutLogger';
import { APPLY_WORKOUT_EVENT, appendPendingWorkoutPlan, PENDING_WORKOUT_QUEUE_KEY } from '../../utils/parseAIWorkoutPlan';

const { apiGetMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastMock: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '88', email: 'trainer@example.com', username: 'trainer',
      firstName: 'Test', lastName: 'Trainer', role: 'trainer',
      isActive: true, createdAt: '', updatedAt: '',
    },
    isAuthenticated: true,
    loading: false,
    authAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    services: {},
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

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

vi.mock('../../services/nasmApiService', async () => {
  const actual = await vi.importActual<any>('../../services/nasmApiService');
  return {
    ...actual,
    dailyWorkoutFormService: {
      submitWorkoutForm: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
  };
});

vi.mock('../../services/pdfExportService', () => ({ exportWorkoutLoggerPDF: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: toastMock, ToastContainer: () => null }));
vi.mock('./useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    exercises: [], isLoading: false, error: null, searchQuery: '',
    setSearchQuery: vi.fn(), filteredExercises: [], refetch: vi.fn(),
  }),
}));
vi.mock('./NASMExerciseRolodex', () => ({ default: () => null }));
vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({ default: () => null }));
vi.mock('./WorkoutLoggerCoachTerminal', () => ({ default: () => null }));
vi.mock('./WorkoutPlanAssignmentPicker', () => ({ default: () => null }));

const CLIENT_ID = 99;

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

const currentPlanPayload = {
  data: {
    success: true,
    currentSession: {
      weekNumber: 1,
      dayNumber: 1,
      dayLabel: 'Active Plan Day',
      exercises: [
        { exerciseId: 'active-plan-row', exerciseName: 'Active Plan Row', sets: 2, targetReps: '8', restTime: 60 },
      ],
      session: { exercises: [] },
      totalWeeks: 12,
      totalSessionsThisWeek: 3,
      isLastSessionOfWeek: false,
      isLastWeek: false,
    },
    plan: { id: 'plan-active', name: 'Active Plan', days: [] },
  },
};

describe('WorkoutLogger Coach pending plan handoff', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) return Promise.resolve(currentPlanPayload);
      return Promise.resolve(defaultClientInfoPayload);
    });
  });

  it('loads the Coach-staged workout without also applying today\'s active plan', async () => {
    expect(appendPendingWorkoutPlan({
      source: 'ai-chat',
      exercises: [{ exerciseName: 'Coach Draft Row', sets: 3, reps: 10 }],
    })).toBe(true);

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=99&tab=training&trainingSection=logger&loadPlan=today']}>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Loaded 1 exercises from AI plan');
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(`/api/workout-forms/client/${CLIENT_ID}/info`);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const currentPlanReads = apiGetMock.mock.calls.filter(([url]) => url === `/api/workouts/${CLIENT_ID}/current`);
    expect(currentPlanReads).toHaveLength(0);
    expect(toastMock.success).not.toHaveBeenCalledWith(expect.stringContaining('Active Plan Day'));
  });
  it('does not apply a live Coach workout event before a logger client is resolved', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/log-workout?loadPlan=today']}>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent(new CustomEvent(APPLY_WORKOUT_EVENT, {
      detail: {
        source: 'ai-chat',
        exercises: [{ exerciseName: 'Unresolved Live Row', sets: 3, reps: 10 }],
      },
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastMock.success).not.toHaveBeenCalledWith('Applied 1 exercises from AI plan');
  });
  it('keeps a Coach-staged workout queued when the wrong client logger opens', async () => {
    expect(appendPendingWorkoutPlan({
      source: 'ai-chat',
      targetClientId: 123,
      exercises: [{ exerciseName: 'Wrong Client Draft Row', sets: 3, reps: 10 }],
    })).toBe(true);

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=99&tab=training&trainingSection=logger&loadPlan=today']}>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(`/api/workout-forms/client/${CLIENT_ID}/info`);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastMock.success).not.toHaveBeenCalledWith('Loaded 1 exercises from AI plan');
    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ targetClientId: 123 });
  });
});
