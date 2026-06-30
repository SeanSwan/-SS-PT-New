import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recordLedgerEntry: vi.fn(),
}));

vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: {
    recordLedgerEntry: mocks.recordLedgerEntry,
  },
}));

import {
  awardWorkoutChallengeCompletionXp,
  getChallengeCompletionReward,
  getChallengeCompletionTitle,
} from '../../services/gamification/challengeCompletionRewardService.mjs';

describe('challenge completion reward service', () => {
  beforeEach(() => {
    mocks.recordLedgerEntry.mockReset();
  });

  it('records idempotent challenge-completion XP ledger entries for workout-completed challenges', async () => {
    const transaction = { id: 'tx-1' };

    const total = await awardWorkoutChallengeCompletionXp({
      userId: 7,
      completions: [{
        challengeId: 'challenge-2',
        title: '150 Minute Week',
        xpReward: 200,
        bonusXpReward: 50,
      }],
      transaction,
    });

    expect(total).toBe(250);
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith({
      userId: 7,
      points: 250,
      transactionType: 'earn',
      source: 'challenge_completion',
      sourceId: 'challenge-2',
      description: 'Challenge Completed: 150 Minute Week',
      metadata: {
        challengeId: 'challenge-2',
        sourceType: 'workout_completed',
      },
      idempotencyKey: 'challenge:7:challenge-2',
      maxPoints: 500,
    }, transaction);
  });

  it('skips completions without positive reward totals', async () => {
    const total = await awardWorkoutChallengeCompletionXp({
      userId: 7,
      completions: [{ challengeId: 'challenge-3', xpReward: 0, bonusXpReward: null }],
      transaction: null,
    });

    expect(total).toBe(0);
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('normalizes fallback titles and reward totals', () => {
    expect(getChallengeCompletionTitle({ challengeId: 'challenge-5' })).toBe('challenge-5');
    expect(getChallengeCompletionTitle({})).toBe('Challenge');
    expect(getChallengeCompletionReward({ xpReward: '20', bonusXpReward: '7.5' })).toBe(27.5);
    expect(getChallengeCompletionReward({ xpReward: -20, bonusXpReward: Number.NaN })).toBe(0);
  });
});
