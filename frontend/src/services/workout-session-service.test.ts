/**
 * workout-session-service route contract
 * ======================================
 * Locks workout session service calls to mounted production routes.
 *
 * Why this exists:
 * - `GET /api/workout/sessions` is consumed by the client workout-history page.
 * - Statistics must use `/api/workout/statistics/:userId`, not the shadowed
 *   `/api/workout/sessions/statistics/:userId` alias.
 * - The canonical controller returns `{ data: { statistics } }`, while Redux
 *   expects `{ statistics }` from this service boundary.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./api', () => ({
  default: apiMock,
}));

import workoutSessionService from './workout-session-service';

describe('workoutSessionService statistics contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the mounted workout statistics route and normalizes the controller envelope', async () => {
    const statistics = {
      totalWorkouts: 3,
      weekdayBreakdown: [0, 1, 0, 2, 0, 0, 0],
    };
    const params = {
      includeWeekdayBreakdown: true,
      includeIntensityTrends: true,
    };

    apiMock.get.mockResolvedValue({
      data: {
        success: true,
        data: { statistics },
      },
    });

    const result = await workoutSessionService.getSessionStatistics('42', params);

    expect(apiMock.get).toHaveBeenCalledWith('/api/workout/statistics/42', { params });
    expect(result).toEqual({ statistics });
  });

  it('preserves legacy raw statistics payloads while callers migrate', async () => {
    const statistics = {
      totalWorkouts: 1,
      exerciseBreakdown: [{ id: 'row', count: 1 }],
    };

    apiMock.get.mockResolvedValue({ data: { statistics } });

    await expect(workoutSessionService.getSessionStatistics('42')).resolves.toEqual({ statistics });
  });
});
