/**
 * BLUEPRINT: ChallengesView.cards
 * Purpose: Render live challenge cards and honest empty states for the
 * dashboard-mounted challenges tab.
 * Data truth: Receives already-filtered Challenge records; no mock fallback.
 * Writes: Only calls the explicit join/leave handlers passed by ChallengesView.
 */
import React from 'react';
import { CalendarCheck, CheckCircle2, Clock, Trophy, Users } from 'lucide-react';
import type { Challenge, ChallengeStatus } from '../../../hooks/useChallenges';
import { ChallengeAction } from './ChallengesView.actions';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './ChallengesView.constants';
import { ChallengeMomentum } from './ChallengesView.momentum';
import {
  barTransitionFor,
  cardTransitionFor,
  formatChallengeCompletionDate,
  formatChallengeDeadline,
  stripSeedMarker,
} from './ChallengesView.logic';
import {
  CardDescription,
  CardHeader,
  CardTitle,
  CardTitleRow,
  CategoryBadge,
  ChallengeCard,
  MetaItem,
  MetaRow,
  ProgressBarInner,
  ProgressBarOuter,
  ProgressStats,
  RewardBadge,
  StatusBadge,
} from './ChallengesView.styles';
import { ChallengeEmptyState } from './ChallengesView.statusPanels';

interface ChallengeCardsProps {
  activeTab: ChallengeStatus;
  challenges: Challenge[];
  isDemoData: boolean;
  noMotion: boolean;
  onJoin: (id: string) => void;
  onLeave?: (id: string) => void;
  onShareCompleted?: (challenge: Challenge) => void;
  sharingChallengeId?: string | null;
  joiningChallengeId?: string | null;
  leavingChallengeId?: string | null;
}

interface ChallengeCardItemProps {
  challenge: Challenge;
  isDemoData: boolean;
  noMotion: boolean;
  onJoin: (id: string) => void;
  onLeave?: (id: string) => void;
  onShareCompleted?: (challenge: Challenge) => void;
  sharingChallengeId?: string | null;
  joiningChallengeId?: string | null;
  leavingChallengeId?: string | null;
}

export function ChallengeCards({
  activeTab,
  challenges,
  isDemoData,
  noMotion,
  onJoin,
  onLeave,
  onShareCompleted,
  sharingChallengeId,
  joiningChallengeId,
  leavingChallengeId,
}: ChallengeCardsProps) {
  if (challenges.length === 0) return <ChallengeEmptyState activeTab={activeTab} />;

  return (
    <>
      {challenges.map((challenge) => (
        <ChallengeCardItem
          key={challenge.id}
          challenge={challenge}
          isDemoData={isDemoData}
          noMotion={noMotion}
          onJoin={onJoin}
          onLeave={onLeave}
          onShareCompleted={onShareCompleted}
          sharingChallengeId={sharingChallengeId}
          joiningChallengeId={joiningChallengeId}
          leavingChallengeId={leavingChallengeId}
        />
      ))}
    </>
  );
}

function ChallengeCardItem({
  challenge,
  isDemoData,
  noMotion,
  onJoin,
  onLeave,
  onShareCompleted,
  sharingChallengeId,
  joiningChallengeId,
  leavingChallengeId,
}: ChallengeCardItemProps) {
  const catColor = CATEGORY_COLORS[challenge.category];
  const CatIcon = CATEGORY_ICONS[challenge.category];

  return (
    <ChallengeCard layout={!noMotion} {...cardTransitionFor(noMotion)}>
      <CardHeader>
        <CardTitleRow>
          <CardTitle>{challenge.title}</CardTitle>
        </CardTitleRow>
        <CategoryBadge $color={catColor}>
          <CatIcon size={14} aria-hidden="true" />
          {challenge.category}
        </CategoryBadge>
      </CardHeader>

      <CardDescription>{stripSeedMarker(challenge.description)}</CardDescription>
      <ChallengeProgress challenge={challenge} catColor={catColor} noMotion={noMotion} />
      <ChallengeMeta challenge={challenge} />
      <ChallengeAction
        challenge={challenge}
        isDemoData={isDemoData}
        onJoin={onJoin}
        onLeave={onLeave}
        onShareCompleted={onShareCompleted}
        sharingChallengeId={sharingChallengeId}
        joiningChallengeId={joiningChallengeId}
        leavingChallengeId={leavingChallengeId}
      />
    </ChallengeCard>
  );
}

