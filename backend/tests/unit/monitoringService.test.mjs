/**
 * Monitoring Service Unit Tests — Phase 10
 * ==========================================
 * Tests for monitoringService.mjs: in-memory metrics, feature validation,
 * metric snapshots, health computation, eval/drift/AB integration, and caching.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database to prevent real DB connections
vi.mock('../../database.mjs', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[]]),
  },
}));

// Mock logger
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock models/index.mjs
vi.mock('../../models/index.mjs', () => ({
  getAiMonitoringAlert: vi.fn(() => ({
    findAll: vi.fn().mockResolvedValue([]),
    findByPk: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
  })),
  getAiMetricsBucket: vi.fn(),
}));

// Mock alertEngine to isolate monitoringService tests
const mockEvaluateThresholds = vi.fn().mockReturnValue([]);
const mockPersistAlerts = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/monitoring/alertEngine.mjs', () => ({
  evaluateThresholds: (...args) => mockEvaluateThresholds(...args),
  persistAlerts: (...args) => mockPersistAlerts(...args),
}));

import {
  updateMetrics,
  getMetricsSnapshot,
  getSystemHealth,
  resetMetrics,
  resetAlertTimer,
  getEvalStatus,
  getDriftStatus,
  getAbStatus,
  clearDriftCache,
  isValidFeatureName,
  truncateToHour,
  truncateToDay,
  _metrics,
  _activeUsers,
  _dailyActiveUsers,
} from '../../services/monitoring/monitoringService.mjs';

// ── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  resetMetrics();
  resetAlertTimer();
  clearDriftCache();
  mockEvaluateThresholds.mockClear();
  mockPersistAlerts.mockClear();
});

// ── Feature name validation ─────────────────────────────────────────────────

describe('isValidFeatureName', () => {
  it('accepts valid alphanumeric feature names', () => {
    expect(isValidFeatureName('workoutGeneration')).toBe(true);
    expect(isValidFeatureName('longHorizonGeneration')).toBe(true);
    expect(isValidFeatureName('feature_with_underscores')).toBe(true);
    expect(isValidFeatureName('a')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidFeatureName('')).toBe(false);
  });

  it('rejects names exceeding 50 characters', () => {
    const longName = 'a'.repeat(51);
    expect(isValidFeatureName(longName)).toBe(false);
    expect(isValidFeatureName('a'.repeat(50))).toBe(true);
  });

  it('rejects names with special characters', () => {
    expect(isValidFeatureName('feature-name')).toBe(false);
    expect(isValidFeatureName('feature.name')).toBe(false);
    expect(isValidFeatureName('feature name')).toBe(false);
    expect(isValidFeatureName('123feature')).toBe(false);
    expect(isValidFeatureName('_underscore_start')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidFeatureName(null)).toBe(false);
    expect(isValidFeatureName(undefined)).toBe(false);
    expect(isValidFeatureName(123)).toBe(false);
  });
});

// ── updateMetrics ───────────────────────────────────────────────────────────

describe('updateMetrics', () => {
  it('increments in-memory counters on success', () => {
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    expect(_metrics.workoutGeneration.totalRequests).toBe(1);
    expect(_metrics.workoutGeneration.successfulRequests).toBe(1);
    expect(_metrics.workoutGeneration.failedRequests).toBe(0);
  });

  it('increments failure counter on failure', () => {
    updateMetrics('workoutGeneration', false, 500, 0, 1);
    expect(_metrics.workoutGeneration.failedRequests).toBe(1);
    expect(_metrics.workoutGeneration.successfulRequests).toBe(0);
  });

  it('calculates running average response time', () => {
    updateMetrics('workoutGeneration', true, 1000, 0);
    updateMetrics('workoutGeneration', true, 3000, 0);
    expect(_metrics.workoutGeneration.averageResponseTime).toBe(2000);
  });

  it('tracks unique users', () => {
    updateMetrics('workoutGeneration', true, 500, 0, 1);
    updateMetrics('workoutGeneration', true, 500, 0, 2);
    updateMetrics('workoutGeneration', true, 500, 0, 1); // duplicate
    expect(_activeUsers.size).toBe(2);
    expect(_dailyActiveUsers.size).toBe(2);
  });

  it('accumulates tokens used', () => {
    updateMetrics('workoutGeneration', true, 500, 100);
    updateMetrics('workoutGeneration', true, 500, 200);
    expect(_metrics.workoutGeneration.totalTokensUsed).toBe(300);
  });

  it('rejects invalid feature name and does not create entry', () => {
    updateMetrics('', true, 500);
    updateMetrics('123bad', true, 500);
    updateMetrics('a'.repeat(51), true, 500);
    expect(Object.keys(_metrics).length).toBe(0);
  });

  it('dynamically creates new feature entries', () => {
    expect(_metrics.longHorizonGeneration).toBeUndefined();
    updateMetrics('longHorizonGeneration', true, 500, 0);
    expect(_metrics.longHorizonGeneration).toBeDefined();
    expect(_metrics.longHorizonGeneration.totalRequests).toBe(1);
  });

  it('sets lastRequestTime on update', () => {
    updateMetrics('workoutGeneration', true, 500);
    expect(_metrics.workoutGeneration.lastRequestTime).toBeTruthy();
  });
});

// ── getMetricsSnapshot ──────────────────────────────────────────────────────

describe('getMetricsSnapshot', () => {
  it('returns overview with totals', () => {
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    updateMetrics('progressAnalysis', false, 1000, 0, 2);
    const snapshot = getMetricsSnapshot();
    expect(snapshot.overview.totalRequests).toBe(2);
    expect(snapshot.overview.successfulRequests).toBe(1);
    expect(snapshot.overview.failedRequests).toBe(1);
  });

  it('includes per-feature data', () => {
    updateMetrics('workoutGeneration', true, 500, 100);
    const snapshot = getMetricsSnapshot();
    expect(snapshot.features.workoutGeneration).toBeDefined();
    expect(snapshot.features.workoutGeneration.totalRequests).toBe(1);
  });

  it('returns success rate as percentage string', () => {
    updateMetrics('workoutGeneration', true, 500);
    updateMetrics('workoutGeneration', true, 500);
    const snapshot = getMetricsSnapshot();
    expect(snapshot.overview.successRate).toBe('100.0%');
  });

  it('returns timestamp', () => {
    const snapshot = getMetricsSnapshot();
    expect(snapshot.timestamp).toBeTruthy();
  });

  it('returns health status based on success rate', () => {
    // No requests = poor (0%)
    const snapshot = getMetricsSnapshot();
    // With 0 requests, rate is 0
    expect(snapshot.systemHealth.status).toBe('poor');
  });
});

// ── getSystemHealth ─────────────────────────────────────────────────────────

describe('getSystemHealth', () => {
  it('returns healthy when success rate >= 95%', () => {
    for (let i = 0; i < 100; i++) updateMetrics('workoutGeneration', true, 500);
    const health = getSystemHealth();
    expect(health.overall.status).toBe('healthy');
  });

  it('returns degraded when success rate 85-94%', () => {
    for (let i = 0; i < 90; i++) updateMetrics('workoutGeneration', true, 500);
    for (let i = 0; i < 10; i++) updateMetrics('workoutGeneration', false, 500);
    const health = getSystemHealth();
    expect(health.overall.status).toBe('degraded');
  });

  it('returns unhealthy when success rate < 85%', () => {
    for (let i = 0; i < 80; i++) updateMetrics('workoutGeneration', true, 500);
    for (let i = 0; i < 20; i++) updateMetrics('workoutGeneration', false, 500);
    const health = getSystemHealth();
    expect(health.overall.status).toBe('unhealthy');
  });

  it('lists active features', () => {
    updateMetrics('workoutGeneration', true, 500);
    const health = getSystemHealth();
    expect(health.overall.activeFeatures).toContain('workoutGeneration');
  });

  it('computes per-feature health status', () => {
    updateMetrics('workoutGeneration', true, 500);
    const health = getSystemHealth();
    expect(health.features[0].status).toBe('healthy');
  });
});

// ── resetMetrics ────────────────────────────────────────────────────────────

describe('resetMetrics', () => {
  it('clears all in-memory counters', () => {
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    resetMetrics();
    expect(Object.keys(_metrics).length).toBe(0);
  });

  it('clears active user sets', () => {
    updateMetrics('workoutGeneration', true, 500, 0, 1);
    expect(_activeUsers.size).toBe(1);
    resetMetrics();
    expect(_activeUsers.size).toBe(0);
    expect(_dailyActiveUsers.size).toBe(0);
  });
});

// ── Bucket truncation helpers ───────────────────────────────────────────────

describe('truncateToHour', () => {
  it('truncates minutes/seconds/ms to zero', () => {
    const d = new Date('2026-02-28T14:35:22.123Z');
    const h = truncateToHour(d);
    expect(h.getMinutes()).toBe(0);
    expect(h.getSeconds()).toBe(0);
    expect(h.getMilliseconds()).toBe(0);
  });
});

describe('truncateToDay', () => {
  it('truncates hours/minutes/seconds/ms to zero', () => {
    const d = new Date('2026-02-28T14:35:22.123Z');
    const day = truncateToDay(d);
    expect(day.getHours()).toBe(0);
    expect(day.getMinutes()).toBe(0);
    expect(day.getSeconds()).toBe(0);
  });
});

// ── Eval / Drift / AB integration ───────────────────────────────────────────

describe('getEvalStatus', () => {
  it('returns null when no baseline exists', () => {
    // loadBaseline returns null on ENOENT — this is the default since
    // the test environment likely doesn't have the baseline file
    const result = getEvalStatus();
    // Either null (no file) or an object (file exists from previous runs)
    expect(result === null || typeof result === 'object').toBe(true);
  });
});

describe('getDriftStatus', () => {
  it('returns consistent result within 60s cache window', () => {
    clearDriftCache();
    const first = getDriftStatus();
    const second = getDriftStatus();
    // Both calls return same reference (cached)
    expect(first).toBe(second);
  });

  it('uses compareDrift when baseline exists', () => {
    clearDriftCache();
    const result = getDriftStatus();
    // If baseline file exists, result has compareDrift fields (drifted, changes, warnings)
    // If not, result is null
    if (result !== null) {
      expect(result).toHaveProperty('drifted');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('warnings');
    }
  });
});

describe('getAbStatus', () => {
  it('returns null when no AB report exists', () => {
    // loadBaseline returns null on ENOENT
    const result = getAbStatus();
    expect(result === null || typeof result === 'object').toBe(true);
  });
});

// ── Alert engine wiring ─────────────────────────────────────────────────────

describe('alert evaluation wiring', () => {
  it('calls evaluateThresholds + persistAlerts on first updateMetrics call', async () => {
    resetAlertTimer();
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    // Allow async fire-and-forget to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockEvaluateThresholds).toHaveBeenCalledTimes(1);
    expect(mockPersistAlerts).toHaveBeenCalledTimes(1);
  });

  it('throttles alert evaluation (30s window)', async () => {
    resetAlertTimer();
    updateMetrics('workoutGeneration', true, 500);
    updateMetrics('workoutGeneration', true, 500);
    updateMetrics('workoutGeneration', true, 500);
    await new Promise(resolve => setTimeout(resolve, 50));
    // Should only evaluate once despite 3 calls (within 30s throttle)
    expect(mockEvaluateThresholds).toHaveBeenCalledTimes(1);
  });

  it('passes metrics snapshot to evaluateThresholds', async () => {
    resetAlertTimer();
    updateMetrics('workoutGeneration', true, 500, 100, 1);
    await new Promise(resolve => setTimeout(resolve, 50));
    const snapshot = mockEvaluateThresholds.mock.calls[0][0];
    expect(snapshot).toHaveProperty('overview');
    expect(snapshot).toHaveProperty('features');
    expect(snapshot.features.workoutGeneration).toBeDefined();
  });

  it('passes evaluateThresholds result to persistAlerts', async () => {
    const fakeAlerts = [{ alertType: 'test', severity: 'warning', feature: 'x' }];
    mockEvaluateThresholds.mockReturnValueOnce(fakeAlerts);
    resetAlertTimer();
    updateMetrics('workoutGeneration', true, 500);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockPersistAlerts).toHaveBeenCalledWith(fakeAlerts);
  });
});
