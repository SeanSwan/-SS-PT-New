import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyWorkoutChallengeProgressEvent: vi.fn(),
  awardWorkoutChallengeCompletionXp: vi.fn(),
}));

vi.mock('../../services/gamification/challengeProgressEventService.mjs', () => ({
  applyWorkoutChallengeProgressEvent: mocks.applyWorkoutChallengeProgressEvent,
}));

vi.mock('../../services/gamification/challengeCompletionRewardService.mjs', () => ({
  awardWorkoutChallengeCompletionXp: mocks.awardWorkoutChallengeCompletionXp,
}));

import {
  applyDailyWorkoutFormChallengeProgress,
  buildDailyWorkoutChallengeProgressEvent,
} from '../../services/gamification/challengeWorkoutCompletionBridge.mjs';

const makeTransaction = () => ({
  id: 'tx-1',
  commit: vi.fn(async () => {}),
  rollback: vi.fn(async () => {}),
});

describe('challenge workout completion bridge', () => {
  beforeEach(() => {
    mocks.applyWorkoutChallengeProgressEvent.mockReset();
    mocks.awardWorkoutChallengeCompletionXp.mockReset();
    mocks.awardWorkoutChallengeCompletionXp.mockResolvedValue(0);
  });

  it('builds a canonical workout-completed event from an accepted daily workout form', () => {
    const event = buildDailyWorkoutChallengeProgressEvent({
      dailyForm: {
        id: 'form-1',
        submittedAt: '2026-06-29T15:30:00.000Z',
        formData: { personalRecords: [{ exercise: 'Squat' }, { exercise: 'Bench Press' }] },
      },
      workoutSession: { id: 'workout-session-1', assignmentId: 'assignment-1' },
      workoutDateIso: '2026-06-29',
      estimatedDuration: '45',
      exercises: [{ name: 'Squat', category: 'squat' }, { name: 'Push Up', category: 'push' }],
    });

    expect(event).toEqual({
      sourceId: 'workout-session:workout-session-1',
      workoutId: 'form-1',
      sessionId: 'workout-session-1',
      occurredAt: '2026-06-29T15:30:00.000Z',
      durationMinutes: 45,
      exercisesCompleted: 2,
      personalRecordCount: 2,
      exerciseFamilies: ['squat', 'push'],
      workoutTags: ['squat', 'push'],
      isAssignedSession: true,
    });
  });

  it('uses the daily form ID as the idempotent source when no workout session exists', () => {
    const event = buildDailyWorkoutChallengeProgressEvent({
      dailyForm: { id: 'form-1' },
      workoutDateIso: '2026-06-29',
      estimatedDuration: null,
      exercises: null,
    });

    expect(event.sourceId).toBe('daily-form:form-1');
    expect(event.occurredAt).toBe('2026-06-29');
    expect(event.durationMinutes).toBe(0);
    expect(event.exercisesCompleted).toBe(0);
    expect(event.personalRecordCount).toBe(0);
    expect(event.exerciseFamilies).toEqual([]);
    expect(event.workoutTags).toEqual([]);
    expect(event.isAssignedSession).toBe(false);
  });

  it('applies challenge progress in its own transaction after the workout save commits', async () => {
    const transaction = makeTransaction();
    const sequelize = { transaction: vi.fn(async () => transaction) };
    const models = { Challenge: {}, ChallengeParticipant: {} };
    mocks.applyWorkoutChallengeProgressEvent.mockResolvedValue({ updatedCount: 1, skippedCount: 0 });

    const result = await applyDailyWorkoutFormChallengeProgress({
      sequelize,
      models,
      userId: 7,
      dailyForm: {
        id: 'form-1',
        submittedAt: '2026-06-29T15:30:00.000Z',
        formData: { personalRecords: [{ exercise: 'Squat' }, { exercise: 'Bench Press' }] },
      },
      workoutSession: { id: 'workout-session-1' },
      workoutDateIso: '2026-06-29',
      estimatedDuration: 45,
      exercises: [{ category: 'push' }],
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.applyWorkoutChallengeProgressEvent).toHaveBeenCalledWith({
      models,
      userId: 7,
      event: expect.objectContaining({
        sourceId: 'workout-session:workout-session-1',
        durationMinutes: 45,
        exercisesCompleted: 1,
        exerciseFamilies: ['push'],
        workoutTags: ['push'],
      }),
      transaction,
    });
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({ updatedCount: 1, skippedCount: 0, xpAwarded: 0 });
  });

  it('awards completed challenge XP in the bridge transaction before committing', async () => {
    const transaction = makeTransaction();
    const sequelize = { transaction: vi.fn(async () => transaction) };
    const models = { Challenge: {}, ChallengeParticipant: {} };
    const completedUpdate = {
      challengeId: 'challenge-2',
      title: '150 Minute Week',
      completed: true,
      xpReward: 200,
      bonusXpReward: 50,
    };
    mocks.applyWorkoutChallengeProgressEvent.mockResolvedValue({
      updated: [
        { challengeId: 'challenge-1', title: 'Session Streak', completed: false, xpReward: 100, bonusXpReward: 0 },
        completedUpdate,
      ],
      skipped: [],
      updatedCount: 2,
      skippedCount: 0,
    });
    mocks.awardWorkoutChallengeCompletionXp.mockResolvedValue(250);

    const result = await applyDailyWorkoutFormChallengeProgress({
      sequelize,
      models,
      userId: 7,
      dailyForm: {
        id: 'form-1',
        submittedAt: '2026-06-29T15:30:00.000Z',
        formData: { personalRecords: [{ exercise: 'Squat' }, { exercise: 'Bench Press' }] },
      },
      workoutSession: { id: 'workout-session-1' },
      workoutDateIso: '2026-06-29',
      estimatedDuration: 45,
      exercises: [{ category: 'push' }],
    });

    expect(mocks.awardWorkoutChallengeCompletionXp).toHaveBeenCalledWith({
      userId: 7,
      completions: [completedUpdate],
      transaction,
    });
    expect(mocks.awardWorkoutChallengeCompletionXp.mock.invocationCallOrder[0])
      .toBeLessThan(transaction.commit.mock.invocationCallOrder[0]);
    expect(result).toEqual(expect.objectContaining({ xpAwarded: 250 }));
  });

  it('rolls back the bridge transaction when challenge progress fails', async () => {
    const transaction = makeTransaction();
    const sequelize = { transaction: vi.fn(async () => transaction) };
    mocks.applyWorkoutChallengeProgressEvent.mockRejectedValue(new Error('challenge write failed'));

    await expect(applyDailyWorkoutFormChallengeProgress({
      sequelize,
      models: { Challenge: {}, ChallengeParticipant: {} },
      userId: 7,
      dailyForm: { id: 'form-1' },
      workoutDateIso: '2026-06-29',
    })).rejects.toThrow('challenge write failed');

    expect(transaction.commit).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });
});
