import { describe, expect, it } from 'vitest';
import { buildWorkoutPlanSavePayload } from './useWorkoutMcp.planGeneration';

describe('buildWorkoutPlanSavePayload reviewed generated days', () => {
  it('persists trainer-reviewed generated day edits instead of stale generated weeks', () => {
    const reviewedDay = {
      dayNumber: 1,
      name: 'Reviewed Pull Day',
      focus: 'pull',
      dayType: 'training',
      sortOrder: 1,
      exercises: [{
        exerciseId: 'reviewed-cable-row',
        exerciseName: 'Reviewed Cable Row',
        orderInWorkout: 1,
        setScheme: '4x8',
        repGoal: '8',
        restPeriod: 75,
        notes: 'Email reviewed@example.com or call 555-234-6789 after the session.',
      }],
    };
    const trainingStyle = {
      mode: 'hardcore',
      method: 'standard',
      label: 'Hardcore',
      cue: 'Higher intent with safety guardrails.',
    };

    const payload = buildWorkoutPlanSavePayload({
      name: 'Reviewed Generated Arc',
      trainerId: '7',
      clientId: '42',
      goal: 'strength',
      startDate: '2026-06-07',
      endDate: '2026-12-06',
      status: 'active',
      planningSystem: 'swan_coach_planning',
      planData: {
        planningSystem: 'swan_coach_planning',
        trainingStyle,
        planSummary: { durationWeeks: 26, startingPhase: 2, primaryGoal: 'strength' },
        weeks: [{
          weekNumber: 4,
          days: [{
            dayNumber: 1,
            name: 'Original Pull Day',
            focus: 'pull',
            dayType: 'training',
            exercises: [{ exerciseId: 'stale-cable-row', exerciseName: 'Stale Cable Row' }],
          }],
        }],
      },
      days: [reviewedDay],
    });

    expect(payload.planData).toEqual(expect.objectContaining({
      trainingStyle,
      weeks: [expect.objectContaining({
        weekNumber: 4,
        days: [expect.objectContaining({
          dayNumber: 1,
          name: 'Reviewed Pull Day',
          focus: 'pull',
          dayType: 'training',
          sortOrder: 1,
          assignmentType: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          shouldDeductSession: false,
          exercises: [expect.objectContaining({
            exerciseId: 'reviewed-cable-row',
            exerciseName: 'Reviewed Cable Row',
            orderInWorkout: 1,
            setScheme: '4x8',
            repGoal: '8',
            restPeriod: 75,
            notes: expect.stringContaining('[redacted]'),
          })],
        })],
      })],
    }));
    const serialized = JSON.stringify(payload.planData);
    expect(serialized).not.toContain('stale-cable-row');
    expect(serialized).not.toContain('reviewed@example.com');
    expect(serialized).not.toContain('555-234-6789');
    expect(serialized).toContain('[redacted]');
  });
});