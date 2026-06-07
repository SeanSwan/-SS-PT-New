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

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    WorkoutPlan: {
      findOne: mockWorkoutPlanFindOne,
      findAll: mockWorkoutPlanFindAll,
    },
  }),
}));

vi.mock('../services/availabilityService.mjs', () => ({
  default: { getAvailableSlots: vi.fn() },
}));

const {
  dispatchMyWorkoutToday,
} = await import('../services/ai/dispatchers/clientSelfServiceReadDispatchers.mjs');

describe('clientSelfServiceReadDispatchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkoutPlanFindOne.mockResolvedValue(null);
    mockWorkoutPlanFindAll.mockResolvedValue([]);
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
});
