/**
 * spotlightImageFixtures — shared fixtures for the Spotlight image-fetch suites
 * ============================================================================
 * Extracted so the two suites that use them stay inside the repo's 299-line limit.
 * Nothing here is a test, and this directory sits outside the test-file glob.
 *
 * WHICH PARTS ARE REAL, AND WHICH ARE NOT (corrected after hostile review round 9, C8).
 *
 * REAL: the HTTP transport (real `http` servers on loopback — the decision point in the
 * transport tests is the network, not an assertion about a mock's shape), the response
 * BODIES (real `Readable` streams, so the streamed byte cap and the cancellation paths are
 * exercised as streams), and the images (`sharp` generates real encodable bytes, so the
 * decoder decodes rather than being told it succeeded).
 *
 * MOCKED, and it matters which: **`dns.lookup`**. `mockDns`, `mockDnsFail` and `mockDnsHang`
 * replace it outright. An earlier version of this header said "these are deliberately REAL
 * artefacts, not stubs" without that qualification, which read as a claim the file does not
 * have. The honest statement is: everything except name resolution is real.
 *
 * WHAT THE MOCK DOES AND DOES NOT ESTABLISH. It establishes what the code does GIVEN a
 * resolution result — the admission decision, the pin's address set, the behaviour when the
 * resolver fails or hangs. It cannot establish that a real resolver returns what the mock
 * claims, so no test here is evidence about real DNS. In particular a rebinding attack is
 * represented by choosing mock values, not by performing one.
 */
import { vi } from 'vitest';
import * as dnsModule from 'node:dns';
import sharp from 'sharp';

/** A publicly routable address — the happy-path resolution. */
export const PUBLIC_IP = [{ address: '93.184.216.34', family: 4 }];

export const mockDns = (addresses) =>
  vi.spyOn(dnsModule.promises, 'lookup').mockResolvedValue(addresses);

export const mockDnsFail = (message = 'ENOTFOUND') =>
  vi.spyOn(dnsModule.promises, 'lookup').mockRejectedValue(new Error(message));

/** A DNS mock that NEVER settles — the hanging-resolver case the lookup budget must bound. */
export const mockDnsHang = () =>
  vi.spyOn(dnsModule.promises, 'lookup').mockImplementation(() => new Promise(() => {}));

/**
 * Like `streamResponse`, but records cancellation so a test can prove the body was RELEASED
 * rather than merely abandoned. `ReadableStream.cancel()` invokes this underlying `cancel`,
 * so `cancels` is evidence of the release, not of an intention to release.
 */
export function cancellableStreamResponse(chunks, { status = 200, headers = {} } = {}) {
  const cancels = [];
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.close();
    },
    cancel(reason) { cancels.push(reason); },
  });
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
}

/**
 * A response whose stream EMITS some chunks and then ERRORS mid-read, recording cancellation.
 *
 * WHY THE ERRORING CASE NEEDS ITS OWN FIXTURE (hostile review round 9, finding 2). A stream
 * that closes cleanly and a stream that throws are different code paths in `readImageBody`:
 * the first exits the read loop via `done`, the second via `catch`. The suite had fixtures for
 * "over the cap" and "not ok" and could show cancellation on both, but nothing that errored
 * mid-read — which is exactly the path that used to skip the release. `cancels` is the
 * evidence: an entry here means the body was released, not merely dropped.
 */
export function erroringStreamResponse(chunks, { status = 200, headers = {}, error = 'ECONNRESET' } = {}) {
  const cancels = [];
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.error(new Error(error));
    },
    cancel(reason) { cancels.push(reason); },
  });
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
}

/** A real Response-shaped object whose body is a real stream, so the cap is exercised. */
export function streamResponse(chunks, { status = 200, headers = {} } = {}) {
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    body,
  };
}

export const pngBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();

export const jpegBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .jpeg()
    .toBuffer();

/** A PNG that genuinely carries an alpha channel — `hasAlpha` is what selects the output codec. */
export const alphaPngBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } })
    .png()
    .toBuffer();

/**
 * A genuine 2-frame GIF89a. Each frame needs its Graphics Control Extension or libvips
 * rejects the frame data — the GCE is what makes this a valid animation rather than a
 * corrupt single-frame GIF.
 */
