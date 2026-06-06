import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';

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
    expect(exerciseFindAll.mock.calls[0][0].include).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ as: 'equipment' })])
    );
    expect(exerciseFindAll.mock.calls[0][0].include).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ as: 'muscleGroups' })])
    );
    expect(result).toEqual(exercises);
  });

  it('filters library equipment from Exercise.equipmentNeeded without joining the missing equipment table', async () => {
    exerciseFindAll.mockResolvedValue([]);

    await workoutService.getExerciseRecommendations('admin-library', {
      equipment: ['dumbbell'],
      libraryMode: true,
    });

    const query = exerciseFindAll.mock.calls[0][0];
    expect(query.where.equipmentNeeded).toBeDefined();
    expect(query.include).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ as: 'equipment' })])
    );
  });

  it('maps spoken difficulty and OPT phase filters to real Exercise columns', async () => {
    exerciseFindAll.mockResolvedValue([]);

    await workoutService.getExerciseRecommendations('admin-library', {
      difficulty: 'beginner',
      optPhase: 2,
      libraryMode: true,
    });

    const query = exerciseFindAll.mock.calls[0][0];
    expect(query.where.difficulty).toEqual({ [Op.between]: [0, 333] });
    expect(query.where.optPhases).toEqual({ [Op.iLike]: '%2%' });
    expect(query.where).not.toHaveProperty('optPhase');
  });

  it('maps trainer-friendly muscle group language to MuscleGroup fields without UUID-only filtering', async () => {
    exerciseFindAll.mockResolvedValue([]);

    await workoutService.getExerciseRecommendations('admin-library', {
      muscleGroups: ['legs'],
      muscleGroupNames: ['quads'],
      bodyRegions: ['core'],
      libraryMode: true,
    });

    const query = exerciseFindAll.mock.calls[0][0];
    const muscleGroupInclude = query.include.find((include) => include.as === 'muscleGroups');
    expect(muscleGroupInclude).toEqual(expect.objectContaining({
      required: true,
      where: expect.any(Object),
    }));
    expect(muscleGroupInclude.through).toBeUndefined();
    expect(muscleGroupInclude.where[Op.or]).toEqual(
      expect.arrayContaining([
        { name: { [Op.iLike]: '%quads%' } },
        { shortName: { [Op.iLike]: '%quads%' } },
      ]),
    );
    expect(muscleGroupInclude.where[Op.or][0].bodyRegion[Op.in]).toEqual(
      expect.arrayContaining(['lower_body', 'core']),
    );
  });

  it('maps rehab focus to real Exercise columns instead of stale isRehabExercise', async () => {
    exerciseFindAll.mockResolvedValue([]);

    await workoutService.getExerciseRecommendations('admin-library', {
      rehabFocus: true,
      libraryMode: true,
    });

    const query = exerciseFindAll.mock.calls[0][0];
    expect(query.where).not.toHaveProperty('isRehabExercise');
    expect(query.where[Op.or]).toEqual(expect.arrayContaining([
      { exerciseType: { [Op.in]: ['injury_prevention', 'injury_recovery', 'flexibility', 'stability'] } },
      { cesProtocolStep: { [Op.ne]: null } },
    ]));
  });
});
