/**
 * Challenge results panel.
 * Renders real managed-challenge result snapshots and endpoint-backed details.
 */

import React, { useMemo, useState } from 'react';
import { Activity, RefreshCw, Trophy } from 'lucide-react';
import type { ChallengeResultsState } from './useChallengeResults';
import ChallengeResultsFunnel from './ChallengeResultsFunnel';
import ChallengeResultsParticipantSignals from './ChallengeResultsParticipantSignals';
import ChallengeResultsRuleSignals from './ChallengeResultsRuleSignals';
import type { ManagedChallenge, ManagedChallengeParticipant } from './useManagedChallenges';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeResultsPanelProps {
  challenges: ManagedChallenge[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  resultState?: ChallengeResultsState;
}

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayStatusLabel = (status: string) => {
  if (status === 'active') return 'Live';
  return labelize(status);
};

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));
const formatCount = (value: number | string | null | undefined): string => String(Math.max(0, Math.round(toNumber(value))));
const pluralize = (value: number | string | null | undefined, singular: string, plural = singular + 's'): string => {
  const count = Math.max(0, Math.round(toNumber(value)));
  return String(count) + ' ' + (count === 1 ? singular : plural);
};
const formatPercent = (value: number | string | null | undefined): string => `${clampPercent(toNumber(value))}%`;
const participantTotal = (challenge: ManagedChallenge): number => Math.max(
  0,
  Math.round(toNumber(challenge.currentParticipants)),
  challenge.participants?.length ?? 0,
);

const participantName = (participant: ManagedChallengeParticipant): string => {
  const user = participant.user;
  const firstLast = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (firstLast) return firstLast;
  if (user?.username) return user.username;
  return `Client #${participant.userId}`;
};

const sortedParticipants = (challenge: ManagedChallenge): ManagedChallengeParticipant[] => (
  [...(challenge.participants ?? [])].sort((a, b) => toNumber(b.progressPercentage) - toNumber(a.progressPercentage))
);

const completedCount = (challenge: ManagedChallenge): number => {
  const total = participantTotal(challenge);

  if (challenge.completionRate !== undefined && challenge.completionRate !== null) {
    return Math.min(total, Math.round((clampPercent(toNumber(challenge.completionRate)) / 100) * total));
  }

  const visibleCompleted = challenge.participants?.filter((participant) => participant.status === 'completed').length ?? 0;
  return Math.min(total || visibleCompleted, visibleCompleted);
};

const resultFilters = (challenges: ManagedChallenge[]) => {
  const statuses = Array.from(new Set(challenges.map((challenge) => challenge.status))).sort();
  return [
    { id: 'all', label: 'All', count: challenges.length },
    ...statuses.map((status) => ({
      id: status,
      label: displayStatusLabel(status),
      count: challenges.filter((challenge) => challenge.status === status).length,
    })),
  ];
};

const visibleAverageProgress = (participants: ManagedChallengeParticipant[]): number => {
  if (participants.length === 0) return 0;
  return participants.reduce((sum, participant) => sum + toNumber(participant.progressPercentage), 0) / participants.length;
};

const ResultsStatus: React.FC<{ title: string; copy: string; action?: React.ReactNode }> = ({ title, copy, action }) => (
  <S.StatusPanel><S.StatusStack><S.StatusTitle>{title}</S.StatusTitle><S.StatusCopy>{copy}</S.StatusCopy>{action}</S.StatusStack></S.StatusPanel>
);

