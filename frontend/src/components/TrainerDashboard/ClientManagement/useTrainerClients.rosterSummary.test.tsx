/**
 * useTrainerClients — batched roster summary consumption tests
 * ============================================================
 * Slice 1 trainer-truth-feeds (2026-09-12 dual hostile review, findings
 * A1/A7/A8): when the assignments endpoint carries client.rosterSummary,
 * the hook must use its all-time numbers and skip the per-client
 * history/upcoming fan-out; when a legacy fetch fails, the hook must mark
 * stats unknown (null) instead of fabricating zeros.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authAxiosGet = vi.fn();
  return {
    authAxiosGet,
    authContext: {
      user: { id: 7, role: 'trainer' },
      authAxios: { get: authAxiosGet },
    },
    globalClientContext: {
      clientList: [],
      loadingClients: false,
    },
    toast: vi.fn(),
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mocks.authContext,
}));

vi.mock('../../../context/GlobalClientContext', () => ({
  useGlobalClient: () => mocks.globalClientContext,
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { useTrainerClients } from './useTrainerClients';

const assignmentWithSummary = {
  id: 'assignment-1',
  status: 'active',
  assignedAt: '2026-05-01T12:00:00.000Z',
  client: {
    id: '91',
    firstName: 'Real',
    lastName: 'Numbers',
    email: 'real-numbers@example.com',
    clientSource: 'swanstudios',
    fitnessGoal: 'Strength and mobility',
    trainingExperience: 'beginner',
    createdAt: '2026-04-01T12:00:00.000Z',
    rosterSummary: {
      totalCompletedSessions: 23,
      lastSessionDate: '2026-09-10T09:00:00.000Z',
      nextSessionDate: null,
    },
  },
};

const assignmentWithoutSummary = {
  id: 'assignment-2',
  status: 'active',
  assignedAt: '2026-05-01T12:00:00.000Z',
  client: {
    id: '92',
    firstName: 'Legacy',
    lastName: 'Fanout',
    email: 'legacy-fanout@example.com',
    clientSource: 'swanstudios',
    createdAt: '2026-04-01T12:00:00.000Z',
  },
};

describe('useTrainerClients roster summary consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the batched rosterSummary all-time numbers and fires no per-client fan-out requests', async () => {
    mocks.authAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/client-trainer-assignments/trainer/7') {
        return Promise.resolve({ data: { assignments: [assignmentWithSummary] } });
      }
      return Promise.reject(new Error(`unexpected fan-out call: ${url}`));
    });

    const { result } = renderHook(() => useTrainerClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authAxiosGet).toHaveBeenCalledTimes(1);
    expect(mocks.authAxiosGet).toHaveBeenCalledWith('/api/client-trainer-assignments/trainer/7');
    expect(result.current.stats.completedSessions).toBe(23);
    expect(result.current.stats.loggedClients).toBe(1);
    expect(result.current.filteredClients[0]?.client.totalSessionsCompleted).toBe(23);
    expect(result.current.filteredClients[0]?.client.lastSessionDate).toBe('2026-09-10T09:00:00.000Z');
  });

  it('marks stats unknown (null), not fabricated zeros, when the legacy per-client fetch fails', async () => {
    mocks.authAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/client-trainer-assignments/trainer/7') {
        return Promise.resolve({ data: { assignments: [assignmentWithoutSummary] } });
      }
      if (url.startsWith('/api/sessions/history/92')) {
        return Promise.reject(new Error('history unavailable'));
      }
      if (url.startsWith('/api/sessions/upcoming/92')) {
        return Promise.reject(new Error('upcoming unavailable'));
      }
      return Promise.reject(new Error(`unexpected call: ${url}`));
    });

    const { result } = renderHook(() => useTrainerClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filteredClients[0]?.client.totalSessionsCompleted).toBeNull();
    expect(result.current.stats.completedSessions).toBe(0);
  });

  it('keeps the legacy per-client fan-out working when the assignment has no rosterSummary', async () => {
    mocks.authAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/client-trainer-assignments/trainer/7') {
        return Promise.resolve({ data: { assignments: [assignmentWithoutSummary] } });
      }
      if (url === '/api/sessions/history/92?limit=5') {
        return Promise.resolve({
          data: [
            { status: 'completed', sessionDate: '2026-09-01T10:00:00.000Z' },
            { status: 'completed', sessionDate: '2026-08-25T10:00:00.000Z' },
          ],
        });
      }
      if (url === '/api/sessions/upcoming/92?limit=3') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`unexpected call: ${url}`));
    });

    const { result } = renderHook(() => useTrainerClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filteredClients[0]?.client.totalSessionsCompleted).toBe(2);
    expect(result.current.filteredClients[0]?.client.lastSessionDate).toBe('2026-09-01T10:00:00.000Z');
  });
});
