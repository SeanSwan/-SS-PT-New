import { describe, expect, it } from 'vitest';
import {
  assessStreakRisk,
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  buildHomeTrainingProof,
  buildLatestPostView,
  buildCreatorStats,
  extractTrendingTagNames,
  buildHomePostPayload,
  buildHomeTopBarActions,
  parseUnreadNotificationCount,
  previewHomePostIntent,
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

  it('builds top bar actions from unread inbox and notification counts with real targets', () => {
    const actions = buildHomeTopBarActions({ inboxUnread: 4, notificationUnread: 8 });

    expect(actions.map((action) => [action.label, action.target, action.count])).toEqual([
      ['Search dashboard', 'search', 0],
      ['Open inbox', 'messages', 4],
      ['View notifications', 'notifications', 8],
    ]);
  });

  it('maps selected mood and media into the social post payload', () => {
    const media = new File(['image'], 'proof.png', { type: 'image/png' });

    expect(buildHomePostPayload('Logged a heavy leg day', 'workout', media)).toEqual({
      content: 'Logged a heavy leg day #WorkoutDiary #SwanProgress',
      type: 'workout',
      visibility: 'friends',
      media,
    });

    expect(buildHomePostPayload('New sketch', 'art')).toMatchObject({
      content: 'New sketch #SwanCreative #Art',
      type: 'art',
      visibility: 'friends',
    });
  });

  it('infers smart labels and hashtags when quick post mood is broad', () => {
    const workoutPayload = buildHomePostPayload('Finished leg day with 5 sets of squats', 'community');
    expect(workoutPayload).toMatchObject({
      type: 'workout',
      visibility: 'friends',
    });
    expect(workoutPayload.content).toContain('#WorkoutDiary');
    expect(workoutPayload.content).toContain('#SwanProgress');

    const musicPayload = buildHomePostPayload('New beat in the studio for tonight', 'community');
    expect(musicPayload).toMatchObject({
      type: 'music',
      visibility: 'friends',
    });
    expect(musicPayload.content).toContain('#SwanCreative');
    expect(musicPayload.content).toContain('#MusicProduction');
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

  it('previews the SAME smart type + hashtags the payload will actually ship (single source of truth)', () => {
    const content = 'Hit a new PR on the trap bar today';
    const preview = previewHomePostIntent(content, 'community');
    const payload = buildHomePostPayload(content, 'community');

    // The preview must match the submitted payload exactly — no drift.
    expect(preview.type).toBe(payload.type);
    expect(preview.hashtags.length).toBeGreaterThan(0);
    preview.hashtags.forEach((tag) => {
      expect(payload.content).toContain(tag);
    });
  });

  it('buckets logged workouts into a REAL 4-week trend with a truthful share line', () => {
    const nowMs = new Date('2026-06-12T12:00:00Z').getTime();
    const day = 24 * 60 * 60 * 1000;
    const proof = buildHomeTrainingProof([
      { id: 'w1', status: 'completed', title: 'Push Day', date: new Date(nowMs - 1 * day).toISOString(), duration: 45 },
      { id: 'w2', status: 'completed', date: new Date(nowMs - 2 * day).toISOString(), duration: 30 },
      { id: 'w3', status: 'completed', title: 'Leg Day', date: new Date(nowMs - 9 * day).toISOString(), duration: 60 },
      { id: 'w4', status: 'completed', date: new Date(nowMs - 22 * day).toISOString() },
      { id: 'old', status: 'completed', date: new Date(nowMs - 60 * day).toISOString() },
    ], nowMs);

    // w4 is 22d ago (4th week back → bucket 0); w3 is 9d (bucket 2); w1+w2 this week (bucket 3).
    expect(proof.weeklyCounts).toEqual([1, 0, 1, 2]);
    expect(proof.thisWeekCount).toBe(2);
    expect(proof.minutesThisWeek).toBe(75);
    expect(proof.lastSession).toEqual({ title: 'Push Day', when: '1d ago' });
    // O3 weekly recap: the real week-over-week delta rides the share line,
    // and the newest session id is exposed for the workout-proof attachment.
    expect(proof.weekDelta).toBe(1);
    expect(proof.latestSessionId).toBe('w1');
    expect(proof.shareLine).toBe('Logged 2 workouts this week — 75 focused minutes, up 1 from last week. Progress you can see.');
  });

  it('excludes planned and in-progress workout rows from training proof', () => {
    const nowMs = new Date('2026-08-03T18:00:00Z').getTime();
    const proof = buildHomeTrainingProof([
      { id: 'done', status: 'completed', date: '2026-08-03T16:00:00Z', duration: 45 },
      { id: 'planned', status: 'planned', date: '2026-08-03T17:00:00Z', duration: 60 },
      { id: 'active', status: 'in_progress', date: '2026-08-03T17:30:00Z', duration: 30 },
    ], nowMs);

    expect(proof.thisWeekCount).toBe(1);
    expect(proof.minutesThisWeek).toBe(45);
    expect(proof.latestSessionId).toBe('done');
  });

  it('reports honest zeros and no share line when nothing is logged', () => {
    const proof = buildHomeTrainingProof([], new Date('2026-06-12T12:00:00Z').getTime());

    expect(proof.weeklyCounts).toEqual([0, 0, 0, 0]);
    expect(proof.thisWeekCount).toBe(0);
    expect(proof.lastSession).toBeNull();
    expect(proof.weekDelta).toBeNull();
    expect(proof.latestSessionId).toBeNull();
    expect(proof.shareLine).toBeNull();
  });

  it('flags streak risk only when the streak is live, today is unlogged, and evening started (O3)', () => {
    const eveningMs = new Date('2026-06-12T19:00:00').getTime();
    const morningMs = new Date('2026-06-12T09:00:00').getTime();
    const todaySession = [{ id: 's1', status: 'completed', date: new Date('2026-06-12T07:30:00').toISOString() }];
    const yesterdaySession = [{ id: 's2', status: 'completed', date: new Date('2026-06-11T18:00:00').toISOString() }];

    // Live streak + nothing today + evening → rescue fires.
    expect(assessStreakRisk(yesterdaySession, 4, eveningMs)).toBe(true);
    // Trained today → safe.
    expect(assessStreakRisk(todaySession, 4, eveningMs)).toBe(false);
    // Morning → not yet urgent.
    expect(assessStreakRisk(yesterdaySession, 4, morningMs)).toBe(false);
    // No streak to lose → never urgent.
    expect(assessStreakRisk(yesterdaySession, 0, eveningMs)).toBe(false);
  });

  it('builds the latest-post view from REAL fields — no fabricated engagement numbers', () => {
    const nowMs = new Date('2026-06-11T10:05:00Z').getTime();
    const view = buildLatestPostView([
      {
        id: 'p1',
        content: 'New PR on the trap bar.',
        likesCount: 4,
        commentsCount: 1,
        mediaUrl: 'https://cdn.example.com/pr-clip.mp4',
        createdAt: '2026-06-11T10:00:00Z',
      },
    ], nowMs);

    expect(view).toEqual({
      caption: 'New PR on the trap bar.',
      mediaUrl: 'https://cdn.example.com/pr-clip.mp4',
      isVideo: true,
      timeAgo: '5m ago',
      likes: 4,
      comments: 1,
    });
  });

  it('returns null for the latest-post view when the feed is empty (honest empty state)', () => {
    expect(buildLatestPostView([], Date.now())).toBeNull();
    expect(buildLatestPostView(null, Date.now())).toBeNull();
  });

  it('reads zero engagement as zero — never inflates counts', () => {
    const view = buildLatestPostView([
      { id: 'p1', content: 'Quiet post', createdAt: '2026-06-11T09:00:00Z' },
    ], new Date('2026-06-11T10:00:00Z').getTime());

    expect(view).toMatchObject({ likes: 0, comments: 0, mediaUrl: null, isVideo: false });
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
