/**
 * BLUEPRINT: ChallengesView.actions
 * Purpose: Render challenge card commands for joining, logging workouts,
 * leaving, and sharing completed milestones.
 * Data truth: Uses the normalized challenge status only; no progress mutation.
 * Writes: Calls explicit handlers or navigates to the canonical workout logger.
 */
import React from 'react';
import { CheckCircle2, ChevronRight, Clock, Dumbbell, LogOut, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Challenge } from '../../../hooks/useChallenges';
import { isAssignedSessionChallenge } from './ChallengesView.logic';
import { ActionButton } from './ChallengesView.styles';

export interface ChallengeActionProps {
  challenge: Challenge;
  isDemoData: boolean;
  onJoin: (id: string) => void;
  onLeave?: (id: string) => void;
  onShareCompleted?: (challenge: Challenge) => void;
  sharingChallengeId?: string | null;
  joiningChallengeId?: string | null;
  leavingChallengeId?: string | null;
}

export function ChallengeAction({
  challenge,
  isDemoData,
  onJoin,
  onLeave,
  onShareCompleted,
  sharingChallengeId,
  joiningChallengeId,
  leavingChallengeId,
}: ChallengeActionProps) {
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
        <ActionButton $variant="completed" disabled aria-label={`Completed: ${challenge.title}`}>
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

  if (challenge.status === 'upcoming' && !challenge.joined) {
    return (
      <ActionButton
        $variant="secondary"
        disabled
        aria-label={`Scheduled Challenge: ${challenge.title}`}
      >
        <Clock size={16} aria-hidden="true" />
        {challenge.startsIn ? `Starts in ${challenge.startsIn}` : 'Scheduled'}
      </ActionButton>
    );
  }

  if (challenge.joined) {
    const workoutLogLabel = isAssignedSessionChallenge(challenge)
      ? 'Log Assigned Workout'
      : 'Log Workout';

    return (
      <>
        <ActionButton $variant="secondary" disabled aria-label={`Progress synced: ${challenge.title}`}>
          <CheckCircle2 size={16} aria-hidden="true" />
          Progress synced
        </ActionButton>
        {challenge.status === 'active' && (
          <ActionButton
            as={Link}
            to="/dashboard/client/log-workout?loadPlan=today"
            $variant="primary"
            aria-label={`${workoutLogLabel}: ${challenge.title}`}
          >
            <Dumbbell size={16} aria-hidden="true" />
            {workoutLogLabel}
          </ActionButton>
        )}
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
