import { describe, expect, it } from 'vitest';
import { buildChallengeDraftCreatorModel, CREATOR_STEPS } from './ChallengeDraftCreator.model';
import type { ChallengeTemplate } from './useChallengeTemplates';

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
} satisfies ChallengeTemplate;

describe('ChallengeDraftCreator model', () => {
  it('builds scheduled public campaign readiness from template and form state', () => {
    const model = buildChallengeDraftCreatorModel({
      template,
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '16',
      publishMode: 'public',
    });

    expect(model.submitLabel).toBe('Create Campaign');
    expect(model.capPreview).toBe('16 participant cap');
    expect(model.audiencePreview).toBe('Team pods up to 4');
    expect(model.goalTarget).toBe('12 Sessions');
    expect(model.readinessItems).toContainEqual(expect.objectContaining({
      label: 'Audience',
      value: 'Scheduled public campaign',
      ready: true,
      detail: 'Creates a public campaign scheduled for the selected start date.',
    }));
    expect(model.previewItems).toContainEqual({ label: 'Counts', value: 'Planned completions only' });
    expect(model.previewItems).toContainEqual({ label: 'Publish state', value: 'Scheduled public campaign' });
  });

  it('keeps sparse template arrays and invalid schedules resilient', () => {
    const sparseTemplate = {
      ...template,
      allowTeams: false,
      requirements: undefined,
      tags: undefined,
      xpReward: 0,
      rule: { ...template.rule, assignedSessionOnly: false, metric: 'workouts_completed' },
    } as unknown as ChallengeTemplate;

    const model = buildChallengeDraftCreatorModel({
      template: sparseTemplate,
      startDate: '2026-07-13',
      endDate: '2026-07-06',
      maxParticipants: '',
      publishMode: 'draft',
    });

    expect(model.audiencePreview).toBe('Individual or cohort roster');
    expect(model.capPreview).toBe('No cap set');
    expect(model.requirementItems).toEqual(['No additional requirements configured.']);
    expect(model.tagSummary).toBe('No tags configured');
    expect(model.rewardCondition).toBe('No XP reward configured.');
    expect(model.scheduleReady).toBe(false);
    expect(model.readinessItems).toContainEqual(expect.objectContaining({ label: 'Schedule', value: 'Fix schedule', ready: false }));
  });

  it('keeps the guided creator workflow order stable', () => {
    expect(CREATOR_STEPS.map((step) => step.label)).toEqual([
      'Audience',
      'Goal',
      'Validation',
      'Schedule',
      'Rewards',
      'Preview',
      'Publish',
    ]);
  });
});