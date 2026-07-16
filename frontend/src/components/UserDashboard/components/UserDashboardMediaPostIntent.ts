/**
 * Shared smart post payload builder for UserDashboard media uploads.
 */

import type { PostType } from '../../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../../Social/Feed/utils/postIntentInference';

const normalizeDashboardMediaCaption = (content: string) => (
  content
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

export function buildUserDashboardMediaPost(
  content: string,
  selectedType: PostType,
  media: File,
) {
  const trimmedContent = normalizeDashboardMediaCaption(content);
  const smartIntent = inferSmartPostIntent(trimmedContent, selectedType);
  const taggedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    trimmedContent,
  );

  return {
    content: taggedContent,
    type: smartIntent.submissionType,
    visibility: 'friends' as const,
    media,
  };
}
