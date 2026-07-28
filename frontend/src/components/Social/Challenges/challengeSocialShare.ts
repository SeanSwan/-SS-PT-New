/**
 * MODULE: challengeSocialShare
 * PURPOSE: Shares completed challenge proof to the canonical social feed lane.
 * DATA POLICY: Uses normalized challenge fields only; no mock or private records.
 */

import type { Challenge } from '../../../hooks/useChallenges';
import {
  formatChallengeCompletionDate,
  formatChallengeWorkoutImpact,
  stripSeedMarker,
} from './ChallengesView.logic';

interface ChallengeSocialPostClient {
  post: (
    url: string,
    data: FormData,
    config?: { headers?: Record<string, string> },
  ) => Promise<{ data?: { post?: { id?: string | number } } } | undefined>;
}

const SOCIAL_POST_CREATED_EVENT = 'swan:social-post-created';

const hasCreatedPostId = (response?: { data?: { post?: { id?: string | number } } }) => (
  Boolean(response?.data?.post?.id)
);

const isCompletedChallenge = (challenge: Challenge) => (
  challenge.joined && (challenge.status === 'completed' || challenge.participantStatus === 'completed')
);

const cleanText = (value?: string | null) => String(value || '').trim();

function rewardLine(reward: string) {
  const cleanReward = reward.trim();
  if (!cleanReward) return null;
  return /^earned\b/i.test(cleanReward)
    ? `Reward ${cleanReward.replace(/^earned\s+/i, 'earned: ')}`
    : `Reward earned: ${cleanReward}`;
}

export function buildChallengeShareCaption(challenge: Challenge): string | null {
  if (!isCompletedChallenge(challenge)) return null;

  const challengeId = cleanText(challenge.id);
  if (!challengeId) return null;

  const title = stripSeedMarker(challenge.title).trim() || 'SwanStudios challenge';
  const progressLabel = cleanText(challenge.progressLabel);

  const lines = [
    `Challenge complete: ${title}`,
    formatChallengeCompletionDate(challenge.completedAt),
    progressLabel ? `Progress: ${progressLabel}` : null,
    formatChallengeWorkoutImpact(challenge.lastWorkoutImpact),
    rewardLine(challenge.reward),
    '#ChallengeComplete #SwanStudios',
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

export async function shareCompletedChallengeToFeed(
  authAxios: ChallengeSocialPostClient,
  challenge: Challenge,
): Promise<boolean> {
  const caption = buildChallengeShareCaption(challenge);
  if (!caption) return false;

  const formData = new FormData();
  formData.append('content', caption);
  formData.append('type', 'challenge');
  formData.append('challengeId', cleanText(challenge.id));

  const response = await authAxios.post('/api/social/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!hasCreatedPostId(response)) return false;

  window.dispatchEvent(new CustomEvent(SOCIAL_POST_CREATED_EVENT));
  return true;
}
