/**
 * FILE: ClientObservatoryPostIntent.ts
 * PURPOSE: Converts the client overview composer state into canonical social
 * post payload intent before it reaches the dashboard mutation.
 */

import type { PostType } from '../../../../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../../../../Social/Feed/utils/postIntentInference';
import type { POST_CATEGORIES } from './ClientObservatoryData';

type ObservatoryCategory = (typeof POST_CATEGORIES)[number];
export const SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE =
  'Post shared. SwanStudios points updated.';

const CATEGORY_FALLBACK_TYPES: Record<ObservatoryCategory, PostType> = {
  Training: 'workout',
  Nutrition: 'general',
  Progress: 'transformation',
  Community: 'general',
};

export function prepareObservatoryPost(
  content: string,
  category: ObservatoryCategory,
  isReelMode: boolean,
): { content: string; type: PostType } {
  const smartIntent = inferSmartPostIntent(content, 'general');
  const fallbackType = isReelMode ? 'workout' : CATEGORY_FALLBACK_TYPES[category];
  const type = smartIntent.displayLabel ? smartIntent.submissionType : fallbackType;
  const enrichedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    content,
  );

  return { content: enrichedContent, type };
}

export function safeObservatoryPostReceiptMessage(_value: unknown): string {
  return SAFE_OBSERVATORY_POST_RECEIPT_MESSAGE;
}
