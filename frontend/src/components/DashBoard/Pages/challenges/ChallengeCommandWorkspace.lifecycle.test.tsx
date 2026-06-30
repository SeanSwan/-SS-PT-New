import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mocks, resetChallengeWorkspaceMocks } from './ChallengeCommandWorkspace.renderTestHarness';
import ChallengeCommandWorkspace from './ChallengeCommandWorkspace';

describe('ChallengeCommandWorkspace lifecycle controls', () => {
  beforeEach(resetChallengeWorkspaceMocks);
  it('publishes a draft challenge as a private cohort from the live tab action', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish Private' }));

    expect(mocks.publishManaged).toHaveBeenCalledWith('challenge-1', 'private');
  });

  it('schedules a draft challenge as public discovery from the live tab action', () => {
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const scheduledButton = screen.getByRole('button', { name: 'Schedule Public Campaign' });

    expect(screen.queryByRole('button', { name: 'Publish Public Now' })).toBeNull();
    expect(scheduledButton.getAttribute('title')).toBe('Schedules public discovery for the selected start date.');
    fireEvent.click(scheduledButton);

    expect(mocks.publishManaged).toHaveBeenCalledWith('challenge-1', 'public');
  });

  it('publishes an already-open draft as public discovery without immediate copy', () => {
    mocks.managed.challenges[0].status = 'draft';
    mocks.managed.challenges[0].startDate = '2000-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const publicButton = screen.getByRole('button', { name: 'Publish Public Campaign' });

    expect(screen.queryByRole('button', { name: 'Schedule Public Campaign' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish Public Now' })).toBeNull();
    expect(publicButton.getAttribute('title')).toBe('Publishes public discovery because the selected start date has already opened.');
    fireEvent.click(publicButton);

    expect(mocks.publishManaged).toHaveBeenCalledWith('challenge-1', 'public');
  });

  it('exposes complete and cancel lifecycle actions for active managed challenges', () => {
    mocks.managed.challenges[0].status = 'active';
    mocks.managed.challenges[0].startDate = '2000-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Challenge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Challenge' }));

    expect(mocks.updateManaged).toHaveBeenCalledWith('challenge-1', 'complete');
    expect(mocks.updateManaged).toHaveBeenCalledWith('challenge-1', 'cancel');
  });

  it('labels backend active managed challenges as live for operators after launch', () => {
    mocks.managed.challenges[0].status = 'active';
    mocks.managed.challenges[0].startDate = '2000-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const list = within(screen.getByLabelText('Managed challenge campaigns'));

    expect(list.getByText('Live').getAttribute('data-status-tone')).toBe('live');
    expect(list.queryByText('Active')).toBeNull();
    expect(list.queryByText('Scheduled')).toBeNull();
  });

  it('labels future-start active managed challenges as scheduled until launch', () => {
    mocks.managed.challenges[0].status = 'active';
    mocks.managed.challenges[0].startDate = '2999-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const list = within(screen.getByLabelText('Managed challenge campaigns'));

    expect(list.getByText('Scheduled').getAttribute('data-status-tone')).toBe('scheduled');
    expect(list.queryByText('Active')).toBeNull();
    expect(list.queryByText('Live')).toBeNull();
    expect(list.queryByRole('button', { name: 'Complete Challenge' })).toBeNull();
    expect(list.getByRole('button', { name: 'Cancel Challenge' })).toBeTruthy();
  });

  it('locks lifecycle controls during an in-flight status update without losing action names', () => {
    mocks.managed.challenges[0].status = 'active';
    mocks.managed.challenges[0].startDate = '2000-01-01T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2999-01-08T12:00:00.000Z';
    mocks.managed.updatingId = 'challenge-1';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const completeButton = screen.getByRole('button', { name: 'Complete Challenge' }) as HTMLButtonElement;
    const cancelButton = screen.getByRole('button', { name: 'Cancel Challenge' }) as HTMLButtonElement;

    expect(completeButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(completeButton.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(cancelButton);
    expect(mocks.updateManaged).not.toHaveBeenCalled();
  });

  it('exposes archive lifecycle action for completed and cancelled managed challenges', () => {
    mocks.managed.challenges[0].status = 'completed';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive Challenge' }));

    expect(mocks.updateManaged).toHaveBeenCalledWith('challenge-1', 'archive');
  });

  it('does not render lifecycle controls for archived managed challenges', () => {
    mocks.managed.challenges[0].status = 'archived';
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));

    expect(screen.queryByRole('button', { name: 'Complete Challenge' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel Challenge' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive Challenge' })).toBeNull();
  });
  it('blocks private publish until a draft audience has been saved', () => {
    mocks.managed.challenges[0].currentParticipants = 0;
    mocks.managed.challenges[0].participants = [];
    render(<ChallengeCommandWorkspace />);

    fireEvent.click(screen.getByRole('tab', { name: /Live Challenges/i }));
    const privateButton = screen.getByRole('button', { name: 'Add Audience First' }) as HTMLButtonElement;
    const publicButton = screen.getByRole('button', { name: 'Schedule Public Campaign' }) as HTMLButtonElement;

    expect(privateButton.disabled).toBe(true);
    expect(publicButton.disabled).toBe(false);
    fireEvent.click(privateButton);
    expect(mocks.publishManaged).not.toHaveBeenCalled();
  });
});
