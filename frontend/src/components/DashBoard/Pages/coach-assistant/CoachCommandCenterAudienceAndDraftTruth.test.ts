import { describe, expect, it } from 'vitest';

import { buildCoachThreads, buildQueueHealthRows, buildQueueSummary, buildStatusMetrics } from './CoachCommandCenter.logic';

const thread = (id: number, role: string) => ({
  id,
  role,
  title: `${role} thread`,
  context: 'coach_assistant',
  status: 'active',
  messageCount: 1,
  lastMessageAt: null,
  createdAt: '2026-07-09T12:00:00.000Z',
});

describe('Coach Command Center audience and draft truth', () => {
  it('keeps staff-owned threads out of the client dashboard audience', () => {
    const threads = buildCoachThreads([thread(1, 'admin'), thread(2, 'client')], '', 'client');
    expect(threads.map(({ id }) => id)).toEqual([2]);
  });

  it('reports only pending proposals as ready draft work', () => {
    const summary = buildQueueSummary({ preparedDrafts: 1, pendingDrafts: 0, readyReview: 0 });
    const metrics = buildStatusMetrics(summary, 'ready', false, undefined);
    const rows = buildQueueHealthRows(summary);

    expect(metrics.find(({ label }) => label === 'Ready drafts')?.value).toBe('0');
    expect(rows.find(({ label }) => label === 'Ready drafts')?.value).toBe('0');
  });
});