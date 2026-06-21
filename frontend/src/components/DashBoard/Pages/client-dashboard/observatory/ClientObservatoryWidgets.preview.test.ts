import { describe, expect, it } from 'vitest';
import {
  normalizeAchievementRows,
  normalizeChallengeWidget,
  normalizeLeaderboardRows,
  normalizeTagRows,
} from './ClientObservatoryWidgets.preview';

describe('ClientObservatoryWidgets preview normalization', () => {
  it('cleans malformed achievement copy and emits stable non-index keys', () => {
    const rows = normalizeAchievementRows([
      {
        achievement: {
          name: ' First\u0000 Forge ',
          icon: 'XP',
          pointValue: 250,
        },
      },
      {
        achievement: {
          title: '\u0007',
          iconEmoji: 'LONG_BADGE_ICON',
        },
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      label: 'First Forge',
      value: 'XP',
    });
    expect(rows[0].key).toMatch(/^achievement-/);
    expect(rows[0].key).not.toBe('0');
    expect(rows[1]).toMatchObject({
      label: 'Achievement',
      value: 'Badge',
    });
  });

  it('clamps leaderboard metrics and cleans player names without index keys', () => {
    const rows = normalizeLeaderboardRows([
      {
        client: { firstName: 'Ari\n', lastName: ' Swan\u0000' },
        points: -25,
      },
      {
        client: { username: '  Vault\tRunner  ' },
        overallLevel: 12,
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        label: '1. Ari Swan',
        value: '0',
      }),
      expect.objectContaining({
        label: '2. Vault Runner',
        value: '12',
      }),
    ]);
    expect(rows[0].key).toMatch(/^leader-/);
    expect(rows[0].key).not.toBe('0');
    expect(rows[1].key).not.toBe(rows[0].key);
  });

  it('normalizes active challenge copy without leaking raw control text', () => {
    expect(normalizeChallengeWidget({
      title: '  Summer\u0000Strength  ',
      description: 'Lift safely\nwithout rushing.',
      currentProgress: 9,
      target: 10,
    })).toEqual({
      title: 'Summer Strength',
      description: 'Lift safely without rushing.',
      progress: 90,
    });

    expect(normalizeChallengeWidget({
      title: '\u0007',
      description: '',
      progress: 140,
    })).toEqual({
      title: 'No active challenge yet',
      description: 'Join a community challenge when you are ready to compete.',
      progress: 100,
    });
  });

  it('deduplicates and filters feed tags into deterministic rows', () => {
    const rows = normalizeTagRows([' #PR ', '#pr', 'client@example.com', '#Recovery_Day']);

    expect(rows).toEqual([
      expect.objectContaining({
        label: '#pr',
        value: 'tag',
      }),
      expect.objectContaining({
        label: '#recovery_day',
        value: 'tag',
      }),
    ]);
    expect(rows[0].key).toMatch(/^tag-/);
    expect(normalizeTagRows([])).toEqual([{
      key: 'tags-empty',
      label: 'No tags yet',
      value: '--',
    }]);
  });
});
