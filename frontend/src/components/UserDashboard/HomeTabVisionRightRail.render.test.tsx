import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeTabVisionRightRail from './components/HomeTabVisionRightRail';
import type { HomeChallengeSummary } from './components/HomeTabViewModel';

const baseChallenge: HomeChallengeSummary = {
  id: 'challenge-1',
  title: 'Three Planned Sessions',
  progress: 40,
  daysLeft: 4,
  participants: 1,
  reward: '120 XP',
  joined: true,
};

const renderRail = (activeChallenge: HomeChallengeSummary) => render(
  <HomeTabVisionRightRail
    progressPercent={55}
    liveActivityItems={[]}
    liveActivityConnected={false}
    activeChallenge={activeChallenge}
    challengeLoading={false}
    badges={[]}
    leaderboardRows={[]}
    trendingTags={[]}
    trendingLoading={false}
    factions={[]}
    transformationPhotoUrls={[]}
    streakAtRisk={false}
    streakDays={3}
    onAction={vi.fn()}
    onLogWorkout={vi.fn()}
    onActivitySelect={vi.fn()}
    onTrendingSelect={vi.fn()}
  />,
);

describe('HomeTabVisionRightRail challenge participant copy', () => {
  it('uses singular participant grammar in the active challenge fallback copy', () => {
    renderRail(baseChallenge);

    expect(screen.getByText('1 participant is in. Reward: 120 XP.')).toBeTruthy();
    expect(screen.queryByText('1 participants are in. Reward: 120 XP.')).toBeNull();
  });

  it('uses plural participant grammar in the support line when a next action exists', () => {
    renderRail({
      ...baseChallenge,
      participants: 12,
      nextAction: 'Complete your next assigned workout',
    });

    expect(screen.getByText(/12 participants are in\. Reward: 120 XP\./)).toBeTruthy();
    expect(screen.queryByText(/12 participant is in/)).toBeNull();
  });
});
describe('HomeTabVisionRightRail challenge countdown copy', () => {
  it('spells out plural days left instead of compact developer shorthand', () => {
    renderRail(baseChallenge);

    expect(screen.getByText('4 days left')).toBeTruthy();
    expect(screen.queryByText('4D left')).toBeNull();
  });

  it('uses Today when the active challenge deadline is today', () => {
    renderRail({
      ...baseChallenge,
      daysLeft: 0,
    });

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.queryByText('0D left')).toBeNull();
  });

  it('uses singular day grammar for one remaining day', () => {
    renderRail({
      ...baseChallenge,
      daysLeft: 1,
    });

    expect(screen.getByText('1 day left')).toBeTruthy();
    expect(screen.queryByText('1D left')).toBeNull();
  });
});