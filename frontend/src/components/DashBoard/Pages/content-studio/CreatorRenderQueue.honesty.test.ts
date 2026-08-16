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
import { describeJob, describeAttribution } from './CreatorRenderQueue';
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
      // Assert the PROPERTY (a reason is attached), not the exact wording — an earlier
      // version hard-coded /no (worker|capable)/ and broke the moment the copy improved,
      // which is a test measuring the implementation rather than the guarantee.
      const reason = d.text.replace(/^queued\s*·\s*/i, '');
      expect(reason.length).toBeGreaterThan(0);
      expect(reason.toLowerCase()).not.toBe('queued');
    }
  });

  /**
   * All THREE blocked states must read differently, because each has a DIFFERENT fix.
   * A first version collapsed NO_WORKER_ENROLLED into "no worker online" — implying a
   * machine exists and is merely switched off, when none had ever been registered.
   */
  it('gives each blocked state its own words — they have different fixes', () => {
    const enrolled = describeJob(job({ workerState: 'NO_WORKER_ENROLLED' })).text;
    const offline = describeJob(job({ workerState: 'NO_WORKER_ONLINE' })).text;
    const incapable = describeJob(job({ workerState: 'NO_WORKER_WITH_CAPABILITY' })).text;

    expect(new Set([enrolled, offline, incapable]).size).toBe(3);
    expect(enrolled).toMatch(/no machine connected/i);
    expect(offline).toMatch(/offline/i);
    expect(incapable).toMatch(/no capable worker/i);

    // "never enrolled" must NOT claim something is merely offline.
    expect(enrolled).not.toMatch(/offline/i);
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


/**
 * RULE 3 — attribution is DISPLAYED when the asset carries it, and never invented.
 *
 * The model licence requires "MiniMax H3" shown prominently wherever H3-derived output
 * appears. That obligation was stated to a licensor in writing on 2026-08-16, and the
 * data path existed while nothing rendered it — so these pin the pixel end.
 */
describe('attribution honesty', () => {
  it('shows the attribution the ASSET carries, not a hardcoded string', () => {
    const a = describeAttribution(job({ status: 'ready', attribution: 'Video generated with MiniMax H3' }));
    expect(a?.text).toBe('Video generated with MiniMax H3');
  });

  it('shows NOTHING when the asset has no provenance — a fabricated credit is worse', () => {
    expect(describeAttribution(job({ status: 'ready' }))).toBeNull();
    expect(describeAttribution(job({ status: 'ready', attribution: '   ' }))).toBeNull();
    expect(describeAttribution(job({ status: 'ready', attribution: null }))).toBeNull();
  });

  it('marks a pending commercial grant beside the credit', () => {
    const a = describeAttribution(job({
      status: 'ready',
      attribution: 'Video generated with MiniMax H3',
      provenance: {
        provider: 'comfyui/minimax-h3', modelVersion: 'x', generatedAt: 'y',
        licenceName: 'MiniMax H3 Model Licence', licenceRestricts: 'model-execution',
        grantRecorded: false,
      },
    }));
    expect(a?.pending).toBe(true);
  });

  it('does not claim "pending" when a grant IS recorded', () => {
    const a = describeAttribution(job({
      status: 'ready',
      attribution: 'Video generated with MiniMax H3',
      provenance: {
        provider: 'comfyui/minimax-h3', modelVersion: 'x', generatedAt: 'y',
        licenceName: 'MiniMax H3 Model Licence', licenceRestricts: 'model-execution',
        grantRecorded: true,
      },
    }));
    expect(a?.pending).toBe(false);
  });
});
