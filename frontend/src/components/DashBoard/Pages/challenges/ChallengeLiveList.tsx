/**
 * Real-data live challenge management list.
 */

import React from 'react';
import { Archive, CheckCircle2, LockKeyhole, RefreshCw, Rocket, Users, XCircle } from 'lucide-react';
import type { ChallengePublishVisibility, ManagedChallenge, ManagedChallengeStatusAction } from './useManagedChallenges';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeLiveListProps {
  challenges: ManagedChallenge[];
  loading: boolean;
  error: string | null;
  notice?: string | null;
  updatingId?: string | null;
  reload: () => Promise<void>;
  publishChallenge?: (id: string, visibility?: ChallengePublishVisibility) => Promise<void>;
  updateChallengeStatus?: (id: string, action: ManagedChallengeStatusAction) => Promise<void>;
}

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const startsInFuture = (startDate: string) => {
  const startTime = new Date(startDate).getTime();
  return Number.isFinite(startTime) && startTime > Date.now();
};

type DisplayStatusTone = 'default' | 'live' | 'scheduled';

const displayStatusLabel = (challenge: Pick<ManagedChallenge, 'status' | 'startDate'>) => {
  if (challenge.status === 'active' && startsInFuture(challenge.startDate)) return 'Scheduled';
  if (challenge.status === 'active') return 'Live';
  return labelize(challenge.status);
};

