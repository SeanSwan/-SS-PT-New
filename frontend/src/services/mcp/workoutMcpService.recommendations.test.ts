import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../api.service';
import workoutMcpApi from './workoutMcpService';

vi.mock('../api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('workoutMcpService recommendation compatibility adapter', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
    vi.mocked(apiService.post).mockReset();
  });

  it('uses the canonical GET /api/workout/recommendations route and unwraps data.exercises', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          exercises: [{ id: 'exercise-1', name: 'Goblet Squat' }],
        },
      },
    });

    const result = await workoutMcpApi.getWorkoutRecommendations({
      userId: 'admin-library',
      goal: 'general',
      limit: 50,
    });

    expect(apiService.post).not.toHaveBeenCalled();
    expect(apiService.get).toHaveBeenCalledWith('/api/workout/recommendations', {
      params: { userId: 'admin-library', goal: 'general', limit: 50 },
    });
    expect(result.data.recommendations).toEqual([
      { id: 'exercise-1', name: 'Goblet Squat' },
    ]);
  });
});
