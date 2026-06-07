import { describe, expect, it } from 'vitest';
import {
  PlannedWorkoutAssignmentError,
  assertPlannedAssignmentMatchesOverview,
  buildPlannedAssignmentFormMetadata,
  isNonBillablePlannedWorkoutAssignment,
  normalizePlannedWorkoutAssignmentInput,
} from '../../services/plannedWorkoutAssignmentLogService.mjs';

describe('plannedWorkoutAssignmentLogService', () => {
  it('normalizes non-billable workout-plan homework aliases into a safe assignment payload', () => {
    const result = normalizePlannedWorkoutAssignmentInput({
      assignmentId: 'day-3-homework',
      planId: 'plan-9',
      assignmentType: 'solo',
      weekNumber: '1',
      dayNumber: '3',
    });

    expect(result).toEqual({
      ok: true,
      assignment: {
        assignmentKey: 'day-3-homework',
        assignmentId: 'day-3-homework',
        planId: 'plan-9',
        assignmentType: 'homework',
        source: 'workout_plan',
        weekNumber: 1,
        dayNumber: 3,
        isBillable: false,
        shouldDeductSession: false,
      },
    });
  });

  it('rejects billable or malformed assignment metadata before session billing can be bypassed', () => {
    expect(normalizePlannedWorkoutAssignmentInput({
      assignmentKey: 'session-1',
      planId: 'plan-9',
      assignmentType: 'strength_session',
      weekNumber: 1,
      dayNumber: 1,
    })).toMatchObject({
      ok: false,
      message: 'Only homework or active recovery assignments can use planned assignment logging',
    });

    expect(normalizePlannedWorkoutAssignmentInput({
      assignmentKey: 'homework-1',
      planId: 'plan-9',
      assignmentType: 'homework',
      weekNumber: 1,
      dayNumber: 1,
      shouldDeductSession: true,
    })).toMatchObject({
      ok: false,
      message: 'Billable assignments must be logged through scheduled session flows',
    });
  });

  it('normalizes scheduled trainer-session plan metadata without changing billing ownership', () => {
    expect(normalizePlannedWorkoutAssignmentInput({
      assignmentKey: 'plan-9:w1:d1:trainer_session',
      planId: 'plan-9',
      assignmentType: 'trainer_session',
      weekNumber: 1,
      dayNumber: 1,
      shouldDeductSession: true,
      isBillable: true,
    }, { hasScheduledSession: true })).toMatchObject({
      ok: true,
      assignment: {
        assignmentKey: 'plan-9:w1:d1:trainer_session',
        planId: 'plan-9',
        assignmentType: 'trainer_session',
        source: 'workout_plan',
        isBillable: true,
        shouldDeductSession: true,
      },
    });

    expect(normalizePlannedWorkoutAssignmentInput({
      assignmentKey: 'homework-1',
      planId: 'plan-9',
      assignmentType: 'homework',
      weekNumber: 1,
      dayNumber: 1,
    }, { hasScheduledSession: true })).toMatchObject({
      ok: false,
      message: 'Scheduled session plan metadata must be a trainer session assignment',
    });
  });

  it('requires the client-sent assignment to match the active server-side plan overview', () => {
    expect(() => assertPlannedAssignmentMatchesOverview(
      {
        assignmentKey: 'homework-1',
        assignmentType: 'homework',
        weekNumber: 1,
        dayNumber: 2,
      },
      {
        assignmentKey: 'homework-1',
        assignmentType: 'homework',
        weekNumber: 1,
        dayNumber: 2,
        isBillable: false,
        shouldDeductSession: false,
      }
    )).not.toThrow();

    expect(() => assertPlannedAssignmentMatchesOverview(
      {
        assignmentKey: 'homework-1',
        assignmentType: 'homework',
        weekNumber: 1,
        dayNumber: 2,
      },
      {
        assignmentKey: 'homework-2',
        assignmentType: 'homework',
        weekNumber: 1,
        dayNumber: 2,
      }
    )).toThrow(PlannedWorkoutAssignmentError);
  });

  it('requires scheduled trainer-session metadata to match a trainer-session overview', () => {
    expect(() => assertPlannedAssignmentMatchesOverview(
      {
        assignmentKey: 'trainer-1',
        assignmentType: 'trainer_session',
        weekNumber: 1,
        dayNumber: 2,
      },
      {
        assignmentKey: 'trainer-1',
        assignmentType: 'trainer_session',
        weekNumber: 1,
        dayNumber: 2,
        isBillable: true,
        shouldDeductSession: true,
      },
      { hasScheduledSession: true }
    )).not.toThrow();

    expect(() => assertPlannedAssignmentMatchesOverview(
      {
        assignmentKey: 'trainer-1',
        assignmentType: 'trainer_session',
        weekNumber: 1,
        dayNumber: 2,
      },
      {
        assignmentKey: 'trainer-1',
        assignmentType: 'homework',
        weekNumber: 1,
        dayNumber: 2,
      },
      { hasScheduledSession: true }
    )).toThrow(PlannedWorkoutAssignmentError);
  });

  it('builds stored metadata that the billing policy can identify as non-billable plan work', () => {
    const metadata = buildPlannedAssignmentFormMetadata(
      {
        assignmentKey: 'recovery-2',
        assignmentId: 'recovery-2',
        planId: 'plan-9',
        assignmentType: 'active_recovery',
        weekNumber: 2,
        dayNumber: 4,
      },
      {
        assignmentKey: 'recovery-2',
        assignmentId: 'recovery-2',
        assignmentType: 'active_recovery',
        title: 'Mobility reset',
        sessionType: 'solo',
        weekNumber: 2,
        dayNumber: 4,
        exerciseCount: 3,
        shouldDeductSession: false,
        isBillable: false,
      }
    );

    expect(metadata).toMatchObject({
      assignmentKey: 'recovery-2',
      source: 'workout_plan',
      planId: 'plan-9',
      assignmentType: 'active_recovery',
      isBillable: false,
      shouldDeductSession: false,
      title: 'Mobility reset',
      weekNumber: 2,
      dayNumber: 4,
      exerciseCount: 3,
    });
    expect(isNonBillablePlannedWorkoutAssignment(metadata)).toBe(true);
    expect(isNonBillablePlannedWorkoutAssignment({ ...metadata, shouldDeductSession: true })).toBe(false);
  });
});
