import { describe, expect, it, vi } from 'vitest';

import { buildClientTrainingVaultContext } from '../services/clientTrainingVaultContextService.mjs';

describe('clientTrainingVaultContextService', () => {
  it('summarizes the seven-slot plan vault without leaking titles, PDF URLs, or storage keys', async () => {
    const WorkoutPlan = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 'plan-6m',
          title: 'Jane Six Month Foundation',
          status: 'active',
          durationWeeks: 26,
          currentWeek: 3,
          currentDay: 2,
          nasmPhase: 2,
          createdBy: 'swan_coach_planning',
          metadata: {
            planHorizon: 'six_month',
            planPdf: {
              url: '/api/workout-plans/plan-6m/pdf/content.pdf',
              fileName: 'Jane Foundation.pdf',
              storage: 'r2',
              storageKey: 'workout-plans/42/plan-6m.pdf',
            },
          },
          planData: {
            weeks: [{
              weekNumber: 3,
              days: [
                { dayNumber: 1, assignmentType: 'trainer_session', exercises: [] },
                {
                  dayNumber: 2,
                  dayLabel: 'Lower Body Homework',
                  assignmentType: 'homework',
                  notes: 'Jane reported private knee notes and jane@example.com should never reach LLM context',
                  exercises: [
                    {
                      exerciseName: 'Goblet Squat',
                      sets: 3,
                      reps: '8-10',
                      tempo: '3/1/1',
                      restSeconds: 90,
                      notes: 'private trainer coaching note',
                    },
                    {
                      name: 'Dead Bug',
                      setScheme: 2,
                      repGoal: '10/side',
                      restTime: 45,
                    },
                  ],
                },
              ],
            }],
          },
        },
      ]),
    };

    const result = await buildClientTrainingVaultContext({ clientId: 42, WorkoutPlan });

    expect(WorkoutPlan.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: ['active', 'paused', 'draft'] },
      limit: 14,
    }));
    expect(result).toMatchObject({
      available: true,
      defaultHorizonKey: 'six_month',
      primaryPlanId: 'plan-6m',
      primaryHorizonKey: 'six_month',
      filledHorizonKeys: ['six_month'],
      todayAssignment: {
        assignmentType: 'homework',
        isLoggable: true,
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 3,
        dayNumber: 2,
        exerciseCount: 2,
        firstExerciseName: 'Goblet Squat',
        exercisePreview: [
          {
            exerciseName: 'Goblet Squat',
            sets: 3,
            reps: '8-10',
            tempo: '3/1/1',
            rest: 90,
          },
          {
            exerciseName: 'Dead Bug',
            sets: 2,
            reps: '10/side',
            rest: 45,
          },
        ],
      },
    });

    const sixMonth = result.slots.find((slot) => slot.horizonKey === 'six_month');
    expect(result.slots).toHaveLength(7);
    expect(sixMonth).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: {
        id: 'plan-6m',
        pdfAttached: true,
        defaultShouldDeductSession: false,
      },
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/Jane|jane@example\.com|private|content\.pdf|storageKey|workout-plans\/42|fileName|title|notes/);
  });

  it('returns a safe unavailable context when the WorkoutPlan model is missing', async () => {
    const result = await buildClientTrainingVaultContext({ clientId: 42, WorkoutPlan: null });

    expect(result).toMatchObject({
      available: false,
      reason: 'workout_plan_model_unavailable',
      defaultHorizonKey: 'six_month',
      primaryPlanId: null,
      filledHorizonKeys: [],
      slots: [],
      todayAssignment: {
        assignmentType: 'none',
        isLoggable: false,
        shouldDeductSession: false,
      },
    });
  });

  it('fills draft/paused vault slots without creating a current assignment', async () => {
    const WorkoutPlan = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 'plan-6m-draft',
          status: 'draft',
          durationWeeks: 26,
          currentWeek: 1,
          currentDay: 1,
          metadata: { planHorizon: 'six_month' },
          planData: {
            weeks: [{
              days: [{
                assignmentType: 'homework',
                exercises: [{ exerciseName: 'Pushup' }],
              }],
            }],
          },
        },
      ]),
    };

    const result = await buildClientTrainingVaultContext({ clientId: 42, WorkoutPlan });

    expect(result.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: true,
      plan: { id: 'plan-6m-draft', status: 'draft' },
    });
    expect(result.todayAssignment).toMatchObject({
      assignmentType: 'none',
      isLoggable: false,
      exerciseCount: 0,
    });
  });

  it('overlays completed DailyWorkoutForm planned assignments onto vault context', async () => {
    const WorkoutPlan = {
      findAll: vi.fn().mockResolvedValue([{
        id: 'plan-6m',
        status: 'active',
        durationWeeks: 26,
        currentWeek: 3,
        currentDay: 2,
        metadata: { planHorizon: 'six_month' },
        planData: {
          weeks: [{
            weekNumber: 3,
            days: [{
              dayNumber: 2,
              assignmentType: 'homework',
              exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10' }],
            }],
          }],
        },
      }]),
    };
    const DailyWorkoutForm = {
      findAll: vi.fn().mockResolvedValue([{
        id: 'form-42',
        formData: {
          plannedAssignment: {
            assignmentKey: 'plan-6m:w3:d2:homework',
            assignmentType: 'homework',
          },
        },
        submittedAt: '2026-06-07T16:00:00.000Z',
      }]),
    };

    const result = await buildClientTrainingVaultContext({
      clientId: 42,
      WorkoutPlan,
      DailyWorkoutForm,
      today: '2026-06-07',
    });

    expect(DailyWorkoutForm.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 42, date: '2026-06-07' },
      limit: 20,
    }));
    expect(result.todayAssignment).toMatchObject({
      assignmentType: 'homework',
      status: 'completed',
      isLoggable: false,
      ctaLabel: 'Review Workout',
      completion: {
        source: 'daily_workout_form',
        formId: 'form-42',
        completedAt: '2026-06-07',
      },
    });
  });
});
