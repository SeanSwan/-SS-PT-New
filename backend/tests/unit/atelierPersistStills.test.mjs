/**
 * Atelier — persisting a still as a MediaAsset.
 * ============================================================================
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *
 * 1. A ROW THAT POINTS AT NOTHING. Storage unconfigured must REFUSE, never mint
 *    a `local://` placeholder row: an asset with provenance whose bytes do not
 *    exist in R2 is a licence record about a file nobody can produce.
 *
 * 2. TWO ROWS FOR ONE IMAGE. The key is derived from the artifact's sha256, so a
 *    replayed batch, a double-click, or an at-least-once retry lands on
 *    `findOrCreate` with the same key. MediaAsset's own docblock: the unique key
 *    is what makes at-least-once harmless.
 *
 * 3. PROVENANCE THAT CANNOT IDENTIFY ITS FILE. `artifact.sha256` must be the hash
 *    of the bytes actually uploaded, and `auditProvenance` must pass for a local
 *    (licensed) provider.
 *
 * 4. A LOCAL FILE THE BACKEND CANNOT READ silently becoming an asset. It becomes
 *    a per-still persistence failure with a code, and the still is still
 *    returned — bytes exist, the row does not, and the caller is told which.
 *
 * Everything is injected (uploader, model, reader, fetch, clock): no R2, no DB.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { persistStill, stillObjectKey, PersistError } from '../../services/atelier/persistStills.mjs';
import { auditProvenance } from '../../../shared/providers/video/provenance.mjs';

// A 1x1 PNG (67 bytes) so dimension parsing has real bytes to read.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const sha = (b) => createHash('sha256').update(b).digest('hex');

function fakeModel() {
  const rows = new Map();
  return {
    rows,
    findOrCreate: async ({ where, defaults }) => {
      if (rows.has(where.r2Key)) return [rows.get(where.r2Key), false];
      const row = { id: `asset-${rows.size + 1}`, ...defaults };
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
    now: new Date('2026-08-25T00:00:00Z'),
    ...over,
  };
}

const LOCAL_CAPS = {
  provider: 'comfyui/wan-2.2', label: 'Wan 2.2', attribution: 'Video generated with Wan 2.2',
  licence: { name: 'Apache License 2.0', restricts: 'none', commercialUse: 'permitted', excludedTerritories: [], requiresAttribution: false },
};
const HOSTED_CAPS = { provider: 'openai/gpt-5.4-image-2', label: 'GPT-5.4 Image 2', attribution: null };

const hostedStill = () => ({
  index: 0, lane: 'hosted', seed: 4471, promptText: 'glacier wall at dawn', promptHash: 'abc',
  provider: 'openai/gpt-5.4-image-2', image: { kind: 'b64', data: PNG_1x1.toString('base64') },
});
const localStill = (path = '/renders/still-1.png') => ({
  index: 0, lane: 'local', seed: 9120, promptText: 'ridge line in fog', promptHash: 'def',
  provider: 'comfyui/wan-2.2', image: { kind: 'path', path, mime: 'image/png' }, sha256: sha(PNG_1x1), bytes: PNG_1x1.length,
});

describe('storage must exist before a row does', () => {
  it('refuses when R2 is unconfigured — no row, no placeholder, no upload', async () => {
    const d = deps({ storageReady: false });
    await expect(persistStill({ still: hostedStill(), userId: 1, caps: HOSTED_CAPS }, d))
      .rejects.toMatchObject({ code: 'E_STORAGE_UNCONFIGURED' });
    expect(d.puts).toHaveLength(0);
    expect(d.assetModel.rows.size).toBe(0);
  });
});

describe('the key is the hash, so persistence is idempotent', () => {
  it('derives the object key from the artifact sha256 and the owner — and NOTHING that changes with time', () => {
    const k = stillObjectKey({ userId: 7, sha256: 'ab'.repeat(32), ext: 'png' });
    expect(k).toBe(`atelier/stills/7/${'ab'.repeat(32)}.png`);
    // The same bytes next month are the same object. (A month segment once broke this.)
    expect(k).not.toMatch(/\d{4}-\d{2}/);
  });

  it('uploads once and creates one row for a hosted base64 still', async () => {
    const d = deps();
    const out = await persistStill({ still: hostedStill(), userId: 1, caps: HOSTED_CAPS }, d);
    expect(out.created).toBe(true);
    expect(out.sha256).toBe(sha(PNG_1x1));
    expect(out.r2Key).toContain(sha(PNG_1x1));
    expect(d.puts).toHaveLength(1);
    expect(d.puts[0].ContentType).toBe('image/png');
    expect(d.puts[0].Body.equals(PNG_1x1)).toBe(true);
    const row = d.assetModel.rows.get(out.r2Key);
    expect(row).toMatchObject({ ownerUserId: 1, kind: 'image', source: 'generated', mime: 'image/png', width: 1, height: 1, sizeBytes: PNG_1x1.length, approvalStatus: 'draft' });
  });

  it('a second persist of the same bytes returns the existing row and uploads nothing new', async () => {
    const d = deps();
    const a = await persistStill({ still: hostedStill(), userId: 1, caps: HOSTED_CAPS }, d);
    const b = await persistStill({ still: hostedStill(), userId: 1, caps: HOSTED_CAPS }, d);
    expect(b.created).toBe(false);
    expect(b.assetId).toBe(a.assetId);
    expect(d.assetModel.rows.size).toBe(1);
    // The upload itself is idempotent by key; a repeat PUT of identical bytes is harmless
    // but we still do not do it when the row already exists.
    expect(d.puts).toHaveLength(1);
  });
});

describe('provenance identifies its file', () => {
  it('a local still carries a licence snapshot and an artifact sha256 that audits clean', async () => {
    const d = deps({ readFile: async () => PNG_1x1 });
    const out = await persistStill({ still: localStill(), userId: 2, caps: LOCAL_CAPS, commercial: true, territory: 'US', grantRecorded: false }, d);
    const row = d.assetModel.rows.get(out.r2Key);
    expect(row.provenance.provider).toBe('comfyui/wan-2.2');
    expect(row.provenance.artifact.sha256).toBe(sha(PNG_1x1));
    expect(row.provenance.licence.name).toBe('Apache License 2.0');
    expect(row.provenance.request.promptSha256).toBeTruthy();
    expect(auditProvenance(row.provenance).ok).toBe(true);
    expect(row.tags).toEqual(expect.arrayContaining(['atelier', 'still', 'lane:local', 'seed:9120']));
  });

  it('a hosted still still records the provider and prompt hash even without a licence entry', async () => {
    const d = deps();
    const out = await persistStill({ still: hostedStill(), userId: 1, caps: HOSTED_CAPS }, d);
    const p = d.assetModel.rows.get(out.r2Key).provenance;
    expect(p.provider).toBe('openai/gpt-5.4-image-2');
    expect(p.licence.name).toBeNull();
    expect(p.artifact.sha256).toBe(sha(PNG_1x1));
  });

  it('refuses a local still whose declared sha256 does not match the bytes read', async () => {
    const d = deps({ readFile: async () => Buffer.from('not the same bytes') });
    await expect(persistStill({ still: localStill(), userId: 2, caps: LOCAL_CAPS }, d))
      .rejects.toMatchObject({ code: 'E_ARTIFACT_HASH_MISMATCH' });
    expect(d.puts).toHaveLength(0);
  });
});

describe('a still the backend cannot reach is a persistence failure, not a silent skip', () => {
  it('names the unreadable local path', async () => {
    const d = deps();
    const err = await persistStill({ still: localStill('/renders/gone.png'), userId: 2, caps: LOCAL_CAPS }, d).catch((e) => e);
    expect(err).toBeInstanceOf(PersistError);
    expect(err.code).toBe('E_STILL_UNREADABLE');
    expect(err.message).toContain('/renders/gone.png');
  });

  it('fetches a URL-delivered hosted image rather than guessing its bytes', async () => {
    const d = deps({ fetchImpl: async () => ({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => PNG_1x1 }) });
    const s = { ...hostedStill(), image: { kind: 'b64', data: 'https://cdn.example/x.png' } };
    const out = await persistStill({ still: s, userId: 1, caps: HOSTED_CAPS }, d);
    expect(out.sha256).toBe(sha(PNG_1x1));
  });
});
