/**
 * System command dispatcher contracts
 * ===================================
 * Ensures read-only Swan Coach system commands return compact operational
 * receipts while AI Village execution remains intentionally unwired.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher() {
  vi.resetModules();

  const readLatestReport = vi.fn(() => ({
    summary: '# Private validation content',
    reports: {
      'summary.md': '# Private validation content',
      '03-security.md': 'Private finding text',
    },
    timestamp: '2026-05-31T12:00:00Z',
  }));
  const getVillageHealth = vi.fn(() => ({
    ready: true,
    openRouter: true,
    gemini: false,
    running: false,
    activeJobId: null,
    latestRun: '2026-05-31T12:00:00Z',
    archiveCount: 3,
  }));
  const getMetricsSnapshot = vi.fn(() => ({
    overview: {
      totalRequests: 10,
      successfulRequests: 8,
      failedRequests: 2,
      successRate: '80.0%',
      totalTokensUsed: 1234,
      activeUsers: 2,
    },
    features: {
      aiWorkout: { totalRequests: 6 },
      longHorizon: { totalRequests: 4 },
    },
  }));
  const getSystemHealth = vi.fn(() => ({
    overall: {
      status: 'degraded',
      successRate: '80.0%',
      activeFeatures: ['aiWorkout', 'longHorizon'],
    },
    features: [],
  }));
  const getActiveAlerts = vi.fn(async () => [{ id: 1 }, { id: 2 }]);

  vi.doMock('../../services/ai/aiVillageService.mjs', () => ({
    readLatestReport,
    getVillageHealth,
  }));
  vi.doMock('../../services/monitoring/monitoringService.mjs', () => ({
    getMetricsSnapshot,
    getSystemHealth,
  }));
  vi.doMock('../../services/monitoring/alertEngine.mjs', () => ({
    getActiveAlerts,
  }));
  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({}),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    readLatestReport,
    getVillageHealth,
    getMetricsSnapshot,
    getSystemHealth,
    getActiveAlerts,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('system command dispatchers', () => {
  it('wires read-only system commands but leaves AI Village execution unwired', async () => {
    const { hasDispatcher } = await loadDispatcher();

    expect(hasDispatcher('view_validation_results')).toBe(true);
    expect(hasDispatcher('view_ai_system_status')).toBe(true);
    expect(hasDispatcher('run_health_check')).toBe(true);
    expect(hasDispatcher('run_ai_village')).toBe(false);
  });

  it('summarizes validation reports without echoing report contents', async () => {
    const { dispatch, readLatestReport } = await loadDispatcher();

    const result = await dispatch('view_validation_results', { track: '03-security.md' }, {
      user: { id: 1, role: 'admin' },
    });

    expect(readLatestReport).toHaveBeenCalledWith('03-security.md');
    expect(result).toEqual({
      found: true,
      timestamp: '2026-05-31T12:00:00Z',
      hasSummary: true,
      trackCount: 2,
      firstTrack: 'summary.md',
      requestedTrack: '03-security.md',
    });
    expect(JSON.stringify(result)).not.toContain('Private validation content');
    expect(JSON.stringify(result)).not.toContain('Private finding text');
  });

  it('summarizes AI monitoring status and health with compact counters', async () => {
    const { dispatch, getMetricsSnapshot, getSystemHealth, getActiveAlerts, getVillageHealth } =
      await loadDispatcher();

    const status = await dispatch('view_ai_system_status', {}, {
      user: { id: 1, role: 'admin' },
    });
    const health = await dispatch('run_health_check', { includeVillage: true }, {
      user: { id: 1, role: 'admin' },
    });

    expect(getMetricsSnapshot).toHaveBeenCalled();
    expect(getSystemHealth).toHaveBeenCalled();
    expect(getActiveAlerts).toHaveBeenCalled();
    expect(getVillageHealth).toHaveBeenCalled();
    expect(status).toEqual({
      overallStatus: 'degraded',
      successRate: '80.0%',
      totalRequests: 10,
      failedRequests: 2,
      totalTokensUsed: 1234,
      activeUsers: 2,
      activeFeatureCount: 2,
      activeAlertCount: 2,
    });
    expect(health).toEqual({
      overallStatus: 'degraded',
      aiSuccessRate: '80.0%',
      activeFeatureCount: 2,
      activeAlertCount: 2,
      villageReady: true,
      validationRunning: false,
      latestValidationRun: '2026-05-31T12:00:00Z',
    });
  });
});
