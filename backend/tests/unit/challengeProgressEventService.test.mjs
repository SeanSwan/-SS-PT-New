import { describe, expect, it, vi } from 'vitest';
import {
  ChallengeProgressEventValidationError,
  applyWorkoutChallengeProgressEvent,
} from '../../services/gamification/challengeProgressEventService.mjs';

const baseChallenge = (overrides = {}) => ({
  id: 'challenge-1',
  title: 'Session Streak',
  progressUnit: 'sessions',
  maxProgress: 3,
  currentParticipants: 4,
  xpReward: 125,
  bonusXpReward: 25,
  update: vi.fn(),
  ...overrides,
});

const baseParticipant = (overrides = {}) => ({
  id: 'participant-1',
  challengeId: 'challenge-1',
  userId: 7,
  status: 'joined',
  currentProgress: 1,
  progressPercentage: 33.33,
  startedAt: null,
  completedAt: null,
  checkInsCount: 0,
  progressHistory: [],
  dailyProgress: {},
  bestSingleDayProgress: 0,
  update: vi.fn(),
  challenge: baseChallenge(),
  ...overrides,
});

const makeModels = (participants, count = 0) => ({
  Challenge: { name: 'Challenge' },
  ChallengeParticipant: {
    findAll: vi.fn(async () => participants),
    count: vi.fn(async () => count),
  },
});

const event = {
  sourceId: 'workout-123',
  occurredAt: '2026-06-20T12:00:00.000Z',
  durationMinutes: 45,
  exercisesCompleted: 6,
  personalRecordCount: 2,
};

describe('challenge progress event service', () => {
  it('applies a session delta from a canonical workout event', async () => {
    const participant = baseParticipant();
    const models = makeModels([participant]);
    const transaction = { id: 'tx', LOCK: { UPDATE: 'UPDATE' } };

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: '7',
      event,
      transaction,
      now: new Date('2026-06-20T12:05:00.000Z'),
    });

    expect(models.ChallengeParticipant.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 7 }),
      transaction,
      lock: 'UPDATE',
    }));
    expect(participant.update).toHaveBeenCalledTimes(1);

    const fields = participant.update.mock.calls[0][0];
    expect(fields.currentProgress).toBe(2);
    expect(fields.progressPercentage).toBe(66.67);
    expect(fields.status).toBe('active');
    expect(fields.startedAt).toEqual(new Date(event.occurredAt));
    expect(fields.dailyProgress).toEqual({ '2026-06-20': 1 });
    expect(fields.progressHistory).toEqual([expect.objectContaining({
      sourceType: 'workout_completed',
      sourceId: 'workout-123',
      delta: 1,
      durationMinutes: 45,
      exercisesCompleted: 6,
      personalRecordCount: 2,
      assignedSession: false,
      currentProgress: 2,
    })]);
    expect(result.updatedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('marks a participant completed and refreshes challenge completion rate', async () => {
    const challenge = baseChallenge();
    const participant = baseParticipant({
      currentProgress: 2,
      progressPercentage: 66.67,
      challenge,
    });
    const models = makeModels([participant], 2);

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event,
      transaction: { id: 'tx' },
    });

    const fields = participant.update.mock.calls[0][0];
    expect(fields.currentProgress).toBe(3);
    expect(fields.progressPercentage).toBe(100);
    expect(fields.status).toBe('completed');
    expect(fields.completedAt).toEqual(new Date(event.occurredAt));
    expect(challenge.update).toHaveBeenCalledWith({ completionRate: 50 }, { transaction: { id: 'tx' } });
    expect(result.updated[0]).toEqual(expect.objectContaining({
      completed: true,
      title: 'Session Streak',
      xpReward: 125,
      bonusXpReward: 25,
    }));
  });

  it('skips a replayed event with the same source ID', async () => {
    const participant = baseParticipant({
      progressHistory: [{ sourceType: 'workout_completed', sourceId: 'workout-123' }],
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({ models, userId: 7, event });

    expect(participant.update).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'duplicate_event' })]);
  });

  it('counts only one workout per date for day-based challenges', async () => {
    const participant = baseParticipant({
      dailyProgress: { '2026-06-20': 1 },
      challenge: baseChallenge({ progressUnit: 'days', maxProgress: 7 }),
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event: { ...event, sourceId: 'workout-456' },
    });

    expect(participant.update).not.toHaveBeenCalled();
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'day_already_counted' })]);
  });

  it('uses workout duration for minute-based challenges', async () => {
    const participant = baseParticipant({
      currentProgress: 15,
      challenge: baseChallenge({ progressUnit: 'minutes', maxProgress: 90 }),
    });
    const models = makeModels([participant]);

    await applyWorkoutChallengeProgressEvent({ models, userId: 7, event });

    const fields = participant.update.mock.calls[0][0];
    expect(fields.currentProgress).toBe(60);
    expect(fields.progressPercentage).toBe(66.67);
    expect(fields.dailyProgress).toEqual({ '2026-06-20': 45 });
  });

  it('skips exercise-family challenge progress when the workout lacks the required Rolodex family', async () => {
    const participant = baseParticipant({
      challenge: baseChallenge({
        progressUnit: 'workouts',
        maxProgress: 3,
        tags: ['exercise-family', 'push', 'template:exercise_family'],
      }),
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event: { ...event, sourceId: 'workout-pull', exerciseFamilies: ['pull'], workoutTags: ['strength'] },
    });

    expect(participant.update).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'rule_mismatch_exercise_family' })]);
  });
  it('skips assigned-session challenge progress for ad hoc workout events', async () => {
    const participant = baseParticipant({
      challenge: baseChallenge({
        tags: ['sessions', 'assigned-session'],
      }),
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event: { ...event, sourceId: 'ad-hoc-workout', isAssignedSession: false },
    });

    expect(participant.update).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'rule_mismatch_assigned_session' })]);
  });
  it('marks assigned-session-only updates for workout-save receipts', async () => {
    const participant = baseParticipant({
      challenge: baseChallenge({
        tags: ['sessions', 'assigned-session'],
      }),
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event: { ...event, sourceId: 'assigned-workout', isAssignedSession: true },
    });

    expect(participant.update).toHaveBeenCalledTimes(1);
    expect(result.updated[0]).toEqual(expect.objectContaining({
      assignedSessionOnly: true,
      assignedSession: true,
    }));
  });
  it('does not auto-update unsupported custom progress units', async () => {
    const participant = baseParticipant({
      challenge: baseChallenge({ progressUnit: 'custom', maxProgress: 10 }),
    });
    const models = makeModels([participant]);

    const result = await applyWorkoutChallengeProgressEvent({ models, userId: 7, event });

    expect(participant.update).not.toHaveBeenCalled();
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'unsupported_progress_unit' })]);
  });

  it('requires a source ID so event replay stays idempotent', async () => {
    const models = makeModels([]);

    await expect(applyWorkoutChallengeProgressEvent({
      models,
      userId: 7,
      event: { occurredAt: event.occurredAt },
    })).rejects.toBeInstanceOf(ChallengeProgressEventValidationError);
  });
});

