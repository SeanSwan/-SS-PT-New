import { describe, expect, it } from 'vitest';
import { getManagedChallengeResults } from '../../services/gamification/challengeResultsService.mjs';
import { buildChallengeLifecycleAnalytics } from '../../services/gamification/challengeLifecycleAnalyticsService.mjs';
import { makeChallenge, makeModels, makeParticipant } from './challengeResultsTestFactory.mjs';

describe('challenge results lifecycle analytics', () => {
  it('derives lifecycle analytics from persisted participant rows and workout progress history', async () => {
    const challenge = makeChallenge({
      maxParticipants: 6,
      viewCount: 10,
      participants: [
        makeParticipant({
          id: 'p1',
          userId: 1,
          status: 'completed',
          currentProgress: 12,
          progressPercentage: 100,
          xpEarned: 250,
          bonusXpEarned: 25,
          joinedAt: '2026-07-01T10:00:00.000Z',
          startedAt: '2026-07-02T10:00:00.000Z',
          completedAt: '2026-07-09T12:00:00.000Z',
          lastProgressUpdate: '2026-07-09T12:00:00.000Z',
          progressHistory: [
            {
              sourceType: 'workout_completed',
              sourceId: 'session-1',
              occurredAt: '2026-07-08T12:00:00.000Z',
              delta: 1,
              durationMinutes: 40,
              exercisesCompleted: 5,
              personalRecordCount: 0,
              assignedSession: true,
              currentProgress: 11,
              previousProgress: 10,
              progressUnit: 'sessions',
            },
            {
              sourceType: 'workout_completed',
              sourceId: 'session-2',
              occurredAt: '2026-07-09T12:00:00.000Z',
              delta: 1,
              durationMinutes: 50,
              exercisesCompleted: 6,
              personalRecordCount: 1,
              assignedSession: true,
              currentProgress: 12,
              previousProgress: 11,
              progressUnit: 'sessions',
            },
          ],
        }),
        makeParticipant({
          id: 'p2',
          userId: 2,
          status: 'quit',
          currentProgress: 3,
          progressPercentage: 25,
          xpEarned: 80,
          joinedAt: '2026-07-03T10:00:00.000Z',
          startedAt: '2026-07-04T10:00:00.000Z',
          updatedAt: '2026-07-05T10:00:00.000Z',
        }),
        makeParticipant({
          id: 'p3',
          userId: 3,
          status: 'active',
          currentProgress: 6,
          progressPercentage: 50,
          joinedAt: '2026-07-04T10:00:00.000Z',
          startedAt: '2026-07-05T10:00:00.000Z',
        }),
      ],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.analytics).toMatchObject({
      viewCount: 10,
      enrollmentConversionRate: 30,
      participationRate: 50,
      activeParticipantRate: 33.3,
      completedParticipantCount: 1,
      completionRate: 33.3,
      retentionRate: 66.7,
      midpointParticipantCount: 2,
      midpointRetentionRate: 66.7,
      rewardedParticipantCount: 1,
      totalRewardXp: 275,
      challengeDerivedCompletedSessions: 2,
      challengeDerivedActiveMinutes: 90,
      challengeDerivedExercisesCompleted: 11,
      challengeDerivedPersonalRecordCount: 1,
      eventCounts: {
        challenge_viewed: 10,
        challenge_joined: 3,
        challenge_started: 3,
        progress_updated: 2,
        challenge_completed: 1,
        challenge_dropped: 1,
        reward_earned: 1,
      },
    });
    expect(result.challenge.viewCount).toBe(10);
    expect(result.lifecycleEvents.map((event) => event.type)).toEqual([
      'challenge_completed', 'reward_earned', 'progress_updated', 'progress_updated', 'challenge_started', 'challenge_dropped',
      'challenge_joined', 'challenge_started', 'challenge_joined', 'challenge_started', 'challenge_joined',
    ]);
    expect(result.lifecycleEvents[0]).toMatchObject({
      participantId: 'p1',
      userId: 1,
      displayName: 'Client1 Training',
      occurredAt: '2026-07-09T12:00:00.000Z',
    });
    expect(result.lifecycleEvents.find((event) => event.type === 'reward_earned')).toMatchObject({
      participantId: 'p1',
      delta: 275,
    });
  });
  it('counts active participants below midpoint as needing attention', () => {
    const result = buildChallengeLifecycleAnalytics({
      challenge: { maxProgress: 10 },
      participants: [
        { id: 'p-low-active', userId: 21, status: 'active', currentProgress: 4 },
        { id: 'p-low-joined', userId: 22, status: 'joined', progressPercentage: 30 },
        { id: 'p-mid-active', userId: 23, status: 'active', currentProgress: 5 },
        { id: 'p-low-dropped', userId: 24, status: 'quit', currentProgress: 1 },
      ],
    });

    expect(result.analytics.needsAttentionParticipantCount).toBe(2);
  });
  it('derives aggregate improvement lift from workout-completed progress only', () => {
    const result = buildChallengeLifecycleAnalytics({
      participants: [
        {
          id: 'p-lift-a',
          userId: 31,
          progressHistory: [
            { sourceType: 'workout_completed', delta: 1 },
            { sourceType: 'manual', delta: 5 },
          ],
        },
        {
          id: 'p-lift-b',
          userId: 32,
          progressHistory: [
            { sourceType: 'workout_completed', currentProgress: 8, previousProgress: 6 },
          ],
        },
        {
          id: 'p-zero',
          userId: 33,
          progressHistory: [
            { sourceType: 'workout_completed', delta: -1 },
          ],
        },
      ],
    });

    expect(result.analytics).toMatchObject({
      improvedParticipantCount: 2,
      averageProgressDelta: 1.5,
    });
  });  it('derives team completion analytics from participant team memberships', () => {
    const result = buildChallengeLifecycleAnalytics({
      participants: [
        { id: 'p-team-a-1', userId: 31, teamId: 'team-a', status: 'completed' },
        { id: 'p-team-a-2', userId: 32, teamId: 'team-a', status: 'completed' },
        { id: 'p-team-b-1', userId: 33, teamId: 'team-b', status: 'completed' },
        { id: 'p-team-b-2', userId: 34, teamId: 'team-b', status: 'active' },
        { id: 'p-solo', userId: 35, status: 'completed' },
      ],
    });

    expect(result.analytics).toMatchObject({
      teamCount: 2,
      completedTeamCount: 1,
      teamCompletionRate: 50,
    });
  });
  it('keeps a historical challenge-left drop event after a participant rejoins', () => {
    const result = buildChallengeLifecycleAnalytics({
      challenge: { viewCount: 0 },
      participants: [
        {
          id: 'p4',
          userId: 4,
          status: 'joined',
          joinedAt: '2026-07-06T10:00:00.000Z',
          progressHistory: [
            {
              sourceType: 'challenge_left',
              sourceId: 'challenge-1',
              occurredAt: '2026-07-05T10:00:00.000Z',
              previousStatus: 'active',
            },
          ],
        },
      ],
    });

    expect(result.analytics.eventCounts.challenge_joined).toBe(1);
    expect(result.analytics.eventCounts.challenge_dropped).toBe(1);
    expect(result.lifecycleEvents).toContainEqual(expect.objectContaining({
      type: 'challenge_dropped',
      participantId: 'p4',
      sourceId: 'challenge-1',
      occurredAt: '2026-07-05T10:00:00.000Z',
    }));
  });
  it('classifies a pre-start challenge leave as declined instead of dropped', () => {
    const result = buildChallengeLifecycleAnalytics({
      challenge: { viewCount: 0 },
      participants: [
        {
          id: 'p5',
          userId: 5,
          status: 'quit',
          joinedAt: '2026-07-06T10:00:00.000Z',
          startedAt: null,
          progressHistory: [
            {
              sourceType: 'challenge_left',
              sourceId: 'challenge-1',
              occurredAt: '2026-07-06T11:00:00.000Z',
              previousStatus: 'joined',
            },
          ],
        },
      ],
    });

    expect(result.analytics.eventCounts.challenge_declined).toBe(1);
    expect(result.analytics.eventCounts.challenge_dropped).toBe(0);
    expect(result.lifecycleEvents).toContainEqual(expect.objectContaining({
      type: 'challenge_declined',
      participantId: 'p5',
      userId: 5,
      sourceId: 'challenge-1',
      occurredAt: '2026-07-06T11:00:00.000Z',
    }));
  });

  it('includes approved client-submission moderation events in challenge results analytics', async () => {
    const challenge = makeChallenge({ id: 'challenge-1', participants: [] });
    const submissions = [{
      id: 'submission-1',
      submittedByUserId: 77,
      reviewedByUserId: 44,
      approvedChallengeId: 'challenge-1',
      status: 'approved',
      moderationStatus: 'approved',
      submittedAt: '2026-07-01T09:00:00.000Z',
      reviewedAt: '2026-07-01T12:00:00.000Z',
    }];
    const models = makeModels(challenge, submissions);

    const result = await getManagedChallengeResults({
      models,
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(models.ChallengeSubmission.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'submittedByUserId', 'submittedAt', 'reviewedAt'],
      where: { approvedChallengeId: 'challenge-1' },
    });
    expect(result.analytics.eventCounts.submission_flagged).toBe(1);
    expect(result.analytics.eventCounts.moderation_action_taken).toBe(1);
    expect(result.lifecycleEvents).toContainEqual(expect.objectContaining({
      type: 'submission_flagged',
      participantId: '',
      userId: 77,
      sourceId: 'submission-1',
      occurredAt: '2026-07-01T09:00:00.000Z',
    }));
    expect(result.lifecycleEvents).toContainEqual(expect.objectContaining({
      type: 'moderation_action_taken',
      userId: 77,
      sourceId: 'submission-1',
      occurredAt: '2026-07-01T12:00:00.000Z',
    }));
  });
});
