/**
 * Authenticated Admin/Trainer challenge result details hook.
 * Loads endpoint-backed campaign rollups for the Results tab.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { ManagedChallenge } from './useManagedChallenges';

interface ChallengeResultsClient {
  get: (url: string) => Promise<{ data: unknown }>;
}

export interface ChallengeResultEnvelope {
  id: string;
  title: string;
  status: string;
  progressUnit?: string;
  viewCount?: number;
}

export interface ChallengeResultSummary {
  participantCount: number;
  activeParticipantCount: number;
  completedParticipantCount: number;
  droppedParticipantCount: number;
  completionRate: number;
  averageProgressPercentage: number;
  totalCurrentProgress: number;
  checkInsCount: number;
  daysLeft: number | null;
  maxProgress: number;
  progressUnit: string;
  statusBreakdown: Record<string, number>;
}

export interface ChallengeResultParticipant {
  id: string;
  userId: number | string | null;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  currentProgress: number;
  progressPercentage: number;
  progressDelta?: number;
  score: number;
  rank: number | string | null;
  xpEarned: number;
  checkInsCount: number;
  joinedAt: string | null;
  completedAt: string | null;
  lastProgressUpdate: string | null;
}

export interface ChallengeWorkoutImpact {
  participantId: string;
  userId: number | string | null;
  sourceId: string | null;
  occurredAt: string | null;
  progressUnit: string | null;
  delta: number;
  activeMinutes?: number;
  exercisesCompleted?: number;
  personalRecordCount?: number;
  assignedSession?: boolean;
  previousProgress: number;
  currentProgress: number;
}

export interface ChallengeLifecycleAnalytics {
  viewCount: number;
  enrollmentConversionRate: number;
  participationRate: number;
  activeParticipantRate: number;
  completedParticipantCount: number;
  completionRate: number;
  teamCount: number;
  completedTeamCount: number;
  teamCompletionRate: number;
  retentionRate: number;
  midpointParticipantCount: number;
  midpointRetentionRate: number;
  needsAttentionParticipantCount: number;
  improvedParticipantCount?: number;
  averageProgressDelta?: number;
  rewardedParticipantCount: number;
  totalRewardXp?: number;
  challengeDerivedCompletedSessions?: number;
  challengeDerivedActiveMinutes?: number;
  challengeDerivedExercisesCompleted?: number;
  challengeDerivedPersonalRecordCount?: number;
  eventCounts: Record<string, number>;
}

export interface ChallengeLifecycleEvent {
  type: string;
  label: string;
  participantId: string;
  userId: number | string | null;
  displayName?: string;
  occurredAt: string | null;
  sourceId: string | null;
  delta: number | null;
}
export interface ChallengeRuleInsight {
  id: string;
  label: string;
  ruleRequired?: boolean;
  verdict: string;
  totalWorkoutEvents: number;
  matchingWorkoutEvents: number;
  offRuleWorkoutEvents: number;
  participantCount?: number;
  matchingParticipantCount?: number;
  offRuleParticipantCount?: number;
  evidenceRate: number;
  summary: string;
  recommendation?: string;
}

export interface ChallengeResultsResponse {
  success: boolean;
  challenge: ChallengeResultEnvelope;
  summary: ChallengeResultSummary;
  topParticipants: ChallengeResultParticipant[];
  topImprovers?: ChallengeResultParticipant[];
  needsAttentionParticipants?: ChallengeResultParticipant[];
  recentJoinedParticipants?: ChallengeResultParticipant[];
  analytics?: ChallengeLifecycleAnalytics;
  lifecycleEvents?: ChallengeLifecycleEvent[];
  ruleInsights?: ChallengeRuleInsight[];
  workoutImpact: {
    completedWorkoutEvents: number;
    challengeDerivedActiveMinutes?: number;
    challengeDerivedExercisesCompleted?: number;
    challengeDerivedPersonalRecordCount?: number;
    totalDelta: number;
    latestWorkoutImpact: ChallengeWorkoutImpact | null;
  };
}

export interface ChallengeResultsState {
  selectedChallengeId: string | null;
  result: ChallengeResultsResponse | null;
  loading: boolean;
  error: string | null;
  selectChallenge: (id: string) => void;
  reload: () => Promise<void>;
}

const isChallengeResultsResponse = (value: unknown): value is ChallengeResultsResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeResultsResponse>;
  return candidate.success === true
    && Boolean(candidate.challenge)
    && Boolean(candidate.summary)
    && Array.isArray(candidate.topParticipants)
    && (candidate.topImprovers === undefined || Array.isArray(candidate.topImprovers))
    && (candidate.needsAttentionParticipants === undefined || Array.isArray(candidate.needsAttentionParticipants))
    && (candidate.recentJoinedParticipants === undefined || Array.isArray(candidate.recentJoinedParticipants))
    && (candidate.lifecycleEvents === undefined || Array.isArray(candidate.lifecycleEvents))
    && (candidate.ruleInsights === undefined || Array.isArray(candidate.ruleInsights))
    && Boolean(candidate.workoutImpact);
};

const firstChallengeId = (challenges: ManagedChallenge[]) => challenges[0]?.id ?? null;

export const useChallengeResults = (challenges: ManagedChallenge[]): ChallengeResultsState => {
  const { authAxios } = useAuth() as { authAxios?: ChallengeResultsClient };
  const availableIds = useMemo(() => new Set(challenges.map((challenge) => challenge.id)), [challenges]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(() => firstChallengeId(challenges));
  const [result, setResult] = useState<ChallengeResultsResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(firstChallengeId(challenges)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firstId = firstChallengeId(challenges);
    setSelectedChallengeId((current) => {
      if (current && availableIds.has(current)) return current;
      return firstId;
    });

    if (!firstId) {
      setResult(null);
      setLoading(false);
      setError(null);
    }
  }, [availableIds, challenges]);

  const loadResults = useCallback(async (id: string | null = selectedChallengeId) => {
    if (!id) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    setResult((current) => (current?.challenge.id === id ? current : null));

    if (!authAxios?.get) {
      setLoading(false);
      setError('Authenticated request client unavailable');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authAxios.get(`/api/v1/gamification/challenges/${id}/results`);
      if (!isChallengeResultsResponse(response.data)) {
        throw new Error('Unexpected challenge results response');
      }
      setResult(response.data);
    } catch (loadError) {
      setResult(null);
      setError(loadError instanceof Error ? loadError.message : 'Challenge results unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedChallengeId]);

  useEffect(() => {
    void loadResults(selectedChallengeId);
  }, [loadResults, selectedChallengeId]);

  const selectChallenge = useCallback((id: string) => {
    setSelectedChallengeId(id);
  }, []);

  const reload = useCallback(() => loadResults(selectedChallengeId), [loadResults, selectedChallengeId]);

  return {
    selectedChallengeId,
    result,
    loading,
    error,
    selectChallenge,
    reload,
  };
};
