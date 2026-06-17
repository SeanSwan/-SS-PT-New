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
    expect(toastMock.info).toHaveBeenCalledWith('No active workout plan found for this client');
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
