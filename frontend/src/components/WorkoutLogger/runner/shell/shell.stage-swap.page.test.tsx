/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — page-level stage laws (Slice 3).            │
 * │ The REAL M2 proof, on the full WorkoutLogger:               │
 * │  · cold load lands on Train (Law 0 — no rail tap needed to  │
 * │    reach the add-exercise path)                             │
 * │  · stage swaps preserve exercises + Finish notes (view      │
 * │    state, not lifecycle)                                    │
 * │  · stage changes push NO history entries (anti-jump law 4)  │
 * │ Mock harness mirrors WorkoutLogger.submitSuccess.test.tsx.  │
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

import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from '../../WorkoutLogger';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const setup = async () => {
  render(<MemoryRouter><WorkoutLogger /></MemoryRouter>);
  return screen.findByRole('tablist', { name: 'Session stages' });
};

describe('page-level stage laws (M2 + Law 0)', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    window.localStorage.clear();
  });

  it('Law 0: cold load lands on Train — the add-exercise path needs NO rail tap', async () => {
    await setup();
    expect(screen.getByRole('tab', { name: /Train/ })).toHaveAttribute('aria-selected', 'true');
    // The Train canvas already offers the first-set path.
    expect(screen.getByText(/Add Your First Exercise/i)).toBeInTheDocument();
  });

  it('stage swaps preserve exercises and Finish notes — view state, not lifecycle', async () => {
    await setup();
    // Log content in Train.
    fireEvent.click(screen.getByText(/Add Your First Exercise/i));
    fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
    expect(screen.getAllByText(/Push-ups/).length).toBeGreaterThan(0);

    // Finish: type notes.
    fireEvent.click(screen.getByRole('tab', { name: /Finish/ }));
    const notes = screen.getByPlaceholderText(/session|notes/i);
    fireEvent.change(notes, { target: { value: 'strong session' } });

    // Storm: Setup → Train → Setup → Finish → Train → Finish.
    for (const name of [/Setup/, /Train/, /Setup/, /Finish/, /Train/, /Finish/]) {
      fireEvent.click(screen.getByRole('tab', { name }));
    }
    expect((screen.getByPlaceholderText(/session|notes/i) as HTMLTextAreaElement).value)
      .toBe('strong session');

    fireEvent.click(screen.getByRole('tab', { name: /Train/ }));
    expect(screen.getAllByText(/Push-ups/).length).toBeGreaterThan(0);
  });

  it('Setup stage hosts the plan-loading + location stubs; Train does not', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: /load today/i })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Setup/ }));
    expect(screen.getByRole('button', { name: /load today/i })).toBeInTheDocument();
  });

  it('anti-jump law 2: a stage swap moves focus to the canvas h2 and announces politely', async () => {
    await setup();
    fireEvent.click(screen.getByRole('tab', { name: /Setup/ }));
    const heading = screen.getByRole('heading', { level: 2, name: 'Setup' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText('Setup stage')).toBeInTheDocument(); // aria-live announcer
  });

  it('anti-jump law 4: stage changes push NO history entries', async () => {
    await setup();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    for (const name of [/Setup/, /Finish/, /Train/]) {
      fireEvent.click(screen.getByRole('tab', { name }));
    }
    expect(pushStateSpy).not.toHaveBeenCalled();
    pushStateSpy.mockRestore();
  });
});