function ChallengeProgress({
  challenge,
  catColor,
  noMotion,
}: { challenge: Challenge; catColor: string; noMotion: boolean }) {
  if (challenge.status === 'upcoming') return null;

  const detailLabel = challenge.joined ? challenge.progressLabel : challenge.targetLabel;

  return (
    <>
      <ProgressBarOuter
        role="progressbar"
        aria-label={`${challenge.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={challenge.progress}
      >
        <ProgressBarInner $color={catColor} {...barTransitionFor(challenge.progress, noMotion)} />
      </ProgressBarOuter>
      <ProgressStats>
        <MetaItem>{challenge.progress}% complete</MetaItem>
        <MetaItem>{detailLabel}</MetaItem>
      </ProgressStats>
      <ChallengeMomentum challenge={challenge} />
    </>
  );
}

function ChallengeMeta({ challenge }: { challenge: Challenge }) {
  const isCompleted = challenge.status === 'completed' || challenge.participantStatus === 'completed';
  const normalizedMaxTeamSize = typeof challenge.maxTeamSize === 'number' && Number.isFinite(challenge.maxTeamSize)
    ? Math.max(2, Math.round(challenge.maxTeamSize))
    : null;
  const teamLabel = challenge.allowTeams
    ? challenge.teamId ? 'Your squad challenge' : 'Team challenge'
    : null;
  const teamSizeLabel = challenge.allowTeams && normalizedMaxTeamSize
    ? `Squads up to ${normalizedMaxTeamSize}`
    : null;
  const completionDateLabel = isCompleted
    ? formatChallengeCompletionDate(challenge.completedAt)
    : null;
  const statusLabel = challenge.participantStatus === 'completed'
    ? 'Completed'
    : challenge.joined
      ? 'Joined'
      : null;
  const rewardLabel = isCompleted && !/^earned\b/i.test(challenge.reward)
    ? `Earned ${challenge.reward}`
    : challenge.reward;
  const deadlineLabel = formatChallengeDeadline(challenge.daysLeft);
  const checkInCount = challenge.joined && Number.isFinite(challenge.checkInsCount)
    ? Math.max(0, Math.round(challenge.checkInsCount))
    : 0;
  const checkInLabel = checkInCount > 0
    ? `${checkInCount} ${checkInCount === 1 ? 'check-in' : 'check-ins'}`
    : null;

  return (
    <MetaRow>
      <MetaItem>
        <Users size={14} aria-hidden="true" />
        {challenge.participants} participants
      </MetaItem>
      {checkInLabel && (
        <MetaItem>
          <CheckCircle2 size={14} aria-hidden="true" />
          {checkInLabel}
        </MetaItem>
      )}
      {deadlineLabel && (
        <MetaItem>
          <Clock size={14} aria-hidden="true" />
          {deadlineLabel}
        </MetaItem>
      )}
      {challenge.startsIn && (
        <MetaItem>
          <Clock size={14} aria-hidden="true" />
          Starts in {challenge.startsIn}
        </MetaItem>
      )}
      {completionDateLabel && (
        <MetaItem>
          <CalendarCheck size={14} aria-hidden="true" />
          {completionDateLabel}
        </MetaItem>
      )}
      {statusLabel && <StatusBadge>{statusLabel}</StatusBadge>}
      {teamLabel && <StatusBadge>{teamLabel}</StatusBadge>}
      {teamSizeLabel && <StatusBadge>{teamSizeLabel}</StatusBadge>}
      <RewardBadge>
        <Trophy size={14} aria-hidden="true" />
        {rewardLabel}
      </RewardBadge>
    </MetaRow>
  );
}
