/**
 * Swan Coach planned-assignment completion context tests.
 *
 * These lock the read-only voice/chat context so completed planned homework
 * does not remain available for duplicate logging.
 */

import { describe, expect, it } from 'vitest';

import { formatActiveWorkoutPlanContext } from '../services/swanCoachPlanningContextService.mjs';

describe('swanCoachPlanningContextService completion overlays', () => {
  it('marks completed planned assignments as review-only in Swan Coach context', () => {
    const context = formatActiveWorkoutPlanContext([{
      id: 'plan-6m',
      status: 'active',
      current_week: 4,
      current_day: 2,
      durationWeeks: 26,
      assignmentCompletions: [{
        assignmentKey: 'plan-6m:w4:d2:homework',
        formId: 4242,
        completedAt: '2026-06-07T15:00:00.000Z',
      }],
      plan_data: {
        weeks: [
          { weekNumber: 4, days: [
            { dayNumber: 1, name: 'Trainer Session', assignmentType: 'trainer_session', exercises: [] },
            {
              dayNumber: 2,
              name: 'Off-Day Lower Homework',
              assignmentType: 'homework',
              exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10', restPeriod: 60 }],
            },
          ]},
        ],
      },
    }]);

    expect(context).toContain('Assignment Type: homework');
    expect(context).toContain('Assignment Status: completed');
    expect(context).toContain('Loggable: no');
    expect(context).toContain('CTA: Review Workout');
    expect(context).toContain('Completed Form: 4242');
    expect(context).not.toContain('Loggable: yes');
  });
});
