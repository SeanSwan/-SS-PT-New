/**
 * Derivative thumbnails — the library stops signing multi-megabyte originals.
 *
 * WHAT THESE PREVENT
 *   1. A two-dozen-card page costing tens of megabytes because every card fetched a
 *      1920x1080 PNG to draw something a few hundred pixels wide.
 *   2. A failed thumbnail costing the ASSET. The bytes are already in storage and the row
 *      already exists; shrinking is an optimisation and must never become a way to lose
 *      work.
 *   3. Rows written before this slice never acquiring a thumbnail — the "new ones are
 *      light, every earlier one is heavy forever" trap, which is the same one-half-of-a-pair
 *      shape that accounted for sixteen defects in the review loop.
 *   4. Every older asset turning into a grey box because the library signed a derived key
 *      for an object that was never written.
 */

import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { makeThumbnail, thumbObjectKey } from '../../services/atelier/stillThumbnail.mjs';
import { persistStill } from '../../services/atelier/persistStills.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

/** A real, decodable PNG big enough that a 512px WebP is genuinely smaller. */
async function bigPng() {
  const { default: sharp } = await import('sharp');
  return sharp({ create: { width: 1920, height: 1080, channels: 3, background: { r: 12, g: 32, b: 96 } } })
    .png().toBuffer();
}

function fakeModel(seed = null) {
  const rows = new Map();
  if (seed) rows.set(seed.r2Key, seed);
  return {
    rows,
    findOrCreate: async ({ where, defaults }) => {
      if (rows.has(where.r2Key)) return [rows.get(where.r2Key), false];
      const row = {
        id: `asset-${rows.size + 1}`, ...defaults,
        update: async function update(patch) { Object.assign(this, patch); return this; },
      };
      rows.set(where.r2Key, row);
      return [row, true];
    },
  };
}

function deps(over = {}) {
  const puts = [];
  return {
    puts,
    storageReady: true,
    putObject: async (args) => { puts.push(args); },
    assetModel: fakeModel(),
    readFile: async () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
    fetchImpl: async () => { throw new Error('no network in tests'); },
    now: new Date('2026-08-26T00:00:00Z'),
    ...over,
  };
}

const stillFrom = (bytes) => ({
  image: { data: bytes.toString('base64'), mime: 'image/png' },
  sha256: sha(bytes), lane: 'local', seed: 7, promptText: 'a glacier calving into black water',
});

describe('a thumbnail is smaller, or it is not a thumbnail', () => {
  it('turns a full-size PNG into a much smaller WebP', async () => {
    const src = await bigPng();
    const out = await makeThumbnail(src);
    expect(out).toBeTruthy();
    expect(out.mime).toBe('image/webp');
    expect(Math.max(out.width, out.height)).toBe(512);   // long edge bounded
    expect(out.bytes.length).toBeLessThan(src.length);
  });

  it('refuses to produce a "thumbnail" larger than its source', async () => {
    // Small and already-tiny sources can encode BIGGER as WebP. Shipping that would make
    // the page heavier while reporting a saving.
    const tiny = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    expect(await makeThumbnail(tiny)).toBeNull();
  });

  it('returns null rather than throwing on bytes it cannot decode', async () => {
    expect(await makeThumbnail(Buffer.from('this is not an image'))).toBeNull();
    expect(await makeThumbnail(Buffer.alloc(0))).toBeNull();
    expect(await makeThumbnail(null)).toBeNull();
  });

  it('degrades to no-thumbnails when the encoder is unavailable, and does not throw', async () => {
    // sharp carries native binaries. A platform where they did not install must lose
    // thumbnails, not every render's persist step.
    const exploding = () => { throw new Error('native binding missing'); };
    expect(await makeThumbnail(Buffer.from('xx'), { sharpImpl: exploding })).toBeNull();
  });

  it('addresses the derivative by the SAME hash, so re-persisting cannot mint a second', () => {
    const k1 = thumbObjectKey({ userId: 1, sha256: 'abc123' });
    const k2 = thumbObjectKey({ userId: 1, sha256: 'abc123' });
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^atelier\/stills\/1\/thumbs\/abc123\.webp$/);
  });
});

describe('persisting a still also persists its derivative', () => {
  it('writes a second object and records it on the row', async () => {
    const src = await bigPng();
    const d = deps();
    const out = await persistStill({ still: stillFrom(src), userId: 1, model: 'comfyui/wan-2.2' }, d);

    expect(out.posterR2Key).toMatch(/\/thumbs\/.+\.webp$/);
    expect(d.puts.length).toBe(2);                         // original, then derivative
    const thumbPut = d.puts.find((p) => p.Key.includes('/thumbs/'));
    expect(thumbPut.ContentType).toBe('image/webp');
    expect(thumbPut.Body.length).toBeLessThan(src.length);
    expect(thumbPut.Metadata.derivedFrom).toBe(out.r2Key); // traceable back to its source
    expect(d.assetModel.rows.get(out.r2Key).posterR2Key).toBe(out.posterR2Key);
  });

  it('a failed thumbnail costs the PREVIEW, never the asset', async () => {
    // The bytes are already in storage and the row already exists. A still that could not
    // be shrunk is a saved still with a heavier preview, not a lost one.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const src = await bigPng();
    const d = deps({ putObject: async (args) => { if (args.Key.includes('/thumbs/')) throw new Error('R2 refused the derivative'); } });
    const out = await persistStill({ still: stillFrom(src), userId: 1, model: 'comfyui/wan-2.2' }, d);

    expect(out.assetId).toBeTruthy();        // the asset survived
    expect(out.r2Key).toBeTruthy();
    expect(out.posterR2Key).toBeNull();      // and honestly reports it has no derivative
    expect(warn).toHaveBeenCalled();         // and it is not silent about why
    warn.mockRestore();
  });

  it('backfills a row that predates thumbnails instead of leaving it heavy forever', async () => {
    // The trap this exists to close: gate the derivative on `created` and new stills are
    // light while every earlier one stays heavy permanently, with nothing to say why. The
    // condition is "this row has no thumbnail yet", not "this row is new".
    const src = await bigPng();
    const hash = sha(src);
    const r2Key = `atelier/stills/1/${hash}.png`;
    const old = {
      id: 'asset-old', r2Key, posterR2Key: null,
      update: async function update(patch) { Object.assign(this, patch); return this; },
    };
    const d = deps({ assetModel: fakeModel(old) });

    const out = await persistStill({ still: stillFrom(src), userId: 1, model: 'comfyui/wan-2.2' }, d);
    expect(out.created).toBe(false);                        // the row already existed
    expect(d.puts.length).toBe(1);                          // original NOT re-uploaded
    expect(d.puts[0].Key).toContain('/thumbs/');            // only the derivative was written
    expect(old.posterR2Key).toMatch(/\/thumbs\/.+\.webp$/); // and the old row now carries it
  });

  it('does not redo the work when a thumbnail is already recorded', async () => {
    const src = await bigPng();
    const hash = sha(src);
    const done = {
      id: 'asset-done', r2Key: `atelier/stills/1/${hash}.png`,
      posterR2Key: `atelier/stills/1/thumbs/${hash}.webp`,
      update: async function update(patch) { Object.assign(this, patch); return this; },
    };
    const d = deps({ assetModel: fakeModel(done) });
    const out = await persistStill({ still: stillFrom(src), userId: 1, model: 'comfyui/wan-2.2' }, d);
    expect(out.posterR2Key).toBe(done.posterR2Key);
    expect(d.puts.length).toBe(0);                          // nothing re-uploaded at all
  });
});
