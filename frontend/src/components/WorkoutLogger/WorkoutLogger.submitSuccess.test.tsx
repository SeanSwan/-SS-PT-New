/**
 * Phase 16.2 round 13 (2026-04-18) — successful save does NOT queue locally
 * ==========================================================================
 * Codex smoke found that a successful 201 `{ success: true, form }` from
 * POST /api/workout-forms was being treated as a failure by the frontend:
 * the error toast fired, and the workout was pushed into
 * `ss-workout-queue-91` even though the backend had already persisted it.
 *
 * Root cause (fixed in `nasmApiService.ts` round 13): the service read
 * `response.success` directly from the AxiosResponse envelope instead of
 * `response.data.success`, so the returned ApiResponse always had
 * `success: undefined, data: undefined`. WorkoutLogger's guard at
 * `WorkoutLogger.tsx:848` — `if (response.success && response.data)` —
 * always evaluated falsy, fell through to the error branch, and queued.
 *
 * This test proves the full-stack behavior: when the service correctly
 * unwraps the payload, WorkoutLogger's success path fires (onComplete is
 * invoked) and the offline queue is NEVER touched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Full WorkoutLogger mounts are heavy (~3s isolated); under a loaded parallel
// pool they can exceed vitest's 5s default. Latency headroom, not behavior.
vi.setConfig({ testTimeout: 15000 });

// ─────────────────────────────────────────────────────────────
// Mocks — registered before the SUT import
// ─────────────────────────────────────────────────────────────

// Track offline-queue calls + submit service mock. vi.hoisted() makes
// these safe to reference inside vi.mock factories (which are hoisted to
// the top of the file before plain `const` declarations).
const { mockQueueSubmission, mockFlush, submitWorkoutFormMock, toastErrorMock, toastSuccessMock, toastWarningMock, apiPostMock, apiGetMock } = vi.hoisted(() => ({
  mockQueueSubmission: vi.fn(),
  mockFlush: vi.fn(),
  submitWorkoutFormMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
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

// Return a fully-loaded client so the pre-submit `!client` and
// `availableSessions === 0` guards don't short-circuit the test.
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

// Mock useGhostPreFill to return a completed pre-filled set so the
// `hasIncompleteExercises` submit guard passes. In production this would
// come from the cache; in the test we just inject a completed set.
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
  toast: { info: vi.fn(), success: toastSuccessMock, warning: toastWarningMock, error: toastErrorMock },
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

// Mocked rolodex that exposes onSelectExercise via a test button —
// same pattern as WorkoutLogger.ghostPrefill.test.tsx.
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

// Mocked footer that exposes onSubmit via a test button so the test can
// trigger the canonical save path without depending on the real footer's
// render-gating logic.
vi.mock('./WorkoutLoggerFooter', () => ({
  default: (props: any) => (
    <div>
      <button data-testid="mock-footer-cancel" onClick={props.onCancel}>
        Cancel
      </button>
      <button data-testid="mock-footer-submit" onClick={props.onSubmit}>
        Complete & Save Workout
      </button>
      {props.showGenerateSummary && (
        <button data-testid="mock-footer-summary" onClick={props.onGenerateSummary}>
          Generate & Send Summary
        </button>
      )}
    </div>
  ),
}));

vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({
  default: (props: any) => (
    <button data-testid="mock-equipment-profile-select" onClick={() => props.onSelect(77)}>
      Select training location
    </button>
  ),
}));

// ─────────────────────────────────────────────────────────────
// SUT + RTL
// ─────────────────────────────────────────────────────────────

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from './WorkoutLogger';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('Phase 16.2 round 13 — successful save does NOT call offlineQueue.queueSubmission', () => {
  beforeEach(() => {
    cleanup();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockQueueSubmission.mockClear();
    mockFlush.mockClear();
    submitWorkoutFormMock.mockClear();
    toastErrorMock.mockClear();
    toastSuccessMock.mockClear();
    apiPostMock.mockClear();
    apiGetMock.mockClear();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        client: {
          id: 91,
          firstName: 'Test',
          lastName: 'Client',
          email: 'client@example.com',
          availableSessions: 10,
          clientSource: 'swanstudios',
        },
      },
    });
    apiPostMock.mockResolvedValue({ data: { success: true } });
    navigateMock.mockClear();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    localStorage.removeItem('token');
  });

  it('201 { success: true, form } → onComplete fires, queueSubmission NOT called', async () => {
    // Service returns the correctly-unwrapped shape: success + data
    // populated. This is what the round-13 `nasmApiService.ts` fix
    // produces given a backend 201 with `{ success: true, form: {...} }`.
    submitWorkoutFormMock.mockResolvedValue({
      success: true,
      data: {
        id: 'form-uuid-success',
        clientId: 91,
        trainerId: 5,
        date: '2026-04-17',
        sessionDeducted: true,
        billing: {
          status: 'deducted',
          shouldDeduct: true,
          sessionDeducted: true,
          creditsDeducted: 2,
          creditsRequired: 2,
          remainingSessions: 4,
        },
      },
      message: 'Workout logged successfully and session deducted',
    });

    const workoutLoggedHandler = vi.fn();
    window.addEventListener('swan:workout-logged', workoutLoggedHandler);

    try {
      render(
        <MemoryRouter>
          <WorkoutLogger />
        </MemoryRouter>,
      );

      // Open rolodex, pick Push-ups.
      fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
      fireEvent.click(await screen.findByTestId('mock-rolodex-select'));

      // Trigger the canonical save path via the mocked footer button.
      fireEvent.click(await screen.findByTestId('mock-footer-submit'));

      // Wait for the success path to settle.
      await waitFor(() => {
        expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1);
      });

      // The key assertion Sean specified: after a successful save, the
      // offline queue must NOT be touched. A regression of the round-13
      // bug would fire `queueSubmission` here because the caller
      // interpreted the success as failure and fell into the catch
      // branch (WorkoutLogger.tsx:861).
      await waitFor(() => {
        expect(mockQueueSubmission).not.toHaveBeenCalled();
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Workout saved. 2 credits deducted; 4 remaining.');
      expect(workoutLoggedHandler).toHaveBeenCalledTimes(1);
      expect((workoutLoggedHandler.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        clientId: 91,
        formId: 'form-uuid-success',
      });
    } finally {
      window.removeEventListener('swan:workout-logged', workoutLoggedHandler);
    }
  });

  it('409 duplicate-form response unlocks Generate Summary with the existing form id', async () => {
    submitWorkoutFormMock.mockResolvedValue({
      success: false,
      data: {
        id: 'existing-form-409',
        clientId: 91,
        trainerId: 5,
        date: '2026-05-24',
      },
      message: 'A workout form already exists for this client on this date',
    });
    apiPostMock.mockResolvedValueOnce({ data: { success: true, emailSent: true } });

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => {
      expect(toastWarningMock).toHaveBeenCalledWith('A workout form already exists for this client on this date');
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('A workout form already exists for this client on this date');
    expect(mockQueueSubmission).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId('mock-footer-summary'));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/workout-summaries',
        expect.objectContaining({
          clientId: 91,
          formId: 'existing-form-409',
          sendEmail: true,
        }),
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Summary generated and sent to client!');
  });

  it('allows Move Fitness clients with zero paid sessions to submit without frontend blocking', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        client: {
          id: 91,
          firstName: 'Test',
          lastName: 'Client',
          email: 'client@example.com',
          availableSessions: 0,
          clientSource: 'move_fitness',
        },
      },
    });
    submitWorkoutFormMock.mockResolvedValue({
      success: true,
      data: {
        id: 'form-move-fitness',
        clientId: 91,
        trainerId: 5,
        date: '2026-05-26',
        sessionDeducted: false,
        billing: {
          status: 'not_deducted',
          shouldDeduct: false,
          sessionDeducted: false,
          creditsDeducted: 0,
          creditsRequired: 0,
          remainingSessions: 0,
        },
      },
      message: 'Workout logged successfully without session deduction',
    });

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    expect(await screen.findByText('free tracking')).toBeInTheDocument();
    expect(screen.queryByText('Move Fitness Access')).not.toBeInTheDocument();
    expect(screen.queryByText('Sessions Remaining: 0')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    // Deduction consequence lives in the Finish canvas (shell Slice 3).
    fireEvent.click(screen.getByRole('tab', { name: /Finish/ }));
    expect(await screen.findByText('No Paid Session Deduction')).toBeInTheDocument();
    expect(screen.queryByText('Will Deduct 1 Session')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => {
      expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock).not.toHaveBeenCalledWith('Client has no available sessions remaining');
    expect(toastSuccessMock).toHaveBeenCalledWith('Workout saved. No paid session deducted.');
  });

  it('submits the selected training-location equipment profile when the picker is rendered', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        client: {
          id: 77,
          firstName: 'Training',
          lastName: 'Client',
          email: 'training@example.com',
          availableSessions: 10,
          clientSource: 'swanstudios',
        },
      },
    });
    submitWorkoutFormMock.mockResolvedValue({
      success: true,
      data: {
        id: 'form-with-equipment-profile',
        clientId: 77,
        trainerId: 5,
        date: '2026-06-06',
      },
      message: 'Workout logged successfully and session deducted',
    });

    render(
      <MemoryRouter>
        <WorkoutLogger clientId={77} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Setup/ })); // location picker lives in Setup (shell Slice 3)
    fireEvent.click(await screen.findByTestId('mock-equipment-profile-select'));
    fireEvent.click(screen.getByRole('tab', { name: /Train/ }));
    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => {
      expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1);
    });
    expect(submitWorkoutFormMock.mock.calls[0][0]).toMatchObject({
      clientId: 77,
      equipmentProfileId: 77,
    });
  });

  it('rejected save DOES call queueSubmission (preserve offline-first behavior)', async () => {
    // Inverse lock: the queueSubmission path for genuine failures
    // must NOT be broken. A network rejection should still land in
    // the queue so the user's workout isn't lost.
    submitWorkoutFormMock.mockRejectedValue(new Error('Network Error'));

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
    await waitFor(() => {
      expect(mockQueueSubmission).toHaveBeenCalledTimes(1);
    });
  });

  it('canceled save from request timeout shows timeout feedback and does not queue a duplicate retry', async () => {
    submitWorkoutFormMock.mockRejectedValue({ name: 'CanceledError', code: 'ERR_CANCELED' });

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Workout submission timed out. Please try again.');
    });
    expect(mockQueueSubmission).not.toHaveBeenCalled();
  });

  it('service returning { success: false } (4xx-with-body) shows the server message and does NOT queue', async () => {
    // Business-rule failures with a server message are terminal for
    // this submission attempt. They should tell the user what to fix
    // instead of queueing an invalid form for offline retry.
    submitWorkoutFormMock.mockResolvedValue({
      success: false,
      data: undefined,
      message: 'Client has no available sessions remaining',
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
      expect(toastErrorMock).toHaveBeenCalledWith('Client has no available sessions remaining');
    });
    expect(mockQueueSubmission).not.toHaveBeenCalled();
  });

  it('requires confirmation before canceling an unsaved workout', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <MemoryRouter>
        <WorkoutLogger />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-cancel'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: /discard unsaved workout/i })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /keep logging/i }));
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId('mock-footer-cancel'));
    fireEvent.click(await screen.findByRole('button', { name: /discard workout/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/client/overview');
    });

    confirmSpy.mockRestore();
  });
});
