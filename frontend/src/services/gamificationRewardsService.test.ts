import { describe, expect, it, vi } from 'vitest';
import apiService from './api.service';
import gamificationRewardsService from './gamificationRewardsService';

vi.mock('./api.service', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('gamificationRewardsService', () => {
  it('records workout completion against the canonical gamification backend route', async () => {
    vi.mocked(apiService.post).mockResolvedValueOnce({
      data: {
        success: true,
        pointsAwarded: 50,
        newBalance: 550,
        streakDays: 2,
        totalWorkouts: 12
      }
    } as never);

    const payload = {
      userId: 'client-7',
      workoutId: 'session-44',
      duration: 60,
      exercisesCompleted: 0,
      notes: 'Completed from Universal Master Schedule'
    };

    const result = await gamificationRewardsService.recordWorkoutCompletion(payload);

    expect(apiService.post).toHaveBeenCalledWith('/api/gamification/record-workout', payload);
    expect(result).toMatchObject({
      success: true,
      pointsAwarded: 50,
      newBalance: 550
    });
  });
});
