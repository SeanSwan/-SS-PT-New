import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  progressLabel: '90 of 150 minutes', targetLabel: '150 minutes target',
  participantStatus: 'active', checkInsCount: 2,
};

const renderChallengeCards = (children: React.ReactElement) => render(<MemoryRouter>{children}</MemoryRouter>);

describe('ChallengeCards', () => {
  it('shows latest workout impact and the next action for joined active challenge cards', () => {
    renderChallengeCards(
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
              activeMinutes: 45,
              exercisesCompleted: 6,
              personalRecordCount: 1,
              assignedSession: true,
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
    expect(screen.getByText('Last workout: +45 minutes | 45 active min | 6 exercises | 1 PR | assigned session')).toBeInTheDocument();
    expect(screen.getByText('2 check-ins')).toBeInTheDocument();
    expect(screen.getByText('Next: Log more workout minutes')).toBeInTheDocument();
  });

  it('keeps joined active cards actionable when the backend has no latest workout impact yet', () => {
    renderChallengeCards(
      <ChallengeCards
        activeTab="active"
        challenges={[{ ...baseChallenge, nextAction: undefined, lastWorkoutImpact: null }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );
    expect(screen.getByText('Next logged workout can sync completed workout minutes toward 150 minutes target when challenge rules match.')).toBeInTheDocument();
    expect(screen.queryByText(/Last workout:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument();
  });
  it('keeps assigned-session next actions from implying ad hoc workout logs count', () => {
    renderChallengeCards(
      <ChallengeCards
        activeTab="active"
        challenges={[{
          ...baseChallenge,
          title: 'Three Planned Sessions',
          progressUnit: 'sessions',
          progressLabel: '1 of 3 sessions',
          targetLabel: '3 sessions target',
          tags: ['assigned-session'],
          nextAction: 'Complete your next workout',
          lastWorkoutImpact: null,
        }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );
    expect(screen.getByText('Next: Complete your next assigned workout')).toBeInTheDocument();
    expect(screen.queryByText('Next: Complete your next workout')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log Assigned Workout: Three Planned Sessions' })).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    expect(screen.queryByRole('link', { name: 'Log Workout: Three Planned Sessions' })).not.toBeInTheDocument();
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
    renderChallengeCards(
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
    renderChallengeCards(
      <ChallengeCards
        activeTab="active"
        challenges={[{ ...baseChallenge, joined: false, nextAction: 'Log more workout minutes', lastWorkoutImpact: null }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );
    expect(screen.getByText('Join to sync completed workout minutes toward 150 minutes target.')).toBeInTheDocument();
    expect(screen.queryByText('2 check-ins')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last workout:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share to feed/i })).not.toBeInTheDocument();
  });
  it('formats active card deadlines with Today and singular day copy', () => {
    renderChallengeCards(
      <ChallengeCards
        activeTab="active"
        challenges={[
          { ...baseChallenge, id: 'deadline-today', title: 'Deadline Today', daysLeft: 0 },
          { ...baseChallenge, id: 'deadline-one-day', title: 'One Day Sprint', daysLeft: 1 },
        ]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
      />,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('1 day left')).toBeInTheDocument();
    expect(screen.queryByText('0 days left')).not.toBeInTheDocument();
    expect(screen.queryByText('1 days left')).not.toBeInTheDocument();
  });
  it('does not invite joining completed public challenge cards', () => {
    renderChallengeCards(
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
    renderChallengeCards(
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

    renderChallengeCards(
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
    expect(screen.getByRole('link', { name: 'Log Workout: 150-Minute Week' })).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    fireEvent.click(screen.getByRole('button', { name: /leave challenge/i }));
    expect(leaveChallenge).toHaveBeenCalledWith(baseChallenge.id);
  });
  it('does not show the Log Workout shortcut for joined upcoming challenge cards', () => {
    renderChallengeCards(
      <ChallengeCards
        activeTab="upcoming"
        challenges={[{ ...baseChallenge, status: 'upcoming', startsIn: '3 days' }]}
        isDemoData={false}
        noMotion
        onJoin={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.queryByRole('link', { name: /log workout/i })).not.toBeInTheDocument();
  });
  it('does not invite joining upcoming public challenge cards before the start window opens', () => {
    const joinChallenge = vi.fn();
    renderChallengeCards(<ChallengeCards activeTab="upcoming" challenges={[{ ...baseChallenge, status: 'upcoming', joined: false, startsIn: '3 days' }]} isDemoData={false} noMotion onJoin={joinChallenge} />);
    const scheduledButton = screen.getByRole('button', { name: 'Scheduled Challenge: 150-Minute Week' });
    expect(scheduledButton).toBeDisabled();
    expect(scheduledButton).toHaveTextContent('Starts in 3 days');
    expect(screen.queryByRole('button', { name: /join challenge/i })).not.toBeInTheDocument();
    fireEvent.click(scheduledButton);
    expect(joinChallenge).not.toHaveBeenCalled();
  });
  it('locks leave actions while a leave request is in flight', () => {
    renderChallengeCards(
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
    renderChallengeCards(
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
