/**
 * Client Training Vault Homework Summary Context Tests
 * ===================================================
 *
 * Locks Swan Coach vault context to the zero-PII homework accountability
 * summary produced from durable DailyWorkoutForm completion records.
 */
import { describe, expect, it, vi } from 'vitest';

import { buildClientTrainingVaultContext } from '../services/clientTrainingVaultContextService.mjs';

describe('clientTrainingVaultContextService homework summary', () => {
  it('exposes a safe homework accountability summary for Swan Coach vault context', async () => {
    const WorkoutPlan = {
      findAll: vi.fn().mockResolvedValue([{
        id: 'plan-6m',
        title: 'ClientNameMustNotLeak Six Month Plan',
        status: 'active',
        durationWeeks: 26,
        currentWeek: 4,
        currentDay: 2,
        metadata: { planHorizon: 'six_month' },
        planData: {
          weeks: [{
            weekNumber: 4,
            days: [{
              dayNumber: 2,
              assignmentType: 'homework',
              exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10' }],
            }],
          }],
        },
      }]),
    };
    const todayForm = {
      id: 'form-42',
      date: '2026-06-07',
      formData: {
        plannedAssignment: {
          assignmentKey: 'plan-6m:w4:d2:homework',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Lower Homework',
          weekNumber: 4,
          dayNumber: 2,
          exerciseCount: 1,
          firstExerciseName: 'Goblet Squat',
        },
      },
      submittedAt: '2026-06-07T16:00:00.000Z',
    };
    const priorForm = {
      id: 'form-41',
      date: '2026-06-05',
      formData: {
        plannedAssignment: {
          assignmentKey: 'plan-6m:w4:d1:homework',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Prior Homework',
          weekNumber: 4,
          dayNumber: 1,
          exerciseCount: 2,
          firstExerciseName: 'Split Squat',
        },
      },
      submittedAt: '2026-06-05T16:00:00.000Z',
    };
    const DailyWorkoutForm = {
      findAll: vi.fn((query) => (
        query.where?.date
          ? Promise.resolve([todayForm])
          : Promise.resolve([todayForm, priorForm])
      )),
    };

    const result = await buildClientTrainingVaultContext({
      clientId: 42,
      WorkoutPlan,
      DailyWorkoutForm,
      today: '2026-06-07',
    });

    expect(result.homeworkSummary).toMatchObject({
      assignmentType: 'homework',
      todayStatus: 'completed',
      todayIsCompleted: true,
      todayIsLoggable: false,
      todayShouldDeductSession: false,
      todayWeekNumber: 4,
      todayDayNumber: 2,
      todayExerciseCount: 1,
      todayFirstExerciseName: 'Goblet Squat',
      recentCompletedCount: 2,
      lastCompletedAt: '2026-06-07',
      accountabilityStatus: {
        key: 'completed_today',
        priority: 'review',
      },
    });
    expect(result.homeworkSummary.recentCompletions).toEqual([
      expect.objectContaining({ formId: 'form-42', completedAt: '2026-06-07' }),
      expect.objectContaining({ formId: 'form-41', completedAt: '2026-06-05' }),
    ]);
    expect(JSON.stringify(result.homeworkSummary)).not.toMatch(/ClientNameMustNotLeak|title/i);
  });
});
