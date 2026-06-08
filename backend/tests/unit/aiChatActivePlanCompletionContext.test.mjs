/**
 * aiChatService active-plan completion context tests.
 *
 * Locks Swan Coach prompt enrichment so completed planned assignments are
 * surfaced as review-only instead of remaining available for duplicate logs.
 */

import { describe, expect, it } from 'vitest';

import { enrichWithUserData } from '../../services/aiChatService.mjs';

function createCompletionAwareSequelize(workoutPlans = []) {
  const sqls = [];
  return {
    QueryTypes: { SELECT: 'SELECT' },
    sqls,
    async query(sql) {
      sqls.push(sql);
      if (sql.includes('FROM workout_plans')) return workoutPlans;
      if (sql.includes('FROM "Users" WHERE id = :userId LIMIT 1')) {
        return [{
          role: 'client',
          createdAt: '2026-01-01T00:00:00.000Z',
          fitnessGoal: 'Build strength',
          availableSessions: 3,
          clientSource: 'swanstudios',
          accountStatus: 'active',
        }];
      }
      return [];
    },
  };
}

describe('aiChatService active plan completion context', () => {
  it('includes completed planned-assignment state in Swan Coach enrichment', async () => {
    const context = await enrichWithUserData(
      42,
      'client',
      'general',
      createCompletionAwareSequelize([{
        id: 'plan-6m',
        status: 'active',
        current_week: 4,
        current_day: 2,
        durationWeeks: 26,
        assignment_completions: [{
          assignmentKey: 'plan-6m:w4:d2:homework',
          formId: 4242,
          completedAt: '2026-06-07T15:00:00.000Z',
        }],
        plan_data: {
          weeks: [
            { weekNumber: 4, days: [
              {
                dayNumber: 2,
                name: 'Off-Day Lower Homework',
                assignmentType: 'homework',
                exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10' }],
              },
            ]},
          ],
        },
      }]),
    );

    expect(context).toContain('--- ACTIVE WORKOUT PLANS ---');
    expect(context).toContain('Assignment Status: completed');
    expect(context).toContain('Loggable: no');
    expect(context).toContain('CTA: Review Workout');
    expect(context).toContain('Completed Form: 4242');
    expect(context).not.toContain('Loggable: yes');
  });

  it('fetches planned-assignment completions with active workout plans', async () => {
    const sequelize = createCompletionAwareSequelize([]);

    await enrichWithUserData(42, 'client', 'general', sequelize);

    const activePlanSql = sequelize.sqls.find(sql => sql.includes('FROM workout_plans'));
    expect(activePlanSql).toContain('daily_workout_forms');
    expect(activePlanSql).toContain('assignment_completions');
    expect(activePlanSql).toContain('plannedAssignment');
  });
});
