import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { useWorkoutMcp } from './useWorkoutMcp';
import { buildWorkoutPlanSavePayload } from './useWorkoutMcp.planGeneration';
const mocks = vi.hoisted(() => ({
  buildPlanPdfFileFromPlanData: vi.fn(),
}));
vi.mock('../components/DashBoard/Pages/admin-workout-planner/workoutPlannerPlanPdfAdapter', () => ({
  buildPlanPdfFileFromPlanData: mocks.buildPlanPdfFileFromPlanData,
}));
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
    vi.clearAllMocks();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.put).mockReset();
    mocks.buildPlanPdfFileFromPlanData.mockResolvedValue(
      new File(['%PDF-1.4'], 'SwanStudios-Plan.pdf', { type: 'application/pdf' }),
    );
  });
  it('routes Program Architect generation through Swan Coach planning and normalizes session aliases', async () => {
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
            sessions: [{
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
      assignmentType: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      shouldDeductSession: false,
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
  it('maps legacy advanced difficulty to the backend hardcore training style', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        plan: {
          planningSystem: 'swan_coach_planning',
          swanCoachPlanning: { createdBy: 'swan_coach_planning' },
          planSummary: { durationWeeks: 8, sessionsPerWeek: 3, primaryGoal: 'strength' },
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
        name: 'Advanced Strength Arc',
        goal: 'strength',
        difficulty: 'advanced',
        daysPerWeek: 3,
      });
    });
    expect(apiService.post).toHaveBeenCalledWith('/api/workout-builder/plan', expect.objectContaining({
      clientId: 42,
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'standard',
    }));
  });
  it('uses the server derivative for Program Architect saves without a browser upload', async () => {
    vi.mocked(apiService.post).mockImplementation((url: string) => (
      url === '/api/workout-plans'
        ? Promise.resolve({ data: {
          success: true,
          plan: { id: 99, title: 'Primary Six Month Arc' },
          pdfDerivative: { enabled: true, state: 'pending' },
        } })
        : Promise.resolve({ data: { success: true } })
    ) as never);
    vi.mocked(apiService.put).mockResolvedValue({
      data: { success: true, pdfDerivative: { enabled: true, state: 'pending' } },
    });
    const { result } = renderHook(() => useWorkoutMcp());
    let response: unknown;
    await act(async () => {
      response = await (result.current as any).saveWorkoutPlan({
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
      }, { activate: true, attachPdf: true, clientName: 'Fixture Client' });
    });
    expect(apiService.post).toHaveBeenCalledWith('/api/workout-plans', expect.objectContaining({
      userId: 42,
      title: 'Primary Six Month Arc',
      description: 'Strength block',
      nasmPhase: 2,
      durationWeeks: 26,
      status: 'draft',
      createdBy: 'swan_coach_planning',
      metadata: expect.objectContaining({
        planHorizon: 'six_month',
        horizonKey: 'six_month',
        planSource: 'swan_coach_planning',
        createdByRole: 'admin',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      }),
      planData: expect.objectContaining({
        assignmentDefaults: {
          defaultAssignmentType: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          shouldDeductSession: false,
        },
      }),
    }));
    expect(apiService.put).toHaveBeenCalledWith('/api/workout-plans/99/activate');
    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(mocks.buildPlanPdfFileFromPlanData).not.toHaveBeenCalled();
    expect(response).toEqual(expect.objectContaining({ pdfAttachment: 'queued' }));
  });
});
describe('buildWorkoutPlanSavePayload', () => {
  it('falls back to reviewed builder days when planData contains an empty weeks array', () => {
    const reviewedDay = {
      dayNumber: 1,
      name: 'Day 1',
      focus: 'full_body',
      dayType: 'training',
      exercises: [{ exerciseId: 'split-squat', exerciseName: 'Split Squat' }],
    };
    const payload = buildWorkoutPlanSavePayload({
      name: 'Reviewed Manual Arc',
      trainerId: '7',
      clientId: '42',
      goal: 'strength',
      startDate: '2026-06-07',
      endDate: '2026-12-06',
      status: 'active',
      planData: {
        planSummary: { durationWeeks: 26, startingPhase: 2 },
        weeks: [],
      },
      days: [reviewedDay],
    });
    expect(payload.planData).toEqual(expect.objectContaining({
      weeks: [{
        weekNumber: 1,
        days: [expect.objectContaining({
          ...reviewedDay,
          assignmentType: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          shouldDeductSession: false,
        })],
      }],
      assignmentDefaults: {
        defaultAssignmentType: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        shouldDeductSession: false,
      },
    }));
  });
});
