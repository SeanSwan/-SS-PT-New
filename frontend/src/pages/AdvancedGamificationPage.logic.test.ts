import { describe, expect, it } from 'vitest';
import {
  clampGamificationPercent,
  formatGamificationLevel,
  formatGamificationNumber,
  formatGamificationRank,
  getAchievementDescription,
  getAchievementName,
  getLeaderboardClientName,
  getLeaderboardLevel,
  getLeaderboardRowKey,
  getRewardPointCost,
  getRewardName,
  getTransactionDescription,
  getTransactionPointLabel,
} from './AdvancedGamificationPage.logic';

const CONTROL_CHARS = /\p{Cc}/u;

describe('AdvancedGamificationPage display helpers', () => {
  it('normalizes malformed gamification display copy before rendering', () => {
    const values = {
      achievementName: getAchievementName({ achievement: { name: '  Tempo\u0000\nArchitect  '.repeat(12) } }),
      achievementDescription: getAchievementDescription({
        achievement: { description: '\tProgress\tproof\nwith\u0007control chars'.repeat(8) },
        pointsAwarded: 75,
      }),
      rewardName: getRewardName({ name: '\u0000 Recovery\nCredit '.repeat(10) }),
      transactionDescription: getTransactionDescription({ description: '\u0000Raw\ntransaction\tcopy'.repeat(8) }),
      leaderboardName: getLeaderboardClientName({ firstName: ' Test\u0000', lastName: '\nClient '.repeat(12) }),
      legacyAchievementName: getAchievementName({ title: '  Legacy\nBadge\u0000Name ' }),
    };

    for (const value of Object.values(values)) {
      expect(value).not.toMatch(CONTROL_CHARS);
      expect(value).not.toMatch(/\s{2,}/);
      expect(value.length).toBeLessThanOrEqual(83);
    }

    expect(values.achievementName).toMatch(/^Tempo Architect/);
    expect(values.achievementDescription).toMatch(/^Progress proof with control chars/);
    expect(values.rewardName).toMatch(/^Recovery Credit/);
    expect(values.transactionDescription).toMatch(/^Raw transaction copy/);
    expect(values.leaderboardName).toMatch(/^Test Client/);
    expect(values.legacyAchievementName).toBe('Legacy Badge Name');
    expect(getAchievementDescription({ pointsAwarded: Number.POSITIVE_INFINITY })).toBe('0 XP awarded');
    expect(getLeaderboardRowKey({ client: { firstName: ' Test\u0000', lastName: '\nClient ' }, overallLevel: 7 }, 2)).toMatch(/^leaderboard-/);
    expect(getLeaderboardLevel({ overallLevel: 'bad' })).toBe(1);
  });

  it('keeps level floors separate from generic XP number clamps', () => {
    expect(formatGamificationNumber(-7)).toBe('0');
    expect(formatGamificationNumber('bad')).toBe('0');
    expect(formatGamificationLevel(-7)).toBe('1');
    expect(formatGamificationLevel('bad')).toBe('1');
    expect(clampGamificationPercent(175)).toBe(100);
    expect(clampGamificationPercent(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(formatGamificationRank(1)).toBe('1st');
    expect(formatGamificationRank(12)).toBe('12th');
    expect(formatGamificationRank('bad')).toBe('Not ranked');
  });

  it('preserves zero-cost rewards and safe point-history signs', () => {
    expect(getRewardPointCost({ pointsCost: 0, pointCost: 500 })).toBe(0);
    expect(getRewardPointCost({ pointsCost: 'bad', pointCost: 500 })).toBe(500);
    expect(getRewardPointCost({ pointsCost: -10, pointCost: 250 })).toBe(250);
    expect(getRewardPointCost({ pointCost: 'bad' })).toBe(0);

    expect(getTransactionPointLabel({ transactionType: 'earn', points: 30 })).toBe('+30 XP');
    expect(getTransactionPointLabel({ transactionType: 'spend', points: 30 })).toBe('-30 XP');
    expect(getTransactionPointLabel({ transactionType: 'spend', points: -30 })).toBe('-30 XP');
    expect(getTransactionPointLabel({ transactionType: 'expire', points: 5 })).toBe('-5 XP');
    expect(getTransactionPointLabel({ transactionType: 'adjustment', points: -25 })).toBe('-25 XP');
    expect(getTransactionPointLabel({ transactionType: 'adjustment', points: 25 })).toBe('+25 XP');
    expect(getTransactionPointLabel({ transactionType: 'earn', points: 'bad' })).toBe('0 XP');
  });

  it('rejects array, object, and non-decimal numeric tokens before rendering XP truth', () => {
    expect(formatGamificationNumber([500])).toBe('0');
    expect(formatGamificationNumber('0x10')).toBe('0');
    expect(formatGamificationLevel([6])).toBe('1');
    expect(clampGamificationPercent({ valueOf: () => 88 })).toBe(0);
    expect(formatGamificationRank('1e2')).toBe('Not ranked');

    expect(getRewardPointCost({ pointCost: [500] })).toBe(0);
    expect(getRewardPointCost({ pointsCost: '0x10', pointCost: '250' })).toBe(250);
    expect(getTransactionPointLabel({ transactionType: 'earn', points: [30] })).toBe('0 XP');
    expect(getTransactionPointLabel({ transactionType: 'spend', points: { valueOf: () => 30 } })).toBe('0 XP');
    expect(getLeaderboardLevel({ level: [6] })).toBe(1);
  });
});
