/**
 * The honesty rules, as executable assertions.
 *
 * The endpoint behind this surface once answered `success: true, status: 'waiting'` while
 * rendering nothing. These tests exist so that lie cannot be reintroduced at the pixel
 * layer by a future edit — they pin the two rules that keep the UI truthful:
 *
 *   1. `blocked` is derived from worker PRESENCE, never from the status string. A
 *      `queued` job a worker is about to grab and a `queued` job nothing can touch are
 *      the same word and opposite truths.
 *   2. The word "Queued" NEVER appears alone on a blocked job — the reason is the label.
 */

import { describe, it, expect } from 'vitest';
import { describeJob } from './CreatorRenderQueue';
import type { RenderJobView } from './CreatorRenderQueue.api';

const job = (over: Partial<RenderJobView>): RenderJobView => ({
  jobId: 'j', status: 'queued', progress: null, errorCode: null, errorMessage: null,
  r2Key: null, startable: false, workerState: 'NO_WORKER_ENROLLED', ...over,
});

describe('the same status string, two opposite truths', () => {
  it('marks queued-with-no-worker as blocked', () => {
    const d = describeJob(job({ startable: false, workerState: 'NO_WORKER_ONLINE' }));
    expect(d.blocked).toBe(true);
    expect(d.tone).toBe('blocked');
  });

  it('does NOT mark queued-with-a-worker as blocked', () => {
    const d = describeJob(job({ startable: true, workerState: 'WORKER_ONLINE' }));
    expect(d.blocked).toBe(false);
  });

  it('never says "Queued" alone when nothing can pick the job up', () => {
    for (const ws of ['NO_WORKER_ENROLLED', 'NO_WORKER_ONLINE', 'NO_WORKER_WITH_CAPABILITY'] as const) {
      const d = describeJob(job({ startable: false, workerState: ws }));
      expect(d.text).not.toBe('Queued');
      expect(d.text.toLowerCase()).toContain('queued');
      // The reason is what makes it honest.
      expect(d.text).toMatch(/no (worker|capable)/i);
    }
  });

  it('distinguishes "no capable worker" from "no worker online" in the label', () => {
    expect(describeJob(job({ workerState: 'NO_WORKER_WITH_CAPABILITY' })).text)
      .toMatch(/no capable worker/i);
    expect(describeJob(job({ workerState: 'NO_WORKER_ONLINE' })).text)
      .toMatch(/no worker online/i);
  });
});

describe('motion is a guarantee — only proven work may look like work', () => {
  it('gives blocked jobs a non-working tone so no animation is reachable', () => {
    // The component renders the indeterminate bar ONLY for status === 'rendering'.
    // This pins the companion rule: a blocked job never claims the working tone.
    expect(describeJob(job({ startable: false })).tone).toBe('blocked');
  });

  it('treats leased and rendering as working — the backend has proof there', () => {
    expect(describeJob(job({ status: 'leased', startable: true })).tone).toBe('working');
    expect(describeJob(job({ status: 'rendering', startable: true })).tone).toBe('working');
  });

  it('surfaces the error code on failure instead of a bare "Failed"', () => {
    const d = describeJob(job({ status: 'failed', errorCode: 'AGENT_UNSUPPORTED' }));
    expect(d.tone).toBe('failed');
    expect(d.text).toContain('AGENT_UNSUPPORTED');
  });

  it('reports ready plainly, with no celebration tone', () => {
    const d = describeJob(job({ status: 'ready', startable: true }));
    expect(d.tone).toBe('ready');
    expect(d.blocked).toBe(false);
  });

  it('does not present a cancelled job as actionable', () => {
    expect(describeJob(job({ status: 'cancelled' })).blocked).toBe(true);
  });
});
