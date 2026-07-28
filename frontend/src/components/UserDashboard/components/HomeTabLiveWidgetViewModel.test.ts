import { describe, expect, it } from 'vitest';
import {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  extractTrendingTagNames,
} from './HomeTabLiveWidgetViewModel';

describe('HomeTabLiveWidgetViewModel', () => {
  it('keeps post metadata on live and fallback activity rows for drilldowns', () => {
    const live = buildHomeLiveActivity({
      nowMs: new Date('2026-06-29T10:02:00Z').getTime(),
      events: [{
        id: 'event-1',
        type: 'post_created',
        userName: 'Maya',
        postType: 'workout',
        postId: 42,
        preview: 'Shared exact workout proof',
        timestamp: '2026-06-29T10:00:00Z',
      }],
      displayName: 'Sean',
    });

    expect(live[0]).toMatchObject({
      id: 'event-1',
      action: 'shared a workout',
      postId: '42',
      postType: 'workout',
      preview: 'Shared exact workout proof',
    });

    const fallback = buildHomeLiveActivity({
      nowMs: new Date('2026-06-29T10:02:00Z').getTime(),
      events: [],
      feedPosts: [{
        id: 'post-1',
        type: 'milestone',
        content: 'Progress charts are live',
        createdAt: '2026-06-29T09:02:00Z',
        user: { firstName: 'Sean' },
      }],
      displayName: 'Sean',
    });

    expect(fallback[0]).toMatchObject({
      id: 'post-1',
      postId: 'post-1',
      postType: 'milestone',
      preview: 'Progress charts are live',
    });
  });

  it('maps badges, leaderboard rows, and trending tags from live payloads', () => {
    const showcase = buildHomeBadgeShowcase({
      achievements: [{
        id: 'ua-1',
        pointsAwarded: 250,
        achievement: { name: 'First Forge', icon: 'F', badgeImageUrl: '/badge.png' },
      }],
      leaderboard: [{
        id: 'leader-1',
        points: 4200,
        client: { firstName: 'Ari', username: 'ari' },
      }],
      currentUserName: 'Sean',
      currentUserPoints: 900,
    });

    expect(showcase.badges).toEqual([
      { id: 'ua-1', name: 'First Forge', icon: 'F', imageUrl: '/badge.png' },
    ]);
    expect(showcase.leaderboardRows).toEqual([
      { id: 'leader-1', name: 'Ari', points: 4200 },
    ]);

    expect(extractTrendingTagNames({
      data: [
        { name: 'StrengthSurge', weeklyCount: 9 },
        { slug: 'level-up', postCount: 3 },
      ],
    })).toEqual([
      { name: 'StrengthSurge', count: 9 },
      { name: 'level-up', count: 3 },
    ]);
  });
});
