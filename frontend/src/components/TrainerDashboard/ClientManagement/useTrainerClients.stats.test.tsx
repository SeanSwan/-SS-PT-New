import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authAxiosGet = vi.fn();
  const toast = vi.fn();
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
    toast,
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

describe('useTrainerClients stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/client-trainer-assignments/trainer/7') {
        return Promise.resolve({
          data: {
            assignments: [
              {
                id: 'assignment-1',
                status: 'active',
                assignedAt: '2026-05-01T12:00:00.000Z',
                client: {
                  id: '91',
                  firstName: 'Missing',
                  lastName: 'Credits',
                  email: 'missing-credits@example.com',
                  clientSource: 'swanstudios',
                  createdAt: '2026-04-01T12:00:00.000Z',
                },
              },
            ],
          },
        });
      }

      if (url === '/api/sessions/history/91?limit=5') {
        return Promise.resolve({
          data: [
            {
              id: 'session-1',
              status: 'completed',
              sessionDate: '2026-05-20T12:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/sessions/upcoming/91?limit=3') {
        return Promise.resolve({ data: [] });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  it('treats missing availableSessions as zero instead of rendering NaN inventory', async () => {
    const { result } = renderHook(() => useTrainerClients());

    await waitFor(() => expect(mocks.authAxiosGet).toHaveBeenCalled());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.totalClients).toBe(1);
    expect(result.current.stats.completedSessions).toBe(1);
    expect(result.current.stats.paidSessionInventory).toBe(0);
    expect(Number.isNaN(result.current.stats.paidSessionInventory)).toBe(false);
  });

  it('drops malformed assignment client ids before loading session history', async () => {
    mocks.authAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/client-trainer-assignments/trainer/7') {
        return Promise.resolve({
          data: {
            assignments: [
              {
                id: 'assignment-bad',
                status: 'active',
                assignedAt: '2026-05-01T12:00:00.000Z',
                client: {
                  id: '91junk',
                  firstName: 'Bad',
                  lastName: 'Identity',
                  email: 'bad-id@example.com',
                  clientSource: 'swanstudios',
                },
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const { result } = renderHook(() => useTrainerClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authAxiosGet).toHaveBeenCalledTimes(1);
    expect(mocks.authAxiosGet).not.toHaveBeenCalledWith('/api/sessions/history/91junk?limit=5');
    expect(result.current.filteredClients).toEqual([]);
    expect(result.current.stats.totalClients).toBe(0);
  });
});
