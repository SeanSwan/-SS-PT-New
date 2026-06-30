import { describe, expect, it } from 'vitest';

import {
  getLatestWorkoutImpact,
  toChallengeDashboardParticipation,
} from '../../services/gamification/challengeDashboardReadModel.mjs';

const NOW = new Date('2026-06-30T12:00:00.000Z');

describe('challenge dashboard read model', () => {
  it('adds a real dashboard summary and latest workout impact to participation rows', () => {
    const row = {
      toJSON: () => ({
        id: 'participation-1',
        challengeId: 'challenge-1',
        userId: 42,
        status: 'active',
        currentProgress: 45,
        progressPercentage: 30,
        checkInsCount: 2,
        progressHistory: [
          { sourceType: 'manual', occurredAt: '2026-06-28T10:00:00.000Z', delta: 10 },
          {
            sourceType: 'workout_completed',
            sourceId: 'workout-session:abc',
            occurredAt: '2026-06-29T15:30:00.000Z',
            progressUnit: 'minutes',
            delta: 45,
            durationMinutes: 45,
            exercisesCompleted: 6,
            personalRecordCount: 1,
            assignedSession: true,
            previousProgress: 0,
            currentProgress: 45,
          },
        ],
        challenge: {
          id: 'challenge-1',
          title: '150-Minute Week',
          status: 'active',
          progressUnit: 'minutes',
          maxProgress: 150,
          endDate: '2026-07-05T00:00:00.000Z',
        },
      }),
    };

    const result = toChallengeDashboardParticipation(row, { now: NOW });

    expect(result.dashboardSummary).toMatchObject({
      challengeId: 'challenge-1',
      title: '150-Minute Week',
      status: 'active',
      currentProgress: 45,
      maxProgress: 150,
      progressPercentage: 30,
      progressUnit: 'minutes',
      progressLabel: '45 of 150 minutes',
      nextAction: 'Log more workout minutes',
      daysLeft: 5,
      checkInsCount: 2,
      lastWorkoutImpact: {
        sourceId: 'workout-session:abc',
        occurredAt: '2026-06-29T15:30:00.000Z',
        progressUnit: 'minutes',
        delta: 45,
        activeMinutes: 45,
        exercisesCompleted: 6,
        personalRecordCount: 1,
        assignedSession: true,
        previousProgress: 0,
        currentProgress: 45,
      },
    });
  });

  it('uses the latest workout-completed event and ignores non-workout history', () => {
    const impact = getLatestWorkoutImpact([
      { sourceType: 'manual', occurredAt: '2026-06-30T10:00:00.000Z', delta: 99 },
      { source: 'workout_completed', sourceId: 'old', occurredAt: '2026-06-28T10:00:00.000Z', delta: 1 },
      {
        sourceType: 'workout_completed',
        sourceId: 'new',
        occurredAt: '2026-06-29T10:00:00.000Z',
        progressUnit: 'sessions',
        delta: 2,
        durationMinutes: 30,
        exercisesCompleted: 4,
        personalRecordCount: 0,
        assignedSession: false,
      },
      { sourceType: 'workout_completed', sourceId: 'bad-date', occurredAt: 'not-a-date', delta: 100 },
    ]);

    expect(impact).toMatchObject({
      sourceId: 'new',
      occurredAt: '2026-06-29T10:00:00.000Z',
      delta: 2,
      activeMinutes: 30,
      exercisesCompleted: 4,
      personalRecordCount: 0,
      assignedSession: false,
    });
  });

  it('uses assigned-session wording for planned-session challenge rules', () => {
    const result = toChallengeDashboardParticipation({
      id: 'participation-assigned',
      challengeId: 'challenge-assigned',
      status: 'active',
      currentProgress: 1,
      progressPercentage: 33,
      challenge: {
        id: 'challenge-assigned',
        title: 'Three Planned Sessions',
        status: 'active',
        progressUnit: 'sessions',
        maxProgress: 3,
        tags: ['sessions', 'program', 'training-plan', 'assigned-session'],
      },
    }, { now: NOW });

    expect(result.dashboardSummary).toMatchObject({
      progressUnit: 'sessions',
      progressLabel: '1 of 3 sessions',
      nextAction: 'Complete your next assigned workout',
    });
  });
  it('stays honest when the challenge association is missing', () => {
    const result = toChallengeDashboardParticipation({
      id: 'participation-2',
      challengeId: 'challenge-missing',
      status: 'joined',
      currentProgress: 'not-a-number',
      progressPercentage: 500,
      progressHistory: 'not-json',
    }, { now: NOW });

    expect(result.dashboardSummary).toMatchObject({
      challengeId: 'challenge-missing',
      title: 'Challenge',
      status: 'active',
      currentProgress: 0,
      maxProgress: 1,
      progressPercentage: 0,
      progressUnit: 'completion',
      progressLabel: '0 of 1 completion',
      nextAction: 'Complete the next challenge action',
      lastWorkoutImpact: null,
    });
  });
});