const displayStatusTone = (challenge: Pick<ManagedChallenge, 'status' | 'startDate'>): DisplayStatusTone => {
  if (challenge.status === 'active' && startsInFuture(challenge.startDate)) return 'scheduled';
  if (challenge.status === 'active') return 'live';
  return 'default';
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const toNonNegativeCount = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

const participantCount = (challenge: ManagedChallenge): number => Math.max(
  toNonNegativeCount(challenge.currentParticipants),
  challenge.participants?.length ?? 0,
);

const participantLabel = (challenge: ManagedChallenge): string => {
  const count = participantCount(challenge);
  const cap = toNonNegativeCount(challenge.maxParticipants);
  return cap > 0 ? `${count} / ${cap}` : `${count}`;
};

const hasSavedAudience = (challenge: ManagedChallenge) => participantCount(challenge) > 0;
const scheduledPublicPublish = {
  label: 'Schedule Public Campaign',
  title: 'Schedules public discovery for the selected start date.',
};

const openPublicPublish = {
  label: 'Publish Public Campaign',
  title: 'Publishes public discovery because the selected start date has already opened.',
};

const publicPublishCopy = (challenge: Pick<ManagedChallenge, 'startDate'>) => (
  startsInFuture(challenge.startDate) ? scheduledPublicPublish : openPublicPublish
);

const lifecycleLabel = (action: ManagedChallengeStatusAction, isUpdating: boolean) => {
  if (isUpdating) return 'Updating';
  switch (action) {
    case 'complete':
      return 'Complete Challenge';
    case 'cancel':
      return 'Cancel Challenge';
    case 'archive':
      return 'Archive Challenge';
    default:
      return 'Update Challenge';
  }
};

const lifecycleIcon = (action: ManagedChallengeStatusAction) => {
  switch (action) {
    case 'complete':
      return <CheckCircle2 size={16} />;
    case 'cancel':
      return <XCircle size={16} />;
    case 'archive':
      return <Archive size={16} />;
    default:
      return null;
  }
};

const lifecycleActionsForChallenge = (
  challenge: Pick<ManagedChallenge, 'status' | 'startDate'>,
): ManagedChallengeStatusAction[] => {
  if (challenge.status === 'draft') return ['cancel'];
  if (challenge.status === 'active') {
    return startsInFuture(challenge.startDate) ? ['cancel'] : ['complete', 'cancel'];
  }
  if (challenge.status === 'completed' || challenge.status === 'cancelled') return ['archive'];
  return [];
};

const ChallengeLiveList: React.FC<ChallengeLiveListProps> = ({
  challenges,
  loading,
  error,
  notice,
  updatingId,
  reload,
  publishChallenge,
  updateChallengeStatus,
}) => {
  const isStatusUpdateInFlight = Boolean(updatingId);

  if (loading && challenges.length === 0) {
    return (
      <S.StatusPanel>
        <S.StatusStack>
          <S.StatusTitle>Loading challenge campaigns</S.StatusTitle>
          <S.StatusCopy>The management list is syncing real challenge records.</S.StatusCopy>
        </S.StatusStack>
      </S.StatusPanel>
    );
  }

  if (error && challenges.length === 0) {
    return (
      <S.StatusPanel>
        <S.StatusStack>
          <S.StatusTitle>Challenge campaigns unavailable</S.StatusTitle>
          <S.StatusCopy>{error}</S.StatusCopy>
          <S.IconButton type="button" onClick={() => void reload()}><RefreshCw size={16} />Retry</S.IconButton>
        </S.StatusStack>
      </S.StatusPanel>
    );
  }

  if (challenges.length === 0) {
    return <S.StatusPanel><S.StatusStack><S.StatusTitle>No real challenge campaigns yet</S.StatusTitle><S.StatusCopy>Create a draft from a template to start this list.</S.StatusCopy></S.StatusStack></S.StatusPanel>;
  }

  return (
    <S.ChallengeList aria-label="Managed challenge campaigns">
      {notice ? <S.ChallengeInlineNotice role="status" aria-live="polite">{notice}</S.ChallengeInlineNotice> : null}
      {error ? <S.ChallengeInlineAlert role="alert">{error}</S.ChallengeInlineAlert> : null}
      {challenges.map((challenge) => {
        const isUpdating = updatingId === challenge.id;
        const privatePublishReady = hasSavedAudience(challenge);
        const lifecycleActions = updateChallengeStatus ? lifecycleActionsForChallenge(challenge) : [];
        const statusTone = displayStatusTone(challenge);
        const publicPublish = publicPublishCopy(challenge);

        return (
          <S.ChallengeItem key={challenge.id}>
            <S.ChallengeItemHeader>
              <S.ChallengeTitleGroup>
                <S.CardMeta>{labelize(challenge.category)}</S.CardMeta>
                <S.CardTitle>{challenge.title}</S.CardTitle>
              </S.ChallengeTitleGroup>
              <S.ChallengeStatusBadge
                $status={challenge.status}
                $tone={statusTone}
                data-status-tone={statusTone}
              >
                {displayStatusLabel(challenge)}
              </S.ChallengeStatusBadge>
            </S.ChallengeItemHeader>
            <S.CardDescription>{challenge.description}</S.CardDescription>
            <S.ChallengeFactGrid>
              <S.ChallengeFact><span>Start</span><strong>{formatDate(challenge.startDate)}</strong></S.ChallengeFact>
              <S.ChallengeFact><span>End</span><strong>{formatDate(challenge.endDate)}</strong></S.ChallengeFact>
              <S.ChallengeFact><span>Participants</span><strong>{participantLabel(challenge)}</strong></S.ChallengeFact>
              <S.ChallengeFact><span>Target</span><strong>{challenge.maxProgress} {labelize(challenge.progressUnit)}</strong></S.ChallengeFact>
            </S.ChallengeFactGrid>
            <S.BadgeRow>
              <S.Badge>{challenge.allowTeams ? <Users size={14} /> : null}{challenge.allowTeams ? `Teams up to ${challenge.maxTeamSize ?? 4}` : 'Individual'}</S.Badge>
              <S.Badge>{challenge.xpReward} XP</S.Badge>
              <S.Badge>Difficulty {challenge.difficulty}/5</S.Badge>
              {challenge.status === 'draft' && publishChallenge ? (
                <>
                  <S.IconButton
                    type="button"
                    onClick={() => void publishChallenge(challenge.id, 'private')}
                    disabled={isStatusUpdateInFlight || !privatePublishReady}
                    aria-label={privatePublishReady ? 'Publish Private' : 'Add Audience First'}
                    aria-busy={isUpdating}
                    title={privatePublishReady ? undefined : 'Save an audience before publishing privately.'}
                  >
                    <LockKeyhole size={16} />
                    {isUpdating ? 'Publishing' : privatePublishReady ? 'Publish Private' : 'Add Audience First'}
                  </S.IconButton>
                  <S.IconButton
                    type="button"
                    onClick={() => void publishChallenge(challenge.id, 'public')}
                    disabled={isStatusUpdateInFlight}
                    aria-label={publicPublish.label}
                    aria-busy={isUpdating}
                    title={publicPublish.title}
                  >
                    <Rocket size={16} />
                    {isUpdating ? 'Publishing' : publicPublish.label}
                  </S.IconButton>
                </>
              ) : null}
              {lifecycleActions.map((action) => (
                <S.IconButton
                  key={action}
                  type="button"
                  onClick={() => void updateChallengeStatus?.(challenge.id, action)}
                  disabled={isStatusUpdateInFlight}
                  aria-label={lifecycleLabel(action, false)}
                  aria-busy={isUpdating}
                >
                  {lifecycleIcon(action)}
                  {lifecycleLabel(action, isUpdating)}
                </S.IconButton>
              ))}
            </S.BadgeRow>
          </S.ChallengeItem>
        );
      })}
    </S.ChallengeList>
  );
};

export default ChallengeLiveList;
