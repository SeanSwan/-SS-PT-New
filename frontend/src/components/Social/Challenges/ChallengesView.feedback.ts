/**
 * Challenge feedback copy helpers.
 *
 * Keeps join/leave messaging aligned with challenge rule types without
 * expanding the mounted ChallengesView component.
 */
import type { Challenge } from '../../../hooks/useChallenges';
import { isAssignedSessionChallenge } from './ChallengesView.logic';

type FeedbackChallenge = Pick<Challenge, 'title' | 'progressUnit' | 'tags'>;

const feedbackTitle = (challenge?: Pick<Challenge, 'title'> | null) => (
  challenge?.title || 'This challenge'
);

export function formatChallengeJoinSuccessDescription(challenge?: FeedbackChallenge | null) {
  const title = feedbackTitle(challenge);

  if (challenge && isAssignedSessionChallenge(challenge)) {
    return `${title} is now syncing from assigned workout completions.`;
  }

  return `${title} is now syncing from your completed workouts.`;
}

export function formatChallengeLeaveConfirmMessage(challenge?: FeedbackChallenge | null) {
  if (!challenge) return '';

  const syncSource = isAssignedSessionChallenge(challenge)
    ? 'future assigned workout completions'
    : 'future workouts';

  return `${challenge.title} will stop syncing from ${syncSource} and your current challenge progress will be removed.`;
}

export function formatChallengeLeaveSuccessDescription(challenge: FeedbackChallenge) {
  const syncSource = isAssignedSessionChallenge(challenge)
    ? 'future assigned workout completions'
    : 'future workouts';

  return `${challenge.title} will stop syncing from ${syncSource}.`;
}
