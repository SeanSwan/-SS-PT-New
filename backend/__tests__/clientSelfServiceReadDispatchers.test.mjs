/**
 * Client self-service read dispatchers
 * ====================================
 *
 * Locks the Swan Coach client read tools to the same safe training read model
 * used by dashboards and trainer/admin routes. These tests intentionally pass
 * PII-like user fields in ctx and assert the dispatcher returns IDs plus safe
 * workout-plan summaries only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkoutPlanFindOne = vi.fn();
const mockWorkoutPlanFindAll = vi.fn();
const mockWorkoutSessionFindAll = vi.fn();
const mockBodyMeasurementFindOne = vi.fn();

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutPlan: {
      findOne: mockWorkoutPlanFindOne,
      findAll: mockWorkoutPlanFindAll,
    },
    WorkoutSession: {
      findAll: mockWorkoutSessionFindAll,
    },
    BodyMeasurement: {
      findOne: mockBodyMeasurementFindOne,
    },
  }),
}));

vi.mock('../services/availabilityService.mjs', () => ({
  default: { getAvailableSlots: vi.fn() },
}));

const {
  dispatchMyWorkoutToday,
  dispatchMyProgress,
} = await import('../services/ai/dispatchers/clientSelfServiceReadDispatchers.mjs');

describe('clientSelfServiceReadDispatchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkoutPlanFindOne.mockResolvedValue(null);
    mockWorkoutPlanFindAll.mockResolvedValue([]);
    mockWorkoutSessionFindAll.mockResolvedValue([]);
    mockBodyMeasurementFindOne.mockResolvedValue(null);
  });

  it('returns safe plan-catalog context when Swan Coach finds no active plan', async () => {
    const draftPlan = {
      id: 'plan-8w-draft',
      userId: 42,
      title: 'Eight Week Strength Ramp',
      status: 'draft',
      durationWeeks: 8,
      currentWeek: 1,
      currentDay: 1,
      metadata: {},
      planData: { weeks: [] },
    };
    mockWorkoutPlanFindAll.mockResolvedValue([draftPlan]);

    const result = await dispatchMyWorkoutToday({}, {
      user: {
        id: 42,
        firstName: 'ClientNameMustNotLeak',
        email: 'client@example.test',
        role: 'client',
      },
    });

    expect(mockWorkoutPlanFindOne).toHaveBeenCalledWith({
      where: { userId: 42, status: 'active' },
      order: [['createdAt', 'DESC']],
    });
    expect(mockWorkoutPlanFindAll).toHaveBeenCalledWith({
      where: { userId: 42, status: ['active', 'paused', 'draft'] },
      order: [['updatedAt', 'DESC']],
      limit: 20,
    });
    expect(result).toMatchObject({
      userId: 42,
      hasActivePlan: false,
      planId: null,
      currentWeek: null,
      currentDay: null,
      exerciseCount: 0,
      todayAssignment: {
        assignmentType: 'none',
        isLoggable: false,
        shouldDeductSession: false,
      },
      trainingPlanCatalog: {
        defaultHorizonKey: 'six_month',
        primaryPlanId: 'plan-8w-draft',
        primaryHorizonKey: 'three_month',
        filledHorizonKeys: ['three_month'],
        slotCount: 7,
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('ClientNameMustNotLeak');
    expect(serialized).not.toContain('client@example.test');
  });

  it('returns safe exercise-preview context for today homework without PII/freeform notes', async () => {
    const activePlan = {
      id: 'plan-6m',
      userId: 42,
      title: 'Six Month Homework Arc',
      status: 'active',
      durationWeeks: 26,
      currentWeek: 4,
      currentDay: 2,
      metadata: { planHorizon: 'six_month' },
      planData: {
        weeks: [
          { weekNumber: 1, days: [] },
          { weekNumber: 2, days: [] },
          { weekNumber: 3, days: [] },
          { weekNumber: 4, days: [
            { dayNumber: 1, name: 'Trainer Session', assignmentType: 'trainer_session', exercises: [] },
            {
              dayNumber: 2,
              name: 'Off-Day Lower Homework',
              assignmentType: 'homework',
              exercises: [{
                exerciseName: 'Goblet Squat',
                sets: 3,
                targetReps: '10',
                tempo: '3-1-1',
                restTime: 60,
                notes: 'ClientNameMustNotLeak should not be sent to Swan Coach',
              }],
            },
          ]},
        ],
      },
    };
    mockWorkoutPlanFindOne.mockResolvedValue(activePlan);
    mockWorkoutPlanFindAll.mockResolvedValue([activePlan]);

    const result = await dispatchMyWorkoutToday({}, {
      user: {
        id: 42,
        firstName: 'ClientNameMustNotLeak',
        email: 'client@example.test',
        role: 'client',
      },
    });

    expect(result.todayAssignment).toMatchObject({
      assignmentType: 'homework',
      isLoggable: true,
      isBillable: false,
      shouldDeductSession: false,
      exercisePreview: [{
        exerciseName: 'Goblet Squat',
        sets: 3,
        reps: '10',
        tempo: '3-1-1',
        rest: 60,
      }],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('ClientNameMustNotLeak');
    expect(serialized).not.toContain('client@example.test');
    expect(serialized).not.toContain('should not be sent');
  });

  it('returns safe workout volume aggregates from completed sessions for Swan Coach progress context', async () => {
    mockWorkoutSessionFindAll.mockResolvedValue([
      { id: 'session-1', duration: 45, totalSets: 5, totalReps: 32, totalWeight: 2760, completedAt: new Date('2026-06-01T12:00:00Z') },
      { id: 'session-2', duration: 30, totalSets: 4, totalReps: 20, totalWeight: 1400, completedAt: new Date('2026-06-02T12:00:00Z') },
    ]);

    const result = await dispatchMyProgress({ days: 14 }, {
      user: {
        id: 42,
        firstName: 'ClientNameMustNotLeak',
        email: 'client@example.test',
        role: 'client',
      },
    });

    expect(mockWorkoutSessionFindAll.mock.calls[0][0].attributes).toContain('totalWeight');
    expect(result).toMatchObject({
      userId: 42,
      days: 14,
      workoutCount: 2,
      totalSets: 9,
      totalReps: 52,
      totalVolume: 4160,
      totalMinutes: 75,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('ClientNameMustNotLeak');
    expect(serialized).not.toContain('client@example.test');
  });
});
