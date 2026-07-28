import { describe, expect, it } from 'vitest';
import { isAssignedSessionChallengeTemplate } from './challengeTemplateRules';

describe('challenge template rule classifiers', () => {
  it('accepts explicit assigned-session rule flags', () => {
    expect(isAssignedSessionChallengeTemplate({
      rule: { source: 'canonical_workout_event', metric: 'workouts_completed', assignedSessionOnly: true, validation: 'Complete assigned sessions.' },
      tags: [],
    })).toBe(true);
    expect(isAssignedSessionChallengeTemplate({
      rule: { source: 'canonical_workout_event', metric: 'workouts_completed', requiresAssignedSession: true, validation: 'Complete assigned sessions.' },
      tags: [],
    })).toBe(true);
  });

  it('normalizes assigned-session metrics and tags', () => {
    expect(isAssignedSessionChallengeTemplate({
      rule: { source: 'canonical_workout_event', metric: 'Team Assigned Sessions Completed', validation: 'Sum sessions.' },
      tags: [],
    })).toBe(true);
    expect(isAssignedSessionChallengeTemplate({
      rule: { source: 'canonical_workout_event', metric: 'workouts_completed', validation: 'Complete workouts.' },
      tags: ['planned-session'],
    })).toBe(true);
  });

  it('rejects generic workout-event templates', () => {
    expect(isAssignedSessionChallengeTemplate({
      rule: { source: 'canonical_workout_event', metric: 'flexibility_sessions_completed', validation: 'Count events.' },
      tags: ['consistency'],
    })).toBe(false);
  });
});