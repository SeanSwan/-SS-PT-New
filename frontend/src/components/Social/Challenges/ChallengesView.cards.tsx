/**
 * BLUEPRINT: ChallengesView.cards
 * Purpose: Render live challenge cards and honest empty states for the
 * dashboard-mounted challenges tab.
 * Data truth: Receives already-filtered Challenge records; no mock fallback.
 * Writes: Only calls the explicit join/leave handlers passed by ChallengesView.
 */
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  Share2,
  Trophy,
  Users,
} from 'lucide-react';
import type { Challenge, ChallengeStatus } from '../../../hooks/useChallenges';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './ChallengesView.constants';
import { ChallengeMomentum } from './ChallengesView.momentum';
import {
  barTransitionFor,
  cardTransitionFor,
  formatChallengeCompletionDate,
  stripSeedMarker,
} from './ChallengesView.logic';
import {
  ActionButton,
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
      {completionDateLabel && (
        <MetaItem>
          <CalendarCheck size={14} aria-hidden="true" />
          {completionDateLabel}
        </MetaItem>
      )}
      {statusLabel && <StatusBadge>{statusLabel}</StatusBadge>}
      <RewardBadge>
        <Trophy size={14} aria-hidden="true" />
        {rewardLabel}
      </RewardBadge>
    </MetaRow>
  );
}

function ChallengeAction({
  challenge,
  isDemoData,
  onJoin,
  onLeave,
  onShareCompleted,
  sharingChallengeId,
  joiningChallengeId,
  leavingChallengeId,
}: Omit<ChallengeCardItemProps, 'noMotion'>) {
  const isCompleted = challenge.status === 'completed' || challenge.participantStatus === 'completed';
  const isSharing = sharingChallengeId === challenge.id;
  const isAnyShareInFlight = Boolean(sharingChallengeId);
  const isAnyJoinInFlight = Boolean(joiningChallengeId);
  const isJoining = joiningChallengeId === challenge.id;
  const isAnyLeaveInFlight = Boolean(leavingChallengeId);
  const isLeaving = leavingChallengeId === challenge.id;

  if (isCompleted) {
    return (
      <>
        <ActionButton
          $variant="completed"
          disabled
          aria-label={`Completed: ${challenge.title}`}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Completed
        </ActionButton>
        {challenge.joined && onShareCompleted && (
          <ActionButton
            $variant="secondary"
            disabled={isAnyShareInFlight}
            aria-label={`Share to Feed: ${challenge.title}`}
            onClick={() => onShareCompleted(challenge)}
          >
            <Share2 size={16} aria-hidden="true" />
            {isSharing ? 'Sharing...' : 'Share to Feed'}
          </ActionButton>
        )}
      </>
    );
  }

  if (challenge.joined) {
    return (
      <>
        <ActionButton
          $variant="secondary"
          disabled
          aria-label={`Progress synced: ${challenge.title}`}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Progress synced
        </ActionButton>
        {onLeave && (
          <ActionButton
            $variant="secondary"
            disabled={isAnyLeaveInFlight}
            aria-busy={isLeaving || undefined}
            aria-label={`${isLeaving ? 'Leaving' : 'Leave'} Challenge: ${challenge.title}`}
            onClick={() => {
              if (!isAnyLeaveInFlight) onLeave(challenge.id);
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {isLeaving ? 'Leaving...' : 'Leave Challenge'}
          </ActionButton>
        )}
      </>
    );
  }

  return (
    <ActionButton
      $variant="primary"
      disabled={isDemoData || isAnyJoinInFlight}
      aria-busy={isJoining || undefined}
      aria-label={`${isJoining ? 'Joining' : 'Join'} Challenge: ${challenge.title}`}
      onClick={() => {
        if (!isDemoData && !isAnyJoinInFlight) onJoin(challenge.id);
      }}
    >
      {isJoining ? 'Joining...' : 'Join Challenge'}
      {!isJoining && <ChevronRight size={16} aria-hidden="true" />}
    </ActionButton>
  );
}
