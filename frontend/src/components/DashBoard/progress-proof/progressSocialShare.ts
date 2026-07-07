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

async function postMilestoneCaption(
  authAxios: ProgressSocialPostClient,
  caption: string,
): Promise<boolean> {
  const formData = new FormData();
  formData.append('content', caption);
  formData.append('type', 'milestone');

  const response = await authAxios.post('/api/social/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!hasCreatedPostId(response)) return false;

  window.dispatchEvent(new CustomEvent(SOCIAL_POST_CREATED_EVENT));
  return true;
}

export async function shareProgressCardToFeed(
  authAxios: ProgressSocialPostClient,
  card: ProgressShareCard,
): Promise<boolean> {
  if (!card.isShareable) return false;
  return postMilestoneCaption(authAxios, card.caption);
}

interface ChartMomentInput {
  title: string;
  pulse: { label: string; value: string } | null;
  facts?: Array<{ label: string; value: string }>;
}

/**
 * Chart-moment caption (2.5): truthful text-only milestone built from what
 * the expand modal already renders. Text-only by design — the feed's
 * milestone renderer (ProofFeedCard) reads post.content; attachment blobs
 * other than workoutData do not survive the backend round trip.
 */
export function buildChartMomentCaption({ title, pulse, facts = [] }: ChartMomentInput): string | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || !pulse) return null;
  const parts = [`${trimmedTitle} — ${pulse.label}: ${pulse.value}`];
  for (const fact of facts.slice(0, 2)) {
    parts.push(`${fact.label}: ${fact.value}`);
  }
  parts.push('Progress proof from my SwanStudios training log.');
  return parts.join(' · ');
}

export async function shareChartMomentToFeed(
  authAxios: ProgressSocialPostClient,
  caption: string,
): Promise<boolean> {
  if (!caption.trim()) return false;
  return postMilestoneCaption(authAxios, caption);
}
