/**
 * Motion bind — server half. Approval binds BYTES, not words.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. A prompt accepted in place of an asset (the broken promise the blueprint names).
 *   2. A job queued for an asset whose recorded hash is not the approved hash.
 *   3. Someone else's asset animated by guessing an id.
 *   4. A queued job that does not carry the bound reference the agent needs.
 *   5. The agent read ticket handed to a caller that does not hold the lease.
 */

import { describe, it, expect } from 'vitest';
import { bindMotion, initImageReadTicket, MotionError } from '../../services/atelier/motionBind.mjs';

const H = 'ab'.repeat(32);
const asset = (over = {}) => ({
  id: 'asset-1', ownerUserId: 1, kind: 'image', r2Key: 'atelier/stills/1/2026-08/x.png', mime: 'image/png', projectId: null,
  provenance: { artifact: { sha256: H }, request: { prompt: 'glacier wall at dawn' } }, ...over,
});
function deps(over = {}) {
  const created = [];
  return {
    created,
    assetModel: { findOne: async ({ where }) => (where.id === 'asset-1' && where.ownerUserId === 1 ? asset() : null) },
    createJob: async (input) => { created.push(input); return { job: { id: 'job-9', status: 'queued' }, replayed: false }; },
    getJob: async () => null,
    workerPresence: async () => ({ code: 'WORKER_ONLINE', startable: true }),
    describePresence: (p) => ({ ...p, message: 'ok' }),
    readUrl: async (key) => `https://r2.example/${key}?sig`,
    env: { SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/wan-2.2' },
    now: 1_700_000_000_000,
    ...over,
  };
}

describe('approval binds bytes, not words', () => {
  it('refuses a prompt with no asset', async () => {
    await expect(bindMotion({ userId: 1, prompt: 'a swan taking off' }, deps())).rejects.toMatchObject({ code: 'E_BIND_NO_ASSET' });
  });
  it('refuses an asset with no hash', async () => {
    await expect(bindMotion({ userId: 1, assetId: 'asset-1' }, deps())).rejects.toMatchObject({ code: 'E_BIND_NO_HASH' });
  });
  it('refuses when the approved hash is not the recorded hash — and queues nothing', async () => {
    const d = deps();
    await expect(bindMotion({ userId: 1, assetId: 'asset-1', sha256: 'cd'.repeat(32) }, d)).rejects.toMatchObject({ code: 'E_BIND_HASH_MISMATCH' });
    expect(d.created).toHaveLength(0);
  });
  it('refuses an asset that is not the caller\'s', async () => {
    await expect(bindMotion({ userId: 2, assetId: 'asset-1', sha256: H }, deps())).rejects.toMatchObject({ code: 'E_BIND_ASSET_NOT_FOUND' });
  });
  it('refuses a non-image asset', async () => {
    const d = deps({ assetModel: { findOne: async () => asset({ kind: 'video' }) } });
    await expect(bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d)).rejects.toMatchObject({ code: 'E_ASSET_NOT_IMAGE' });
  });
});

describe('the queued job carries the bound reference', () => {
  it('queues on the video queue with initImage = {assetId, r2Key, sha256, mime}', async () => {
    const d = deps();
    const out = await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H, duration: 5 }, d);
    expect(out.jobId).toBe('job-9');
    expect(out.bound).toEqual({ assetId: 'asset-1', sha256: H });
    expect(out.statusUrl).toBe('/api/content-studio/render-job/job-9');
    const input = d.created[0];
    expect(input.workflowId).toBe('generate:comfyui/wan-2.2');
    expect(input.params.initImage).toEqual({ assetId: 'asset-1', r2Key: 'atelier/stills/1/2026-08/x.png', sha256: H, mime: 'image/png' });
    expect(input.params.commercial).toBe(true);
    expect(typeof input.params.initImage).toBe('object'); // never flattened to a filename here
  });

  it('defaults the motion prompt to the still\'s own prompt and validates against the provider', async () => {
    const d = deps();
    await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d);
    expect(d.created[0].prompt).toBe('glacier wall at dawn');
    expect(d.created[0].params.category).toBe('marketing');
  });

  it('refuses a duration above the provider ceiling before queueing', async () => {
    const d = deps();
    await expect(bindMotion({ userId: 1, assetId: 'asset-1', sha256: H, duration: 60 }, d)).rejects.toMatchObject({ code: 'E_BAD_INPUT' });
    expect(d.created).toHaveLength(0);
  });

  it('derives a stable idempotency key so a double-click replays', async () => {
    const d = deps();
    await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d);
    await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d);
    expect(d.created[0].idempotencyKey).toBe(d.created[1].idempotencyKey);
  });

  it('surfaces worker presence honestly — startable:false when nothing can render', async () => {
    const d = deps({ workerPresence: async () => ({ code: 'NO_WORKER_ONLINE', startable: false }) });
    const out = await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d);
    expect(out.startable).toBe(false);
    expect(out.workerState).toBe('NO_WORKER_ONLINE');
  });

  it('refuses a disabled provider with the registry\'s own message', async () => {
    const d = deps({ env: {} });
    const err = await bindMotion({ userId: 1, assetId: 'asset-1', sha256: H }, d).catch((e) => e);
    expect(err).toBeInstanceOf(MotionError);
    expect(err.code).toBe('E_PROVIDER_DISABLED');
    expect(err.message).toContain('SWAN_VIDEO_PROVIDERS_ENABLED');
  });
});

describe('the agent read ticket', () => {
  const job = { id: 'job-9', leasedBy: 'agent-A', params: { initImage: { assetId: 'asset-1', r2Key: 'atelier/stills/1/x.png', sha256: H, mime: 'image/png' } } };
  it('is issued only to the lease holder, from the job\'s own params', async () => {
    const d = deps({ getJob: async () => job });
    const t = await initImageReadTicket({ jobId: 'job-9', agentId: 'agent-A' }, d);
    expect(t.url).toContain('atelier/stills/1/x.png');
    expect(t.sha256).toBe(H);
    await expect(initImageReadTicket({ jobId: 'job-9', agentId: 'agent-B' }, d)).rejects.toMatchObject({ code: 'E_LEASE_CONFLICT' });
  });
  it('refuses a job with no bound frame', async () => {
    const d = deps({ getJob: async () => ({ ...job, params: { initImage: 'plain.png' } }) });
    await expect(initImageReadTicket({ jobId: 'job-9', agentId: 'agent-A' }, d)).rejects.toMatchObject({ code: 'E_BIND_NO_INIT_IMAGE' });
  });
});
