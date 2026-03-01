/**
 * Alert Engine Unit Tests — Phase 10
 * ====================================
 * Tests for alertEngine.mjs: threshold evaluation, alert persistence,
 * auto-resolution, acknowledge/resolve lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
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

// Mock models index
const mockAlert = {
  findAll: vi.fn().mockResolvedValue([]),
  findByPk: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
};
vi.mock('../../models/index.mjs', () => ({
  getAiMonitoringAlert: vi.fn(() => mockAlert),
}));

import { evaluateThresholds, THRESHOLDS, persistAlerts, getActiveAlerts, acknowledgeAlert, resolveAlert } from '../../services/monitoring/alertEngine.mjs';

// ── Helper: build a metrics snapshot ────────────────────────────────────────

function buildSnapshot(features = {}) {
  return { features };
}

function buildFeature(overrides = {}) {
  return {
    totalRequests: 100,
    successfulRequests: 90,
    failedRequests: 10,
    averageResponseTime: 1000,
    lastRequestTime: new Date().toISOString(),
    totalTokensUsed: 5000,
    ...overrides,
  };
}

// ── evaluateThresholds ──────────────────────────────────────────────────────

describe('evaluateThresholds', () => {
  it('returns empty array when all metrics are healthy', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        successfulRequests: 99,
        failedRequests: 1,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    expect(alerts).toHaveLength(0);
  });

  it('detects high_error_rate (>25%)', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 30,
        successfulRequests: 70,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const highErr = alerts.find(a => a.alertType === 'high_error_rate');
    expect(highErr).toBeDefined();
    expect(highErr.severity).toBe('critical');
    expect(highErr.feature).toBe('workoutGeneration');
  });

  it('detects elevated_error_rate (>10%) but not high', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 15,
        successfulRequests: 85,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const elevated = alerts.find(a => a.alertType === 'elevated_error_rate');
    expect(elevated).toBeDefined();
    expect(elevated.severity).toBe('warning');
  });

  it('does not fire elevated when high already fires', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 30,
        successfulRequests: 70,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const elevated = alerts.find(a => a.alertType === 'elevated_error_rate');
    expect(elevated).toBeUndefined();
  });

  it('detects high_latency (>5000ms)', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 1,
        successfulRequests: 99,
        averageResponseTime: 6000,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const latency = alerts.find(a => a.alertType === 'high_latency');
    expect(latency).toBeDefined();
    expect(latency.severity).toBe('warning');
  });

  it('detects critical_latency (>10000ms)', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 1,
        successfulRequests: 99,
        averageResponseTime: 12000,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const critical = alerts.find(a => a.alertType === 'critical_latency');
    expect(critical).toBeDefined();
    expect(critical.severity).toBe('critical');
  });

  it('does not fire high_latency when critical already fires', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        averageResponseTime: 12000,
        totalRequests: 100,
        failedRequests: 1,
        successfulRequests: 99,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const high = alerts.find(a => a.alertType === 'high_latency');
    expect(high).toBeUndefined();
  });

  it('detects token_budget exceeded', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 1,
        successfulRequests: 99,
        averageResponseTime: 500,
        totalTokensUsed: 1500000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const budget = alerts.find(a => a.alertType === 'token_budget');
    expect(budget).toBeDefined();
    expect(budget.severity).toBe('warning');
  });

  it('evaluates per-feature independently', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 30,
        successfulRequests: 70,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
      progressAnalysis: buildFeature({
        totalRequests: 100,
        failedRequests: 1,
        successfulRequests: 99,
        averageResponseTime: 500,
        totalTokensUsed: 1000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    // workoutGeneration should have high_error_rate, progressAnalysis should not
    expect(alerts.some(a => a.feature === 'workoutGeneration' && a.alertType === 'high_error_rate')).toBe(true);
    expect(alerts.some(a => a.feature === 'progressAnalysis')).toBe(false);
  });

  it('skips features with zero requests', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({ totalRequests: 0, failedRequests: 0, successfulRequests: 0 }),
    });
    const alerts = evaluateThresholds(snapshot);
    expect(alerts).toHaveLength(0);
  });

  it('returns correct severity per alert type', () => {
    const snapshot = buildSnapshot({
      workoutGeneration: buildFeature({
        totalRequests: 100,
        failedRequests: 30,
        successfulRequests: 70,
        averageResponseTime: 12000,
        totalTokensUsed: 1500000,
      }),
    });
    const alerts = evaluateThresholds(snapshot);
    const errorAlert = alerts.find(a => a.alertType === 'high_error_rate');
    const latencyAlert = alerts.find(a => a.alertType === 'critical_latency');
    const tokenAlert = alerts.find(a => a.alertType === 'token_budget');
    expect(errorAlert.severity).toBe('critical');
    expect(latencyAlert.severity).toBe('critical');
    expect(tokenAlert.severity).toBe('warning');
  });

  it('handles empty features object', () => {
    const alerts = evaluateThresholds(buildSnapshot({}));
    expect(alerts).toHaveLength(0);
  });

  it('handles null/undefined metricsSnapshot gracefully', () => {
    expect(evaluateThresholds(null)).toHaveLength(0);
    expect(evaluateThresholds(undefined)).toHaveLength(0);
    expect(evaluateThresholds({})).toHaveLength(0);
  });
});

// ── persistAlerts ───────────────────────────────────────────────────────────

describe('persistAlerts', () => {
  beforeEach(() => {
    mockAlert.findAll.mockReset();
    mockAlert.findAll.mockResolvedValue([]);
    mockAlert.create.mockReset();
    mockAlert.create.mockResolvedValue({});
    mockAlert.findByPk.mockReset();
  });

  it('creates new alert in DB', async () => {
    const alerts = [{
      alertType: 'high_error_rate',
      severity: 'critical',
      feature: 'workoutGeneration',
      message: 'test',
      metadata: {},
    }];
    await persistAlerts(alerts);
    expect(mockAlert.create).toHaveBeenCalledTimes(1);
  });

  it('auto-resolves cleared alerts', async () => {
    const mockActiveAlert = {
      alertType: 'high_error_rate',
      feature: 'workoutGeneration',
      update: vi.fn().mockResolvedValue({}),
    };
    mockAlert.findAll.mockResolvedValue([mockActiveAlert]);

    // No current alerts = old one should be resolved
    await persistAlerts([]);
    expect(mockActiveAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'resolved' })
    );
  });

  it('does not duplicate active alerts for same condition', async () => {
    const mockActiveAlert = {
      alertType: 'high_error_rate',
      feature: 'workoutGeneration',
      update: vi.fn(),
    };
    mockAlert.findAll.mockResolvedValue([mockActiveAlert]);

    const alerts = [{
      alertType: 'high_error_rate',
      severity: 'critical',
      feature: 'workoutGeneration',
      message: 'test',
      metadata: {},
    }];
    await persistAlerts(alerts);
    expect(mockAlert.create).not.toHaveBeenCalled();
  });
});

// ── getActiveAlerts ─────────────────────────────────────────────────────────

describe('getActiveAlerts', () => {
  it('queries status=active', async () => {
    mockAlert.findAll.mockResolvedValue([{ id: 1, alertType: 'test' }]);
    const alerts = await getActiveAlerts();
    expect(mockAlert.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'active' } })
    );
    expect(alerts).toHaveLength(1);
  });

  it('returns empty array when no alerts', async () => {
    mockAlert.findAll.mockResolvedValue([]);
    const alerts = await getActiveAlerts();
    expect(alerts).toHaveLength(0);
  });
});

// ── acknowledgeAlert / resolveAlert ─────────────────────────────────────────

describe('acknowledgeAlert', () => {
  it('sets status to acknowledged', async () => {
    const mockAlertInstance = { update: vi.fn().mockResolvedValue({}) };
    mockAlert.findByPk.mockResolvedValue(mockAlertInstance);
    await acknowledgeAlert(1);
    expect(mockAlertInstance.update).toHaveBeenCalledWith({ status: 'acknowledged' });
  });

  it('throws for non-existent alertId', async () => {
    mockAlert.findByPk.mockResolvedValue(null);
    await expect(acknowledgeAlert(999)).rejects.toThrow('not found');
  });
});

describe('resolveAlert', () => {
  it('sets status and resolvedAt', async () => {
    const mockAlertInstance = { update: vi.fn().mockResolvedValue({}) };
    mockAlert.findByPk.mockResolvedValue(mockAlertInstance);
    await resolveAlert(1);
    expect(mockAlertInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'resolved', resolvedAt: expect.any(Date) })
    );
  });

  it('throws for non-existent alertId', async () => {
    mockAlert.findByPk.mockResolvedValue(null);
    await expect(resolveAlert(999)).rejects.toThrow('not found');
  });
});

// ── Threshold env var overrides ─────────────────────────────────────────────

describe('threshold values', () => {
  it('uses default threshold values', () => {
    expect(THRESHOLDS.high_error_rate).toBe(0.25);
    expect(THRESHOLDS.elevated_error_rate).toBe(0.10);
    expect(THRESHOLDS.high_latency).toBe(5000);
    expect(THRESHOLDS.critical_latency).toBe(10000);
    expect(THRESHOLDS.token_budget).toBe(1000000);
  });
});
