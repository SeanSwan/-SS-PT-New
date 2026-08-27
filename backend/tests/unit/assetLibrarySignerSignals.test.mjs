/**
 * Signer HEALTH signals — what the page is entitled to claim about why a picture is missing.
 *
 * Split from assetLibraryPreviews.test.mjs at the 300-line cap, on a real boundary:
 * that file tests whether a card gets a PICTURE, this one tests what the system is
 * allowed to SAY when it does not. The two failure modes are different — a missing
 * preview is a card problem, a claim about WHY it is missing is an assertion about
 * cause, and this subsystem has now twice shipped that assertion when it could not
 * know. One purged object and a broken signer are indistinguishable until there were
 * two chances to fail.
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

describe('a diagnosis needs more evidence than a flag does', () => {
  const model = (rows) => ({ findAll: async () => rows });
  const clip = (over = {}) => row({ kind: 'video', mime: 'video/mp4', r2Key: 'atelier/video/1/clip.mp4', ...over });

  it('does NOT claim a misconfigured signer when only one object was signable', async () => {
    // 23 posterless rows and one purged poster reaches failed === attempted just as easily
    // as a one-row page does. "The signer is likely misconfigured" is wrong there, and it
    // is the sentence this message exists to keep anyone from having to guess at.
    const errs = [];
    const spy = console.error; console.error = (m) => errs.push(String(m));
    try {
      const rows = [clip({ posterR2Key: 'atelier/video/1/gone.webp' })];
      for (let i = 0; i < 23; i += 1) rows.push(clip({ id: `n${i}`, posterR2Key: null }));
      const out = await listAssets({ userId: 1 }, {
        assetModel: model(rows), Op, readUrl: async () => { throw new Error('object gone'); },
      });
      // ROUND-3 REVERSAL. I first kept the flag true here and gated only the log, on the
      // reasoning that a quiet flag means silence about a broken signer. But the flag's
      // ONLY consumer is a page-wide banner reading "this is a preview-signing problem,
      // not a problem with your assets" — the same causal claim as the log line, in the
      // place a person reads it. Gating one and not the other put the wrong sentence
      // exactly where it does harm. Nothing goes silent: the warn below still fires.
      expect(out.previewsUnavailable).toBe(false);
      expect(errs.join(' ')).not.toMatch(/misconfigured/);
    } finally { console.error = spy; }
  });

  it('DOES claim it once two objects were signable and both failed', async () => {
    const errs = [];
    const spy = console.error; console.error = (m) => errs.push(String(m));
    try {
      await listAssets({ userId: 1 }, {
        assetModel: model([
          clip({ posterR2Key: 'a.webp' }), clip({ id: 'b', posterR2Key: 'b.webp' }),
        ]), Op, readUrl: async () => { throw new Error('signature key missing'); },
      });
      expect(errs.join(' ')).toMatch(/misconfigured/);
    } finally { console.error = spy; }
  });
});

describe('an absent signer is legitimate, but never silent', () => {
  const model = (rows) => ({ findAll: async () => rows });

  it('warns when rows were signable and no signer was injected', async () => {
    // If the route's injection regresses, this branch returns a full page of nulls with a
    // 200 and no telemetry — the same silence the per-row catch refuses. The rule has to
    // hold on the not-attempted branch too, or it is guarding one half of a pair.
    const warns = [];
    const spy = console.warn; console.warn = (m) => warns.push(String(m));
    try {
      const out = await listAssets({ userId: 1 }, { assetModel: model([row()]), Op });
      expect(out.previewsUnavailable).toBe(false);   // not a BROKEN signer — an absent one
      expect(warns.join(' ')).toMatch(/no signer was injected/);
    } finally { console.warn = spy; }
  });

  it('says nothing when there was nothing to sign anyway', async () => {
    // An empty page, or one of posterless clips, is no evidence about wiring.
    const warns = [];
    const spy = console.warn; console.warn = (m) => warns.push(String(m));
    try {
      await listAssets({ userId: 1 }, {
        assetModel: model([row({ kind: 'video', posterR2Key: null })]), Op,
      });
      expect(warns.join(' ')).not.toMatch(/no signer was injected/);
    } finally { console.warn = spy; }
  });
});
