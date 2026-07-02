/**
 * clientWorkoutRoutes mapper planned-assignment history contract.
 *
 * A completed workout-plan assignment should stay recognizable when the client
 * opens workout history after logging it from the active planner/logger path.
 */
import { describe, expect, it } from 'vitest';
import { toClientWorkoutHistoryRow } from '../../services/clientWorkoutHistoryRowService.mjs';

describe('toClientWorkoutHistoryRow planned-assignment history continuity', () => {
  it('uses joined planned-assignment metadata for completed homework history rows', () => {
    const row = toClientWorkoutHistoryRow({
      id: 'session-1',
      title: 'Workout',
      completedAt: '2026-06-06T12:30:00.000Z',
      duration: 42,
      totalSets: 6,
      dailyForms: [{
        formData: {
          plannedAssignment: {
            assignmentKey: 'plan-6m:w4:d2:homework',
            assignmentType: 'homework',
            title: 'Coach Homework Lower Body',
            weekNumber: 4,
            dayNumber: 2,
            dayLabel: 'Lower Body',
            firstExerciseName: 'Goblet Squat',
          },
          exercises: [
            { exerciseName: 'Goblet Squat' },
            { exerciseName: 'Split Squat' },
          ],
        },
      }],
    });

    expect(row.name).toBe('Coach Homework Lower Body');
    expect(row.plannedAssignment).toEqual({
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'homework',
      title: 'Coach Homework Lower Body',
      weekNumber: 4,
      dayNumber: 2,
      dayLabel: 'Lower Body',
      firstExerciseName: 'Goblet Squat',
    });
    expect(row.exerciseCount).toBe(2);
    expect(row.exerciseNames).toEqual(['Goblet Squat', 'Split Squat']);
  });

  it('does not let blank planned-assignment titles override a specific session title', () => {
    const row = toClientWorkoutHistoryRow({
      id: 'session-2',
      title: 'Trainer Floor Session',
      completedAt: '2026-06-07T12:30:00.000Z',
      duration: 55,
      totalSets: 8,
      dailyForms: [{
        formData: {
          plannedAssignment: {
            assignmentKey: 'plan-6m:w4:d3:trainer_session',
            assignmentType: 'trainer_session',
            title: '   ',
            weekNumber: 4,
            dayNumber: 3,
          },
          exercises: [{ exerciseName: 'Bench Press' }],
        },
      }],
    });

    expect(row.name).toBe('Trainer Floor Session');
    expect(row.plannedAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d3:trainer_session',
      assignmentType: 'trainer_session',
      weekNumber: 4,
      dayNumber: 3,
    });
  });
});
