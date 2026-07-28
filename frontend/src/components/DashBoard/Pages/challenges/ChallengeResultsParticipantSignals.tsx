/**
 * Focused challenge participant signal rows.
 * Keeps result detail badges grouped while preserving the main panel line budget.
 */

import React from 'react';
import { Activity, Trophy } from 'lucide-react';
import type { ChallengeResultParticipant } from './useChallengeResults';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeResultsParticipantSignalsProps {
  challengeTitle: string;
  progressUnit: string;
  topParticipants: ChallengeResultParticipant[];
  topImprovers: ChallengeResultParticipant[];
  needsAttentionParticipants: ChallengeResultParticipant[];
  recentJoinedParticipants: ChallengeResultParticipant[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));
const formatPercent = (value: number | string | null | undefined): string => `${clampPercent(toNumber(value))}%`;
const unitForCount = (count: number, unit: string): string => {
  const normalized = unit.trim() || 'progress';
  return count === 1 && normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
};
const formatProgressLift = (value: number | string | null | undefined, unit: string): string | null => {
  const lift = Math.max(0, Math.round(toNumber(value)));
  return lift > 0 ? `+${lift} ${unitForCount(lift, unit)}` : null;
};
const formatJoinedDate = (value: string | null): string => {
  const date = new Date(value ?? '');
  if (!Number.isFinite(date.getTime())) return 'Joined';
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

const ChallengeResultsParticipantSignals: React.FC<ChallengeResultsParticipantSignalsProps> = ({
  challengeTitle,
  progressUnit,
  topParticipants,
  topImprovers,
  needsAttentionParticipants,
  recentJoinedParticipants,
}) => (
  <>
    <S.BadgeRow aria-label={`${challengeTitle} endpoint participant leaders`}>
      {topParticipants.length > 0 ? topParticipants.slice(0, 5).map((participant) => {
        const liftLabel = formatProgressLift(participant.progressDelta, progressUnit);
        return (
          <S.Badge key={participant.id}>
            <Activity size={14} aria-hidden="true" />
            {participant.displayName} {formatPercent(participant.progressPercentage)}{liftLabel ? ` ${liftLabel}` : ''}
          </S.Badge>
        );
      }) : <S.Badge><Trophy size={14} aria-hidden="true" />No participant rows yet</S.Badge>}
    </S.BadgeRow>
    {recentJoinedParticipants.length > 0 ? (
      <S.BadgeRow aria-label={`${challengeTitle} recent joined participants`}>
        <S.Badge><Activity size={14} aria-hidden="true" />Recently Joined</S.Badge>
        {recentJoinedParticipants.slice(0, 5).map((participant) => (
          <S.Badge key={participant.id}>{participant.displayName} {formatJoinedDate(participant.joinedAt)}</S.Badge>
        ))}
      </S.BadgeRow>
    ) : null}
    {needsAttentionParticipants.length > 0 ? (
      <S.BadgeRow aria-label={`${challengeTitle} needs attention participants`}>
        <S.Badge><Activity size={14} aria-hidden="true" />Needs Attention</S.Badge>
        {needsAttentionParticipants.slice(0, 5).map((participant) => (
          <S.Badge key={participant.id}>
            <Activity size={14} aria-hidden="true" />
            {participant.displayName} {formatPercent(participant.progressPercentage)}
          </S.Badge>
        ))}
      </S.BadgeRow>
    ) : null}
    {topImprovers.length > 0 ? (
      <S.BadgeRow aria-label={`${challengeTitle} most improved participants`}>
        <S.Badge><Trophy size={14} aria-hidden="true" />Most Improved</S.Badge>
        {topImprovers.slice(0, 5).map((participant) => {
          const liftLabel = formatProgressLift(participant.progressDelta, progressUnit);
          return liftLabel ? <S.Badge key={participant.id}><Activity size={14} aria-hidden="true" />{participant.displayName} {liftLabel}</S.Badge> : null;
        })}
      </S.BadgeRow>
    ) : null}
  </>
);

export default ChallengeResultsParticipantSignals;