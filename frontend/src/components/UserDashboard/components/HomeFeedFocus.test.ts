import { describe, expect, it } from 'vitest';
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import {
  buildActivityFeedFocus,
  buildHashtagFeedFocus,
  homeFeedFocusSubtitle,
  homeFeedFocusTitle,
  normalizeHashtagSlug,
  postMatchesActivityFocus,
} from './HomeFeedFocus';

const post = (overrides: Partial<Post>): Post => ({
  id: 'post-1',
  content: 'Progress proof',
  type: 'workout',
  createdAt: '2026-06-29T12:00:00.000Z',
  user: {
    id: 'user-1',
    firstName: 'Sean',
    lastName: 'Swan',
    username: 'sean',
    role: 'client',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  ...overrides,
});

describe('HomeFeedFocus helpers', () => {
  it('normalizes trending tags into hashtag focus state', () => {
    expect(normalizeHashtagSlug('#Swan-Progress!')).toBe('swan-progress');

    const focus = buildHashtagFeedFocus({ name: '#SwanProgress', count: 7 });

    expect(focus).toEqual({
      kind: 'hashtag',
      hashtag: 'swanprogress',
      label: '#SwanProgress',
      count: 7,
    });
    expect(homeFeedFocusTitle(focus)).toBe('#SwanProgress posts');
    expect(homeFeedFocusSubtitle(focus)).toContain('7 tagged posts');
  });

  it('preserves exact live activity post metadata for focused detail', () => {
    const focus = buildActivityFeedFocus({
      id: 'event-1',
      user: 'Maya',
      action: 'shared a workout',
      time: '2m ago',
      source: 'live',
      postId: '42',
      postType: 'workout',
      preview: 'Hit a new PR today',
    });

    expect(focus).toMatchObject({
      kind: 'activity',
      activityId: 'event-1',
      postId: '42',
      postType: 'workout',
      preview: 'Hit a new PR today',
    });
    expect(homeFeedFocusTitle(focus)).toBe('Activity detail');
    expect(homeFeedFocusSubtitle(focus)).toBe('Hit a new PR today');
    expect(postMatchesActivityFocus(post({ id: '42' }), focus)).toBe(true);
    expect(postMatchesActivityFocus(post({ id: '43' }), focus)).toBe(false);
  });

  it('falls back to post-type matching when an activity has no exact post id', () => {
    const focus = buildActivityFeedFocus({
      id: 'event-2',
      user: 'Ari',
      action: 'completed a workout',
      time: 'just now',
      source: 'live',
      postType: 'workout',
    });

    expect(postMatchesActivityFocus(post({ type: 'workout' }), focus)).toBe(true);
    expect(postMatchesActivityFocus(post({ type: 'milestone' }), focus)).toBe(false);
  });
});
