import { describe, expect, it } from 'vitest';
import { buildChallengeProgressImpactReceipt } from '../../services/gamification/challengeProgressImpactReceipt.mjs';

describe('challenge progress impact receipt', () => {
  it('builds a capped user-facing receipt from updated challenge progress rows', () => {
    const receipt = buildChallengeProgressImpactReceipt({
      updatedCount: 2,
      skippedCount: 1,
      updated: [
        {
          participantId: 'participant-1',
          challengeId: 'challenge-1',
          title: 'Session Streak',
          progressUnit: 'sessions',
          delta: 1,
          currentProgress: 2,
          progressPercentage: 66.666,
          completed: false,
          xpReward: 125,
          bonusXpReward: 25,
          assignedSessionOnly: true,
          assignedSession: true,
        },
        {
          participantId: 'participant-2',
          challengeId: 'challenge-2',
          title: '150 Minute Week',
          progressUnit: 'minutes',
          delta: 45,
          currentProgress: 150,
          progressPercentage: 100,
          completed: true,
          xpReward: 200,
          bonusXpReward: 50,
        },
      ],
      skipped: [{ participantId: 'participant-3', reason: 'duplicate_event' }],
    });

    expect(receipt).toEqual({
      status: 'processed',
      updatedCount: 2,
      skippedCount: 1,
      headline: '2 challenges moved from this workout',
      updates: [
        {
          challengeId: 'challenge-1',
          title: 'Session Streak',
          delta: 1,
          progressUnit: 'sessions',
          currentProgress: 2,
          progressPercentage: 66.67,
          completed: false,
          xpEarned: 0,
          assignedSessionOnly: true,
          assignedSession: true,
        },
        {
          challengeId: 'challenge-2',
          title: '150 Minute Week',
          delta: 45,
          progressUnit: 'minutes',
          currentProgress: 150,
          progressPercentage: 100,
          completed: true,
          xpEarned: 250,
        },
      ],
    });
    expect(JSON.stringify(receipt)).not.toContain('participant-');
    expect(JSON.stringify(receipt)).not.toContain('duplicate_event');
  });

  it('returns a safe failed receipt without raw error text', () => {
    const receipt = buildChallengeProgressImpactReceipt({ error: 'database secret stack' }, 'failed');

    expect(receipt).toEqual({
      status: 'failed',
      updatedCount: 0,
      skippedCount: 0,
      headline: null,
      updates: [],
    });
    expect(JSON.stringify(receipt)).not.toContain('database secret stack');
  });
});