export function animatedGifBuffer() {
  const gce = Buffer.from([0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]);
  const frame = Buffer.from([
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80,
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x02, 0x02, 0x44, 0x01, 0x00,
  ]);
  return Buffer.concat([
    Buffer.from('GIF89a', 'latin1'),
    Buffer.from([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
    gce, frame, gce, frame,
    Buffer.from([0x3b]),
  ]);
}

/**
 * A response + fetch + dispatcher wired so every stage records into ONE timeline.
 *
 * WHY THIS LIVES HERE. The D1 defect (hostile review round 8) was an ORDERING bug — the pool was
 * asked to close before the body was settled — and an ordering bug can only be caught by a test
 * that observes the sequence. `cancellableStreamResponse` supplies the cancel hook; this supplies
 * the close hook and the drain marker, and keeps the test file inside the repo's line ceiling.
 *
 * Events recorded:
 *   'fetch-returned'    the fetch impl resolved (headers in hand, body maybe still streaming)
 *   'body-settled'      `body.cancel()` was called — the response was released
 *   'stream-drained'    the reader reached `done` — the body was fully consumed
 *   'dispatcher-closed' `dispatcher.close()` was called
 *
 * @param {(addrs: Array<{address: string, family: number}>) => object} makeDispatcher
 *        injected so this helper does not import the module under test
 * @returns {{ timeline: string[], build: (opts?: object) => object }}
 */
export function orderedLifecycleHarness(makeDispatcher) {
  const timeline = [];

  const trackedDispatcher = () => {
    const dispatcher = makeDispatcher([{ address: PUBLIC_IP[0].address, family: 4 }]);
    const originalClose = dispatcher.close.bind(dispatcher);
    dispatcher.close = async (...args) => {
      timeline.push('dispatcher-closed');
      return originalClose(...args);
    };
    return dispatcher;
  };

  // The tracked factory is what the module under test calls, so the returned object is the
  // one whose `close()` we record. `trackedDispatcher` is invoked per `build()` so each test
  // gets a fresh timeline entry rather than sharing one pool.
  const trackedFactory = () => trackedDispatcher();

  const build = (opts = {}) => {
    // `opts.errorAfter` selects the ERRORING stream instead of the clean one, so the
    // mid-read-failure path (round 9, finding 2) is observable in the same timeline as the
    // others. Without this the harness could only produce streams that close.
    const response = opts.errorAfter !== undefined
      ? erroringStreamResponse(opts.chunks || [Buffer.from('x')], {
        status: opts.status ?? 200,
        headers: opts.headers || {},
        error: opts.errorAfter,
      })
      : cancellableStreamResponse(opts.chunks || [Buffer.from('x')], {
        status: opts.status ?? 200,
        headers: opts.headers || {},
      });

    // Record the release — but only once it has actually SETTLED (round 9, finding 3).
    //
    // The previous version pushed the marker BEFORE awaiting the underlying cancel, so it
    // recorded the CALL, not the completion. A cancel that hung or resolved late would still
    // read as "body-settled" and `settleThenClose` would pass on an unsettled body — the exact
    // property the ordering assertion exists to check.
    //
    // WHY A REJECTION IS STILL "SETTLED". `reader.cancel()` on a stream that has ALREADY errored
    // rejects with that stream's own error rather than resolving — measured directly, and it is
    // the spec's behaviour, not a quirk of this fixture. So for the erroring path a rejecting
    // cancel IS the release having run to completion. The two cases are recorded as distinct
    // events so no test can confuse "cancelled successfully" with "cancel was refused":
    //
    //   body-settled             the cancel completed in the ordinary way
    //   body-settled-after-error the stream had already failed, and the cancel ran under that
    //   body-cancel-locked       the cancel was REFUSED (e.g. the body is locked) — a real leak
    //
    // 'body-cancel-locked' is the one that matters: it is what the first version of this fix
    // produced by calling `body.cancel()` on a locked stream, and it means NO release happened.
    const classifyCancelFailure = (err) => {
      const msg = String(err?.message || err);
      return /locked/i.test(msg) ? 'body-cancel-locked' : 'body-settled-after-error';
    };

    const originalCancel = response.body.cancel.bind(response.body);
    response.body.cancel = async (reason) => {
      try {
        const result = await originalCancel(reason);
        timeline.push('body-settled');
        return result;
      } catch (err) {
        timeline.push(classifyCancelFailure(err));
        throw err;
      }
    };

    // Record the drain, for the path that consumes rather than cancels — and the READER-level
    // cancel, which is a DIFFERENT call from `body.cancel()`. The streamed over-cap path cancels
    // through the reader it already holds, so hooking only `body.cancel` records nothing there.
    // (Learned the hard way: the first version of this harness missed that path.)
    const originalGetReader = response.body.getReader.bind(response.body);
    response.body.getReader = () => {
      const reader = originalGetReader();
      const originalRead = reader.read.bind(reader);
      reader.read = async () => {
        const step = await originalRead();
        if (step.done) timeline.push('stream-drained');
        return step;
      };
      // Same correction as `body.cancel` above: record AFTER the await, so the marker means
      // the reader-level cancel completed rather than merely started (round 9, finding 3).
      const originalReaderCancel = reader.cancel.bind(reader);
      reader.cancel = async (reason) => {
        try {
          const result = await originalReaderCancel(reason);
          timeline.push('body-settled');
          return result;
        } catch (err) {
          timeline.push(classifyCancelFailure(err));
          throw err;
        }
      };
      return reader;
    };

    return {
      timeline,
      fetchImpl: async () => { timeline.push('fetch-returned'); return response; },
      // `fetchSpotlightImage` builds its own dispatcher from the validated addresses, so the
      // observation point is the FACTORY, not a pre-built object. Injected via the module's
      // `dispatcherFactory` opt — the only way to hold the object whose lifetime is under test.
      dispatcherFactory: trackedFactory,
      maxBytes: opts.maxBytes ?? 1024,
    };
  };

  return { timeline, build };
}
