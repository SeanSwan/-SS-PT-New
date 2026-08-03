import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastMock: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/api.service', () => ({
  ApiService: class MockApiService {
    get = apiGetMock;
  },
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

import { loadTodaysPlanIntoLogger } from './WorkoutLogger.loadTodaysPlan';

function baseParams() {
  return {
    effectiveClientId: 2,
    createWorkoutLoggerLocalId: (prefix: string) => `${prefix}-1`,
    routeAssignmentKey: null,
    routeAssignmentType: null,
    scheduledSessionId: null,
    setExercises: vi.fn(),
    setIsLoadingPlan: vi.fn(),
    setPlannedAssignment: vi.fn(),
  };
}

describe('WorkoutLogger.loadTodaysPlanIntoLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
  });

  it('treats missing client/current-plan responses as an empty plan state without console noise', async () => {
    apiGetMock.mockRejectedValue({
      response: {
        status: 404,
        data: { success: false, message: 'Client not found' },
      },
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const params = baseParams();

    try {
      await loadTodaysPlanIntoLogger(params);
    } finally {
      consoleError.mockRestore();
    }

    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(toastMock.info).toHaveBeenCalledWith('No active workout plan found for this training profile');
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('treats a 200 plan-pending response as no active plan when no route target is requested', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        data: null,
        plan: null,
        todayAssignment: {
          assignmentKey: null,
          assignmentType: 'none',
          status: 'none',
          isLoggable: false,
          title: 'Plan pending',
          exercises: [],
        },

      },
    });
    const params = {
      ...baseParams(),
      setLoadedPlanContext: vi.fn(),
    } as ReturnType<typeof baseParams> & { setLoadedPlanContext: ReturnType<typeof vi.fn> };

    await loadTodaysPlanIntoLogger(params);

    expect(params.setExercises).not.toHaveBeenCalled();
    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(params.setLoadedPlanContext).toHaveBeenCalledWith(null);
    expect(toastMock.info).toHaveBeenCalledWith('No active workout plan found for this training profile');
    expect(toastMock.info).not.toHaveBeenCalledWith(expect.stringMatching(/not loggable/i));
    expect(toastMock.success).not.toHaveBeenCalled();
  });
  it('loads a route-targeted generated picker day as a draft when todayAssignment is different', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        currentSession: null,
        todayAssignment: {
          assignmentKey: 'plan-6m:w1:d1:homework',
          assignmentType: 'homework',
          isLoggable: true,
          title: 'Today Homework',
          exercises: [
            { exerciseId: 'today-row', exerciseName: 'Today Row', sets: 2, targetReps: '8' },
          ],
        },
        plan: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
        assignmentPicker: [
          {
            id: 'plan-6m:w1:d3:homework',
            assignmentKey: 'plan-6m:w1:d3:homework',
            assignmentType: 'homework',
            planId: 'plan-6m',
            planTitle: 'Six Month Arc',
            isCurrent: false,
            isLoadable: true,
            canSubmitPlannedAssignment: false,
            submitMode: 'draft_only',
            title: 'Posterior Chain Draft',
            weekNumber: 1,
            dayNumber: 3,
            dayLabel: 'Posterior Chain',
            exercises: [
              { exerciseId: 'rdl', exerciseName: 'Romanian Deadlift', sets: 3, targetReps: '8' },
            ],
          },
        ],
      },
    });
    const params = {
      ...baseParams(),
      routeAssignmentKey: 'plan-6m:w1:d3:homework',
      routeAssignmentType: 'homework',
      setLoadedPlanContext: vi.fn(),
    } as ReturnType<typeof baseParams> & { setLoadedPlanContext: ReturnType<typeof vi.fn> };

    await loadTodaysPlanIntoLogger(params);

    expect(params.setExercises).toHaveBeenCalledTimes(1);
    const updateExercises = params.setExercises.mock.calls[0][0] as (previous: unknown[]) => unknown[];
    expect(updateExercises([])).toEqual([
      expect.objectContaining({
        exerciseId: 'rdl',
        exerciseName: 'Romanian Deadlift',
        sets: expect.arrayContaining([
          expect.objectContaining({ reps: 8, rpe: null, formQuality: null }),
        ]),
      }),
    ]);
    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(params.setLoadedPlanContext).toHaveBeenCalledWith(expect.objectContaining({
      assignmentKey: 'plan-6m:w1:d3:homework',
      planId: 'plan-6m',
      title: 'Posterior Chain Draft',
    }));
    expect(toastMock.success).toHaveBeenCalledWith('Loaded 1 exercise from Posterior Chain Draft as a draft.');
    expect(toastMock.info).not.toHaveBeenCalledWith(expect.stringMatching(/assignment changed/i));
  });
  it('does not load homework exercises into a booked scheduled-session handoff', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        currentSession: {
          weekNumber: 2,
          dayNumber: 3,
          dayLabel: 'Homework Day',
          exercises: [
            { exerciseId: 'homework-row', exerciseName: 'Homework Row', sets: 2, targetReps: '10' },
          ],
        },
        todayAssignment: {
          assignmentKey: 'plan-6m:w2:d3:homework',
          assignmentType: 'homework',
          source: 'workout_plan',
          isBillable: false,
          shouldDeductSession: false,
          isLoggable: true,
          title: 'Off-Day Homework',
          weekNumber: 2,
          dayNumber: 3,
          dayLabel: 'Homework Day',
          exerciseCount: 1,
          exercises: [
            { exerciseId: 'homework-row', exerciseName: 'Homework Row', sets: 2, targetReps: '10' },
          ],
        },
        plan: { id: 'plan-6m', name: 'Six Month Arc', days: [] },
      },
    });
    const params = {
      ...baseParams(),
      routeAssignmentType: 'homework',
      scheduledSessionId: '314',
      setLoadedPlanContext: vi.fn(),
    } as ReturnType<typeof baseParams> & { setLoadedPlanContext: ReturnType<typeof vi.fn> };

    await loadTodaysPlanIntoLogger(params);

    expect(params.setExercises).not.toHaveBeenCalled();
    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(params.setLoadedPlanContext).toHaveBeenCalledWith(null);
    expect(toastMock.info).toHaveBeenCalledWith(
      'Today\'s assignment changed. Open it again from your dashboard before logging.',
    );
    expect(toastMock.success).not.toHaveBeenCalled();
  });
  it('does not load a legacy plan-day fallback into a booked scheduled-session handoff', async () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[new Date().getDay()];

    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        currentSession: null,
        todayAssignment: null,
        plan: {
          id: 'legacy-plan',
          name: 'Legacy Plan',
          days: [{
            dayName: todayName,
            exercises: [
              { exerciseId: 'legacy-row', exerciseName: 'Legacy Row', sets: 2, reps: '8' },
            ],
          }],
        },
      },
    });
    const params = {
      ...baseParams(),
      scheduledSessionId: '314',
      setLoadedPlanContext: vi.fn(),
    } as ReturnType<typeof baseParams> & { setLoadedPlanContext: ReturnType<typeof vi.fn> };

    await loadTodaysPlanIntoLogger(params);

    expect(params.setExercises).not.toHaveBeenCalled();
    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(params.setLoadedPlanContext).toHaveBeenCalledWith(null);
    expect(toastMock.info).toHaveBeenCalledWith(
      'Today\'s assignment changed. Open it again from your dashboard before logging.',
    );
    expect(toastMock.success).not.toHaveBeenCalled();
  });
  it('S0: never guesses a day — weekday fallback deleted, honest no_current_day outcome instead', async () => {
    // INTENT PRESERVED FROM THE OLD PIN: when the cursor session and today's
    // assignment both miss but plan.days exist, the user still gets a
    // truthful, recoverable state. The OLD behavior (weekday-name match with
    // `days[dayOfWeek % length]` fallback) silently loaded days the plan
    // never scheduled — W2·Tue vs W5·Tue are indistinguishable by weekday.
    // The new law: nothing prefills, and the outcome names the recovery path.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[new Date().getDay()];

    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        currentSession: null,
        todayAssignment: null,
        plan: {
          id: 'legacy-plan',
          name: 'Legacy Plan',
          days: [{
            dayName: todayName,
            exercises: [
              { exerciseId: 'legacy-squat', exerciseName: 'Legacy Squat', sets: 2, reps: '8' },
            ],
          }],
        },
      },
    });
    const setPlanLoadOutcome = vi.fn();
    const params = {
      ...baseParams(),
      setLoadedPlanContext: vi.fn(),
      setPlanLoadOutcome,
    } as ReturnType<typeof baseParams> & {
      setLoadedPlanContext: ReturnType<typeof vi.fn>;
      setPlanLoadOutcome: ReturnType<typeof vi.fn>;
    };

    await loadTodaysPlanIntoLogger(params);

    expect(params.setExercises).not.toHaveBeenCalled();
    expect(params.setPlannedAssignment).toHaveBeenCalledWith(null);
    expect(params.setLoadedPlanContext).toHaveBeenCalledWith(null);
    expect(setPlanLoadOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'no_current_day' }),
    );
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
