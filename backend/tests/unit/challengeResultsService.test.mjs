import { describe, expect, it, vi } from 'vitest';
import {
  ChallengeResultsReadError,
  getManagedChallengeResults,
} from '../../services/gamification/challengeResultsService.mjs';
import { makeChallenge, makeModels, makeParticipant } from './challengeResultsTestFactory.mjs';

describe('challenge results service', () => {
  it('builds trainer-managed result rollups from persisted participant rows', async () => {
    const challenge = makeChallenge({
      participants: [
        makeParticipant({
          id: 'p1',
          userId: 1,
          status: 'completed',
          currentProgress: '12.00',
          progressPercentage: '100.00',
          checkInsCount: 4,
          score: 120,
          xpEarned: 250,
          lastProgressUpdate: '2026-07-09T12:00:00.000Z',
          completedAt: '2026-07-09T12:00:00.000Z',
          progressHistory: [
            {
              sourceType: 'workout_completed',
              sourceId: 'session-1',
              occurredAt: '2026-07-09T12:00:00.000Z',
              delta: 1,
              durationMinutes: 45,
              exercisesCompleted: 6,
              personalRecordCount: 1,
              assignedSession: true,
              currentProgress: 12,
              previousProgress: 11,
              progressUnit: 'sessions',
            },
          ],
          user: { id: 1, firstName: 'Avery', lastName: 'Stone', username: 'avery', photo: 'avery.png' },
        }),
        makeParticipant({
          id: 'p2',
          userId: 2,
          status: 'active',
          currentProgress: '6.00',
          progressPercentage: '50.00',
          checkInsCount: 2,
          score: 60,
          xpEarned: 80,
          lastProgressUpdate: '2026-07-10T12:00:00.000Z',
          progressHistory: [
            { sourceType: 'manual', occurredAt: '2026-07-08T12:00:00.000Z', delta: 2 },
            {
              sourceType: 'workout_completed',
              sourceId: 'session-2',
              occurredAt: '2026-07-10T12:00:00.000Z',
              delta: 2,
              durationMinutes: 30,
              exercisesCompleted: 6,
              personalRecordCount: 0,
              assignedSession: false,
              currentProgress: 6,
              previousProgress: 4,
              progressUnit: 'sessions',
            },
          ],
          user: { id: 2, firstName: 'Blair', lastName: 'Reed', username: 'blair', photo: null },
        }),
        makeParticipant({
          id: 'p3',
          userId: 3,
          status: 'quit',
          currentProgress: '2.00',
          progressPercentage: '16.67',
          checkInsCount: 1,
          score: 20,
          xpEarned: 20,
          lastProgressUpdate: '2026-07-04T12:00:00.000Z',
          user: { id: 3, firstName: 'Casey', lastName: '', username: 'casey', photo: null },
        }),
      ],
    });
    const models = makeModels(challenge);

    const result = await getManagedChallengeResults({
      models,
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(models.Challenge.findByPk).toHaveBeenCalledWith('challenge-1', expect.objectContaining({
      include: expect.any(Array),
    }));
    const participantInclude = models.Challenge.findByPk.mock.calls[0][1].include[0];
    expect(participantInclude.attributes).toContain('teamId');
    expect(result.challenge.title).toBe('July Squad Spark');
    expect(result.summary).toMatchObject({
      participantCount: 3,
      activeParticipantCount: 1,
      completedParticipantCount: 1,
      droppedParticipantCount: 1,
      completionRate: 33.3,
      averageProgressPercentage: 55.6,
      totalCurrentProgress: 20,
      checkInsCount: 7,
      daysLeft: 21,
      maxProgress: 12,
      progressUnit: 'sessions',
    });
    expect(result.workoutImpact).toMatchObject({
      completedWorkoutEvents: 2,
      challengeDerivedActiveMinutes: 75,
      challengeDerivedExercisesCompleted: 12,
      challengeDerivedPersonalRecordCount: 1,
      totalDelta: 3,
      latestWorkoutImpact: {
        participantId: 'p2',
        userId: 2,
        sourceId: 'session-2',
        delta: 2,
        activeMinutes: 30,
        exercisesCompleted: 6,
        personalRecordCount: 0,
        assignedSession: false,
      },
    });
    expect(result.topParticipants.map((participant) => participant.displayName)).toEqual([
      'Avery Stone',
      'Blair Reed',
      'Casey',
    ]);
    expect(result.topParticipants.map((participant) => [participant.displayName, participant.progressDelta])).toEqual([
      ['Avery Stone', 1],
      ['Blair Reed', 2],
      ['Casey', 0],
    ]);
    expect(result.topImprovers.map((participant) => [participant.displayName, participant.progressDelta])).toEqual([
      ['Blair Reed', 2],
      ['Avery Stone', 1],
    ]);
    expect(result.topParticipants[0]).toMatchObject({
      id: 'p1',
      userId: 1,
      currentProgress: 12,
      progressPercentage: 100,
      status: 'completed',
    });
  });

  it('keeps unset participant timestamps null in managed results', async () => {
    const participant = {
      ...makeParticipant({ id: 'p-null-time', userId: 7 }).toJSON(),
      joinedAt: null,
      completedAt: null,
      lastProgressUpdate: null,
    };
    const challenge = makeChallenge({ participants: [participant] });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.topParticipants[0]).toMatchObject({
      id: 'p-null-time',
      joinedAt: null,
      completedAt: null,
      lastProgressUpdate: null,
    });
  });
  it('allows admin review without trainer ownership', async () => {
    const result = await getManagedChallengeResults({
      models: makeModels(makeChallenge({ createdBy: 12, participants: [] })),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.summary.participantCount).toBe(0);
    expect(result.summary.completionRate).toBe(0);
    expect(result.topParticipants).toEqual([]);
  });

  it('rejects trainers who do not own the challenge', async () => {
    await expect(getManagedChallengeResults({
      models: makeModels(makeChallenge({ createdBy: 44 })),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
    })).rejects.toMatchObject({
      name: 'ChallengeResultsReadError',
      publicMessage: 'You cannot manage this challenge',
      statusCode: 403,
    });
  });

  it('fails closed when participant result models are unavailable', async () => {
    await expect(getManagedChallengeResults({
      models: { Challenge: { findByPk: vi.fn() } },
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
    })).rejects.toMatchObject({
      publicMessage: 'Challenge result models unavailable',
      statusCode: 500,
    });
  });
  it('surfaces a typed not-found error for missing challenges', async () => {
    await expect(getManagedChallengeResults({
      models: makeModels(null),
      challengeId: 'missing',
      viewer: { id: 1, role: 'admin' },
    })).rejects.toBeInstanceOf(ChallengeResultsReadError);
  });
  it('lists active participants who need attention by lowest progress', async () => {
    const challenge = makeChallenge({
      participants: [
        makeParticipant({
          id: 'behind-1',
          userId: 11,
          status: 'active',
          currentProgress: 3,
          progressPercentage: 25,
          user: { id: 11, firstName: 'Blair', lastName: 'Reed', username: 'blair', photo: null },
        }),
        makeParticipant({
          id: 'behind-2',
          userId: 12,
          status: 'joined',
          currentProgress: 5.4,
          progressPercentage: 45,
          user: { id: 12, firstName: 'Jordan', lastName: 'Pike', username: 'jordan', photo: null },
        }),
        makeParticipant({
          id: 'not-behind',
          userId: 13,
          status: 'active',
          currentProgress: 6,
          progressPercentage: 50,
          user: { id: 13, firstName: 'Mika', lastName: 'Rivera', username: 'mika', photo: null },
        }),
        makeParticipant({
          id: 'completed',
          userId: 14,
          status: 'completed',
          currentProgress: 12,
          progressPercentage: 100,
          user: { id: 14, firstName: 'Avery', lastName: 'Stone', username: 'avery', photo: null },
        }),
        makeParticipant({
          id: 'dropped',
          userId: 15,
          status: 'quit',
          currentProgress: 1,
          progressPercentage: 8,
          user: { id: 15, firstName: 'Casey', lastName: 'Drop', username: 'casey', photo: null },
        }),
      ],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.needsAttentionParticipants.map((participant) => [
      participant.displayName,
      participant.progressPercentage,
    ])).toEqual([
      ['Blair Reed', 25],
      ['Jordan Pike', 45],
    ]);
  });
});
