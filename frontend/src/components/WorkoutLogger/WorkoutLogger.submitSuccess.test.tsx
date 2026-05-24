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

// ─────────────────────────────────────────────────────────────
// Mocks — registered before the SUT import
// ─────────────────────────────────────────────────────────────

// Track offline-queue calls + submit service mock. vi.hoisted() makes
// these safe to reference inside vi.mock factories (which are hoisted to
// the top of the file before plain `const` declarations).
const { mockQueueSubmission, mockFlush, submitWorkoutFormMock } = vi.hoisted(() => ({
  mockQueueSubmission: vi.fn(),
  mockFlush: vi.fn(),
  submitWorkoutFormMock: vi.fn(),
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
    get = vi.fn().mockResolvedValue({
      data: {
        success: true,
        client: {
          id: 91,
          firstName: 'Test',
          lastName: 'Client',
          email: 'client@example.com',
          availableSessions: 10,
        },
      },
    });
    post = vi.fn().mockResolvedValue({ data: { success: true } });
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
  toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
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
      <button data-testid="mock-footer-submit" onClick={props.onSubmit}>
        Complete & Save Workout
      </button>
    </div>
  ),
}));

vi.mock('../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../Shared/EquipmentProfilePicker', () => ({ default: () => null }));

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
      },
      message: 'Workout logged successfully and session deducted',
    });

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

  it('service returning { success: false } (4xx-with-body) throws in caller and queues', async () => {
    // Anti-regression for the pre-round-13 shape where success/data
    // were both undefined. Now that the fix is in, a genuine
    // `{ success: false }` response must NOT be silently treated as
    // success — it must trigger the error branch which queues locally
    // so the user can retry once the issue is resolved.
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
      expect(mockQueueSubmission).toHaveBeenCalledTimes(1);
    });
  });
});
