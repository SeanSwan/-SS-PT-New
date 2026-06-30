import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChallengeAudienceSelector from './ChallengeAudienceSelector';

const mocks = vi.hoisted(() => ({
  reload: vi.fn(() => Promise.resolve()),
  saveAudience: vi.fn(() => Promise.resolve(true)),
  state: {
    options: [
      {
        id: '101',
        name: 'Avery Stone',
        source: 'swanstudios',
        membership: 'premium',
        workouts: 18,
        lastWorkoutDate: '2026-06-20T12:00:00.000Z',
      },
      {
        id: '102',
        name: 'Mika Rivera',
        source: 'move_fitness',
        membership: 'basic',
        workouts: 7,
        nextSessionDate: '2026-07-01T12:00:00.000Z',
      },
    ],
    sourceLabel: 'Assigned clients',
    loading: false,
    error: null,
  },
}));

vi.mock('./useChallengeAudienceOptions', () => ({
  useChallengeAudienceOptions: () => ({ ...mocks.state, reload: mocks.reload }),
}));

const draftChallenge = {
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Trainer-created draft challenge.',
  challengeType: 'community',
  category: 'community_meetup',
  difficulty: 3,
  xpReward: 140,
  maxProgress: 12,
  progressUnit: 'sessions',
  startDate: '2026-07-06T12:00:00.000Z',
  endDate: '2026-07-13T12:00:00.000Z',
  status: 'draft',
  currentParticipants: 0,
  maxParticipants: 16,
};

const renderAudienceSelector = () => render(
  <ChallengeAudienceSelector
    challenges={[draftChallenge]}
    onSaveAudience={mocks.saveAudience}
    savingChallengeId={null}
    saveError={null}
  />,
);

describe('ChallengeAudienceSelector', () => {
  beforeEach(() => {
    mocks.reload.mockClear();
    mocks.saveAudience.mockClear();
  });

  it('shows real eligible clients and persists a draft audience selection', async () => {
    renderAudienceSelector();

    expect(screen.getByText('Build the starting cohort')).toBeTruthy();
    expect(screen.getByText('Persistent Draft Audience')).toBeTruthy();
    expect(screen.getByLabelText('Draft challenge target')).toBeTruthy();
    expect(screen.getByText('Assigned clients')).toBeTruthy();
    expect(screen.getByText('Avery Stone')).toBeTruthy();
    expect(screen.getByText('Mika Rivera')).toBeTruthy();
    expect(screen.getByText(/0 visible selected in Cohort mode\./)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Select Avery Stone'));
    expect(screen.getByText(/1 visible selected in Cohort mode\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Team Pool/i }));
    expect(screen.getByText(/1 visible selected in Team Pool mode\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Save Audience/i }));
    await waitFor(() => expect(mocks.saveAudience).toHaveBeenCalledWith('challenge-1', ['101']));
    expect(await screen.findByText('1 clients saved to July Squad Spark.')).toBeTruthy();
  });

  it('filters, selects visible clients, clears, and refreshes', () => {
    renderAudienceSelector();

    fireEvent.change(screen.getByLabelText('Search eligible clients'), { target: { value: 'Mika' } });
    expect(screen.queryByText('Avery Stone')).toBeNull();
    expect(screen.getByText('Mika Rivera')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Select Visible/i }));
    expect(screen.getByText(/1 visible selected in Cohort mode\./)).toBeTruthy();

    const metrics = within(screen.getByLabelText('Audience assignment metrics'));
    expect(metrics.getByText('Selected')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.getByText(/0 visible selected in Cohort mode\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });
});
