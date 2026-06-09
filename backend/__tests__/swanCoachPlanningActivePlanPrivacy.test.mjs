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

    expect(context).toContain('[filtered plan text]');
    expect(context).not.toMatch(/client@example\.test|555-123-4567/i);
  });
});
