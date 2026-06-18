import { beforeEach, describe, expect, it, vi } from 'vitest';

const exerciseMock = vi.hoisted(() => ({
  findOrCreate: vi.fn(),
  findOne: vi.fn(),
}));

vi.mock('../models/Exercise.mjs', () => ({ default: exerciseMock }));

const { seedExpandedExercise } = await import('../seeders/20260321-seed-expanded-exercises.mjs');

const makeValidationError = () => Object.assign(new Error('Validation error'), {
  name: 'SequelizeUniqueConstraintError',
});

describe('seedExpandedExercise duplicate-name recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('backfills exercise_key and skips when an older row already owns the name', async () => {
    const existingRow = {
      exercise_key: null,
      update: vi.fn(async () => undefined),
    };
    exerciseMock.findOrCreate.mockRejectedValueOnce(makeValidationError());
    exerciseMock.findOne.mockResolvedValueOnce(existingRow);

    const result = await seedExpandedExercise({
      id: 'seed-id',
      name: '90/90 Hip Stretch',
      exercise_key: 'nasm-90-90-hip-stretch',
      description: 'Hip mobility stretch.',
      instructions: 'Hold position with control.',
      exerciseType: 'flexibility',
      primaryMuscles: '["Hip Rotators","Glutes"]',
      difficulty: 150,
    });

    expect(result).toBe('skipped');
    expect(exerciseMock.findOne).toHaveBeenCalledWith({ where: { name: '90/90 Hip Stretch' } });
    expect(existingRow.update).toHaveBeenCalledWith({ exercise_key: 'nasm-90-90-hip-stretch' });
  });
});
