import React from 'react';
import { render, screen } from '@testing-library/react';
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
  progressLabel: '90 of 150 minutes',
  targetLabel: '150 minutes target',
  participantStatus: 'active',
  checkInsCount: 2,
};

const renderChallengeCards = (challenge: Challenge) => render(
  <MemoryRouter>
    <ChallengeCards
      activeTab="active"
      challenges={[challenge]}
      isDemoData={false}
      noMotion
      onJoin={vi.fn()}
    />
  </MemoryRouter>,
);

describe('ChallengeCards team context', () => {
  it('labels joined team challenges without exposing the internal team id', () => {
    renderChallengeCards({
      ...baseChallenge,
      title: 'Squad Program Week',
      allowTeams: true,
      maxTeamSize: 4,
      teamId: 'team-alpha-internal',
    });

    expect(screen.getByText('Your squad challenge')).toBeInTheDocument();
    expect(screen.getByText('Squads up to 4')).toBeInTheDocument();
    expect(screen.queryByText('team-alpha-internal')).not.toBeInTheDocument();
  });

  it('does not label non-team cards from stray team ids', () => {
    renderChallengeCards({
      ...baseChallenge,
      teamId: 'team-alpha-internal',
    });

    expect(screen.queryByText('Your squad challenge')).not.toBeInTheDocument();
    expect(screen.queryByText('Team challenge')).not.toBeInTheDocument();
    expect(screen.queryByText('team-alpha-internal')).not.toBeInTheDocument();
  });

  it('rounds malformed team sizes up before labeling squads', () => {
    renderChallengeCards({
      ...baseChallenge,
      allowTeams: true,
      maxTeamSize: 1.2,
    });

    expect(screen.getByText('Team challenge')).toBeInTheDocument();
    expect(screen.getByText('Squads up to 2')).toBeInTheDocument();
    expect(screen.queryByText('Squads up to 1.2')).not.toBeInTheDocument();
  });
});