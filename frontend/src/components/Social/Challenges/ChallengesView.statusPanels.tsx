/**
 * BLUEPRINT: ChallengesView.statusPanels
 * Purpose: Render non-card challenge panel states for the mounted client
 * challenge tab without mixing API outage copy into the ordinary empty state.
 * Data truth: Retryable unavailable state is driven by useChallenges.error.
 * Writes: Only calls the retry handler supplied by the mounted view.
 */
import React from 'react';
import { AlertTriangle, Dumbbell, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ChallengeStatus } from '../../../hooks/useChallenges';
import { emptyChallengeCopy, emptyChallengeTitle } from './ChallengesView.logic';
import {
  ActionButton,
  CardDescription,
  EmptyIcon,
  EmptyState,
  EmptyTitle,
} from './ChallengesView.styles';

export function ChallengeEmptyState({ activeTab }: { activeTab: ChallengeStatus }) {
  return (
    <EmptyState>
      <EmptyIcon>
        <Lock size={48} aria-hidden="true" />
      </EmptyIcon>
      <EmptyTitle>{emptyChallengeTitle(activeTab)}</EmptyTitle>
      <CardDescription>{emptyChallengeCopy(activeTab)}</CardDescription>
      <ActionButton as={Link} to="/dashboard/client/log-workout?loadPlan=today" $variant="primary">
        <Dumbbell size={16} aria-hidden="true" />
        Log Workout
      </ActionButton>
    </EmptyState>
  );
}

export function ChallengeUnavailableState({
  message,
  onRetry,
}: { message: string; onRetry: () => void }) {
  return (
    <EmptyState role="alert" aria-live="polite">
      <EmptyIcon>
        <AlertTriangle size={48} aria-hidden="true" />
      </EmptyIcon>
      <EmptyTitle>Challenges unavailable</EmptyTitle>
      <CardDescription>{message}</CardDescription>
      <ActionButton $variant="secondary" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" />
        Retry
      </ActionButton>
    </EmptyState>
  );
}