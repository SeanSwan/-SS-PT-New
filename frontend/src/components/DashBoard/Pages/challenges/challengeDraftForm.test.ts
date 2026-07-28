import { describe, expect, it } from 'vitest';
import { buildChallengeDraftPayload, getDefaultDraftDates, validateChallengeDraftSection } from './challengeDraftForm';

const template = {
  id: 'challenge-template:session-three-planned-sessions',
  archetype: 'session_completion',
  title: 'Three Planned Sessions',
  description: 'Finish three assigned training sessions in a week and keep the plan moving.',
  challengeType: 'weekly',
  category: 'fitness',
  difficulty: 3,
  xpReward: 120,
  maxProgress: 3,
  progressUnit: 'sessions',
  requirements: ['Complete assigned sessions from the trainer plan or workout logger.'],
  tags: ['sessions', 'program'],
  rule: {
    source: 'canonical_workout_event',
    metric: 'assigned_sessions_completed',
    validation: 'Count completed assigned sessions.',
  },
  governance: {
    creatorRoles: ['admin', 'trainer'],
    clientCreation: 'disabled_by_default',
    requiresModerationForClientPublish: true,
    publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
  },
};

describe('challenge draft form helpers', () => {
  it('builds a template-backed draft payload without overriding rule fields', () => {
    const payload = buildChallengeDraftPayload({
      template,
      title: 'July Session Spark',
      description: 'Coach-guided draft for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '24',
    });

    expect(payload).toEqual({
      templateId: template.id,
      title: 'July Session Spark',
      description: 'Coach-guided draft for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: 24,
      publishState: 'draft',
      isPublic: false,
    });
    expect(payload).not.toHaveProperty('challengeType');
    expect(payload).not.toHaveProperty('progressUnit');
  });

  it('rejects non-decimal participant cap notation before posting', () => {
    const baseInput = {
      template,
      title: 'July Session Spark',
      description: 'Coach-guided draft for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
    };

    expect(() => buildChallengeDraftPayload({ ...baseInput, maxParticipants: '1e2' })).toThrow('Participant cap must be a whole number');
    expect(() => buildChallengeDraftPayload({ ...baseInput, maxParticipants: '0x10' })).toThrow('Participant cap must be a whole number');
    expect(() => buildChallengeDraftPayload({ ...baseInput, maxParticipants: '24' })).not.toThrow();
    expect(buildChallengeDraftPayload({ ...baseInput, maxParticipants: '024' }).maxParticipants).toBe(24);
  });
  it('validates individual creator sections before navigation', () => {
    const baseInput = {
      template,
      title: 'July Session Spark',
      description: 'Coach-guided draft for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '',
    };

    expect(() => validateChallengeDraftSection('audience', { ...baseInput, maxParticipants: '1e2' })).toThrow('Participant cap must be a whole number');
    expect(() => validateChallengeDraftSection('goal', { ...baseInput, title: 'No' })).toThrow('Draft title is required');
    expect(() => validateChallengeDraftSection('schedule', { ...baseInput, startDate: '2026-07-13', endDate: '2026-07-06' })).toThrow('End date must be after start date');
    expect(() => validateChallengeDraftSection('schedule', baseInput)).not.toThrow();
  });

  it('rejects draft copy outside backend model bounds before posting', () => {
    const maxTitle = 'T'.repeat(100);
    const maxDescription = 'D'.repeat(1000);

    expect(buildChallengeDraftPayload({
      template,
      title: maxTitle,
      description: maxDescription,
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '',
    })).toMatchObject({
      title: maxTitle,
      description: maxDescription,
    });

    expect(() => buildChallengeDraftPayload({
      template,
      title: 'T'.repeat(101),
      description: 'Coach-guided draft for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '',
    })).toThrow('Draft title must be 100 characters or less');

    expect(() => buildChallengeDraftPayload({
      template,
      title: 'July Session Spark',
      description: 'D'.repeat(1001),
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '',
    })).toThrow('Draft description must be 1000 characters or less');
  });

  it('builds a public campaign payload with an active model status', () => {
    const payload = buildChallengeDraftPayload({
      template,
      title: 'July Session Spark',
      description: 'Coach-guided campaign for three assigned sessions in July.',
      startDate: '2026-07-06',
      endDate: '2026-07-13',
      maxParticipants: '',
      publishMode: 'public',
    });

    expect(payload).toMatchObject({
      templateId: template.id,
      publishState: 'active',
      isPublic: true,
    });
    expect(payload).not.toHaveProperty('maxParticipants');
  });
  it('rejects incomplete draft windows before posting', () => {
    expect(() => buildChallengeDraftPayload({
      template,
      title: 'Bad Window',
      description: 'This draft has an invalid date order.',
      startDate: '2026-07-13',
      endDate: '2026-07-06',
      maxParticipants: '',
    })).toThrow('End date must be after start date');
  });

  it('rejects impossible calendar dates before posting', () => {
    const baseInput = {
      template,
      title: 'July Session Spark',
      description: 'Coach-guided draft for three assigned sessions in July.',
      maxParticipants: '',
    };

    expect(() => buildChallengeDraftPayload({
      ...baseInput,
      startDate: '2026-02-30',
      endDate: '2026-03-08',
    })).toThrow('Start date must be valid');

    expect(() => buildChallengeDraftPayload({
      ...baseInput,
      startDate: '2026-03-01',
      endDate: '2026-04-31',
    })).toThrow('End date must be valid');

    expect(() => buildChallengeDraftPayload({
      ...baseInput,
      startDate: '2026-02-29',
      endDate: '2026-03-08',
    })).toThrow('Start date must be valid');

    expect(() => buildChallengeDraftPayload({
      ...baseInput,
      startDate: '2028-02-29',
      endDate: '2028-03-07',
    })).not.toThrow();
  });

  it('creates stable default dates from a supplied clock', () => {
    expect(getDefaultDraftDates(new Date('2026-06-28T12:00:00.000Z'))).toEqual({
      startDate: '2026-07-05',
      endDate: '2026-07-12',
    });
  });
});
