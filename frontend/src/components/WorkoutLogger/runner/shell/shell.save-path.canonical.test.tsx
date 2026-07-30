/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — canonical save-path pin (Slice 0).          │
 * │ THE crown-jewel gate of the strangler migration: the exact  │
 * │ POST /api/workout-forms payload is pinned here BEFORE any   │
 * │ shell code exists. Every shell slice (context bar, action   │
 * │ bar merge, stage rail…) must keep this green — the payload  │
 * │ the billing-sensitive backend receives stays byte-identical │
 * │ no matter which zone owns the Save button.                  │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §4 Slice 0.        │
 * │ Mock harness mirrors WorkoutLogger.submitSuccess.test.tsx.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.setConfig({ testTimeout: 15000 });

const {
  mockQueueSubmission, submitWorkoutFormMock, apiPostMock, apiGetMock, navigateMock,
} = vi.hoisted(() => ({
  mockQueueSubmission: vi.fn(),
  submitWorkoutFormMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('./../../useOfflineQueue', () => ({
  useOfflineQueue: () => ({
    isOnline: true, pendingCount: 0, queueSubmission: mockQueueSubmission, flush: vi.fn(),
  }),
}));

vi.mock('../../../../services/nasmApiService', async () => {
  const actual = await vi.importActual<any>('../../../../services/nasmApiService');
  return {
    ...actual,
    dailyWorkoutFormService: {
      submitWorkoutForm: submitWorkoutFormMock,
      generateWorkoutSummary: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '91', email: 'client@example.com', username: 'testclient',
      firstName: 'Test', lastName: 'Client', role: 'client',
      isActive: true, createdAt: '', updatedAt: '',
    },
    isAuthenticated: true, loading: false,
    authAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    services: {},
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../../../services/api.service', async () => {
  const actual = await vi.importActual<any>('../../../../services/api.service');
  class MockApiService {
    get = apiGetMock;
    post = apiPostMock;
    put = vi.fn().mockResolvedValue({ data: { success: true } });
    delete = vi.fn().mockResolvedValue({ data: { success: true } });
  }
  return { ...actual, ApiService: MockApiService, default: new MockApiService() };
});

vi.mock('./../../useGhostPreFill', () => ({
  useGhostPreFill: () => ({
    isLoading: false,
    fetchExerciseHistory: vi.fn(),
    getPreFill: () => null,
    getOverload: () => null,
    createPreFilledSet: (_name: string, setNumber: number) => ({
      setNumber, weight: 45, reps: 10, rpe: null, tempo: '', restTime: 60, formQuality: null, notes: '',
    }),
  }),
}));

vi.mock('../../../../services/pdfExportService', () => ({ exportWorkoutLoggerPDF: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ToastContainer: () => null,
}));

vi.mock('./../../useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    exercises: [], isLoading: false, error: null, searchQuery: '',
    setSearchQuery: vi.fn(), filteredExercises: [], refetch: vi.fn(),
  }),
}));

vi.mock('./../../NASMExerciseRolodex', () => ({
  default: (props: any) => {
    if (!props.isOpen) return null;
    return (
      <button
        data-testid='mock-rolodex-select'
        onClick={() => props.onSelectExercise({ id: 'e1', name: 'Push-ups' })}
      >
        Select Push-ups
      </button>
    );
  },
}));

vi.mock('./../../WorkoutLoggerFooter', () => ({
  default: (props: any) => (
    <button data-testid='mock-footer-submit' onClick={props.onSubmit}>Complete & Save Workout</button>
  ),
}));

vi.mock('../../../Shared/AITerminalPanel', () => ({ default: () => null }));
vi.mock('../../../Shared/EquipmentProfilePicker', () => ({
  default: (props: any) => (
    <button data-testid='mock-equipment-profile-select' onClick={() => props.onSelect(77)}>
      Select training location
    </button>
  ),
}));

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from '../../WorkoutLogger';
import { normalizeWorkoutDate } from '../../WorkoutLogger.helpers';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('canonical save-path pin — the payload the shell must never change', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    submitWorkoutFormMock.mockReset();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        client: {
          id: 91, firstName: 'Test', lastName: 'Client', email: 'client@example.com',
          availableSessions: 10, clientSource: 'swanstudios',
        },
      },
    });
    apiPostMock.mockResolvedValue({ data: { success: true } });
    submitWorkoutFormMock.mockResolvedValue({
      success: true,
      data: { id: 'form-pin', clientId: 91, trainerId: 5, date: '2026-07-30' },
      message: 'Workout logged successfully',
    });
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    window.localStorage.clear();
  });

  it('minimal session: the EXACT wire body — keys, shapes, omissions — is pinned', async () => {
    render(<MemoryRouter><WorkoutLogger /></MemoryRouter>);

    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1));

    // toEqual is STRICT on key presence: an extra key, a renamed key, or a
    // no-longer-omitted null all fail here. This is the byte-shape contract.
    expect(submitWorkoutFormMock.mock.calls[0][0]).toEqual({
      clientId: 91,
      date: normalizeWorkoutDate(null),
      exercises: [
        {
          exerciseId: 'e1',
          exerciseName: 'Push-ups',
          painLevel: 0,
          performanceNotes: '',
          sets: [
            { setNumber: 1, weight: 45, reps: 10, tempo: '', restTime: 60, notes: '' },
          ],
        },
      ],
      sessionNotes: '',
    });
  });

  it('optional-key contract: equipment profile rides the wire ONLY when picked', async () => {
    // Trainer-logging shape (clientId ≠ viewer) — self mode hides the picker.
    apiGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        client: {
          id: 77, firstName: 'Training', lastName: 'Client', email: 'training@example.com',
          availableSessions: 10, clientSource: 'swanstudios',
        },
      },
    });
    render(<MemoryRouter><WorkoutLogger clientId={77} /></MemoryRouter>);

    fireEvent.click(await screen.findByTestId('mock-equipment-profile-select'));
    fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByTestId('mock-footer-submit'));

    await waitFor(() => expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1));
    const body = submitWorkoutFormMock.mock.calls[0][0];
    expect(body.equipmentProfileId).toBe(77);
    // Untouched optionals stay OMITTED — never serialized as null.
    expect('overallIntensity' in body).toBe(false);
    expect('scheduledSessionId' in body).toBe(false);
    expect('plannedAssignment' in body).toBe(false);
  });
});
