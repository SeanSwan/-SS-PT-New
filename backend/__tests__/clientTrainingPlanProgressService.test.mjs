/**
 * Client Training Plan Progress Service Tests
 * ===========================================
 *
 * Protects off-day homework logging semantics: only verified non-billable
 * plan assignments may advance an active plan cursor.
 */

import { describe, expect, it, vi } from 'vitest';
import { advancePlanAfterPlannedAssignmentLog } from '../services/clientTrainingPlanProgressService.mjs';

const buildPlan = (overrides = {}) => ({
  id: 'plan-6m',
  userId: 42,
  currentWeek: 1,
  currentDay: 1,
  status: 'active',
  planData: {
    weeks: [
      {
        days: [
          { dayLabel: 'Homework Day', exercises: [{ exerciseName: 'Goblet Squat' }] },
          { dayLabel: 'Second Day', exercises: [] },
        ],
      },
    ],
  },
  update: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const nonBillableAssignment = {
  source: 'workout_plan',
  assignmentType: 'homework',
  isBillable: false,
  shouldDeductSession: false,
  planId: 'plan-6m',
  weekNumber: 1,
  dayNumber: 1,
};

describe('advancePlanAfterPlannedAssignmentLog', () => {
  it('advances the active plan cursor after a verified non-billable homework log', async () => {
    const plan = buildPlan();
    const WorkoutPlan = { findOne: vi.fn().mockResolvedValue(plan) };

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      assignment: nonBillableAssignment,
      clientId: 42,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
      completedAt: '2026-06-07T12:00:00.000Z',
    });

    expect(result).toMatchObject({
      advanced: true,
      planCompleted: false,
      previous: { week: 1, day: 1 },
      next: { week: 1, day: 2 },
    });
    expect(plan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 1,
      currentDay: 2,
      status: 'active',
    }), { transaction: undefined });
    const updatePayload = plan.update.mock.calls[0][0];
    expect(updatePayload.planData.weeks[0].days[0]).toMatchObject({
      completed: true,
      dailyWorkoutFormId: 'daily-form-1',
      workoutSessionId: 'workout-session-1',
      completionSource: 'daily_workout_form',
    });
  });

  it('does not advance billable trainer-session assignments', async () => {
    const WorkoutPlan = { findOne: vi.fn() };

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      assignment: {
        ...nonBillableAssignment,
        assignmentType: 'trainer_session',
        isBillable: true,
        shouldDeductSession: true,
      },
      clientId: 42,
    });

    expect(result).toEqual({ advanced: false, reason: 'not_applicable' });
    expect(WorkoutPlan.findOne).not.toHaveBeenCalled();
  });

  it('advances trainer-session assignments only when scheduled-session context opts in', async () => {
    const plan = buildPlan({
      planData: {
        weeks: [
          {
            days: [
              { dayLabel: 'Trainer Floor Session', assignmentType: 'trainer_session', exercises: [] },
              { dayLabel: 'Next Day', exercises: [] },
            ],
          },
        ],
      },
    });
    const WorkoutPlan = { findOne: vi.fn().mockResolvedValue(plan) };

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      assignment: {
        ...nonBillableAssignment,
        assignmentType: 'trainer_session',
        isBillable: true,
        shouldDeductSession: true,
      },
      clientId: 42,
      dailyWorkoutFormId: 'daily-form-2',
      workoutSessionId: 'workout-session-2',
      allowScheduledTrainerSession: true,
    });

    expect(result).toMatchObject({
      advanced: true,
      previous: { week: 1, day: 1 },
      next: { week: 1, day: 2 },
    });
    expect(plan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 1,
      currentDay: 2,
      status: 'active',
    }), { transaction: undefined });
  });

  it('marks the plan completed when the logged assignment is the final planned day', async () => {
    const plan = buildPlan({
      planData: { weeks: [{ days: [{ dayLabel: 'Final Homework', exercises: [] }] }] },
    });
    const WorkoutPlan = { findOne: vi.fn().mockResolvedValue(plan) };

    const result = await advancePlanAfterPlannedAssignmentLog({
      WorkoutPlan,
      assignment: nonBillableAssignment,
      clientId: 42,
      dailyWorkoutFormId: 'daily-form-final',
      workoutSessionId: 'workout-session-final',
    });

    expect(result).toMatchObject({
      advanced: true,
      planCompleted: true,
      next: null,
    });
    expect(plan.update).toHaveBeenCalledWith(expect.objectContaining({
      currentWeek: 1,
      currentDay: 1,
      status: 'completed',
    }), { transaction: undefined });
  });
});
