/**
 * Library previews — the difference between an index and a library.
 *
 * Split from assetLibrary.test.mjs at the 300-line cap. That file tests FINDING an
 * asset; this one tests SEEING it, which is a different job with different failure
 * modes — chiefly that one object which will not sign must cost its own card and
 * never the page, while EVERY object failing is a broken signer and must say so.
 */

import { describe, it, expect } from 'vitest';
import { listAssets } from '../../services/atelier/assetLibrary.mjs';

const Op = { contains: Symbol('contains'), or: Symbol('or'), lt: Symbol('lt') };

const row = (over = {}) => ({
  id: over.id || '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  kind: 'image', mime: 'image/png', width: 1920, height: 1080, sizeBytes: '2048',
  approvalStatus: 'draft', createdAt: new Date('2026-08-26T10:00:00.000Z'),
  r2Key: 'atelier/stills/1/abc.png',
  tags: ['atelier', 'still', 'lane:local'],
  provenance: { request: { prompt: 'a lone red fox', promptTruncated: false } },
  ...over,
});

describe('previews turn an index into a library', () => {
  const model = (rows) => ({ findAll: async () => rows });

  it('signs one URL per image row', async () => {
    const signed = [];
    const readUrl = async (key, mime) => { signed.push([key, mime]); return `https://cdn.example/${key}?sig=abc`; };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row(), row({ id: 'b' })]), Op, readUrl });
    expect(out.assets[0].previewUrl).toMatch(/^https:\/\/cdn\.example\//);
    expect(signed).toHaveLength(2);
    expect(signed[0][0]).toBe('atelier/stills/1/abc.png');
  });

  it('ONE unsignable object costs its own card, not the page', async () => {
    // A page that 500s because of a thumbnail is a worse library than one with a missing
    // thumbnail. The bad row degrades to its dimensions; every other row is unaffected.
    let n = 0;
    const readUrl = async () => { n += 1; if (n === 1) throw new Error('object gone'); return 'https://cdn.example/ok'; };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row(), row({ id: 'b' })]), Op, readUrl });
    expect(out.assets).toHaveLength(2);
    expect(out.assets[0].previewUrl).toBeNull();
    expect(out.assets[1].previewUrl).toBe('https://cdn.example/ok');
  });

  it('a synchronously-throwing signer is caught too', async () => {
    // `.catch()` alone would not save this — the throw happens before a promise exists.
    const readUrl = () => { throw new Error('boom'); };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row()]), Op, readUrl });
    expect(out.assets[0].previewUrl).toBeNull();
  });

  it('signs nothing for a row with no poster and no viewable original', async () => {
    // The reason is the POSTER'S ABSENCE, not the kind. These rows carry none, so there is
    // nothing to show; a video that HAS one is signed, and is covered below. The original
    // name of this test said "non-image rows have no still to preview", which stopped being
    // true the moment posters were signed — a test name is a claim like any other.
    const signed = [];
    const readUrl = async (k) => { signed.push(k); return 'x'; };
    await listAssets({ userId: 1 }, { assetModel: model([row({ kind: 'video' }), row({ kind: 'audio' })]), Op, readUrl });
    expect(signed).toHaveLength(0);
  });

  it('with no signer injected every preview is null and nothing throws', async () => {
    const out = await listAssets({ userId: 1 }, { assetModel: model([row()]), Op });
    expect(out.assets[0].previewUrl).toBeNull();
  });
});

describe('one bad object and a broken signer are different facts', () => {
  const model = (rows) => ({ findAll: async () => rows });

  it('ONE failure is isolation working — previewsUnavailable stays false', async () => {
    let n = 0;
    const readUrl = async () => { n += 1; if (n === 1) throw new Error('object gone'); return 'https://cdn/ok'; };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row(), row({ id: 'b' })]), Op, readUrl });
    expect(out.previewsUnavailable).toBe(false);
  });

  it('EVERY failure is a broken signer, and the page says so', async () => {
    // Silent isolation turns a rotated secret into a page of grey boxes with a 200 and no
    // telemetry — the operator concludes their renders are broken and nothing corrects them.
    const readUrl = async () => { throw new Error('signature key missing'); };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row(), row({ id: 'b' })]), Op, readUrl });
    expect(out.previewsUnavailable).toBe(true);
    expect(out.assets.every((a) => a.previewUrl === null)).toBe(true);
  });

  it('a page where nothing was signable is not a signer failure', async () => {
    // Nothing ATTEMPTED is not everything FAILED. This row is a video with no poster, so
    // the signer is never called and there is no evidence either way about its health.
    const readUrl = async () => { throw new Error('never called'); };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row({ kind: 'video' })]), Op, readUrl });
    expect(out.previewsUnavailable).toBe(false);
  });

  it('no signer injected is not a signer failure either', async () => {
    const out = await listAssets({ userId: 1 }, { assetModel: model([row()]), Op });
    expect(out.previewsUnavailable).toBe(false);
  });
});

