import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authAxiosGet: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: { get: mocks.authAxiosGet } }),
}));

import { useTrainerTodaySessions } from './useTrainerTodaySessions';

describe('useTrainerTodaySessions fetch contract', () => {
  beforeEach(() => {
    mocks.authAxiosGet.mockReset();
    mocks.authAxiosGet.mockResolvedValue({ data: [] });
  });

  it('queries the sessions API with the date-range parameters the backend actually filters', async () => {
    const { result } = renderHook(() => useTrainerTodaySessions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const requestedUrl = mocks.authAxiosGet.mock.calls[0]?.[0] as string;
    const url = new URL(requestedUrl, 'https://sswanstudios.test');

    expect(url.pathname).toBe('/api/sessions');
    expect(url.searchParams.has('date')).toBe(false);
    expect(url.searchParams.get('startDate')).toBeTruthy();
    expect(url.searchParams.get('endDate')).toBeTruthy();
  });

  it('counts clients today by client identity instead of collapsing matching names', async () => {
    mocks.authAxiosGet.mockResolvedValue({
      data: [
        {
          id: 101,
          userId: 42,
          sessionDate: '2026-05-31T16:00:00.000Z',
          duration: 45,
          status: 'scheduled',
          client: { id: 42, firstName: 'Alex', lastName: 'Lee' },
        },
        {
          id: 102,
          userId: 51,
          sessionDate: '2026-05-31T17:00:00.000Z',
          duration: 45,
          status: 'scheduled',
          client: { id: 51, firstName: 'Alex', lastName: 'Lee' },
        },
      ],
    });

    const { result } = renderHook(() => useTrainerTodaySessions());

    await waitFor(() => expect(result.current.stats.sessionsToday).toBe(2));

    expect(result.current.stats.clientsToday).toBe(2);
  });
});
