import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChallengeDraftCreator from './ChallengeDraftCreator';

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(() => Promise.resolve({ id: 'challenge-1' })),
}));

vi.mock('./useChallengeDraftCreator', () => ({
  useChallengeDraftCreator: () => ({
    createDraft: mocks.createDraft,
    creating: false,
    error: null,
    created: null,
  }),
}));

const template = {
  id: 'challenge-template:team-squad-program-week',
  archetype: 'team',
  title: 'Squad Program Week',
  description: 'A small squad completes its assigned sessions together and earns progress as a team.',
  challengeType: 'community',
  category: 'community_meetup',
  difficulty: 3,
  xpReward: 140,
  maxProgress: 12,
  progressUnit: 'sessions',
  allowTeams: true,
  maxTeamSize: 4,
  requirements: ['Every squad member contributes completed workout sessions toward the team total.'],
  tags: ['team', 'squad', 'assigned-session'],
  rule: {
    source: 'canonical_workout_event',
    metric: 'team_assigned_sessions_completed',
    assignedSessionOnly: true,
    validation: 'Sum completed assigned sessions.',
  },
  governance: {
    creatorRoles: ['admin', 'trainer'],
    clientCreation: 'disabled_by_default',
    requiresModerationForClientPublish: true,
    publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
  },
};

const clickNext = (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Next: ${label}` }));
};

const advanceToPublish = () => {
  ['Goal', 'Validation', 'Schedule', 'Rewards', 'Preview', 'Publish'].forEach(clickNext);
};

describe('ChallengeDraftCreator', () => {
  beforeEach(() => {
    mocks.createDraft.mockClear();
  });

  it('guides staff through one setup step at a time before showing the create action', () => {
    render(<ChallengeDraftCreator template={template} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next: Goal' })).toBeTruthy();
    expect(screen.queryByLabelText('Draft title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create Draft' })).toBeNull();

    clickNext('Goal');

    expect(screen.getByLabelText('Draft title')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Audience' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next: Validation' })).toBeTruthy();
  });

  it('submits a draft payload for the selected template', async () => {
    render(<ChallengeDraftCreator template={template} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Participant cap'), { target: { value: '16' } });
    clickNext('Goal');
    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'July Squad Spark' } });
    clickNext('Validation');
    clickNext('Schedule');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-07-06' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-07-13' } });
    clickNext('Rewards');
    clickNext('Preview');
    clickNext('Publish');
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }));

    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith({
      templateId: template.id,
      title: 'July Squad Spark',
      description: template.description,
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: 16,
      publishState: 'draft',
      isPublic: false,
    }));
  });
  it('stops forward navigation on invalid audience, goal, and schedule fields', () => {
    render(<ChallengeDraftCreator template={template} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Participant cap'), { target: { value: '1e2' } });
    clickNext('Goal');
    expect(screen.getByRole('alert').textContent).toBe('Participant cap must be a whole number');
    expect(screen.queryByLabelText('Draft title')).toBeNull();

    fireEvent.change(screen.getByLabelText('Participant cap'), { target: { value: '16' } });
    clickNext('Goal');
    expect(screen.getByLabelText('Draft title')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'No' } });
    clickNext('Validation');
    expect(screen.getByRole('alert').textContent).toBe('Draft title is required');
    expect(screen.getByLabelText('Draft title')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'July Squad Spark' } });
    clickNext('Validation');
    clickNext('Schedule');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-07-13' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-07-06' } });
    clickNext('Rewards');
    expect(screen.getByRole('alert').textContent).toBe('End date must be after start date');
    expect(screen.getByLabelText('Start date')).toBeTruthy();
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it('submits a public campaign with an active publish state when publish mode is changed', async () => {
    render(<ChallengeDraftCreator template={template} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Publish mode'), { target: { value: 'public' } });
    clickNext('Goal');
    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'July Squad Spark' } });
    clickNext('Validation');
    clickNext('Schedule');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-07-06' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-07-13' } });
    clickNext('Rewards');
    clickNext('Preview');
    const readiness = within(screen.getByLabelText('Challenge launch readiness'));
    expect(readiness.getByText('Scheduled public campaign')).toBeTruthy();
    expect(readiness.getByText('Creates a public campaign scheduled for the selected start date.')).toBeTruthy();
    expect(readiness.queryByText('Creates an active public campaign immediately.')).toBeNull();
    clickNext('Publish');
    fireEvent.click(screen.getByRole('button', { name: 'Create Campaign' }));

    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      templateId: template.id,
      title: 'July Squad Spark',
      publishState: 'active',
      isPublic: true,
    })));
  });

  it('shows the guided creation sequence and review preview before posting', () => {
    render(<ChallengeDraftCreator template={template} onCancel={vi.fn()} />);

    const steps = within(screen.getByRole('list', { name: 'Challenge setup steps' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(steps).toEqual([
      '1Audience',
      '2Goal',
      '3Validation',
      '4Schedule',
      '5Rewards',
      '6Preview',
      '7Publish',
    ]);
    expect(screen.getByText('Public campaign')).toBeTruthy();
    expect(screen.queryByText('Scheduled public campaign')).toBeNull();

    clickNext('Goal');
    clickNext('Validation');
    clickNext('Schedule');
    clickNext('Rewards');
    clickNext('Preview');

    expect(screen.getByText('Review before publish')).toBeTruthy();
    expect(screen.getByText('Team Assigned Sessions Completed')).toBeTruthy();
    expect(screen.getAllByText('Assigned sessions only').length).toBeGreaterThan(0);
    expect(screen.getByText('Planned completions only')).toBeTruthy();
    expect(screen.getByText('140 XP')).toBeTruthy();

    expect(screen.getByText('Launch readiness')).toBeTruthy();
    const readiness = within(screen.getByLabelText('Challenge launch readiness'));
    expect(readiness.getByText('Private draft')).toBeTruthy();
    expect(readiness.getByText('Creates a private draft for audience setup.')).toBeTruthy();
    expect(readiness.getByText('Schedule ready')).toBeTruthy();
    expect(readiness.getByText('Assigned sessions only')).toBeTruthy();
    expect(readiness.getByText('Only planned or trainer-assigned workout completions can move progress.')).toBeTruthy();

    clickNext('Publish');
    const setup = within(screen.getByLabelText('Challenge operational setup'));
    expect(setup.getByText('Workout completion events')).toBeTruthy();
    expect(setup.getByText('Sum completed assigned sessions.')).toBeTruthy();
    expect(setup.getByText('Planned-session proof required')).toBeTruthy();
    expect(setup.getByText('Ad hoc workout logs stay out of this assigned-session challenge.')).toBeTruthy();
    expect(setup.getByText('Every squad member contributes completed workout sessions toward the team total.')).toBeTruthy();
    expect(setup.getByText('Reward is earned when challenge progress reaches 100%.')).toBeTruthy();
    expect(setup.getByText('Team + Squad + Assigned Session')).toBeTruthy();
  });

  it('keeps operational setup resilient when optional template arrays are absent', () => {
    const sparseTemplate = {
      ...template,
      requirements: undefined,
      tags: undefined,
    } as unknown as typeof template;

    render(<ChallengeDraftCreator template={sparseTemplate} onCancel={vi.fn()} />);

    advanceToPublish();
    const setup = within(screen.getByLabelText('Challenge operational setup'));
    expect(setup.getByText('No additional requirements configured.')).toBeTruthy();
    expect(setup.getByText('No tags configured')).toBeTruthy();
  });

  it('cancels without posting', () => {
    const onCancel = vi.fn();
    render(<ChallengeDraftCreator template={template} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
});