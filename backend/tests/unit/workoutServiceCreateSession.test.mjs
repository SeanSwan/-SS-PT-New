/**
 * workoutService.createWorkoutSession transaction + idempotency behavior.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    commit: vi.fn(),
    rollback: vi.fn(),
  };
  const WorkoutSession = {
    create: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
  };
  return {
    transaction,
    sequelizeTransaction: vi.fn(),
    WorkoutSession,
    WorkoutExercise: { create: vi.fn() },
    Set: { bulkCreate: vi.fn() },
  };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: mocks.sequelizeTransaction,
    literal: vi.fn((value) => value),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutSession: mocks.WorkoutSession,
    WorkoutExercise: mocks.WorkoutExercise,
    Set: mocks.Set,
    User: {},
    Exercise: {},
    MuscleGroup: null,
    WorkoutPlan: null,
  }),
}));

const { default: workoutService } = await import('../../services/workoutService.mjs');

const payload = {
  userId: 42,
  title: 'Strength day',
  sessionDate: '2026-07-19T12:00:00.000Z',
  duration: 45,
  intensity: 8,
  clientRequestId: '11111111-1111-4111-8111-111111111111',
  exercises: [],
};

describe('workoutService.createWorkoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sequelizeTransaction.mockResolvedValue(mocks.transaction);
    mocks.WorkoutSession.findByPk.mockResolvedValue({ id: 'session-1' });
  });

  it('commits the model-backed fields and stable retry key', async () => {
    mocks.WorkoutSession.create.mockResolvedValue({ id: 'session-1' });

    const result = await workoutService.createWorkoutSession(payload);

    expect(mocks.WorkoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        title: 'Strength day',
        date: payload.sessionDate,
        duration: 45,
        intensity: 8,
        clientRequestId: payload.clientRequestId,
      }),
      { transaction: mocks.transaction },
    );
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'session-1' });
  });

  it('rolls back and replays the same user request after the composite unique conflict', async () => {
    const duplicate = Object.assign(new Error('duplicate'), {
      name: 'SequelizeUniqueConstraintError',
      original: { constraint: 'workout_sessions_user_client_request_uidx' },
    });
    mocks.WorkoutSession.create.mockRejectedValue(duplicate);
    mocks.WorkoutSession.findOne.mockResolvedValue({ id: 'existing-session' });
    mocks.WorkoutSession.findByPk.mockResolvedValue({ id: 'existing-session' });

    const result = await workoutService.createWorkoutSession(payload);

    expect(mocks.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.WorkoutSession.findOne).toHaveBeenCalledWith({
      where: {
        userId: 42,
        clientRequestId: payload.clientRequestId,
      },
    });
    expect(result).toEqual({ id: 'existing-session' });
  });

  it('does not turn an unrelated unique failure into a false successful replay', async () => {
    const unrelated = Object.assign(new Error('duplicate title'), {
      name: 'SequelizeUniqueConstraintError',
      original: { constraint: 'some_other_unique_index' },
    });
    mocks.WorkoutSession.create.mockRejectedValue(unrelated);

    await expect(workoutService.createWorkoutSession(payload)).rejects.toBe(unrelated);

    expect(mocks.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.WorkoutSession.findOne).not.toHaveBeenCalled();
  });
});
