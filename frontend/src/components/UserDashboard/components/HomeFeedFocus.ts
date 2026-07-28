/**
 * FILE: HomeFeedFocus.ts
 * PURPOSE: Pure focus-state helpers for Home feed drilldowns.
 */
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import type { HomeLiveActivityItem, TrendingTagSummary } from './HomeTabViewModel';

export const HOME_FEED_ALL_FOCUS = { kind: 'all' } as const;

export type HomeFeedFocus =
  | typeof HOME_FEED_ALL_FOCUS
  | {
    kind: 'hashtag';
    hashtag: string;
    label: string;
    count: number;
  }
  | {
    kind: 'activity';
    activityId: string;
    label: string;
    subtitle: string;
    postId?: string;
    postType?: string;
    preview?: string;
  };

export function normalizeHashtagSlug(value: string): string {
  return value.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

export function buildHashtagFeedFocus(tag: TrendingTagSummary): HomeFeedFocus {
  const rawName = tag.name.replace(/^#/, '').trim();
  return {
    kind: 'hashtag',
    hashtag: normalizeHashtagSlug(rawName),
    label: `#${rawName || 'community'}`,
    count: Math.max(0, Math.round(tag.count || 0)),
  };
}

export function buildActivityFeedFocus(item: HomeLiveActivityItem): HomeFeedFocus {
  const postType = item.postType?.trim();
  return {
    kind: 'activity',
    activityId: item.id,
    label: `${item.user} ${item.action}`,
    subtitle: item.postId
      ? 'Exact post from this activity'
      : `Current ${postType || 'community'} posts from Home`,
    postId: item.postId,
    postType,
    preview: item.preview,
  };
}

export function isHomeFeedFocused(focus: HomeFeedFocus): boolean {
  return focus.kind !== 'all';
}

export function homeFeedFocusTitle(focus: HomeFeedFocus): string {
  if (focus.kind === 'hashtag') return `${focus.label} posts`;
  if (focus.kind === 'activity') return 'Activity detail';
  return 'Live community signal';
}

export function homeFeedFocusSubtitle(focus: HomeFeedFocus): string {
  if (focus.kind === 'hashtag') {
    const countLabel = focus.count > 0 ? `${focus.count} tagged posts` : 'Posts using this tag';
    return `${countLabel} from the SwanStudios community.`;
  }
  if (focus.kind === 'activity') return focus.preview || focus.subtitle;
  return 'Proof, questions, and coach-marked wins from the SwanStudios floor.';
}

export function postMatchesActivityFocus(post: Post, focus: HomeFeedFocus): boolean {
  if (focus.kind !== 'activity') return true;
  if (focus.postId) return String(post.id) === focus.postId;
  if (focus.postType) return post.type === focus.postType;
  return true;
}
