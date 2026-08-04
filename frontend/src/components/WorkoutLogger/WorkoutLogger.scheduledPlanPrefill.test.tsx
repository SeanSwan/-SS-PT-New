/**
 * WorkoutLogger scheduled-plan prefill regression.
 *
 * Locks the Client Hub / master-schedule handoff where a logger already
 * mounted without a scheduled session can later receive `sessionId` and must
 * treat the active plan assignment as a billable trainer session.
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

const { apiGetMock, submitWorkoutFormMock, toastMock } = vi.hoisted(() => ({
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
vi.mock('react-toastify', () => ({ toast: toastMock, ToastContainer: () => null }));
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

import { render, waitFor, cleanup, screen, fireEvent } from '@testing-library/react';
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

describe('WorkoutLogger scheduled-session plan prefill', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    apiGetMock.mockReset();
    submitWorkoutFormMock.mockReset();
    submitWorkoutFormMock.mockResolvedValue({ success: true, data: { id: 'form-scheduled', clientId: CLIENT_ID, date: '2026-06-15' } });
  });

  it('refreshes scheduled-session context and submits trainer-session plan metadata', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.endsWith('/current')) {
        return Promise.resolve({
          data: {
            success: true,
            currentSession: {
              weekNumber: 4,
              dayNumber: 2,
              dayLabel: 'Paid Session Day',
              exercises: [
                { exerciseId: 'fx-scheduled', exerciseName: 'Scheduled Loaded Squat', sets: 3, targetReps: '8', restTime: 90 },
              ],
              session: { exercises: [] },
            },
            todayAssignment: {
              assignmentKey: 'plan-6m:w4:d2:trainer_session',
              assignmentType: 'trainer_session',
              source: 'workout_plan',
              isBillable: true,
              shouldDeductSession: true,
              isLoggable: true,
              title: 'Trainer Floor Session',
              weekNumber: 4,
              dayNumber: 2,
              dayLabel: 'Paid Session Day',
              exerciseCount: 1,
              firstExerciseName: 'Scheduled Loaded Squat',
            },
            plan: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
            data: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
          },
        });
      }
      return Promise.resolve(clientInfoPayload);
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=99&tab=training&trainingSection=logger']}>
        <WorkoutLogger clientId={CLIENT_ID} loadTodayPlanSignal={1} scheduledSessionId={null} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith(
      expect.stringContaining('not loggable right now'),
    ));
    expect(toastMock.success).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=99&tab=training&trainingSection=logger&loadPlan=today&sessionId=314']}>
        <WorkoutLogger clientId={CLIENT_ID} loadTodayPlanSignal={2} scheduledSessionId="314" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const successMsg = toastMock.success.mock.calls.map((c) => c[0]).join(' | ');
    expect(successMsg).toMatch(/Week 4/);
    expect(successMsg).toMatch(/Paid Session Day/);
    expect(apiGetMock).toHaveBeenCalledWith(`/api/workouts/${CLIENT_ID}/current`);

    fireEvent.click(await screen.findByRole('button', { name: /complete and save workout/i }));

    await waitFor(() => expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1));
    expect(submitWorkoutFormMock.mock.calls[0][0]).toMatchObject({
      clientId: CLIENT_ID,
      scheduledSessionId: '314',
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:trainer_session',
        planId: 'plan-6m',
        assignmentType: 'trainer_session',
        source: 'workout_plan',
        isBillable: true,
        shouldDeductSession: true,
        weekNumber: 4,
        dayNumber: 2,
      },
    });
  });
});
