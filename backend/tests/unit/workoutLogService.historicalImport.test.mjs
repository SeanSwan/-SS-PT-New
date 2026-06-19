import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => {
  const fakeSession = {
    id: 'history-session-1',
    update: vi.fn().mockResolvedValue(undefined),
  };
  const fakeWorkoutSession = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (attrs) => ({ ...fakeSession, ...attrs })),
    update: vi.fn().mockResolvedValue([1]),
  };
  const fakeWorkoutLog = {
    bulkCreate: vi.fn().mockResolvedValue([]),
  };
  return {
    getAllModels: () => ({
      WorkoutSession: fakeWorkoutSession,
      WorkoutLog: fakeWorkoutLog,
    }),
  };
});

vi.mock('../../services/awardWorkoutXP.mjs', () => ({
  awardWorkoutXP: vi.fn().mockResolvedValue({ alreadyAwarded: true }),
}));

const { logWorkoutForClient } = await import('../../services/workout/workoutLogService.mjs');
const { awardWorkoutXP } = await import('../../services/awardWorkoutXP.mjs');
const { getAllModels } = await import('../../models/index.mjs');

function makeFakeSequelize() {
  return {
    transaction: vi.fn().mockResolvedValue({
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

const VALID_WORKOUT = {
  clientId: 61,
  date: '2026-02-11',
  duration: 30,
  intensity: 6,
  notes: 'AI-estimated historical filler.',
  title: 'Move Fitness Historical Filler',
  trainerId: 1,
  exercises: [
    {
      name: 'Incline Push-Up',
      sets: [{ setNumber: 1, reps: 12, weight: 0 }],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  const { WorkoutSession } = getAllModels();
  WorkoutSession.findOne.mockResolvedValue(null);
});

describe('workoutLogService historical import side effects', () => {
  it('suppresses XP/social side effects while still writing historical workout logs', async () => {
    const sequelize = makeFakeSequelize();

    const result = await logWorkoutForClient({
      ...VALID_WORKOUT,
      sequelize,
      suppressEngagementSideEffects: true,
    });

    const { WorkoutLog, WorkoutSession } = getAllModels();
    expect(WorkoutSession.create).toHaveBeenCalledTimes(1);
    expect(WorkoutLog.bulkCreate).toHaveBeenCalledTimes(1);
    expect(awardWorkoutXP).not.toHaveBeenCalled();
    expect(result.xp).toBeNull();
    expect(result.xpAwarded).toBeNull();
  });

  it('keeps normal workout saves on the XP path', async () => {
    const sequelize = makeFakeSequelize();

    await logWorkoutForClient({
      ...VALID_WORKOUT,
      sequelize,
    });

    expect(awardWorkoutXP).toHaveBeenCalledTimes(1);
  });
});
