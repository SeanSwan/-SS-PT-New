import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gateState = vi.hoisted(() => ({
  current: {
    canSubmit: false,
    queueStatus: 'closed_until_entitlement',
    requiredEntitlement: 'client_challenge_creation',
    message: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
    nextSteps: [
      'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
      'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
    ],
    policy: {
      creatorRoles: ['admin', 'trainer'],
      clientCreation: 'disabled_by_default',
      requiresModerationForClientPublish: true,
      publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
    },
    loading: false,
    error: null,
    actionError: null,
    actionMessage: null,
    reload: vi.fn(),
    submitChallengeIdea: vi.fn(),
  },
}));

vi.mock('./useClientChallengeSubmissionGate', () => ({
  useClientChallengeSubmissionGate: () => gateState.current,
}));

import ClientChallengeSubmissionGate from './ClientChallengeSubmissionGate';

describe('ClientChallengeSubmissionGate', () => {
  beforeEach(() => {
    Object.assign(gateState.current, {
      canSubmit: false,
      message: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
      nextSteps: [
        'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
        'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
      ],
      loading: false,
      error: null,
      actionError: null,
      actionMessage: null,
    });
    gateState.current.reload.mockReset();
    gateState.current.submitChallengeIdea.mockReset();
  });

  it('renders a locked challenge idea lane without fake submission controls', () => {
    render(<ClientChallengeSubmissionGate />);

    expect(screen.getByRole('heading', { name: 'Challenge Idea Lab' })).toBeTruthy();
    expect(screen.getByText('Pilot Locked')).toBeTruthy();
    expect(screen.getByText('Trainer review required')).toBeTruthy();
    expect(screen.getByText('No media or comments')).toBeTruthy();
    expect(screen.getByText(gateState.current.message)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit challenge idea locked' })).toBeDisabled();
    expect(screen.queryByLabelText('Challenge idea title')).toBeNull();

    const nextSteps = within(screen.getByLabelText('Challenge idea gate next steps'));
    expect(nextSteps.getByText(gateState.current.nextSteps[0])).toBeTruthy();
    expect(nextSteps.getByText(gateState.current.nextSteps[1])).toBeTruthy();
  });

  it('lets clients refresh policy access without submitting a challenge idea', () => {
    render(<ClientChallengeSubmissionGate />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh challenge idea access' }));

    expect(gateState.current.reload).toHaveBeenCalledTimes(1);
    expect(gateState.current.submitChallengeIdea).not.toHaveBeenCalled();
  });

  it('guides entitled clients through required challenge idea fields before submission', () => {
    Object.assign(gateState.current, {
      canSubmit: true,
      message: 'Challenge ideas are open for trainer review.',
      nextSteps: ['Draft a private idea from real training progress.'],
    });

    render(<ClientChallengeSubmissionGate />);

    const submitButton = screen.getByRole('button', { name: 'Submit challenge idea for trainer review' });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-describedby', 'challenge-idea-readiness');
    expect(screen.getByText('Add a title and description to unlock submission.')).toBeTruthy();
    expect(screen.getByText('0/72 title characters')).toBeTruthy();
    expect(screen.getByText('0/240 description characters')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Challenge idea title'), { target: { value: 'Three steady sessions' } });
    expect(screen.getByText('21/72 title characters')).toBeTruthy();
    expect(screen.getByText('Add a description to unlock submission.')).toBeTruthy();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Challenge idea description'), { target: { value: 'A trainer-reviewed challenge for my next three assigned workouts.' } });
    expect(screen.getByText('65/240 description characters')).toBeTruthy();
    expect(screen.getByText('Ready for trainer review.')).toBeTruthy();
    expect(submitButton).not.toBeDisabled();
  });

  it('lets entitled clients submit a private self-challenge idea without opening public publishing', () => {
    Object.assign(gateState.current, {
      canSubmit: true,
      message: 'Challenge ideas are open for trainer review.',
      nextSteps: ['Draft a private idea from real training progress.'],
    });

    render(<ClientChallengeSubmissionGate />);

    fireEvent.click(screen.getByRole('radio', { name: /Private self-challenge/i }));
    expect(screen.getByLabelText('Challenge format')).toBeTruthy();
    expect(screen.getByLabelText('Challenge focus')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Challenge idea title'), { target: { value: 'My quiet consistency streak' } });
    fireEvent.change(screen.getByLabelText('Challenge idea description'), { target: { value: 'A private challenge for my own next seven workouts.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit private challenge idea' }));

    expect(gateState.current.submitChallengeIdea).toHaveBeenCalledWith({
      title: 'My quiet consistency streak',
      description: 'A private challenge for my own next seven workouts.',
      requestedVisibility: 'private',
      challengeType: 'weekly',
      archetype: 'consistency',
    });
    expect(screen.getAllByText('No public publishing')).toHaveLength(2);
  });

  it('opens an entitled trainer-review idea form and submits through the governed hook', () => {
    Object.assign(gateState.current, {
      canSubmit: true,
      message: 'Challenge ideas are open for trainer review.',
      nextSteps: ['Draft a private idea from real training progress.'],
    });

    render(<ClientChallengeSubmissionGate />);

    expect(screen.getByText('Entitlement Open')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Submit challenge idea locked' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Challenge idea title'), { target: { value: 'Three steady sessions' } });
    fireEvent.change(screen.getByLabelText('Challenge idea description'), { target: { value: 'A trainer-reviewed challenge for my next three assigned workouts.' } });
    fireEvent.change(screen.getByLabelText('Challenge format'), { target: { value: 'monthly' } });
    fireEvent.change(screen.getByLabelText('Challenge focus'), { target: { value: 'improvement' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit challenge idea for trainer review' }));

    expect(gateState.current.submitChallengeIdea).toHaveBeenCalledWith({
      title: 'Three steady sessions',
      description: 'A trainer-reviewed challenge for my next three assigned workouts.',
      requestedVisibility: 'trainer_visible',
      challengeType: 'monthly',
      archetype: 'improvement',
    });
  });
});
