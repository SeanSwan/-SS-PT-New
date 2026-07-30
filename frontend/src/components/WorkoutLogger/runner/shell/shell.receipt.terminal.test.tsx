/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Receipt terminal state (Slice 5).           │
 * │ Post-save is a TERMINAL state, not a stage: the rail is NOT │
 * │ navigable (it unmounts), the canvas is replaced by the      │
 * │ proven SaveSuccessPanel (reused, new placement), and the    │
 * │ action bar shows the earned Saved marker.                   │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 6 Receipt. │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.setConfig({ testTimeout: 15000 });

const { submitWorkoutFormMock, apiPostMock, apiGetMock, navigateMock } = vi.hoisted(() => ({
  submitWorkoutFormMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('./../../useOfflineQueue', () => ({
  useOfflineQueue: () => ({ isOnline: true, pendingCount: 0, queueSubmission: vi.fn(), flush: vi.fn() }),
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

vi.mock('../../../Shared/AITerminalPanel', () => ({ default: () => null }));

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from '../../WorkoutLogger';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('Receipt terminal state', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    submitWorkoutFormMock.mockReset();
    apiGetMock.mockReset();
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
      data: { id: 'form-receipt', clientId: 91, trainerId: 5, date: '2026-07-30' },
      message: 'Workout logged successfully',
    });
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    window.localStorage.clear();
  });

  it('after save: the rail unmounts (not navigable), the canvas becomes the receipt', async () => {
    render(<MemoryRouter><WorkoutLogger /></MemoryRouter>);

    expect(await screen.findByRole('tablist', { name: 'Session stages' })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    fireEvent.click(await screen.findByRole('button', { name: 'Complete and save workout' }));

    await waitFor(() => expect(submitWorkoutFormMock).toHaveBeenCalledTimes(1));

    // Terminal: no stage rail, no runner canvas — the receipt owns the page.
    await waitFor(() => {
      expect(screen.queryByRole('tablist', { name: 'Session stages' })).toBeNull();
    });
    expect(screen.getByText(/Saved/)).toBeInTheDocument(); // bar marker
    // The proven SaveSuccessPanel is the receipt body (reused, new placement).
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
  });
});
