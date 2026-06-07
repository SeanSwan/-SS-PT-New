import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useWorkoutMcp } from './useWorkoutMcp';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' } }),
}));

vi.mock('../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

describe('useWorkoutMcp.generateWorkoutPlan', () => {
  beforeEach(() => {
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.put).mockReset();
  });

  it('routes Program Architect generation through Swan Coach planning', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        plan: {
          planningSystem: 'swan_coach_planning',
          planSummary: {
            durationWeeks: 26,
            sessionsPerWeek: 3,
            primaryGoal: 'strength',
            startingPhase: 2,
          },
          weeks: [{
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              name: 'Day 1: Push',
              focus: 'push',
              dayType: 'training',
              optPhase: 'strength_endurance',
              exercises: [{
                exerciseId: 'cable-row',
                exerciseName: 'Cable Row',
                orderInWorkout: 1,
                setScheme: '3x10',
                repGoal: '10',
                restPeriod: 60,
                tempo: '2-0-2',
                intensityGuideline: '70-80%',
              }],
            }],
          }],
          recommendations: ['Plan aligned with trainer-selected goal: Strength'],
        },
      },
    });

    const { result } = renderHook(() => useWorkoutMcp());
    let response: Awaited<ReturnType<typeof result.current.generateWorkoutPlan>> | null = null;

    await act(async () => {
      response = await result.current.generateWorkoutPlan({
        trainerId: 'current-trainer',
        clientId: '42',
        name: 'Primary Six Month Arc',
        description: 'Strength block',
        goal: 'strength',
        startDate: '2026-06-07',
        endDate: '2026-12-06',
        daysPerWeek: 3,
        focusAreas: ['Push'],
        difficulty: 'intermediate',
        optPhase: '2',
        equipment: ['Cable Machine'],
      });
    });

    expect(apiService.post).toHaveBeenCalledWith('/api/workout-builder/plan', {
      clientId: 42,
      durationWeeks: 26,
      sessionsPerWeek: 3,
      primaryGoal: 'strength',
      startingPhaseOverride: 2,
    });
    expect(response?.plan.description).toContain('Swan Coach planning');
    expect(response?.plan.days).toEqual([{
      dayNumber: 1,
      name: 'Week 1 - Day 1: Push',
      focus: 'push',
      dayType: 'training',
      optPhase: 'strength_endurance',
      sortOrder: 1,
      exercises: [{
        exerciseId: 'cable-row',
        exerciseName: 'Cable Row',
        orderInWorkout: 1,
        setScheme: '3x10',
        repGoal: '10',
        restPeriod: 60,
        tempo: '2-0-2',
        intensityGuideline: '70-80%',
      }],
    }]);
  });

  it('maps legacy builder goal names to Swan Coach planning goals', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        plan: {
          planningSystem: 'swan_coach_planning',
          planSummary: { durationWeeks: 8, sessionsPerWeek: 2, primaryGoal: 'fat_loss' },
          weeks: [],
          recommendations: [],
        },
      },
    });

    const { result } = renderHook(() => useWorkoutMcp());

    await act(async () => {
      await result.current.generateWorkoutPlan({
        trainerId: 'current-trainer',
        clientId: '42',
        name: 'Fat Loss Arc',
        goal: 'weight_loss',
        daysPerWeek: 2,
      });
    });

    expect(apiService.post).toHaveBeenCalledWith('/api/workout-builder/plan', expect.objectContaining({
      primaryGoal: 'fat_loss',
    }));
  });

  it('persists generated Swan Coach plans into the Plan Vault save route', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: { success: true, plan: { id: 99, title: 'Primary Six Month Arc' } },
    });
    vi.mocked(apiService.put).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useWorkoutMcp());

    await act(async () => {
      await (result.current as any).saveWorkoutPlan({
        name: 'Primary Six Month Arc',
        description: 'Strength block',
        trainerId: '7',
        clientId: '42',
        goal: 'strength',
        startDate: '2026-06-07',
        endDate: '2026-12-06',
        status: 'active',
        planningSystem: 'swan_coach_planning',
        planData: {
          planSummary: {
            durationWeeks: 26,
            sessionsPerWeek: 3,
            primaryGoal: 'strength',
            startingPhase: 2,
          },
          weeks: [],
        },
        days: [],
      }, { activate: true });
    });

    expect(apiService.post).toHaveBeenCalledWith('/api/workout-plans', expect.objectContaining({
      userId: 42,
      title: 'Primary Six Month Arc',
      description: 'Strength block',
      nasmPhase: 2,
      durationWeeks: 26,
      status: 'draft',
      createdBy: 'ai',
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        horizonKey: 'six_month',
        planSource: 'swan_coach_ai',
        createdByRole: 'admin',
      }),
    }));
    expect(apiService.put).toHaveBeenCalledWith('/api/workout-plans/99/activate');
  });
});
