/**
 * BLUEPRINT: ChallengesView.cards
 * Purpose: Render live challenge cards and honest empty states for the
 * dashboard-mounted challenges tab.
 * Data truth: Receives already-filtered Challenge records; no mock fallback.
 * Writes: Only calls the explicit join handler passed by ChallengesView.
 */
import React from 'react';
import { CheckCircle2, ChevronRight, Clock, Lock, Trophy, Users } from 'lucide-react';
import type { Challenge, ChallengeStatus } from '../../../hooks/useChallenges';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './ChallengesView.constants';
import { barTransitionFor, cardTransitionFor, emptyChallengeCopy, stripSeedMarker } from './ChallengesView.logic';
import {
  ActionButton,
  CardDescription,
  CardHeader,
  CardTitle,
  CardTitleRow,
  CategoryBadge,
  ChallengeCard,
  EmptyIcon,
  EmptyState,
  EmptyTitle,
  MetaItem,
  MetaRow,
  ProgressBarInner,
  ProgressBarOuter,
  RewardBadge,
} from './ChallengesView.styles';

interface ChallengeCardsProps {
  activeTab: ChallengeStatus;
  challenges: Challenge[];
  isDemoData: boolean;
  noMotion: boolean;
  onJoin: (id: string) => void;
}

interface ChallengeCardItemProps {
  challenge: Challenge;
  isDemoData: boolean;
  noMotion: boolean;
  onJoin: (id: string) => void;
}

export function ChallengeCards({
  activeTab,
  challenges,
  isDemoData,
  noMotion,
  onJoin,
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
        />
      ))}
    </>
  );
}

function ChallengeEmptyState({ activeTab }: { activeTab: ChallengeStatus }) {
  return (
    <EmptyState>
      <EmptyIcon>
        <Lock size={48} aria-hidden="true" />
      </EmptyIcon>
      <EmptyTitle>No {activeTab} challenges</EmptyTitle>
      <CardDescription>{emptyChallengeCopy(activeTab)}</CardDescription>
    </EmptyState>
  );
}

function ChallengeCardItem({
  challenge,
  isDemoData,
  noMotion,
  onJoin,
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
      <ChallengeAction challenge={challenge} isDemoData={isDemoData} onJoin={onJoin} />
    </ChallengeCard>
  );
}

function ChallengeProgress({
  challenge,
  catColor,
  noMotion,
}: { challenge: Challenge; catColor: string; noMotion: boolean }) {
  if (challenge.status === 'upcoming') return null;

  return (
    <>
      <ProgressBarOuter>
        <ProgressBarInner $color={catColor} {...barTransitionFor(challenge.progress, noMotion)} />
      </ProgressBarOuter>
      <MetaItem>{challenge.progress}% complete</MetaItem>
    </>
  );
}

function ChallengeMeta({ challenge }: { challenge: Challenge }) {
  return (
    <MetaRow>
      <MetaItem>
        <Users size={14} aria-hidden="true" />
        {challenge.participants} participants
      </MetaItem>
      {challenge.daysLeft != null && (
        <MetaItem>
          <Clock size={14} aria-hidden="true" />
          {challenge.daysLeft} days left
        </MetaItem>
      )}
      {challenge.startsIn && (
        <MetaItem>
          <Clock size={14} aria-hidden="true" />
          Starts in {challenge.startsIn}
        </MetaItem>
      )}
      <RewardBadge>
        <Trophy size={14} aria-hidden="true" />
        {challenge.reward}
      </RewardBadge>
    </MetaRow>
  );
}

function ChallengeAction({ challenge, isDemoData, onJoin }: Omit<ChallengeCardItemProps, 'noMotion'>) {
  if (challenge.status === 'completed') {
    return (
      <ActionButton $variant="completed" disabled>
        <CheckCircle2 size={16} aria-hidden="true" />
        Completed
      </ActionButton>
    );
  }

  if (challenge.joined) {
    return (
      <ActionButton $variant="secondary">
        View Progress
        <ChevronRight size={16} aria-hidden="true" />
      </ActionButton>
    );
  }

  return (
    <ActionButton $variant="primary" onClick={() => !isDemoData && onJoin(challenge.id)}>
      Join Challenge
      <ChevronRight size={16} aria-hidden="true" />
    </ActionButton>
  );
}
