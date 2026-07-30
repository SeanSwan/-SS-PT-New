/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ LAW 0 — "Train-first, two taps" (THE acceptance test).      │
 * │ Cold load with an assigned session → the first set commits  │
 * │ in ≤2 taps, 0 stage changes, 0 sheets. Here it is ONE tap:  │
 * │ the page lands on Train, the first incomplete exercise is   │
 * │ focused, its ghost-prefilled row exposes the log control    │
 * │ immediately, and a single tap commits the set + starts      │
 * │ rest. Any recipe/zone/interaction that breaks this is cut.  │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 LAW 0.          │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.setConfig({ testTimeout: 15000 });

const { apiPostMock, apiGetMock, navigateMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('./../../useOfflineQueue', () => ({
  useOfflineQueue: () => ({ isOnline: true, pendingCount: 0, queueSubmission: vi.fn(), flush: vi.fn() }),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '5', email: 'trainer@example.com', username: 'trainer',
      firstName: 'Sean', lastName: 'Swan', role: 'trainer',
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

vi.mock('./../../NASMExerciseRolodex', () => ({ default: () => null }));
vi.mock('../../../Shared/AITerminalPanel', () => ({ default: () => null }));

import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLogger from '../../WorkoutLogger';

const assignedSession = [
  {
    exerciseName: 'DB Bench Press', exerciseId: 'x1', formRating: null, painLevel: 0,
    performanceNotes: '',
    sets: [
      { setNumber: 1, weight: 100, reps: 0, rpe: null, formQuality: null, restTime: 60, tempo: '', notes: '' },
      { setNumber: 2, weight: 100, reps: 0, rpe: null, formQuality: null, restTime: 60, tempo: '', notes: '' },
    ],
  },
  {
    exerciseName: 'Incline Fly', exerciseId: 'x2', formRating: null, painLevel: 0,
    performanceNotes: '',
    sets: [
      { setNumber: 1, weight: 40, reps: 0, rpe: null, formQuality: null, restTime: 60, tempo: '', notes: '' },
    ],
  },
] as never;

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('LAW 0 — cold load → first set logged in ≤2 taps, nothing jumps', () => {
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

  it('assigned session: the first set commits in ONE tap — 0 stage changes, 0 sheets', async () => {
    render(
      <MemoryRouter>
        <WorkoutLogger clientId={91} initialData={assignedSession} />
      </MemoryRouter>,
    );

    // Cold landing truth: Train is selected, no dialog/sheet is open.
    expect(await screen.findByRole('tab', { name: /Train/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).toBeNull();

    // TAP 1: the first incomplete set's log control is ALREADY on screen.
    const logControls = await screen.findAllByRole('button', { name: 'Log set 1 and start rest timer' });
    fireEvent.click(logControls[0]);

    // The set committed (rest starts, the bar flips to its rest state).
    expect(await screen.findByRole('button', { name: 'Skip rest' })).toBeInTheDocument();

    // Still zero stage changes, zero sheets — the budget was ONE tap.
    expect(screen.getByRole('tab', { name: /Train/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
