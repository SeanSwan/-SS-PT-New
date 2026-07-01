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

  it('adds read-only homework summary context without PII or paid-session drift', () => {
    const context = formatActiveWorkoutPlanContext([{
      id: 'plan-6m',
      title: 'Six Month Homework Arc',
      status: 'active',
      current_week: 4,
      current_day: 2,
      durationWeeks: 26,
      assignmentCompletions: [
        {
          assignmentKey: 'plan-6m:w4:d2:homework',
          formId: 4242,
          completedAt: '2026-06-07T15:00:00.000Z',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Lower Homework',
          weekNumber: 4,
          dayNumber: 2,
          exerciseCount: 1,
          firstExerciseName: 'Goblet Squat',
        },
        {
          assignmentKey: 'plan-6m:w4:d1:homework',
          formId: 4241,
          completedAt: '2026-06-05T15:00:00.000Z',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Prior Homework',
          weekNumber: 4,
          dayNumber: 1,
          exerciseCount: 2,
          firstExerciseName: 'Split Squat',
        },
      ],
      plan_data: {
        weeks: [
          { weekNumber: 4, days: [
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

    expect(context).toContain('--- HOMEWORK SUMMARY ---');
    expect(context).toContain('Today Homework: completed (Week 4, Day 2)');
    expect(context).toContain('Today Homework Exercises: 1');
    expect(context).toContain('Recent Homework Logs: 2');
    expect(context).toContain('Last Homework Log: 2026-06-07T15:00:00.000Z');
    expect(context).toContain('Deduct Paid Session: no');
    expect(context).not.toContain('ClientNameMustNotLeak');
  });
  it('keeps the completed assignment review-only after the active plan cursor advances', () => {
    const context = formatActiveWorkoutPlanContext([{
      id: 'plan-6m',
      title: 'Six Month Homework Arc',
      status: 'active',
      current_week: 4,
      current_day: 1,
      durationWeeks: 26,
      assignmentCompletions: [{
        assignmentKey: 'plan-6m:w3:d2:homework',
        formId: 4242,
        completedAt: '2026-06-07T15:00:00.000Z',
        assignmentType: 'homework',
        title: 'Logged Lower Homework',
        weekNumber: 3,
        dayNumber: 2,
        exerciseCount: 1,
        firstExerciseName: 'Goblet Squat',
      }],
      plan_data: {
        weeks: [
          { weekNumber: 3, days: [
            { dayNumber: 2, name: 'Logged Lower Homework', assignmentType: 'homework', exercises: [] },
          ]},
          { weekNumber: 4, days: [
            {
              dayNumber: 1,
              name: 'Next Week Start',
              assignmentType: 'homework',
              exercises: [{ exerciseName: 'Split Squat', sets: 3, reps: '8', restPeriod: 75 }],
            },
          ]},
        ],
      },
    }]);

    expect(context).toContain('Assignment Status: completed');
    expect(context).toContain('Loggable: no');
    expect(context).toContain('CTA: Review Workout');
    expect(context).toContain('Assignment Key: plan-6m:w3:d2:homework');
    expect(context).toContain('--- CURRENT SESSION (Week 4, Day 1) ---');
    expect(context).toContain('Next Week Start');
    expect(context).toContain('Split Squat');
    expect(context).not.toContain('Assignment Key: plan-6m:w4:d1:homework');
  });
});
