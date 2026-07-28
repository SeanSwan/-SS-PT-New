import { describe, expect, it } from 'vitest';
import {
  getChallengeGovernancePolicy,
  getChallengeTemplateCatalog,
  getChallengeTemplateById,
  listChallengeArchetypes,
} from '../../services/gamification/challengeTemplateCatalog.mjs';

const MODEL_ENUMS = {
  challengeType: new Set(['daily', 'weekly', 'monthly', 'community', 'custom']),
  category: new Set(['fitness', 'nutrition', 'social', 'streak', 'dance', 'music', 'art', 'gaming', 'comedy', 'community_meetup']),
  progressUnit: new Set(['completion', 'workouts', 'minutes', 'sessions', 'days', 'points', 'custom']),
};

describe('challenge template catalog', () => {
  it('exposes the six first-class challenge archetypes from the platform plan', () => {
    expect(listChallengeArchetypes()).toEqual([
      'consistency',
      'session_completion',
      'active_minutes',
      'exercise_family',
      'improvement',
      'team',
    ]);

    const catalog = getChallengeTemplateCatalog();
    expect(catalog).toHaveLength(6);
    expect(catalog.map((template) => template.archetype)).toEqual(listChallengeArchetypes());
  });

  it('returns the same governed creation policy exposed by every template', () => {
    const policy = getChallengeGovernancePolicy();

    expect(policy).toMatchObject({
      creatorRoles: ['admin', 'trainer'],
      clientCreation: 'disabled_by_default',
      requiresModerationForClientPublish: true,
      publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
    });
    expect(policy.clientCreationControls).toHaveLength(13);
  });

  it('exposes explicit client-created challenge controls instead of a single client switch', () => {
    const policy = getChallengeGovernancePolicy();

    expect(policy.clientCreationControls.map((control) => control.key)).toEqual([
      'private_self_challenges',
      'trainer_visible_submissions',
      'public_or_team_publish',
      'media_uploads',
      'comments',
      'content_filtering',
      'reporting_flow',
      'blocking_flow',
      'safety_contact',
      'terms_acceptance',
      'auto_publish',
      'moderation_default',
      'creator_roles',
    ]);
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'private_self_challenges',
      enabled: false,
      value: 'Closed until entitlement',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'trainer_visible_submissions',
      enabled: false,
      value: 'Review queue required',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'content_filtering',
      enabled: false,
      value: 'Required before public release',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'reporting_flow',
      enabled: false,
      value: 'Required before public release',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'blocking_flow',
      enabled: false,
      value: 'Required before public release',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'safety_contact',
      enabled: false,
      value: 'Published contact required',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'terms_acceptance',
      enabled: false,
      value: 'Required at rollout',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'auto_publish',
      enabled: false,
      value: 'Disabled',
    }));
    expect(policy.clientCreationControls).toContainEqual(expect.objectContaining({
      key: 'moderation_default',
      enabled: true,
      value: 'Moderation required',
    }));
  });

  it('returns model-compatible presets with workout-first rule metadata', () => {
    const catalog = getChallengeTemplateCatalog();

    for (const template of catalog) {
      expect(template.id).toMatch(/^challenge-template:/);
      expect(template.title.length).toBeGreaterThanOrEqual(3);
      expect(template.description.length).toBeGreaterThanOrEqual(10);
      expect(MODEL_ENUMS.challengeType.has(template.challengeType)).toBe(true);
      expect(MODEL_ENUMS.category.has(template.category)).toBe(true);
      expect(MODEL_ENUMS.progressUnit.has(template.progressUnit)).toBe(true);
      expect(Number.isInteger(template.difficulty)).toBe(true);
      expect(template.difficulty).toBeGreaterThanOrEqual(1);
      expect(template.difficulty).toBeLessThanOrEqual(5);
      expect(Number.isInteger(template.xpReward)).toBe(true);
      expect(template.xpReward).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(template.maxProgress)).toBe(true);
      expect(template.maxProgress).toBeGreaterThan(0);
      expect(template.rule.source).toBe('canonical_workout_event');
      expect(template.rule.validation).toMatch(/workout|session|minutes|exercise|progress|team/i);
      expect(template.governance.creatorRoles).toEqual(['admin', 'trainer']);
      expect(template.governance.clientCreation).toBe('disabled_by_default');
      expect(template.governance.requiresModerationForClientPublish).toBe(true);
    }
  });

  it('marks assigned-program presets as assigned-session-only rules', () => {
    const planned = getChallengeTemplateById('challenge-template:session-three-planned-sessions');
    const team = getChallengeTemplateById('challenge-template:team-squad-program-week');

    expect(planned?.rule).toMatchObject({
      metric: 'assigned_sessions_completed',
      assignedSessionOnly: true,
    });
    expect(team?.rule).toMatchObject({
      metric: 'team_assigned_sessions_completed',
      assignedSessionOnly: true,
    });
    expect(planned?.tags).toContain('assigned-session');
    expect(team?.tags).toContain('assigned-session');
  });
  it('keeps challenge copy within Swan fitness language and away from restricted wording', () => {
    const serialized = JSON.stringify(getChallengeTemplateCatalog());

    expect(serialized).not.toMatch(/\byoga\b|\bmeditation\b/i);
    expect(serialized).not.toMatch(/\bcalorie target\b|\bpunish\b|\bshame\b/i);
    expect(serialized).toMatch(/stretching|flexibility/i);
    expect(serialized).toMatch(/team|squad/i);
  });

  it('returns cloned templates so callers cannot mutate the source catalog', () => {
    const template = getChallengeTemplateById('challenge-template:consistency-7-day-flexibility');
    expect(template?.title).toBe('7-Day Flexibility Rhythm');

    if (!template) throw new Error('missing template fixture');
    template.title = 'mutated';
    template.rule.metric = 'mutated';

    const fresh = getChallengeTemplateById('challenge-template:consistency-7-day-flexibility');
    expect(fresh?.title).toBe('7-Day Flexibility Rhythm');
    expect(fresh?.rule.metric).toBe('flexibility_sessions_completed');
  });
});
