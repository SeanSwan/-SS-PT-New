/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — recipe wiring (Slice 6).                    │
 * │ M4: recipes are DATA driving zone chrome, never new IA.     │
 * │ Proven here on the live page: Ledger Pro = segmented rail + │
 * │ expanded Train stats strip; Focus Flow = tab rail + stats   │
 * │ collapsed into the context bar's 2 numbers. Same zones,     │
 * │ same copy, same tap budget — only arrangement changes.      │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 M4 + §4.6.      │
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
import { writeRunnerStyle } from '../../runner/runnerStyles';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const mountWithExercise = async () => {
  render(<MemoryRouter><WorkoutLogger /></MemoryRouter>);
  fireEvent.click(await screen.findByText(/Add Your First Exercise/i));
  fireEvent.click(await screen.findByTestId('mock-rolodex-select'));
};

describe('recipe wiring — data drives chrome, never IA (M4)', () => {
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

  it('Focus Flow (default): tab rail, Train stats collapsed into the context bar', async () => {
    writeRunnerStyle('focus-flow');
    await mountWithExercise();
    const rail = screen.getByRole('tablist', { name: 'Session stages' });
    expect(rail).toHaveAttribute('data-rail-variant', 'tabs');
    // Stats live in the context bar's 2 numbers — no Train strip.
    expect(document.querySelector('[data-shell-zone="canvas"] [aria-label="Session statistics"]')).toBeNull();
  });

  it('Ledger Pro (power view): segmented rail + expanded Train stats strip', async () => {
    writeRunnerStyle('ledger-pro');
    await mountWithExercise();
    const rail = screen.getByRole('tablist', { name: 'Session stages' });
    expect(rail).toHaveAttribute('data-rail-variant', 'segmented');
  });

  it('recipe swap changes CHROME only — the same zones exist under every recipe', async () => {
    for (const style of ['focus-flow', 'ledger-pro', 'sheet-stack'] as const) {
      cleanup();
      writeRunnerStyle(style);
      await mountWithExercise();
      expect(screen.getByRole('tablist', { name: 'Session stages' })).toBeInTheDocument();
      expect(document.querySelector('[data-shell-zone="context-bar"]')).not.toBeNull();
      expect(document.querySelector('[data-shell-zone="action-bar"]')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Complete and save workout' })).toBeInTheDocument();
    }
  });
});
