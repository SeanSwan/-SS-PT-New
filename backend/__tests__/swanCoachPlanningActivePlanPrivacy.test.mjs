/**
 * Swan Coach active-plan privacy tests.
 *
 * Locks active workout-plan prompt context so plan text with obvious PII
 * patterns is filtered before it can reach any AI provider.
 */
import { describe, expect, it } from 'vitest';

import { formatActiveWorkoutPlanContext } from '../services/swanCoachPlanningContextService.mjs';

describe('swanCoachPlanning active-plan privacy', () => {
  it('filters email and phone patterns from active-plan day and exercise text', () => {
    const context = formatActiveWorkoutPlanContext([{
      id: '44444444-4444-4444-8444-444444444444',
      status: 'active',
      currentWeek: 1,
      currentDay: 1,
      planData: {
        weeks: [{
          weekNumber: 1,
          days: [{
            dayNumber: 1,
            name: 'Lower for client@example.test',
            focus: 'Call 555-123-4567 before progressing',
            exercises: [{
              name: 'Cable Row client@example.test',
              sets: 3,
              reps: 10,
            }],
          }],
        }],
      },
    }]);

    expect(context).toContain('[redacted]');
    expect(context).not.toMatch(/client@example\.test|555-123-4567/i);
  });

  it('redacts contact details in legacy persisted plan JSON while preserving training labels', () => {
    const context = formatActiveWorkoutPlanContext([{
      id: '55555555-5555-4555-8555-555555555555',
      status: 'active',
      currentWeek: 1,
      currentDay: 1,
      plan_data: JSON.stringify({
        weeks: [{
          weekNumber: 1,
          days: [{
            dayNumber: 1,
            name: 'Lower for client@example.test',
            focus: 'Call 555-123-4567 before progressing',
            exercises: [{
              name: 'Cable Row client@example.test',
              sets: 3,
              reps: 10,
            }],
          }],
        }],
      }),
      created_by: 'coach@example.test',
      progress_notes: JSON.stringify([{
        type: 'session_complete',
        note: 'Call 555-123-4567',
        coachEmail: 'coach@example.test',
      }]),
    }]);

    expect(context).toContain('Lower for [redacted]');
    expect(context).toContain('Call [redacted] before progressing');
    expect(context).toContain('Cable Row [redacted]: 3x10');
    expect(context).toContain('Sessions Completed: 1/1');
    expect(context).toContain('Created: ? by unknown');
    expect(context).not.toContain('[filtered plan text]');
    expect(context).not.toMatch(/client@example\.test|coach@example\.test|555-123-4567/i);
  });
});
