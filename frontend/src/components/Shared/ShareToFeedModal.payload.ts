/**
 * Pure payload builder for quick workout and achievement feed shares.
 */

import type { PostType, Visibility } from '../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../Social/Feed/utils/postIntentInference';

export type ShareToFeedPostType = Extract<
  PostType,
  'general' | 'workout' | 'achievement' | 'challenge' | 'transformation'
>;
export type ShareToFeedVisibility = Visibility;

export interface ShareToFeedPostPayloadInput {
  content: string;
  postType: ShareToFeedPostType;
  visibility: ShareToFeedVisibility;
  workoutSessionId?: string;
  achievementId?: number;
  userAchievementId?: number;
}

export function buildShareToFeedPostPayload({
  content,
  postType,
  visibility,
  workoutSessionId,
  achievementId,
  userAchievementId,
}: ShareToFeedPostPayloadInput) {
  const trimmedContent = content.trim();
  const smartIntent = inferSmartPostIntent(trimmedContent, postType);
  const taggedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    trimmedContent,
  );
  const payload: Record<string, unknown> = {
    content: taggedContent,
    type: postType,
    visibility,
  };
  if (workoutSessionId) payload.workoutSessionId = workoutSessionId;
  if (achievementId) payload.achievementId = achievementId;
  if (userAchievementId) payload.userAchievementId = userAchievementId;
  return payload;
}
