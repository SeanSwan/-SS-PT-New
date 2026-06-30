import { describe, expect, it } from 'vitest';
import { getManagedChallengeResults } from '../../services/gamification/challengeResultsService.mjs';
import { makeChallenge, makeModels, makeParticipant } from './challengeResultsTestFactory.mjs';

const withChallengeData = (overrides = {}) => {
  const base = makeChallenge(overrides).toJSON();
  const data = {
    ...base,
    ...overrides,
  };
  return {
    ...data,
    toJSON: () => data,
  };
};

describe('challenge results rule insights', () => {
  it('surfaces assigned-session rule impact from persisted workout-event evidence', async () => {
    const participants = [
      makeParticipant({
        id: 'participant-1',
        userId: 11,
        status: 'active',
        currentProgress: 1,
        progressPercentage: 33.3,
        progressHistory: [
          {
            sourceType: 'workout_completed',
            sourceId: 'assigned-session-1',
            occurredAt: '2026-07-09T12:00:00.000Z',
            delta: 1,
            progressUnit: 'sessions',
            assignedSession: true,
            currentProgress: 1,
            previousProgress: 0,
          },
        ],
      }),
      makeParticipant({
        id: 'participant-2',
        userId: 12,
        status: 'active',
        currentProgress: 1,
        progressPercentage: 33.3,
        progressHistory: [
          {
            sourceType: 'workout_completed',
            sourceId: 'ad-hoc-session-1',
            occurredAt: '2026-07-10T12:00:00.000Z',
            delta: 1,
            progressUnit: 'sessions',
            assignedSession: false,
            currentProgress: 1,
            previousProgress: 0,
          },
        ],
      }),
    ];
    const challenge = withChallengeData({
      participants,
      progressUnit: 'sessions',
      requirements: ['Complete assigned sessions from the trainer plan or workout logger.'],
      tags: ['sessions', 'assigned-session', 'template:session_completion'],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.ruleInsights).toEqual([
      expect.objectContaining({
        id: 'assigned-session-rule',
        label: 'Assigned sessions only',
        verdict: 'hurting',
        totalWorkoutEvents: 2,
        matchingWorkoutEvents: 1,
        offRuleWorkoutEvents: 1,
        evidenceRate: 50,
        summary: '1 of 2 workout events came from assigned sessions.',
      }),
    ]);
  });

  it('keeps assigned-session rule insights honest when no workout evidence exists yet', async () => {
    const challenge = withChallengeData({
      participants: [],
      progressUnit: 'sessions',
      requirements: ['Complete assigned sessions from the trainer plan or workout logger.'],
      tags: ['sessions', 'assigned-session', 'template:session_completion'],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.ruleInsights).toEqual([
      expect.objectContaining({
        id: 'assigned-session-rule',
        verdict: 'not_enough_data',
        totalWorkoutEvents: 0,
        matchingWorkoutEvents: 0,
        offRuleWorkoutEvents: 0,
        evidenceRate: 0,
        summary: 'Assigned-session rule has no workout-event evidence yet.',
      }),
    ]);
  });

  it('does not invent rule impact signals for generic challenges without assigned-session evidence', async () => {
    const challenge = withChallengeData({
      participants: [makeParticipant({ id: 'participant-1', userId: 11 })],
      progressUnit: 'sessions',
      requirements: ['Complete any workout session.'],
      tags: ['sessions'],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.ruleInsights).toEqual([]);
  });
});