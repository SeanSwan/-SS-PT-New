/**
 * Shared smart post payload builder for UserDashboard media uploads.
 */

import type { PostType } from '../../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../../Social/Feed/utils/postIntentInference';

export function buildUserDashboardMediaPost(
  content: string,
  selectedType: PostType,
  media: File,
) {
  const smartIntent = inferSmartPostIntent(content, selectedType);
  const taggedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    content,
  );

  return {
    content: taggedContent,
    type: smartIntent.submissionType,
    media,
  };
}