const FocusedResult: React.FC<{ resultState: ChallengeResultsState }> = ({ resultState }) => {
  if (resultState.loading && !resultState.result) {
    return <ResultsStatus title="Loading focused result" copy="Campaign analytics are syncing from the dedicated results endpoint." />;
  }

  if (resultState.error && !resultState.result) {
    return (
      <ResultsStatus
        title="Focused result unavailable"
        copy={resultState.error}
        action={<S.IconButton type="button" onClick={() => void resultState.reload()}><RefreshCw size={16} />Retry</S.IconButton>}
      />
    );
  }

  if (!resultState.result) return null;

  const { challenge, summary, topParticipants, topImprovers = [], needsAttentionParticipants = [], recentJoinedParticipants = [], workoutImpact, analytics, lifecycleEvents = [], ruleInsights = [] } = resultState.result;
  const latestImpact = workoutImpact.latestWorkoutImpact;

  return (
    <S.ChallengeItem aria-label="Focused challenge result">
      <S.ChallengeItemHeader>
        <S.ChallengeTitleGroup>
          <S.CardMeta>Focused Result</S.CardMeta>
          <S.CardTitle>{challenge.title}</S.CardTitle>
        </S.ChallengeTitleGroup>
        <S.ChallengeStatusBadge $status={challenge.status}>{formatPercent(summary.completionRate)}</S.ChallengeStatusBadge>
      </S.ChallengeItemHeader>
      <S.ChallengeFactGrid>
        <S.ChallengeFact><span>Actual Participants</span><strong>{summary.participantCount}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>Completed</span><strong>{summary.completedParticipantCount}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>Average Progress</span><strong>{formatPercent(summary.averageProgressPercentage)}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>Workout Events</span><strong>{workoutImpact.completedWorkoutEvents}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>Active Minutes</span><strong>{formatCount(workoutImpact.challengeDerivedActiveMinutes)}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>Exercises</span><strong>{formatCount(workoutImpact.challengeDerivedExercisesCompleted)}</strong></S.ChallengeFact>
        <S.ChallengeFact><span>PR Count</span><strong>{formatCount(workoutImpact.challengeDerivedPersonalRecordCount)}</strong></S.ChallengeFact>
      </S.ChallengeFactGrid>
      {analytics ? <ChallengeResultsFunnel challengeTitle={challenge.title} analytics={analytics} lifecycleEvents={lifecycleEvents} /> : null}
      <ChallengeResultsRuleSignals challengeTitle={challenge.title} ruleInsights={ruleInsights} />
      <ChallengeResultsParticipantSignals
        challengeTitle={challenge.title}
        progressUnit={summary.progressUnit}
        topParticipants={topParticipants}
        topImprovers={topImprovers}
        needsAttentionParticipants={needsAttentionParticipants}
        recentJoinedParticipants={recentJoinedParticipants}
      />
      <S.BadgeRow aria-label={`${challenge.title} workout impact`}>
        <S.Badge>{summary.checkInsCount} check-ins</S.Badge>
        <S.Badge>{summary.totalCurrentProgress} total {summary.progressUnit}</S.Badge>
        <S.Badge>{workoutImpact.totalDelta} workout-event progress</S.Badge>
        {toNumber(workoutImpact.challengeDerivedActiveMinutes) > 0 ? <S.Badge>{pluralize(workoutImpact.challengeDerivedActiveMinutes, 'active minute')}</S.Badge> : null}
        {toNumber(workoutImpact.challengeDerivedExercisesCompleted) > 0 ? <S.Badge>{pluralize(workoutImpact.challengeDerivedExercisesCompleted, 'exercise')}</S.Badge> : null}
        {toNumber(workoutImpact.challengeDerivedPersonalRecordCount) > 0 ? <S.Badge>{pluralize(workoutImpact.challengeDerivedPersonalRecordCount, 'PR', 'PRs')}</S.Badge> : null}
        {latestImpact ? <S.Badge>Latest +{latestImpact.delta} {latestImpact.progressUnit ?? summary.progressUnit}</S.Badge> : null}
        {toNumber(latestImpact?.activeMinutes) > 0 ? <S.Badge>Latest {pluralize(latestImpact?.activeMinutes, 'active minute')}</S.Badge> : null}
        {latestImpact?.assignedSession ? <S.Badge>Assigned session verified</S.Badge> : null}
      </S.BadgeRow>
    </S.ChallengeItem>
  );
};

