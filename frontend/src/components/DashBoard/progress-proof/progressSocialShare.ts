/**
 * MODULE: progressSocialShare
 * PURPOSE: Posts explicit Progress Proof share cards to the social feed.
 * DATA POLICY: Receives sanitized card copy only; never reads raw client records.
 */

import type { ProgressShareCard } from './progressShareCard';

interface ProgressSocialPostClient {
  post: (
    url: string,
    data: FormData,
    config?: { headers?: Record<string, string> },
  ) => Promise<{ data?: { post?: { id?: string | number } } }>;
}

const SOCIAL_POST_CREATED_EVENT = 'swan:social-post-created';

const hasCreatedPostId = (response: { data?: { post?: { id?: string | number } } }) => (
  Boolean(response.data?.post?.id)
);

export async function shareProgressCardToFeed(
  authAxios: ProgressSocialPostClient,
  card: ProgressShareCard,
): Promise<boolean> {
  if (!card.isShareable) return false;

  const formData = new FormData();
  formData.append('content', card.caption);
  formData.append('type', 'milestone');

  const response = await authAxios.post('/api/social/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!hasCreatedPostId(response)) return false;

  window.dispatchEvent(new CustomEvent(SOCIAL_POST_CREATED_EVENT));
  return true;
}
