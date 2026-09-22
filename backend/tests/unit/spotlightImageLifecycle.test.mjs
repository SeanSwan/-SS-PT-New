/**
 * spotlightImageLifecycle — the dispatcher outlives the BODY, not just the headers
 * ==============================================================================
 * WHAT THIS PROVES. `fetchSpotlightImage` must not ask the socket pool to close until the
 * response body has been settled — consumed, cancelled, or abandoned by an abort.
 *
 * WHY IT IS A SEPARATE FILE FROM THE PIN SUITE. The pin suite answers "is the connection
 * pinned to the approved address". This file answers a different question — "what is the
 * lifetime of the pool relative to the response" — and the two answers come from different
 * mechanisms. Splitting also keeps both files inside `06-bans.md` #50.
 *
 * THE DEFECT THIS ENCODES (hostile review round 8, D1, graded HIGH). The old code awaited
 * `dispatcher.close()` in a `finally` around `fetch()`. But `fetch()` resolves when the
 * HEADERS arrive and the body may still be streaming, so every body-handling path — the
 * 4xx/5xx cancel, the over-cap declared-length cancel, the streamed read — ran AFTER the
 * pool had been asked to shut down. `close()` drains idle sockets "once in-flight requests
 * settle", and a body still being read IS an in-flight request. The order was backwards by
 * construction: settlement must come first.
 *
 * WHY THE ASSERTIONS ARE ORDERING ASSERTIONS. A test asserting "close() was called" passes
 * on the broken code — that is the R6-01 failure mode (a green suite whose green does not
 * entail the property). Every assertion below compares the INDEX of two recorded events, so
 * reverting the fix turns this file red. That was verified by mutation, not assumed.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
import { mockDns, PUBLIC_IP, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Settlement must be recorded, and must precede closure. */
const settleThenClose = (timeline, settledEvent) => {
  expect(timeline).toContain(settledEvent);
  expect(timeline).toContain('dispatcher-closed');
  expect(timeline.indexOf(settledEvent)).toBeLessThan(timeline.indexOf('dispatcher-closed'));
};

describe('the dispatcher outlives the response body (round 8, D1)', () => {
  it('hands the headers over before the pool closes', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    await fetchSpotlightImage('https://example.com/a.png', build());

    // Sanity on the harness itself: if the fetch never resolved, the ordering claims below
    // would be comparing indices in a timeline that never recorded the thing under test.
    expect(timeline[0]).toBe('fetch-returned');
    expect(timeline).toContain('dispatcher-closed');
  });

  it('settles an over-cap DECLARED length before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      headers: { 'content-length': '4096' },
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
    settleThenClose(timeline, 'body-settled');
  });

  it('settles a 4xx body before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({ status: 500 }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    settleThenClose(timeline, 'body-settled');
  });

  it('settles an over-cap STREAMED read before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      maxBytes: 8,
      chunks: [Buffer.alloc(6), Buffer.alloc(6)],
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
    settleThenClose(timeline, 'body-settled');
  });

  it('drains a within-cap body before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      chunks: [Buffer.from('abc')],
    }));

    expect(result.ok).toBe(true);
    // A fully-consumed stream fires no `cancel`, so the drain marker stands in for settlement.
    settleThenClose(timeline, 'stream-drained');
  });

  it('settles a body that ERRORS mid-read before closing the pool (round 9, finding 2)', async () => {
    // THE PATH THIS PINS. Every other exit from `readImageBody` released the body; the
    // `catch (err)` around the read loop returned WITHOUT cancelling, so a stream that failed
    // mid-read left a live socket behind. It was the single exception, and it was on the path
    // where a connection is most likely to be stranded.
    //
    // The assertion is on the timeline, not on the code: if the release is removed, no
    // `body-settled` entry is recorded and `settleThenClose` fails. A test that only checked
    // `result.ok === false` would pass either way.
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      chunks: [Buffer.alloc(4)],
      errorAfter: 'ECONNRESET',
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    expect(result.message).toMatch(/ECONNRESET/);

    // The stream had ALREADY errored, so `reader.cancel()` rejects with that error rather than
    // resolving — measured, and it is the spec's behaviour. What must be true is that the cancel
    // RAN to completion (either outcome) and, critically, that it was not REFUSED as locked.
    //
    // `body-cancel-locked` is the assertion that has teeth. The first version of this fix called
    // `response.body.cancel()` on a stream whose body was LOCKED by the reader; that throws
    // `Invalid state: ReadableStream is locked`, the empty catch swallowed it, and the socket was
    // never released — while a marker-before-await harness reported success. This is that bug,
    // pinned so it cannot come back.
    expect(timeline).not.toContain('body-cancel-locked');
    const settled = timeline.filter((e) => e === 'body-settled' || e === 'body-settled-after-error');
    expect(settled.length).toBeGreaterThan(0);
    expect(timeline).toContain('dispatcher-closed');
    expect(timeline.indexOf(settled[0])).toBeLessThan(timeline.indexOf('dispatcher-closed'));
  });

  it('closes the pool even when the fetch itself throws', async () => {
    // The failure path must not leak the dispatcher. `fetchImpl` throwing is the case the
    // original `finally` DID handle correctly — so this case guards against a fix that
    // moved cleanup inside the body handler and lost the error path.
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const built = build();
    const exploding = { ...built, fetchImpl: async () => { throw new Error('socket exploded'); } };

    const result = await fetchSpotlightImage('https://example.com/a.png', exploding);

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    expect(timeline).toContain('dispatcher-closed');
  });
});
