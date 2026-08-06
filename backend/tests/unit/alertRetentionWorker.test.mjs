/**
 * SWA-138 S4b — alert retention worker.
 * The read-state side table introduced in S4a grows one row per (admin, alert)
 * forever; computed finance alerts mint new ids as conditions recur. These
 * lock the pruning behaviour and its safety floors.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/NotificationReadState.mjs', () => ({
  default: { destroy: vi.fn() },
  ALERT_REF_TYPES: ['contact', 'finance', 'admin_notification', 'post_report'],
}));

const { default: NotificationReadState } = await import('../../models/NotificationReadState.mjs');
const {
  pruneReadState,
  resolveReadStateRetentionDays,
  startAlertRetentionWorker,
  stopAlertRetentionWorker,
  _internal,
} = await import('../../jobs/alertRetentionWorker.mjs');

describe('read-state retention', () => {
  beforeEach(() => {
    NotificationReadState.destroy.mockReset().mockResolvedValue(4);
    delete process.env.ALERT_READ_STATE_RETENTION_DAYS;
  });

  it('only deletes rows that are BOTH settled and older than the window', async () => {
    const now = new Date('2026-08-06T00:00:00Z');
    const result = await pruneReadState(now);

    expect(result.removed).toBe(4);
    const where = NotificationReadState.destroy.mock.calls[0][0].where;
    const orClause = Object.getOwnPropertySymbols(where)
      .map((sym) => where[sym])
      .find(Array.isArray);

    // Settled = acked or archived. An untouched (still-active) alert is never pruned.
    expect(orClause).toHaveLength(2);
    expect(result.retentionDays).toBe(120);
    expect(result.cutoff.getTime()).toBe(now.getTime() - 120 * 86400000);
  });

  it('honours a configured retention window but refuses anything under the floor', () => {
    process.env.ALERT_READ_STATE_RETENTION_DAYS = '200';
    expect(resolveReadStateRetentionDays()).toBe(200);
    process.env.ALERT_READ_STATE_RETENTION_DAYS = '2';
    expect(resolveReadStateRetentionDays()).toBe(120); // below MIN → default
    expect(_internal.MIN_RETENTION_DAYS).toBe(30);
  });
});

describe('worker lifecycle', () => {
  afterEach(() => {
    stopAlertRetentionWorker();
    delete process.env.ALERT_RETENTION_WORKER_ENABLED;
  });

  it('is disabled by default — no timer without the explicit flag', () => {
    expect(startAlertRetentionWorker()).toBeNull();
  });

  it('enforces an interval floor so it can never hot-loop the database', () => {
    process.env.ALERT_RETENTION_WORKER_INTERVAL_MS = '1000';
    expect(_internal.resolveIntervalMs()).toBeGreaterThanOrEqual(_internal.MIN_INTERVAL_MS);
    delete process.env.ALERT_RETENTION_WORKER_INTERVAL_MS;
  });
});

describe('server wiring', () => {
  const server = readFileSync(resolvePath(process.cwd(), 'server.mjs'), 'utf8');

  it('starts and stops with the server, non-fatally', () => {
    expect(server).toContain("import { startAlertRetentionWorker, stopAlertRetentionWorker } from './jobs/alertRetentionWorker.mjs'");
    expect(server).toContain('startAlertRetentionWorker();');
    expect(server).toContain('stopAlertRetentionWorker();');
    expect(server).toContain('Alert retention worker bootstrap failed (non-fatal)');
  });
});
