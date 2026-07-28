import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mocks, resetChallengeWorkspaceMocks } from './ChallengeCommandWorkspace.renderTestHarness';
import ChallengeCommandWorkspace from './ChallengeCommandWorkspace';
import ChallengeWorkspaceNextAction from './ChallengeWorkspaceNextAction';

describe('ChallengeWorkspaceNextAction integration', () => {
  beforeEach(resetChallengeWorkspaceMocks);

  it('opens the audience tab from the workspace next-action strip when a draft has no cohort', async () => {
    mocks.managed.challenges[0].currentParticipants = 0;
    mocks.managed.challenges[0].participants = [];

    render(<ChallengeCommandWorkspace />);

    const nextAction = within(screen.getByRole('region', { name: 'Challenge command next action' }));
    expect(nextAction.getByText('Add an audience before publishing')).toBeTruthy();

    fireEvent.click(nextAction.getByRole('button', { name: 'Open Audience' }));

    expect(screen.getByRole('tab', { name: /Audience/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Build the starting cohort')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tabpanel')));
  });

  it('describes a disabled submissions-sync action with its loading detail', () => {
    render(
      <ChallengeWorkspaceNextAction
        templateCount={6}
        challenges={[{ id: 'challenge-1', title: 'July Squad Spark', status: 'active', startDate: '2000-01-01T12:00:00.000Z', currentParticipants: 4, participants: [] }]}
        submissionCount={0}
        submissionsLoading
        onNavigate={() => undefined}
      />,
    );

    const detail = screen.getByText('Client-created submissions are loading from the governed moderation queue.');
    const button = screen.getByRole('button', { name: 'Open Submissions' });
    expect(button).toBeDisabled();
    expect(detail).toHaveAttribute('id', 'challenge-next-action-detail');
    expect(button).toHaveAttribute('aria-describedby', 'challenge-next-action-detail');
  });
  it('opens the live tab for scheduled active campaigns instead of claiming live impact', async () => {
    mocks.managed.challenges[0].status = 'active';
    mocks.managed.challenges[0].startDate = '2999-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    mocks.managed.challenges[0].currentParticipants = 4;

    render(<ChallengeCommandWorkspace />);

    const nextAction = within(screen.getByRole('region', { name: 'Challenge command next action' }));
    expect(nextAction.getByText('Monitor scheduled challenge launch')).toBeTruthy();
    expect(nextAction.queryByText('Inspect live challenge impact')).toBeNull();

    fireEvent.click(nextAction.getByRole('button', { name: 'Open Live Challenges' }));

    expect(screen.getByRole('tab', { name: /Live Challenges/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Scheduled').getAttribute('data-status-tone')).toBe('scheduled');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tabpanel')));
  });
});