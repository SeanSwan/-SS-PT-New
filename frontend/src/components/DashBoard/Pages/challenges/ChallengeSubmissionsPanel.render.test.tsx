import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallengeSubmissionsPanel from './ChallengeSubmissionsPanel';
import type { ChallengeGovernancePolicy } from './useChallengeTemplates';
import type { ChallengeSubmissionQueueState } from './useChallengeSubmissions';

const gatedGovernance: ChallengeGovernancePolicy = {
  creatorRoles: ['admin', 'trainer'],
  clientCreation: 'disabled_by_default',
  requiresModerationForClientPublish: true,
  publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
};

describe('ChallengeSubmissionsPanel', () => {
  it('shows entitlement and moderation policy without inventing submission rows', () => {
    const queue: ChallengeSubmissionQueueState = {
      submissions: [],
      queueStatus: 'empty_by_policy',
      message: 'Backend queue confirms client-created submissions are closed.',
      governance: gatedGovernance,
      loading: false,
      error: null,
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload: vi.fn(),
      moderateSubmission: vi.fn(),
    };

    render(<ChallengeSubmissionsPanel governance={null} queue={queue} />);

    expect(screen.getByRole('heading', { name: 'Client submission gate' })).toBeTruthy();
    expect(screen.getByText('Off until entitlement')).toBeTruthy();
    expect(screen.getByText('Required before publish')).toBeTruthy();
    expect(screen.getByText('No client-created challenge submissions are connected yet.')).toBeTruthy();
    expect(screen.getByText('Review queue empty by policy')).toBeTruthy();
    expect(screen.getByText('Backend queue confirms client-created submissions are closed.')).toBeTruthy();
    expect(screen.getByText('This space is reserved for entitlement-approved client submissions after moderation storage starts returning review records.')).toBeTruthy();
    expect(screen.queryByText('Avery Stone')).toBeNull();

    const gates = within(screen.getByLabelText('Client submission activation gates'));
    expect(gates.getByText('Entitlement required')).toBeTruthy();
    expect(gates.getByText('Moderation storage pending')).toBeTruthy();
    expect(gates.getByText('Review records pending')).toBeTruthy();

    const policy = within(screen.getByLabelText('Client challenge submission policy'));
    expect(policy.getByText('Admin + Trainer')).toBeTruthy();
    expect(policy.getByText('Admin Full Control Trainer Scoped Client Entitled Later')).toBeTruthy();
  });

  it('renders staff moderation controls for queued client submissions', () => {
    const moderateSubmission = vi.fn().mockResolvedValue(true);
    const queue: ChallengeSubmissionQueueState = {
      submissions: [{
        id: 'sub-1',
        title: '30-day consistency sprint',
        description: 'Client wants a measurable challenge for the next four logged workouts.',
        challengeType: 'weekly',
        archetype: 'consistency',
        status: 'pending',
        moderationStatus: 'pending',
        requestedVisibility: 'trainer_visible',
        submittedAt: '2026-06-30T05:00:00.000Z',
        submittedBy: 'Client #42',
      }],
      queueStatus: 'pending_review',
      message: '1 client-created challenge submission needs moderation review.',
      governance: gatedGovernance,
      loading: false,
      error: null,
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload: vi.fn(),
      moderateSubmission,
    };

    render(<ChallengeSubmissionsPanel governance={null} queue={queue} />);

    const row = screen.getByText('30-day consistency sprint').closest('article');
    expect(row).toBeTruthy();
    const card = within(row as HTMLElement);

    expect(card.getByText('Client wants a measurable challenge for the next four logged workouts.')).toBeTruthy();
    expect(card.getByText('Weekly')).toBeTruthy();
    expect(card.getByText('Consistency')).toBeTruthy();
    expect(card.getByText('Pending')).toBeTruthy();
    expect(card.getByText('Decision Pending')).toBeTruthy();
    expect(card.getByText('Trainer Visible')).toBeTruthy();
    expect(card.getByRole('button', { name: 'Start review 30-day consistency sprint' })).toBeTruthy();
    expect(card.getByRole('button', { name: 'Approve draft 30-day consistency sprint' })).toBeTruthy();
    expect(card.getByRole('button', { name: 'Reject 30-day consistency sprint' })).toBeTruthy();

    fireEvent.change(card.getByLabelText('Review notes for 30-day consistency sprint'), {
      target: { value: 'Needs clearer scoring before launch.' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Reject 30-day consistency sprint' }));

    expect(moderateSubmission).toHaveBeenCalledWith('sub-1', 'reject', 'Needs clearer scoring before launch.');
  });

  it('lets staff request client submission changes with review notes', () => {
    const moderateSubmission = vi.fn().mockResolvedValue(true);
    const queue: ChallengeSubmissionQueueState = {
      submissions: [{
        id: 'sub-1',
        title: '30-day consistency sprint',
        status: 'under_review',
        moderationStatus: 'needs_changes',
        requestedVisibility: 'trainer_visible',
        submittedBy: 'Client #42',
      }],
      queueStatus: 'pending_review',
      message: '1 client-created challenge submission needs moderation review.',
      governance: gatedGovernance,
      loading: false,
      error: null,
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload: vi.fn(),
      moderateSubmission,
    };

    render(<ChallengeSubmissionsPanel governance={null} queue={queue} />);

    const requestChangesButton = screen.getByRole('button', { name: 'Request changes 30-day consistency sprint' });
    const rejectButton = screen.getByRole('button', { name: 'Reject 30-day consistency sprint' });
    expect(requestChangesButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(requestChangesButton).toHaveAttribute('aria-describedby', 'challenge-submission-sub-1-notes-required');
    expect(rejectButton).toHaveAttribute('aria-describedby', 'challenge-submission-sub-1-notes-required');
    expect(screen.getByText('Review notes required before request changes or rejection')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Review notes for 30-day consistency sprint'), {
      target: { value: 'Add a measurable scoring target before staff can review it again.' },
    });
    fireEvent.click(requestChangesButton);

    expect(moderateSubmission).toHaveBeenCalledWith(
      'sub-1',
      'request_changes',
      'Add a measurable scoring target before staff can review it again.',
    );
  });
  it('sanitizes submission ids before using them in moderation aria descriptions', () => {
    const queue: ChallengeSubmissionQueueState = {
      submissions: [{
        id: 'sub 1/unsafe',
        title: '30-day consistency sprint',
        status: 'under_review',
        moderationStatus: 'needs_changes',
        requestedVisibility: 'trainer_visible',
        submittedBy: 'Client #42',
      }],
      queueStatus: 'pending_review',
      message: '1 client-created challenge submission needs moderation review.',
      governance: gatedGovernance,
      loading: false,
      error: null,
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload: vi.fn(),
      moderateSubmission: vi.fn(),
    };

    render(<ChallengeSubmissionsPanel governance={null} queue={queue} />);

    const requirement = screen.getByText('Review notes required before request changes or rejection');
    expect(requirement).toHaveAttribute('id', 'challenge-submission-sub-1-unsafe-notes-required');
    expect(screen.getByRole('button', { name: 'Request changes 30-day consistency sprint' })).toHaveAttribute(
      'aria-describedby',
      'challenge-submission-sub-1-unsafe-notes-required',
    );
  });
  it('blocks rejection until staff records client-facing review notes', () => {
    const moderateSubmission = vi.fn().mockResolvedValue(true);
    const queue: ChallengeSubmissionQueueState = {
      submissions: [{
        id: 'sub-1',
        title: '30-day consistency sprint',
        status: 'under_review',
        moderationStatus: 'pending',
        requestedVisibility: 'trainer_visible',
        submittedBy: 'Client #42',
      }],
      queueStatus: 'pending_review',
      message: '1 client-created challenge submission needs moderation review.',
      governance: gatedGovernance,
      loading: false,
      error: null,
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload: vi.fn(),
      moderateSubmission,
    };

    render(<ChallengeSubmissionsPanel governance={null} queue={queue} />);

    const rejectButton = screen.getByRole('button', { name: 'Reject 30-day consistency sprint' });
    expect(rejectButton).toBeDisabled();
    expect(screen.getByText('Review notes required before request changes or rejection')).toBeTruthy();

    fireEvent.click(rejectButton);
    expect(moderateSubmission).not.toHaveBeenCalled();
  });

  it('shows backend queue errors with a retry action', () => {
    const reload = vi.fn();
    const queue: ChallengeSubmissionQueueState = {
      submissions: [],
      queueStatus: null,
      message: null,
      governance: null,
      loading: false,
      error: 'Challenge submission queue unavailable',
      moderatingId: null,
      actionMessage: null,
      actionError: null,
      reload,
      moderateSubmission: vi.fn(),
    };

    render(<ChallengeSubmissionsPanel governance={gatedGovernance} queue={queue} />);

    expect(screen.getByRole('alert').textContent).toContain('Challenge submission queue unavailable');
    screen.getByRole('button', { name: 'Retry submissions queue' }).click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});