const ChallengeResultsPanel: React.FC<ChallengeResultsPanelProps> = ({ challenges, loading, error, reload, resultState }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const filters = useMemo(() => resultFilters(challenges), [challenges]);
  const activeStatusFilter = filters.some((filter) => filter.id === statusFilter) ? statusFilter : 'all';
  const filteredChallenges = useMemo(() => (
    activeStatusFilter === 'all' ? challenges : challenges.filter((challenge) => challenge.status === activeStatusFilter)
  ), [challenges, activeStatusFilter]);
  const totalParticipants = filteredChallenges.reduce((sum, challenge) => sum + participantTotal(challenge), 0);
  const totalCompleted = filteredChallenges.reduce((sum, challenge) => sum + completedCount(challenge), 0);
  const bestCompletion = filteredChallenges.length > 0
    ? Math.max(...filteredChallenges.map((challenge) => toNumber(challenge.completionRate)))
    : 0;

  if (loading && challenges.length === 0) {
    return <ResultsStatus title="Loading challenge results" copy="Result snapshots are syncing from the managed challenge list." />;
  }

  if (error && challenges.length === 0) {
    return (
      <ResultsStatus
        title="Challenge results unavailable"
        copy={error}
        action={<S.IconButton type="button" onClick={() => void reload()}><RefreshCw size={16} />Retry</S.IconButton>}
      />
    );
  }

  if (challenges.length === 0) {
    return <ResultsStatus title="No challenge results yet" copy="Create or publish a challenge campaign to start collecting workout-event progress." />;
  }

  return (
    <>
      <S.PolicyGrid aria-label="Challenge result summary">
        <S.PolicyTile><span>Campaigns</span><strong>{filteredChallenges.length}</strong></S.PolicyTile>
        <S.PolicyTile><span>Participants</span><strong>{totalParticipants}</strong></S.PolicyTile>
        <S.PolicyTile><span>Completed</span><strong>{totalCompleted}</strong></S.PolicyTile>
        <S.PolicyTile><span>Best Completion</span><strong>{formatPercent(bestCompletion)}</strong></S.PolicyTile>
      </S.PolicyGrid>

      {resultState ? <FocusedResult resultState={resultState} /> : null}

      <S.BadgeRow aria-label="Filter challenge result snapshots">
        {filters.map((filter) => (
          <S.IconButton
            key={filter.id}
            type="button"
            aria-pressed={activeStatusFilter === filter.id}
            onClick={() => setStatusFilter(filter.id)}
          >
            <Activity size={16} />
            {filter.label} {filter.count}
          </S.IconButton>
        ))}
      </S.BadgeRow>

      <S.ChallengeList aria-label="Challenge result snapshots">
        {filteredChallenges.map((challenge) => {
          const participants = sortedParticipants(challenge);
          const leader = participants[0];
          const visibleAverage = visibleAverageProgress(participants);
          const isFocused = resultState?.selectedChallengeId === challenge.id;

          return (
            <S.ChallengeItem key={challenge.id}>
              <S.ChallengeItemHeader>
                <S.ChallengeTitleGroup>
                  <S.CardMeta>{displayStatusLabel(challenge.status)} Results</S.CardMeta>
                  <S.CardTitle>{challenge.title}</S.CardTitle>
                </S.ChallengeTitleGroup>
                <S.ChallengeStatusBadge $status={challenge.status}>{formatPercent(challenge.completionRate)}</S.ChallengeStatusBadge>
              </S.ChallengeItemHeader>
              <S.CardDescription>{challenge.description}</S.CardDescription>
              <S.ChallengeFactGrid>
                <S.ChallengeFact><span>Completion</span><strong>{formatPercent(challenge.completionRate)}</strong></S.ChallengeFact>
                <S.ChallengeFact><span>Completed</span><strong>{completedCount(challenge)} of {participantTotal(challenge)}</strong></S.ChallengeFact>
                <S.ChallengeFact><span>Visible Progress</span><strong>{formatPercent(visibleAverage)}</strong></S.ChallengeFact>
                <S.ChallengeFact><span>Top Visible</span><strong>{leader ? participantName(leader) : 'No participant rows yet'}</strong></S.ChallengeFact>
              </S.ChallengeFactGrid>
              <S.BadgeRow aria-label={`${challenge.title} visible participant progress`}>
                {participants.length > 0 ? participants.slice(0, 5).map((participant) => (
                  <S.Badge key={participant.id}>
                    <Activity size={14} aria-hidden="true" />
                    {participantName(participant)} {formatPercent(participant.progressPercentage)}
                  </S.Badge>
                )) : (
                  <S.Badge><Trophy size={14} aria-hidden="true" />Progress rows pending</S.Badge>
                )}
                {resultState ? (
                  <S.IconButton
                    type="button"
                    aria-label={`Inspect ${challenge.title}`}
                    aria-pressed={isFocused}
                    onClick={() => resultState.selectChallenge(challenge.id)}
                  >
                    <Trophy size={16} />
                    Inspect
                  </S.IconButton>
                ) : null}
              </S.BadgeRow>
            </S.ChallengeItem>
          );
        })}
      </S.ChallengeList>
    </>
  );
};

export default ChallengeResultsPanel;
