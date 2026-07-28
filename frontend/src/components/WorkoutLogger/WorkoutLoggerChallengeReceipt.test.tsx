import React from 'react';
import { render, screen } from '@testing-library/react';

import WorkoutLoggerChallengeReceipt from './WorkoutLoggerChallengeReceipt';
import type { ChallengeProgressImpactReceipt } from '../../services/nasmApiService';

const completionProgress: ChallengeProgressImpactReceipt = {
  status: 'processed',
  updatedCount: 2,
  skippedCount: 0,
  headline: '2 challenges updated',
  updates: [
    {
      challengeId: 'minute-week',
      title: '150 Minute Week',
      delta: 45,
      progressUnit: 'minutes',
      currentProgress: 150,
      progressPercentage: 100,
      completed: true,
      xpEarned: 250,
    },
    {
      challengeId: 'session-streak',
      title: 'Session Streak',
      delta: 1,
      progressUnit: 'sessions',
      currentProgress: 3,
      progressPercentage: 60,
      completed: false,
      xpEarned: 0,
    },
  ],
};

describe('WorkoutLoggerChallengeReceipt', () => {
  it('renders a completed challenge with XP and each additional challenge update', () => {
    render(<WorkoutLoggerChallengeReceipt progress={completionProgress} />);

    expect(screen.getByRole('status', { name: /challenge impact/i })).toBeInTheDocument();
    expect(screen.getByText('150 Minute Week completed')).toBeInTheDocument();
    expect(screen.getByText('+250 XP earned from this workout.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /challenge updates from this workout/i })).toBeInTheDocument();
    expect(screen.getByText('Session Streak')).toBeInTheDocument();
    expect(screen.getByText('+1 session logged. 60% complete.')).toBeInTheDocument();
    expect(screen.queryByText('1 more challenge also updated.')).not.toBeInTheDocument();
  });

  it('keeps the overflow count when the backend caps visible challenge updates', () => {
    render(
      <WorkoutLoggerChallengeReceipt
        progress={{
          ...completionProgress,
          updatedCount: 5,
          updates: [
            ...completionProgress.updates,
            {
              challengeId: 'push-day',
              title: 'Push Day Builder',
              delta: 1,
              progressUnit: 'workouts',
              currentProgress: 1,
              progressPercentage: 25,
              completed: false,
              xpEarned: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Session Streak')).toBeInTheDocument();
    expect(screen.getByText('Push Day Builder')).toBeInTheDocument();
    expect(screen.getByText('2 more challenges also updated.')).toBeInTheDocument();
  });

  it('does not render more challenge rows than updatedCount supports', () => {
    render(
      <WorkoutLoggerChallengeReceipt
        progress={{
          ...completionProgress,
          updatedCount: 2,
          updates: [
            ...completionProgress.updates,
            {
              challengeId: 'push-day',
              title: 'Push Day Builder',
              delta: 1,
              progressUnit: 'workouts',
              currentProgress: 1,
              progressPercentage: 25,
              completed: false,
              xpEarned: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Session Streak')).toBeInTheDocument();
    expect(screen.queryByText('Push Day Builder')).not.toBeInTheDocument();
  });

  it('renders a non-completion progress move without inventing XP', () => {
    render(
      <WorkoutLoggerChallengeReceipt
        progress={{
          status: 'processed',
          updatedCount: 1,
          skippedCount: 0,
          headline: '1 challenge updated',
          updates: [{
            challengeId: 'session-streak',
            title: 'Session Streak',
            delta: 1,
            progressUnit: 'sessions',
            currentProgress: 2,
            progressPercentage: 20,
            completed: false,
            xpEarned: 0,
          }],
        }}
      />,
    );

    expect(screen.getByText('Session Streak moved')).toBeInTheDocument();
    expect(screen.getByText('+1 session logged. 20% complete.')).toBeInTheDocument();
    expect(screen.queryByText(/XP earned/i)).not.toBeInTheDocument();
  });

  it('uses assigned-session copy when the backend marks assigned-session-only progress', () => {
    render(
      <WorkoutLoggerChallengeReceipt
        progress={{
          status: 'processed',
          updatedCount: 1,
          skippedCount: 0,
          headline: '1 challenge updated',
          updates: [{
            challengeId: 'assigned-sessions',
            title: 'Three Planned Sessions',
            delta: 1,
            progressUnit: 'sessions',
            currentProgress: 2,
            progressPercentage: 67,
            completed: false,
            xpEarned: 0,
            assignedSessionOnly: true,
            assignedSession: true,
          }],
        }}
      />,
    );

    expect(screen.getByText('Three Planned Sessions moved')).toBeInTheDocument();
    expect(screen.getByText('+1 assigned session completed. 67% complete.')).toBeInTheDocument();
    expect(screen.queryByText('+1 session logged. 67% complete.')).not.toBeInTheDocument();
  });
  it('renders nothing for failed or empty receipts', () => {
    const { container, rerender } = render(
      <WorkoutLoggerChallengeReceipt progress={{ ...completionProgress, status: 'failed' }} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<WorkoutLoggerChallengeReceipt progress={{ ...completionProgress, updates: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
