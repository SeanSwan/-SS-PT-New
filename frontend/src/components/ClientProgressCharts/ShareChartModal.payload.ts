/**
 * Pure payload builder for ClientProgressCharts social chart shares.
 */

import type { PostType, Visibility } from '../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../Social/Feed/utils/postIntentInference';

export interface ShareChartPostPayloadInput {
  caption: string;
  chartTitle: string;
  chartImage: File;
  visibility: Visibility;
}

export interface ShareChartPostPayload {
  content: string;
  type: PostType;
  visibility: Visibility;
  media: File;
}

export function buildShareChartPostPayload({
  caption,
  chartTitle,
  chartImage,
  visibility,
}: ShareChartPostPayloadInput): ShareChartPostPayload {
  const baseContent = caption.trim() || `My ${chartTitle} progress`;
  const smartIntent = inferSmartPostIntent(baseContent, 'transformation');
  const content = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    baseContent,
  );

  return {
    content,
    type: smartIntent.submissionType,
    visibility,
    media: chartImage,
  };
}
