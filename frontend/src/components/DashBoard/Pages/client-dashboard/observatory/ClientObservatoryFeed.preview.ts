import {
  type FeedPostPreview,
  compactNumber,
  countCollection,
  timeLabel,
} from './ClientObservatoryData';

export const CONTROL_TEXT_PATTERN = /[\u0000-\u001F\u007F]/g;

export interface NormalizedFeedPostPreview {
  key: string;
  author: string;
  avatarUrl?: string;
  content: string;
  mediaUrl?: string;
  timeAgo: string;
  likesLabel: string;
}

const cleanText = (value: unknown, fallback = '', maxLength = 160): string => {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(CONTROL_TEXT_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}...` : cleaned;
};

const cleanAssetUrl = (value: unknown): string | undefined => {
  const cleaned = cleanText(value, '', 2048);
  if (!cleaned || /^javascript:/i.test(cleaned)) return undefined;
  return cleaned;
};

const hasRenderableSignal = (post: FeedPostPreview): boolean => Boolean(
  cleanText(post.content)
    || cleanText(post.user?.firstName)
    || cleanText(post.user?.lastName)
    || cleanText(post.user?.username)
    || cleanAssetUrl(post.mediaUrl)
    || cleanAssetUrl(post.user?.photo)
    || cleanAssetUrl(post.user?.profileImage),
);

const previewHash = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
};

export const stablePreviewKey = (
  post: FeedPostPreview,
  author: string,
  content: string,
): string => {
  const id = cleanText(String(post.id ?? ''), '', 96);
  if (id) return `post-${id}`;
  const fingerprint = [
    cleanText(post.createdAt, 'recent', 96),
    author,
    content,
    cleanText(post.mediaUrl, '', 160),
  ].join('|');
  return `post-preview-${previewHash(fingerprint)}`;
};

export const postPreviewAuthor = (post: FeedPostPreview): string => {
  const first = cleanText(post.user?.firstName, '', 48);
  const last = cleanText(post.user?.lastName, '', 48);
  const username = cleanText(post.user?.username, '', 64);
  return [first, last].filter(Boolean).join(' ') || username || 'SwanStudios athlete';
};

export const normalizeFeedPostPreviews = (
  posts: FeedPostPreview[],
): NormalizedFeedPostPreview[] => posts
  .filter(hasRenderableSignal)
  .map((post) => {
    const author = postPreviewAuthor(post);
    const content = cleanText(post.content, 'Shared a training update.', 240);
    return {
      key: stablePreviewKey(post, author, content),
      author,
      avatarUrl: cleanAssetUrl(post.user?.photo) || cleanAssetUrl(post.user?.profileImage),
      content,
      mediaUrl: cleanAssetUrl(post.mediaUrl),
      timeAgo: timeLabel(cleanText(post.createdAt, '', 96)),
      likesLabel: compactNumber(countCollection(post.likes)),
    };
  });
