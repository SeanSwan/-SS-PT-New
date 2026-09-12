/**
 * FILE: WorkoutLogger.sessionTruth.test.tsx
 * PURPOSE: Regression lock for the session-credit truthfulness fix (hostile
 *          audit 2026-09-12 P0-2). When the client-info fetch fails, the
 *          logger used to fabricate `availableSessions: 0`, so a transient
 *          API error mid-workout hard-blocked the save with "Client has no
 *          available sessions remaining" — a billing lie caused by a network
 *          hiccup. The truth contract:
 *            1. unknown balance renders as "Balance unverified", never "0";
 *            2. submit stays allowed (the server is authoritative) with a
 *               verification warning, never the billing-error block.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockQueueSubmission, mockFlush, submitWorkoutFormMock, toastErrorMock, toastSuccessMock, toastWarningMock, toastInfoMock, apiPostMock, apiGetMock } = vi.hoisted(() => ({
  mockQueueSubmission: vi.fn(),
  mockFlush: vi.fn(),
  submitWorkoutFormMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
  toastInfoMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
}));

vi.mock('./useOfflineQueue', () => ({
  useOfflineQueue: () => ({
    isOnline: true,
    pendingCount: 0,
    queueSubmission: mockQueueSubmission,
    flush: mockFlush,
  }),
}));

vi.mock('../../services/nasmApiService', async () => {
  const actual = await vi.importActual<any>('../../services/nasmApiService');
  return {
    ...actual,
    dailyWorkoutFormService: {
      submitWorkoutForm: submitWorkoutFormMock,
      generateWorkoutSummary: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '91',
      email: 'client@example.com',
      username: 'testclient',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
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

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// The info fetch is driven per-test; submit-side endpoints stay successful.
vi.mock('../../services/api.service', async () => {
  const actual = await vi.importActual<any>('../../services/api.service');
  class MockApiService {
    get = apiGetMock;
    post = apiPostMock;
    put = vi.fn().mockResolvedValue({ data: { success: true } });
    delete = vi.fn().mockResolvedValue({ data: { success: true } });
  }
  return { ...actual, ApiService: MockApiService, default: new MockApiService() };
});

vi.mock('./useGhostPreFill', () => ({
  useGhostPreFill: () => ({
    isLoading: false,
    fetchExerciseHistory: vi.fn(),
    getPreFill: () => null,
    getOverload: () => null,
    createPreFilledSet: (_name: string, setNumber: number) => ({
      setNumber,
      weight: 45,
      reps: 10,
      rpe: null,
      tempo: '',
      restTime: 60,
      formQuality: null,
      notes: '',
    }),
  }),
}));

vi.mock('../../services/pdfExportService', () => ({
  exportWorkoutLoggerPDF: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: { info: toastInfoMock, success: toastSuccessMock, warning: toastWarningMock, error: toastErrorMock },
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

vi.mock('./NASMExerciseRolodex', () => ({
  default: (props: any) => {
    if (!props.isOpen) return null;
    return (
      <button
        data-testid="mock-rolodex-select"
        onClick={() => props.onSelectExercise({ id: 'e1', name: 'Push-ups' })}
      >
        Select Push-ups
      </button>
    );
  },
}));

vi.mock('./WorkoutLoggerFooter', () => ({
  default: (props: any) => (
    <div>
      <button data-testid="mock-footer-cancel" onClick={props.onCancel}>
        Cancel
      </button>
      <button data-testid="mock-footer-submit" onClick={props.onSubmit}>
        Complete & Save Workout
      </button>
    </div>
  ),
}));

vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({ default: () => null }));

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from './WorkoutLogger';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('WorkoutLogger session-credit truthfulness (audit 2026-09-12 P0-2)', () => {
  beforeEach(() => {
    cleanup();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockQueueSubmission.mockClear();
    mockFlush.mockClear();
    submitWorkoutFormMock.mockClear();
    toastErrorMock.mockClear();
    toastSuccessMock.mockClear();
    toastWarningMock.mockClear();
    toastInfoMock.mockClear();
    apiPostMock.mockClear();
    apiGetMock.mockClear();
    apiPostMock.mockResolvedValue({ data: { success: true } });
    navigateMock.mockClear();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    localStorage.removeItem('token');
  });

  it('a failed client-info fetch never fabricates "0 paid sessions" — the header badge says unverified', async () => {
    apiGetMock.mockRejectedValue(new Error('network down'));

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalled();
    });
    expect(await screen.findByText(/balance unverified/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 paid sessions/i)).not.toBeInTheDocument();
  });

  it('a failed client-info fetch must NOT block the save as "no available sessions remaining"', async () => {
    apiGetMock.mockRejectedValue(new Error('network down'));
    submitWorkoutFormMock.mockResolvedValue({
      success: true,
      data: {
        id: 'form-truth',
        clientId: 91,
        trainerId: 5,
        date: '2026-09-12',
      },
      message: 'Workout logged successfully! Progress updated.',
    });

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => {
      expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('Client has no available sessions remaining');
    expect(mockQueueSubmission).not.toHaveBeenCalled();
  });
});