describe('the library signs the DERIVATIVE, and falls back rather than losing a picture', () => {
  const model = (rows) => ({ findAll: async () => rows });
  it('signs the thumbnail when the asset has one', async () => {
    // The whole point of the slice: a ~30 KB WebP instead of a ~2 MB PNG, two dozen times
    // per page. Signing the original made a library page cost tens of megabytes.
    const signed = [];
    const readUrl = async (key, mime) => { signed.push([key, mime]); return `https://cdn.example/${key}?sig=abc`; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([row({ posterR2Key: 'atelier/stills/1/thumbs/deadbeef.webp' })]), Op, readUrl,
    });
    expect(signed[0][0]).toBe('atelier/stills/1/thumbs/deadbeef.webp');
    expect(signed[0][1]).toBeUndefined();   // one argument, because the real signer takes one
    expect(out.assets[0].previewUrl).toContain('/thumbs/');
  });

  it('falls back to the ORIGINAL for assets made before thumbnails existed', async () => {
    // Signing a derived key unconditionally would hand every older asset a URL for an
    // object that was never written: the browser 404s, the card's error handler falls back
    // to dimensions, and every picture made before this slice quietly becomes a grey box.
    // Heavy and visible beats light and absent.
    const signed = [];
    const readUrl = async (key, mime) => { signed.push([key, mime]); return `https://cdn.example/${key}?sig=abc`; };
    const out = await listAssets({ userId: 1 }, { assetModel: model([row({ posterR2Key: null })]), Op, readUrl });
    expect(signed[0][0]).not.toContain('/thumbs/');
    expect(out.assets[0].previewUrl).toBeTruthy();      // the card still shows a picture
  });
});

describe('a clip has a poster, and it was never signed', () => {
  const model = (rows) => ({ findAll: async () => rows });
  const clip = (over = {}) => row({
    kind: 'video', mime: 'video/mp4', r2Key: 'atelier/video/1/clip.mp4', ...over,
  });

  it('signs the POSTER of a video, so a clip stops being a grey box', async () => {
    // videoRenderJobService writes `posterR2Key` onto the MediaAsset row it creates. The
    // library never signed it, so every clip in the library rendered as its dimensions
    // while the poster sat in storage, already made and already paid for.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return `https://cdn.example/${key}?sig=abc`; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([clip({ posterR2Key: 'atelier/video/1/poster.webp' })]), Op, readUrl,
    });
    expect(signed).toEqual(['atelier/video/1/poster.webp']);
    expect(out.assets[0].previewUrl).toContain('poster.webp');
  });

  it('the view CARRIES the kind, which is the seam the frontend marker depends on', async () => {
    // The frontend test for the "· video" marker injects `kind` at its fake API, so it
    // proves the card renders what it is given and NOTHING about whether the server sends
    // it. A field the view quietly dropped would leave that test green and the marker dead
    // — a poster rendered as though it were a photograph, which is the exact honesty
    // problem the marker exists to prevent. Asserted here through the real `assetView`.
    const readUrl = async (key) => `https://cdn.example/${key}`;
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([clip({ posterR2Key: 'atelier/video/1/poster.webp' })]), Op, readUrl,
    });
    expect(out.assets[0].kind).toBe('video');
  });

  it('NEVER falls back to the video file itself when there is no poster', async () => {
    // THE WHOLE REASON `previewKeyFor` IS ONE FUNCTION. The image path falls back to
    // `r2Key` because an image's original IS a picture. Copying that fallback to video
    // would sign an MP4 into an <img>: the browser cannot decode it, the card's onError
    // fires, and the operator sees the same grey box as before \u2014 now with a wasted
    // signature and a request for several megabytes of video behind it.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return 'https://cdn/x'; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([clip({ posterR2Key: null })]), Op, readUrl,
    });
    expect(signed).toEqual([]);
    expect(out.assets[0].previewUrl).toBeNull();
  });

  it('audio follows the same one rule: poster if there is one, never the original', async () => {
    // Not a special case \u2014 a consequence. The rule is stated once, so a kind nobody
    // thought about behaves correctly without anybody deciding it should.
    const signed = [];
    const readUrl = async (key) => { signed.push(key); return 'https://cdn/x'; };
    await listAssets({ userId: 1 }, {
      assetModel: model([
        row({ kind: 'audio', r2Key: 'atelier/audio/1/take.mp3', posterR2Key: 'atelier/audio/1/cover.webp' }),
        row({ id: 'b', kind: 'audio', r2Key: 'atelier/audio/1/other.mp3', posterR2Key: null }),
      ]), Op, readUrl,
    });
    expect(signed).toEqual(['atelier/audio/1/cover.webp']);
  });

  it('a page of clips whose posters all fail IS a broken signer', async () => {
    // Video rows now count toward `attempted`, so the all-failed signal covers them. Before
    // this they were skipped, and a page of clips could never report a misconfigured signer.
    const readUrl = async () => { throw new Error('signature key missing'); };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([
        clip({ posterR2Key: 'atelier/video/1/a.webp' }),
        clip({ id: 'b', posterR2Key: 'atelier/video/1/b.webp' }),
      ]), Op, readUrl,
    });
    expect(out.previewsUnavailable).toBe(true);
  });

  it('a poster that will not sign costs its own card, not the clip beside it', async () => {
    let n = 0;
    const readUrl = async () => { n += 1; if (n === 1) throw new Error('object gone'); return 'https://cdn/ok'; };
    const out = await listAssets({ userId: 1 }, {
      assetModel: model([
        clip({ posterR2Key: 'atelier/video/1/a.webp' }),
        clip({ id: 'b', posterR2Key: 'atelier/video/1/b.webp' }),
      ]), Op, readUrl,
    });
    expect(out.assets[0].previewUrl).toBeNull();
    expect(out.assets[1].previewUrl).toBe('https://cdn/ok');
    expect(out.previewsUnavailable).toBe(false);
  });
});
