/**
 * clientTrainingAssignmentPickerService tests
 * ==========================================
 * Locks the logger's generated-plan/day picker contract: all generated days can
 * load as drafts, but only the active current assignment can advance on save.
 */
import { describe, expect, it } from 'vitest';
import { buildClientTrainingAssignmentPicker } from '../../services/clientTrainingAssignmentPickerService.mjs';

const activePlan = {
  id: 'plan-6m',
  title: 'Six Month Arc',
  status: 'active',
  currentWeek: 1,
  currentDay: 2,
  updatedAt: '2026-06-20T10:00:00.000Z',
  planData: {
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1,
            dayLabel: 'Lower Foundation',
            exercises: [{ exerciseId: 'squat', exerciseName: 'Squat', sets: 3, targetReps: '10' }],
          },
          {
            dayNumber: 2,
            dayLabel: 'Upper Strength',
            exercises: [{ exerciseId: 'row', exerciseName: 'Row', sets: 4, reps: '8' }],
          },
          {
            dayNumber: 3,
            dayLabel: 'Recovery',
            assignmentType: 'rest',
            exercises: [],
          },
        ],
      },
    ],
  },
};

const pausedPlan = {
  id: 'plan-1w',
  title: 'One Week Reset',
  status: 'paused',
  currentWeek: 1,
  currentDay: 1,
  updatedAt: '2026-06-18T10:00:00.000Z',
  planData: {
    days: [
      {
        dayNumber: 1,
        name: 'Reset Day',
        exercises: [{ exerciseId: 'step-up', exerciseName: 'Step-up', sets: 2, reps: 8 }],
      },
    ],
  },
};

describe('buildClientTrainingAssignmentPicker', () => {
  it('marks only the active current generated day as planned-assignment submit safe', () => {
    const picker = buildClientTrainingAssignmentPicker({
      plans: [pausedPlan, activePlan],
      today: '2026-06-28',
    });

    expect(picker[0]).toMatchObject({
      assignmentKey: 'plan-6m:w1:d2:homework',
      planId: 'plan-6m',
      planTitle: 'Six Month Arc',
      isCurrent: true,
      isLoadable: true,
      canSubmitPlannedAssignment: true,
      submitMode: 'planned_assignment',
      scheduledDate: '2026-06-28',
      exerciseCount: 1,
      firstExerciseName: 'Row',
    });

    const nonCurrent = picker.find((item) => item.assignmentKey === 'plan-6m:w1:d1:homework');
    expect(nonCurrent).toMatchObject({
      isCurrent: false,
      isLoadable: true,
      canSubmitPlannedAssignment: false,
      submitMode: 'draft_only',
      scheduledDate: null,
    });

    const paused = picker.find((item) => item.assignmentKey === 'plan-1w:w1:d1:homework');
    expect(paused).toMatchObject({
      planStatus: 'paused',
      isLoadable: true,
      canSubmitPlannedAssignment: false,
      submitMode: 'draft_only',
    });
  });

  it('keeps completed assignments visible but not loadable', () => {
    const picker = buildClientTrainingAssignmentPicker({
      plans: [activePlan],
      today: '2026-06-28',
      assignmentCompletions: [{ assignmentKey: 'plan-6m:w1:d1:homework', formId: 'form-1' }],
    });

    expect(picker.find((item) => item.assignmentKey === 'plan-6m:w1:d1:homework')).toMatchObject({
      status: 'completed',
      isLoadable: false,
      canSubmitPlannedAssignment: false,
      submitMode: 'draft_only',
      completion: { source: 'daily_workout_form', formId: 'form-1' },
    });
  });
});
