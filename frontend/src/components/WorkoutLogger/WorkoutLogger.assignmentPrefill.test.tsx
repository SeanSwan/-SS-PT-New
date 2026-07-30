/**
 * WorkoutLogger assignment-prefill regression.
 *
 * Locks the off-day homework path where the client read model provides
 * loggable exercises on todayAssignment even when currentSession is absent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Full WorkoutLogger mounts are heavy (~3s isolated); under a loaded parallel
// pool they can exceed vitest's 5s default. Latency headroom, not behavior.
vi.setConfig({ testTimeout: 15000 });

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '88',
      email: 'trainer@example.test',
      username: 'trainer',
      firstName: 'Test',
      lastName: 'Trainer',
      role: 'trainer',
      isActive: true,
      createdAt: '',
      updatedAt: '',
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

const { apiGetMock, toastMock, submitWorkoutFormMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  submitWorkoutFormMock: vi.fn(),
  toastMock: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/nasmApiService', async () => {
  const actual = await vi.importActual<any>('../../services/nasmApiService');
  return {
    ...actual,
    dailyWorkoutFormService: {
      submitWorkoutForm: submitWorkoutFormMock,
    },
  };
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

vi.mock('../../services/pdfExportService', () => ({ exportWorkoutLoggerPDF: vi.fn() }));

vi.mock('react-toastify', () => ({
  toast: toastMock,
  ToastContainer: () => null,
}));

vi.mock('./useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    exercises: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filteredExercises: [],
    refetch: vi.fn(),
  }),
}));

vi.mock('./NASMExerciseRolodex', () => ({ default: () => null }));
vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({ default: () => null }));

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from './WorkoutLogger';

const CLIENT_ID = 99;

const clientInfoPayload = {
  data: {
    success: true,
    client: {
      id: CLIENT_ID,
      firstName: 'Test',
      lastName: 'Client',
      email: 'client@example.test',
      availableSessions: 5,
      phone: '',
      hasWorkoutToday: false,
    },
  },
};

describe('WorkoutLogger assignment-level homework prefill', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    apiGetMock.mockReset();
    submitWorkoutFormMock.mockResolvedValue({ success: true, data: { id: 'form-1' } });
  });

  it('loads todayAssignment.exercises when currentSession is absent', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve({
          data: {
            success: true,
            currentSession: null,
            todayAssignment: {
              assignmentKey: 'plan-6m:w4:d2:homework',
              assignmentType: 'homework',
              source: 'workout_plan',
              isBillable: false,
              shouldDeductSession: false,
              isLoggable: true,
              title: 'Off-Day Lower Homework',
              weekNumber: 4,
              dayNumber: 2,
              dayLabel: 'Lower Body',
              exerciseCount: 1,
              firstExerciseName: 'Goblet Squat',
              exercises: [
                {
                  exerciseId: 'goblet-squat',
                  exerciseName: 'Goblet Squat',
                  sets: 3,
                  targetReps: '10',
                  tempo: '3-1-1',
                  restTime: 60,
                },
              ],
            },
            plan: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
            data: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
          },
        });
      }
      return Promise.resolve(clientInfoPayload);
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // plan loaders live in Setup (shell Slice 3)
    fireEvent.click(await screen.findByRole('button', { name: /load today/i }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(toastMock.info).not.toHaveBeenCalledWith(expect.stringContaining('No active workout plan'));
    expect(toastMock.success.mock.calls.map((call) => call[0]).join(' | ')).toMatch(/Off-Day Lower Homework/);

    fireEvent.click(await screen.findByRole('button', { name: /complete & save workout/i }));

    await waitFor(() => expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1));
    expect(submitWorkoutFormMock.mock.calls[0][0]).toMatchObject({
      clientId: CLIENT_ID,
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
    });
  });

  it('refuses route-prefilled homework when the current assignment no longer matches', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve({
          data: {
            success: true,
            currentSession: null,
            todayAssignment: {
              assignmentKey: 'plan-6m:w4:d3:homework',
              assignmentType: 'homework',
              source: 'workout_plan',
              isBillable: false,
              shouldDeductSession: false,
              isLoggable: true,
              title: 'Updated Off-Day Homework',
              weekNumber: 4,
              dayNumber: 3,
              dayLabel: 'Posterior Chain',
              exerciseCount: 1,
              firstExerciseName: 'Romanian Deadlift',
              exercises: [
                {
                  exerciseId: 'romanian-deadlift',
                  exerciseName: 'Romanian Deadlift',
                  sets: 3,
                  targetReps: '8',
                  tempo: '3-1-1',
                  restTime: 75,
                },
              ],
            },
            plan: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
            data: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
          },
        });
      }
      return Promise.resolve(clientInfoPayload);
    });

    render(
      <MemoryRouter
        initialEntries={[
          '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw4%3Ad2%3Ahomework&assignmentType=homework',
        ]}
      >
        <WorkoutLogger clientId={CLIENT_ID} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith(
      expect.stringMatching(/assignment changed/i),
    ));
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(submitWorkoutFormMock).not.toHaveBeenCalled();
  });
});
