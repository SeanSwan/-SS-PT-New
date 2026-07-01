/**
 * planDataBuilder privacy regressions.
 *
 * Locks the mounted Workout Planner save payload so generated long-horizon
 * plans persist workout structure without carrying contact details into JSONB.
 */
import { describe, expect, it } from 'vitest';
import { buildPlanData } from './planDataBuilder';
import { buildGeneratedPlan, buildManualExercise } from './planDataBuilder.testFixtures';
import type { GeneratedPlan } from './WorkoutPlannerTypes';

describe('buildPlanData - privacy', () => {
  it('redacts contact details from generated planData before persistence', () => {
    const basePlan = buildGeneratedPlan();
    const generatedPlan = buildGeneratedPlan({
      planSummary: {
        ...basePlan.planSummary,
        email: 'private@example.com',
        phoneNumber: '(555) 555-0199',
      } as GeneratedPlan['planSummary'] & Record<string, unknown>,
      recommendations: [
        'Use the client portal; do not text (555) 555-0199 or email private@example.com.',
        'Hydrate 3L/day',
      ],
      rationale: [
        'Contact fallback private@example.com should not persist in planData.',
      ],
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          name: 'Day 1: Pull',
          exercises: [{
            exerciseId: 'cable-row',
            exerciseName: 'Cable Row',
            notes: 'Trainer-only contact number: 555-555-0199',
          }],
        }],
      }],
    });

    const result = buildPlanData({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('(555) 555-0199');
    expect(serialized).not.toContain('555-555-0199');
    expect(serialized).toContain('[redacted]');
    expect(serialized).toContain('Day 1: Pull');
    expect(serialized).toContain('Cable Row');
  });
  it('redacts contact details from manual exercise notes before persistence', () => {
    const result = buildPlanData({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: [buildManualExercise('squat', 'Squat', {
        notes: 'Do not store private@example.com or 555-555-0199 in planData.',
      })],
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('555-555-0199');
    expect(serialized).toContain('[redacted]');
    expect(serialized).toContain('Squat');
    expect(serialized).toContain('3');
    expect(serialized).toContain('10');
  });
});
