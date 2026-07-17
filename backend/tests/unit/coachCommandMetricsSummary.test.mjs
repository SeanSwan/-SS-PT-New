/**
 * v2 P2.2 — command success metrics shaping (pure) + window clamping.
 * The ingestion side is the pre-existing append-only AiCommandAuditLog;
 * these tests pin the read-side aggregation contract.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../models/AiCommandAuditLog.mjs', () => ({ default: {} }));

const { clampWindowDays, shapeCommandMetrics } = await import('../../services/ai/coachCommandMetricsSummary.mjs');

describe('clampWindowDays', () => {
  it('defaults to 7 and clamps to [1, 90]', () => {
    expect(clampWindowDays(undefined)).toBe(7);
    expect(clampWindowDays('abc')).toBe(7);
    expect(clampWindowDays(0)).toBe(7);
    expect(clampWindowDays(-3)).toBe(7);
    expect(clampWindowDays(30)).toBe(30);
    expect(clampWindowDays('14')).toBe(14);
    expect(clampWindowDays(365)).toBe(90);
  });
});

describe('shapeCommandMetrics', () => {
  it('aggregates outcomes per command with success rate and weighted latency', () => {
    const shaped = shapeCommandMetrics([
      { commandType: 'log_workout', outcome: 'success', count: '8', avgDurationMs: '400' },
      { commandType: 'log_workout', outcome: 'failed', count: '2', avgDurationMs: '900' },
      { commandType: 'log_workout', outcome: 'confirmation_required', count: '5', avgDurationMs: null },
      { commandType: 'cancel_session', outcome: 'cancelled', count: '1', avgDurationMs: '120' },
      { commandType: 'cancel_session', outcome: 'denied', count: '1', avgDurationMs: '50' },
    ]);

    const logWorkout = shaped.commands.find((entry) => entry.commandType === 'log_workout');
    expect(logWorkout).toMatchObject({
      attempts: 15,
      succeeded: 8,
      failed: 2,
      confirmationsPending: 5,
      cancelled: 0,
      successRate: 0.533,
    });
    // Weighted latency ignores null-duration groups: (400*8 + 900*2) / 10 = 500
    expect(logWorkout.avgDurationMs).toBe(500);

    expect(shaped.totals).toMatchObject({ attempts: 17, succeeded: 8, failed: 3, cancelled: 1 });
    expect(shaped.totals.successRate).toBe(0.471);
    // Sorted by attempts, busiest first.
    expect(shaped.commands[0].commandType).toBe('log_workout');
  });

  it('handles empty windows and unknown outcomes without inventing data', () => {
    expect(shapeCommandMetrics([])).toEqual({
      totals: { attempts: 0, succeeded: 0, failed: 0, confirmationsPending: 0, cancelled: 0, successRate: 0 },
      commands: [],
    });
    const shaped = shapeCommandMetrics([{ commandType: null, outcome: 'weird_new_outcome', count: 3, avgDurationMs: 10 }]);
    expect(shaped.commands[0]).toMatchObject({ commandType: 'unknown', attempts: 3, succeeded: 0, failed: 0 });
  });
});
