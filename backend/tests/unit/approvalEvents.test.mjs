/**
 * Card 1.0 — approval lifecycle events are countable, namespaced, and cannot
 * skew the existing command metrics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordCommandAudit = vi.fn(async () => true);
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit }));

const {
  APPROVAL_EVENTS, APPROVAL_EVENT_PREFIX, isApprovalEvent,
  approvalOutcomeToken, recordApprovalEvent, shapeApprovalCounts,
} = await import('../../services/ai/approvalEvents.mjs');

beforeEach(() => recordCommandAudit.mockClear());

describe('approval events', () => {
  it('every event token fits the audit outcome column (30 chars)', () => {
    for (const e of Object.values(APPROVAL_EVENTS)) {
      expect(approvalOutcomeToken(e).length).toBeLessThanOrEqual(30);
    }
  });

  it('approval rows are EXCLUDED from command attempts — the successRate denominator is untouched', async () => {
    const { shapeCommandMetrics } = await import('../../services/ai/coachCommandMetricsSummary.mjs');
    const withoutApprovals = shapeCommandMetrics([
      { commandType: 'cancel_session', outcome: 'success', count: 4, avgDurationMs: 10 },
    ]);
    const withApprovals = shapeCommandMetrics([
      { commandType: 'cancel_session', outcome: 'success', count: 4, avgDurationMs: 10 },
      { commandType: 'cancel_session', outcome: 'approval:minted', count: 9, avgDurationMs: 1 },
      { commandType: 'cancel_session', outcome: 'approval:consumed', count: 7, avgDurationMs: 1 },
    ]);
    expect(withApprovals.totals).toEqual(withoutApprovals.totals);
    expect(withApprovals.totals.attempts).toBe(4);
    expect(withApprovals.totals.successRate).toBe(1);
  });

  it('an approval outcome matches NEITHER the success NOR the failure sets', async () => {
    const src = (await import('node:fs')).readFileSync(
      new URL('../../services/ai/coachCommandMetricsSummary.mjs', import.meta.url), 'utf8');
    const success = src.match(/SUCCESS_OUTCOMES = new Set\(\[([^\]]*)\]/)[1];
    const failure = src.match(/FAILURE_OUTCOMES = new Set\(\[([^\]]*)\]/)[1];
    for (const e of Object.values(APPROVAL_EVENTS)) {
      const token = approvalOutcomeToken(e);
      expect(success).not.toContain(token);
      expect(failure).not.toContain(token);
    }
  });

  it('records a namespaced row with ids only — never params or description', async () => {
    await recordApprovalEvent({
      event: APPROVAL_EVENTS.MINTED, userId: 7, userRole: 'trainer',
      commandType: 'cancel_session', operationId: 'op-1', targetClientId: 61, destructive: true,
    });
    expect(recordCommandAudit).toHaveBeenCalledTimes(1);
    const entry = recordCommandAudit.mock.calls[0][0];
    expect(entry.outcome).toBe('approval:minted');
    expect(entry.operationId).toBe('op-1');
    expect(entry).not.toHaveProperty('params');
    expect(JSON.stringify(entry)).not.toMatch(/description/i);
  });

  it('an unknown event name writes NOTHING — a typo must not create a metric bucket', async () => {
    const written = await recordApprovalEvent({ event: 'minted_typo', userId: 7, userRole: 'admin' });
    expect(written).toBe(false);
    expect(recordCommandAudit).not.toHaveBeenCalled();
  });

  it('shapeApprovalCounts counts only prefixed rows and ignores unknown members', () => {
    const counts = shapeApprovalCounts([
      { outcome: 'approval:minted', count: 3 },
      { outcome: 'approval:consumed', count: 2 },
      { outcome: 'success', count: 99 },                 // ordinary command row
      { outcome: 'approval:from_the_future', count: 5 }, // forward-compatible
      { outcome: null, count: 1 },
    ]);
    expect(counts.minted).toBe(3);
    expect(counts.consumed).toBe(2);
    expect(counts.confirmed).toBe(0);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('isApprovalEvent is closed over the exported set', () => {
    expect(isApprovalEvent(APPROVAL_EVENTS.RENDER_MISMATCH)).toBe(true);
    expect(isApprovalEvent('anything_else')).toBe(false);
    expect(APPROVAL_EVENT_PREFIX).toBe('approval:');
  });
});
