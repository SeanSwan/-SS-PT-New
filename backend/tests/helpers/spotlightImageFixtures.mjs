/**
 * spotlightImageFixtures — shared fixtures for the Spotlight image-fetch suites
 * ============================================================================
 * Extracted so the two suites that use them stay inside the repo's 299-line limit.
 * Nothing here is a test, and this directory sits outside the test-file glob.
 *
 * These are deliberately REAL artefacts, not stubs. A mocked `fetch` returning a plain
 * object would not exercise the streamed byte cap, and a fake image buffer would not
 * exercise the decoder. The DNS mock is the only stub, because resolving a name to
 * 127.0.0.1 is precisely the behaviour under test.
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
