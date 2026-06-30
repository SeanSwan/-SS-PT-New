/**
 * Challenge momentum and join-impact rows.
 */
import React from 'react';
import { Activity, Target } from 'lucide-react';
import type { Challenge } from '../../../hooks/useChallenges';
import { MetaItem, MetaRow } from './ChallengesView.styles';
import {
  formatChallengeJoinImpact,
  formatChallengeNextAction,
  formatChallengeWorkoutImpact,
  formatChallengeWorkoutSyncFallback,
} from './ChallengesView.logic';

export function ChallengeMomentum({ challenge }: { challenge: Challenge }) {
  if (!challenge.joined) {
    if (challenge.status !== 'active') return null;

    const joinImpact = formatChallengeJoinImpact(challenge);

    return (
      <MetaRow aria-label={`${challenge.title} join impact`}>
        <MetaItem>
          <Target size={14} aria-hidden="true" />
          {joinImpact}
        </MetaItem>
      </MetaRow>
    );
  }

  const impactLabel = formatChallengeWorkoutImpact(challenge.lastWorkoutImpact);
  const nextAction = challenge.status === 'active' ? formatChallengeNextAction(challenge) : undefined;
  const syncFallback = challenge.status === 'active' && !impactLabel && !nextAction
    ? formatChallengeWorkoutSyncFallback(challenge)
    : null;

  if (!impactLabel && !nextAction && !syncFallback) return null;

  return (
    <MetaRow aria-label={`${challenge.title} challenge momentum`}>
      {impactLabel && (
        <MetaItem>
          <Activity size={14} aria-hidden="true" />
          {impactLabel}
        </MetaItem>
      )}
      {nextAction && (
        <MetaItem>
          <Target size={14} aria-hidden="true" />
          Next: {nextAction}
        </MetaItem>
      )}
      {syncFallback && (
        <MetaItem>
          <Target size={14} aria-hidden="true" />
          {syncFallback}
        </MetaItem>
      )}
    </MetaRow>
  );
}

export default ChallengeMomentum;
