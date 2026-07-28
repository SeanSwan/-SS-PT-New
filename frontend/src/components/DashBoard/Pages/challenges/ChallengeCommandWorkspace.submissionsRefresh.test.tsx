import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mocks, resetChallengeWorkspaceMocks } from './ChallengeCommandWorkspace.renderTestHarness';
import ChallengeCommandWorkspace from './ChallengeCommandWorkspace';

const loadClientSubmission = (status: 'pending' | 'under_review' = 'under_review') => {
  mocks.submissions.submissions = [{
    id: 'submission-1',
    title: 'Client-built consistency sprint',
    description: 'Client wants a coach-reviewed weekly challenge draft.',
    challengeType: 'weekly',
    archetype: 'consistency',
    status,
    moderationStatus: 'pending',
    requestedVisibility: 'trainer_visible',
    submittedBy: 'Client #42',
  }];
};

const openSubmissionsTab = () => {
  fireEvent.click(screen.getByRole('tab', { name: /Submissions/i }));
};

describe('ChallengeCommandWorkspace submission moderation refresh', () => {
  beforeEach(resetChallengeWorkspaceMocks);

  it('refreshes managed challenge drafts after approving a client submission', async () => {
    loadClientSubmission();
    render(<ChallengeCommandWorkspace />);

    openSubmissionsTab();
    fireEvent.click(screen.getByRole('button', { name: 'Approve draft Client-built consistency sprint' }));

    await waitFor(() => expect(mocks.moderateSubmission).toHaveBeenCalledWith('submission-1', 'approve_as_draft', ''));
    await waitFor(() => expect(mocks.reloadManaged).toHaveBeenCalledTimes(1));
  });

  it('does not refresh managed challenges when staff only starts submission review', async () => {
    loadClientSubmission('pending');
    render(<ChallengeCommandWorkspace />);

    openSubmissionsTab();
    fireEvent.click(screen.getByRole('button', { name: 'Start review Client-built consistency sprint' }));

    await waitFor(() => expect(mocks.moderateSubmission).toHaveBeenCalledWith('submission-1', 'start_review', undefined));
    expect(mocks.reloadManaged).not.toHaveBeenCalled();
  });

  it('does not refresh managed challenges when submission moderation fails', async () => {
    mocks.moderateSubmission.mockResolvedValueOnce(false);
    loadClientSubmission();
    render(<ChallengeCommandWorkspace />);

    openSubmissionsTab();
    fireEvent.click(screen.getByRole('button', { name: 'Approve draft Client-built consistency sprint' }));

    await waitFor(() => expect(mocks.moderateSubmission).toHaveBeenCalledWith('submission-1', 'approve_as_draft', ''));
    expect(mocks.reloadManaged).not.toHaveBeenCalled();
  });
});