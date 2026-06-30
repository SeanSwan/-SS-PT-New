import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Challenge } from '../../../hooks/useChallenges';
import { ChallengeCards } from './ChallengesView.cards';

const baseChallenge: Challenge = {
  id: 'challenge-1',
  title: '150-Minute Week',
  description: 'Build consistent training minutes',
  category: 'strength',
  status: 'active',
  progress: 60,
  participants: 18,
  reward: '250 XP',
  joined: true,
  currentProgress: 90,
  maxProgress: 150,
  progressUnit: 'minutes',
  progressLabel: '90 of 150 minutes',
  targetLabel: '150 minutes target',
  participantStatus: 'active',
  checkInsCount: 2,
};

describe('ChallengeCards', () => {
  it('shows latest workout impact and the next action for joined active challenge cards', () => {
    render(
      <ChallengeCards
        activeTab="active"
        challenges={[
          {
            ...baseChallenge,
            nextAction: 'Log more workout minutes',
            lastWorkoutImpact: {
              sourceId: 'workout-session:abc',
              occurredAt: '2026-06-29T15:30:00.000Z',
              progressUnit: 'minutes',
              delta: 45,
              previousProgress: 45,
              currentProgress: 90,
            },
          },
        ]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByText('Last workout: +45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Next: Log more workout minutes')).toBeInTheDocument();
  });


  it('keeps joined active cards actionable when the backend has no latest workout impact yet', () => {
    render(
      <ChallengeCards
        activeTab="active"
        challenges={[{ ...baseChallenge, nextAction: undefined, lastWorkoutImpact: null }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByText('Next logged workout will sync completed workout minutes toward 150 minutes target.')).toBeInTheDocument();
    expect(screen.queryByText(/Last workout:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument();
  });
  it('keeps completion impact visible and labels earned reward on completed cards', () => {
    const shareCompleted = vi.fn();
    const completedChallenge: Challenge = {
      ...baseChallenge,
      status: 'completed',
      progress: 100,
      participantStatus: 'completed',
      completedAt: '2026-06-29T15:30:00.000Z',
      nextAction: 'Challenge complete',
      lastWorkoutImpact: {
        progressUnit: 'sessions',
        delta: 1,
        currentProgress: 10,
      },
    };

    render(
      <ChallengeCards
        activeTab="completed"
        challenges={[completedChallenge]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
        onShareCompleted={shareCompleted}
      />,
    );

    expect(screen.getByText('Completed Jun 29')).toBeInTheDocument();
    expect(screen.getByText('Earned 250 XP')).toBeInTheDocument();
    expect(screen.getByText('Last workout: +1 session')).toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /share to feed/i }));
    expect(shareCompleted).toHaveBeenCalledWith(completedChallenge);
  });

  it('does not invent workout momentum for public joinable challenge cards', () => {
    render(
      <ChallengeCards
        activeTab="active"
        challenges={[{ ...baseChallenge, joined: false, nextAction: 'Log more workout minutes', lastWorkoutImpact: null }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByText('Join to sync completed workout minutes toward 150 minutes target.')).toBeInTheDocument();
    expect(screen.queryByText(/Last workout:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share to feed/i })).not.toBeInTheDocument();
  });

  it('does not invite joining completed public challenge cards', () => {
    render(
      <ChallengeCards
        activeTab="completed"
        challenges={[{
          ...baseChallenge,
          status: 'completed',
          joined: false,
          progress: 100,
          participantStatus: undefined,
          nextAction: 'Challenge complete',
          lastWorkoutImpact: null,
        }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Join to/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join challenge/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeDisabled();
  });
  it('locks join actions while a join request is in flight', () => {
    render(
      <ChallengeCards
        activeTab="active"
        challenges={[
          { ...baseChallenge, id: 'challenge-1', title: '150-Minute Week', joined: false },
          { ...baseChallenge, id: 'challenge-2', title: 'Three Session Streak', joined: false },
        ]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
        joiningChallengeId="challenge-1"
      />,
    );

    expect(screen.getByRole('button', { name: /joining/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /join challenge/i })).toBeDisabled();
  });
  it('exposes a guarded leave action for joined active challenge cards', () => {
    const leaveChallenge = vi.fn();

    render(
      <ChallengeCards
        activeTab="active"
        challenges={[baseChallenge]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
        onLeave={leaveChallenge}
      />,
    );

    expect(screen.getByRole('button', { name: /progress synced/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /leave challenge/i }));

    expect(leaveChallenge).toHaveBeenCalledWith(baseChallenge.id);
  });

  it('locks leave actions while a leave request is in flight', () => {
    render(
      <ChallengeCards
        activeTab="active"
        challenges={[
          { ...baseChallenge, id: 'challenge-1', title: '150-Minute Week' },
          { ...baseChallenge, id: 'challenge-2', title: 'Three Session Streak' },
        ]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
        onLeave={vi.fn()}
        leavingChallengeId="challenge-1"
      />,
    );

    expect(screen.getByRole('button', { name: /leaving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /leave challenge/i })).toBeDisabled();
  });
  it('uses challenge-specific accessible names for repeated card actions', () => {
    const joinChallenge = vi.fn();
    const leaveChallenge = vi.fn();
    const shareCompleted = vi.fn();
    const completedChallenge: Challenge = {
      ...baseChallenge,
      id: 'completed-1',
      title: 'Ten Session Sprint',
      status: 'completed',
      progress: 100,
      participantStatus: 'completed',
    };

    render(
      <ChallengeCards
        activeTab="active"
        challenges={[
          { ...baseChallenge, id: 'open-1', title: 'Open Minutes', joined: false },
          { ...baseChallenge, id: 'joined-1', title: 'Joined Minutes' },
          completedChallenge,
        ]}
        isDemoData={false}
        noMotion
        onJoin={joinChallenge}
        onLeave={leaveChallenge}
        onShareCompleted={shareCompleted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Join Challenge: Open Minutes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave Challenge: Joined Minutes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share to Feed: Ten Session Sprint' }));

    expect(screen.getByRole('button', { name: 'Progress synced: Joined Minutes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Completed: Ten Session Sprint' })).toBeDisabled();
    expect(joinChallenge).toHaveBeenCalledWith('open-1');
    expect(leaveChallenge).toHaveBeenCalledWith('joined-1');
    expect(shareCompleted).toHaveBeenCalledWith(completedChallenge);
  });
});
