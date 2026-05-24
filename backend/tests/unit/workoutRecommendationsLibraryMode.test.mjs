import { describe, expect, it, vi, beforeEach } from 'vitest';

const clientProgressFindOne = vi.fn();
const exerciseFindAll = vi.fn();

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    ClientProgress: { findOne: clientProgressFindOne },
    MuscleGroup: {},
    Equipment: {},
    Exercise: { findAll: exerciseFindAll },
  }),
}));

import workoutService from '../../services/workoutService.mjs';

describe('workoutService.getExerciseRecommendations admin library mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips client progress lookup for the admin exercise library catalog request', async () => {
    const exercises = [
      { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout' },
      { id: 'shin-box-stretch', name: '90-90 Shin Box Stretch' },
    ];
    exerciseFindAll.mockResolvedValue(exercises);

    const result = await workoutService.getExerciseRecommendations('admin-library', {
      goal: 'general',
      limit: 50,
      libraryMode: true,
    });

    expect(clientProgressFindOne).not.toHaveBeenCalled();
    expect(exerciseFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    expect(result).toEqual(exercises);
  });
});
