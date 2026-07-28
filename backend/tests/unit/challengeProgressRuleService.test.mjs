import { describe, expect, it } from 'vitest';
import { evaluateWorkoutChallengeProgressRule } from '../../services/gamification/challengeProgressRuleService.mjs';

describe('challenge progress rule service', () => {
  it('keeps generic session challenges eligible for any canonical workout completion', () => {
    const result = evaluateWorkoutChallengeProgressRule({
      challenge: { progressUnit: 'sessions', tags: ['sessions', 'training-plan'] },
      event: { exerciseFamilies: ['pull'], workoutTags: ['strength'] },
    });

    expect(result).toEqual(expect.objectContaining({ eligible: true }));
  });

  it('requires assigned-session challenge metrics to prove a planned assignment', () => {
    const challenge = {
      progressUnit: 'sessions',
      rule: { source: 'canonical_workout_event', metric: 'assigned_sessions_completed' },
    };

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'], isAssignedSession: false },
    })).toEqual(expect.objectContaining({
      eligible: false,
      reason: 'rule_mismatch_assigned_session',
    }));

    expect(evaluateWorkoutChallengeProgressRule({
      challenge: {
        ...challenge,
        rule: { source: 'canonical_workout_event', metric: 'team_assigned_sessions_completed' },
      },
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'], isAssignedSession: true },
    })).toEqual(expect.objectContaining({ eligible: true }));
  });
  it('requires the durable assigned-session tag to prove a planned assignment', () => {
    const challenge = { progressUnit: 'sessions', tags: ['sessions', 'assigned-session'] };

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'], isAssignedSession: false },
    })).toEqual(expect.objectContaining({
      eligible: false,
      reason: 'rule_mismatch_assigned_session',
    }));

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'], isAssignedSession: true },
    })).toEqual(expect.objectContaining({ eligible: true }));
  });

  it('requires exercise-family challenges to match the workout event family', () => {
    const challenge = {
      progressUnit: 'workouts',
      tags: ['exercise-family', 'push', 'template:exercise_family'],
    };

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'] },
    })).toEqual(expect.objectContaining({ eligible: true }));

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['pull'], workoutTags: ['strength'] },
    })).toEqual(expect.objectContaining({
      eligible: false,
      reason: 'rule_mismatch_exercise_family',
    }));
  });

  it('requires flexibility rhythm challenges to match stretching or flexibility workout evidence', () => {
    const challenge = {
      progressUnit: 'days',
      tags: ['consistency', 'flexibility', 'stretching', 'template:consistency'],
    };

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['mobility'], workoutTags: ['static_stretch'] },
    })).toEqual(expect.objectContaining({ eligible: true }));

    expect(evaluateWorkoutChallengeProgressRule({
      challenge,
      event: { exerciseFamilies: ['push'], workoutTags: ['strength'] },
    })).toEqual(expect.objectContaining({
      eligible: false,
      reason: 'rule_mismatch_flexibility',
    }));
  });
});
