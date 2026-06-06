import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useWorkoutMcp } from './useWorkoutMcp';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' } }),
}));

vi.mock('../services/api.service', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

describe('useWorkoutMcp.getWorkoutRecommendations', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
  });

  it('unwraps the canonical recommendation successResponse for real client requests', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        message: 'Success',
        data: {
          exercises: [
            { id: 'exercise-1', name: 'Goblet Squat', description: 'Squat pattern' },
            { id: 'exercise-2', name: 'Cable Row', description: 'Pull pattern' },
          ],
        },
      },
    });

    const { result } = renderHook(() => useWorkoutMcp());
    let response: Awaited<ReturnType<typeof result.current.getWorkoutRecommendations>> | null = null;

    await act(async () => {
      response = await result.current.getWorkoutRecommendations({
        userId: 'client-42',
        goal: 'general',
        limit: 50,
      });
    });

    expect(apiService.get).toHaveBeenCalledWith('/api/workout/recommendations', {
      params: { userId: 'client-42', goal: 'general', limit: 50 },
    });
    expect(response?.exercises).toHaveLength(2);
    expect(response?.exercises[0]).toMatchObject({ id: 'exercise-1', name: 'Goblet Squat' });
  });

  it('routes the admin exercise catalog request through the client-safe exercise library', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        exercises: [{ id: 'legacy-1', name: 'Push Up', description: 'Push pattern' }],
      },
    });

    const { result } = renderHook(() => useWorkoutMcp());
    let response: Awaited<ReturnType<typeof result.current.getWorkoutRecommendations>> | null = null;

    await act(async () => {
      response = await result.current.getWorkoutRecommendations({
        userId: 'admin-library',
        limit: 1,
      });
    });

    expect(apiService.get).toHaveBeenCalledWith('/api/exercises/library');
    expect(response?.exercises).toEqual([
      { id: 'legacy-1', name: 'Push Up', description: 'Push pattern' },
    ]);
  });

  it('normalizes Exercise model fields for the active Exercise Library UI contract', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          exercises: [{
            id: 'exercise-3',
            name: 'Ab Wheel Rollout',
            description: null,
            exerciseType: 'core',
            difficulty: 450,
            primaryMuscles: ['abdominals'],
            secondaryMuscles: ['shoulders'],
            equipmentNeeded: '["Ab Wheel"]',
          }],
        },
      },
    });

    const { result } = renderHook(() => useWorkoutMcp());
    let response: Awaited<ReturnType<typeof result.current.getWorkoutRecommendations>> | null = null;

    await act(async () => {
      response = await result.current.getWorkoutRecommendations({
        userId: 'admin-library',
        limit: 1,
      });
    });

    expect(response?.exercises[0]).toMatchObject({
      id: 'exercise-3',
      description: '',
      category: 'core',
      difficulty: 'intermediate',
      muscleGroups: [
        { id: 'abdominals', name: 'abdominals', shortName: 'abdominals' },
        { id: 'shoulders', name: 'shoulders', shortName: 'shoulders' },
      ],
      equipment: [
        { id: 'ab-wheel', name: 'Ab Wheel', category: 'equipment' },
      ],
    });
  });
});
