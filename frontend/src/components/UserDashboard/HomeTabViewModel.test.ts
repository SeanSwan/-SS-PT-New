import { describe, expect, it } from 'vitest';
import {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  buildHomeStories,
  buildCreatorStats,
  extractTrendingTagNames,
  buildHomePostPayload,
  buildHomeTopBarActions,
  parseUnreadNotificationCount,
  resolveHomeAvatarSrc,
  selectActiveChallengeSummary,
  sumUnreadConversations,
} from './components/HomeTabViewModel';

describe('HomeTabViewModel', () => {
  it('derives creator stats from real dashboard/profile data without artificial floors', () => {
    const stats = buildCreatorStats({
      profileStats: { posts: 2, followers: 5, following: 6, workouts: 0, points: 0, level: 1 },
      profilePosts: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      feedPosts: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }, { id: 'f4' }],
      followStats: {
        followers: { count: 9, list: [] },
        following: { count: 10, list: [] },
        ratio: 0.9,
      },
    });

    expect(stats).toEqual({ posts: 2, followers: 9, following: 10 });
  });

  it('falls back to profile posts and feed posts only when profile stats are absent', () => {
    expect(buildCreatorStats({
      profilePosts: [{ id: 'p1' }, { id: 'p2' }],
      feedPosts: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }],
    })).toEqual({ posts: 2, followers: 0, following: 0 });

    expect(buildCreatorStats({
      profilePosts: [],
      feedPosts: [{ id: 'f1' }],
    })).toEqual({ posts: 1, followers: 0, following: 0 });
  });

  it('prioritizes real user avatars over brand artwork', () => {
    expect(resolveHomeAvatarSrc({
      profilePhoto: 'https://cdn.example.com/profile.jpg',
      authPhoto: 'https://cdn.example.com/auth.jpg',
      fallbackAvatar: '/fallback.svg',
    })).toBe('https://cdn.example.com/profile.jpg');

    expect(resolveHomeAvatarSrc({
      authPhoto: 'https://cdn.example.com/auth.jpg',
      fallbackAvatar: '/fallback.svg',
    })).toBe('https://cdn.example.com/auth.jpg');

    expect(resolveHomeAvatarSrc({ fallbackAvatar: '/fallback.svg' })).toBe('/fallback.svg');
  });

  it('builds top bar actions from unread inbox and notification counts', () => {
    const actions = buildHomeTopBarActions({ inboxUnread: 4, notificationUnread: 8 });

    expect(actions.map((action) => [action.label, action.count])).toEqual([
      ['Search dashboard', 0],
      ['Open inbox', 4],
      ['View notifications', 8],
    ]);
  });

  it('maps selected mood and media into the social post payload', () => {
    const media = new File(['image'], 'proof.png', { type: 'image/png' });

    expect(buildHomePostPayload('Logged a heavy leg day', 'workout', media)).toEqual({
      content: 'Logged a heavy leg day',
      type: 'workout',
      visibility: 'friends',
      media,
    });

    expect(buildHomePostPayload('New sketch', 'art')).toMatchObject({
      content: 'New sketch',
      type: 'art',
      visibility: 'friends',
    });
  });

  it('parses unread notification and message counts from existing API shapes', () => {
    expect(parseUnreadNotificationCount({ unreadCount: 7 })).toBe(7);
    expect(parseUnreadNotificationCount({
      notifications: [
        { isRead: false },
        { read: false },
        { isRead: true },
        { read: true },
      ],
    })).toBe(2);

    expect(sumUnreadConversations([
      { unreadCount: '2' },
      { unreadCount: 3 },
      { unreadCount: null },
    ])).toBe(5);
    expect(sumUnreadConversations({
      conversations: [{ unreadCount: 4 }, { unreadCount: '6' }],
    })).toBe(10);
  });

  it('builds garden stories from real media posts instead of static creator names', () => {
    const stories = buildHomeStories({
      displayName: 'Sean',
      feedPosts: [
        { id: 'p1', mediaUrl: 'https://cdn.example.com/reel.jpg', user: { username: 'IronSean' } },
        { id: 'p2', content: 'Text only update', user: { username: 'TextOnly' } },
        { id: 'p3', mediaUrl: 'https://cdn.example.com/proof.jpg', user: { firstName: 'Maya' } },
      ],
    });

    expect(stories).toEqual([
      { id: 'create-story', label: 'Your Story', tone: 'violet', isCreate: true },
      { id: 'p1', label: 'IronSean', tone: 'cyan', mediaUrl: 'https://cdn.example.com/reel.jpg' },
      { id: 'p3', label: 'Maya', tone: 'violet', mediaUrl: 'https://cdn.example.com/proof.jpg' },
    ]);
  });

  it('builds live activity from socket events, then recent feed posts as fallback', () => {
    const live = buildHomeLiveActivity({
      nowMs: new Date('2026-05-13T10:02:00Z').getTime(),
      events: [{
        id: 'event-1',
        type: 'post_created',
        userName: 'Maya',
        postType: 'reel',
        timestamp: '2026-05-13T10:00:00Z',
      }],
      feedPosts: [],
      displayName: 'Sean',
    });

    expect(live[0]).toMatchObject({
      id: 'event-1',
      user: 'Maya',
      action: 'shared a reel',
      time: '2m ago',
      source: 'live',
    });

    const fallback = buildHomeLiveActivity({
      nowMs: new Date('2026-05-13T10:02:00Z').getTime(),
      events: [],
      feedPosts: [{
        id: 'post-1',
        type: 'workout',
        createdAt: '2026-05-13T09:02:00Z',
        user: { firstName: 'Sean' },
      }],
      displayName: 'Sean',
    });

    expect(fallback[0]).toMatchObject({
      id: 'post-1',
      user: 'Sean',
      action: 'shared a workout',
      time: '1h ago',
      source: 'feed',
    });
  });

  it('selects a real active challenge and refuses demo challenge data as truth', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: true,
      challenges: [{ id: 'demo', title: 'Fake Challenge', status: 'active' }],
    })).toBeNull();

    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [
        { id: 'a', title: 'Open Challenge', status: 'active', progress: 15, daysLeft: 9, participants: 10 },
        { id: 'b', title: 'Joined Challenge', status: 'active', joined: true, progress: 67, daysLeft: 3, participants: 42, reward: '500 XP' },
      ],
    })).toEqual({
      id: 'b',
      title: 'Joined Challenge',
      progress: 67,
      daysLeft: 3,
      participants: 42,
      reward: '500 XP',
      joined: true,
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
