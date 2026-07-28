import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientRightRail } from './ClientDashboardHome.railSections';
import type { HomeChallengeSummary } from './HomeTabViewModel';

const activeChallenge: HomeChallengeSummary = {
  id: 'challenge-1',
  title: '150-Minute Week',
  progress: 30,
  daysLeft: 5,
  participants: 12,
  reward: '300 XP',
  joined: true,
  progressLabel: '45 of 150 minutes',
  checkInsCount: 2,
  nextAction: 'Log more workout minutes',
  impactLabel: 'Last workout added 45 minutes | 45 active min | 6 exercises | 2 PRs | assigned session',
};

describe('ClientRightRail active challenge context', () => {
  it('renders workout impact, progress, participation, countdown, and reward in the rail card', () => {
    render(
      <ClientRightRail
        activeChallenge={activeChallenge}
        challengeLoading={false}
        badges={[]}
        leaderboardRows={[]}
        trendingTags={[]}
        trendingLoading={false}
        onTarget={vi.fn()}
      />,
    );

    expect(screen.getByText('150-Minute Week')).toBeInTheDocument();
    expect(screen.getByText('Log more workout minutes')).toBeInTheDocument();
    expect(screen.getByText('Last workout added 45 minutes | 45 active min | 6 exercises | 2 PRs | assigned session')).toBeInTheDocument();
    expect(screen.getByText('Progress: 45 of 150 minutes | 2 check-ins')).toBeInTheDocument();
    expect(screen.getByText('12 participants in | 5 days left | Reward: 300 XP')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
    expect(screen.getByRole('button', { name: /open challenge board/i })).toBeInTheDocument();
  });

  it('labels the next step and hands the CTA to the canonical Challenges route target', () => {
    const onTarget = vi.fn();

    render(
      <ClientRightRail
        activeChallenge={activeChallenge}
        challengeLoading={false}
        badges={[]}
        leaderboardRows={[]}
        trendingTags={[]}
        trendingLoading={false}
        onTarget={onTarget}
      />,
    );

    expect(screen.getByText('Next action')).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: 'Open challenge board for 150-Minute Week' });
    fireEvent.click(cta);

    expect(onTarget).toHaveBeenCalledWith('challenges');
  });
  it('labels reward copy honestly when a challenge has no next-action prompt', () => {
    render(
      <ClientRightRail
        activeChallenge={{ ...activeChallenge, nextAction: undefined }}
        challengeLoading={false}
        badges={[]}
        leaderboardRows={[]}
        trendingTags={[]}
        trendingLoading={false}
        onTarget={vi.fn()}
      />,
    );

    expect(screen.getByText('Reward')).toBeInTheDocument();
    expect(screen.queryByText('Next action')).toBeNull();
  });
});
