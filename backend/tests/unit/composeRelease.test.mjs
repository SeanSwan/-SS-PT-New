/**
 * Returning the GPU — the one rule this review got wrong twice.
 *
 * Split from composeGuardsRefusals at the 300-line cap. The rule has exactly two ways to
 * be wrong and they are opposite: release on the WAIT and two batches share a card;
 * release only on the WORK and a hung render holds it forever. Both mistakes were made,
 * an hour apart, on two lanes — which is why there is now one helper and one test file
 * for it.
 */

import { describe, it, expect } from 'vitest';

describe('the GPU comes back when the WORK stops, not when the WAIT stops', () => {
  it('holds the reservation while the work is still running', async () => {
    // One helper, called by both lanes. It exists because the async lane got this right
    // first and the sync watchdog added an hour later reproduced the original bug exactly
    // — two copies of a subtle release rule is how that happens.
    const { releaseWhenSettled } = await import('../../services/atelier/composeGpu.mjs');
    let released = false;
    const reservation = { release: () => { released = true; } };
    let finish;
    const work = new Promise((r) => { finish = r; });

    releaseWhenSettled(reservation, work, 5000);
    await new Promise((r) => setTimeout(r, 40));
    expect(released).toBe(false);                 // still rendering; card is still ours

    finish();
    await new Promise((r) => setTimeout(r, 20));
    expect(released).toBe(true);                  // work ended, card returned
  });

  it('releases after a bounded grace even when the work NEVER settles', async () => {
    // The opposite mistake: waiting unconditionally means a genuinely hung render holds
    // the card forever, which is the failure the watchdog exists to end.
    const { releaseWhenSettled } = await import('../../services/atelier/composeGpu.mjs');
    let released = false;
    releaseWhenSettled({ release: () => { released = true; } }, new Promise(() => {}), 250);
    await new Promise((r) => setTimeout(r, 400));
    expect(released).toBe(true);
  });

  it('releases exactly once, and immediately when there is no work to wait for', async () => {
    const { releaseWhenSettled } = await import('../../services/atelier/composeGpu.mjs');
    let count = 0;
    releaseWhenSettled({ release: () => { count += 1; } }, null, 250);
    expect(count).toBe(1);

    let n = 0;
    releaseWhenSettled({ release: () => { n += 1; } }, Promise.reject(new Error('boom')), 250);
    await new Promise((r) => setTimeout(r, 300));
    expect(n).toBe(1);                            // a rejected render still returns the card, once
  });
});
