/**
 * Shared Reels view-model helpers. Keeps the mounted Reels component small and
 * locks media handling to the same sanitizer used by the dashboard feed.
 */
import { sanitizeImageUrl } from '../../../utils/imageUrl';

export type ReelPost = {
  id: string;
  content?: string;
  type?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    photo?: string;
  };
  comments?: Array<{
    id?: string;
    content?: string;
    user?: { firstName?: string; username?: string };
  }>;
};

export type MediaReel = {
  post: ReelPost;
  mediaUrl: string;
};

const VIDEO_URL_PATTERN = /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i;

export const safeCount = (value?: number) =>
  Number.isFinite(value) && value! > 0 ? Math.floor(value!) : 0;

export const getDisplayName = (post: ReelPost) => {
  const name = [post.user?.firstName, post.user?.lastName].filter(Boolean).join(' ').trim();
  return name || post.user?.username || 'SwanStudios member';
};

export const isTextEntryTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
};

export const isVideoPost = (post: ReelPost, mediaUrl: string) => {
  const mediaType = post.mediaType?.toLowerCase();
  return mediaType === 'video' || mediaType?.startsWith('video/') || VIDEO_URL_PATTERN.test(mediaUrl);
};

export const buildMediaReels = (posts: unknown[]): MediaReel[] =>
  posts
    .map((post) => {
      const reelPost = post as ReelPost;
      const mediaUrl = sanitizeImageUrl(reelPost.mediaUrl);
      return mediaUrl ? { post: reelPost, mediaUrl } : null;
    })
    .filter((item): item is MediaReel => Boolean(item));

export const getCommentsPreview = (post: ReelPost) => {
  if (post.comments?.length) {
    return post.comments
      .slice(0, 2)
      .map((comment) => `${comment.user?.firstName || comment.user?.username || 'Member'}: ${comment.content || ''}`)
      .join(' ');
  }
  return safeCount(post.commentsCount) > 0 ? 'Loading comments...' : 'No comments yet.';
};
