/**
 * Compose honesty rules, as executable assertions.
 *
 * The backend refuses to advertise a lane it cannot run. These pin the client to the
 * same standard:
 *   1. A `claimed` local lane is "unproven" with the exact switch — never "ready",
 *      never "broken".
 *   2. A lane the server will refuse is not offerable; `auto` needs at least one.
 *   3. A local still is never given a fake <img> src — it lives on the render box.
 *   4. A refusal keeps its code and the numbers the server attached.
 */

import { describe, it, expect } from 'vitest';
import {
  describeLocalLane, describeHostedLane, laneOfferable, formatCost, stillSrc, readRefusal, describePersist, motionBindable, describeMotionJob,
  type LimitsView, type LocalLaneView, type HostedLaneView, type StillView,
} from './AtelierCompose.api';

const local = (o: Partial<LocalLaneView>): LocalLaneView => ({
  provider: 'comfyui/wan-2.2', status: 'claimed', ready: false, advertisable: false,
  problems: ['still lane is CLAIMED, not probed — run the probe, then set SWAN_ATELIER_LOCAL_STILLS=probed'],
  probeEnvKey: 'SWAN_ATELIER_LOCAL_STILLS', unitUsd: 0, ...o,
});
const hosted = (o: Partial<HostedLaneView>): HostedLaneView => ({
  enabled: false, spendEnvKey: 'SWAN_ATELIER_MAX_SPEND_USD_DAILY', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0 }, ...o,
});
const limits = (l: Partial<LocalLaneView>, h: Partial<HostedLaneView>): LimitsView => ({
  maxStills: 4, lanes: { local: local(l), hosted: hosted(h) }, usage: { runs: 0, spendUsd: 0 },
  ledger: 'absent-this-slice', enabled: false, note: '',
});

describe('the local lane is unproven, not broken, until probed', () => {
  it('labels claimed as unproven in gold with the exact switch', () => {
    const d = describeLocalLane(local({}));
    expect(d.tone).toBe('unproven');
    expect(d.text.toLowerCase()).toContain('unproven');
    expect(d.text.toLowerCase()).not.toMatch(/ready|broken|error/);
    expect(d.fix).toContain('SWAN_ATELIER_LOCAL_STILLS=probed');
  });

  it('labels a probed-but-unconfigured lane with the first real problem, not "unproven"', () => {
    const d = describeLocalLane(local({ status: 'probed', problems: ['SWAN_ATELIER_STILL_WORKFLOW is unset'] }));
    expect(d.tone).toBe('off');
    expect(d.fix).toContain('SWAN_ATELIER_STILL_WORKFLOW');
  });

  it('labels ready as ready at $0', () => {
    const d = describeLocalLane(local({ status: 'probed', ready: true, advertisable: true, problems: [] }));
    expect(d.tone).toBe('ready');
    expect(d.text).toContain('$0');
  });

  it('never invents "both lanes off" from an unreadable limits response', () => {
    expect(describeLocalLane(null).text.toLowerCase()).toContain('unknown');
    expect(describeHostedLane(null).text.toLowerCase()).toContain('unknown');
  });
});

describe('a lane the server will refuse is not offered', () => {
  it('offers nothing when neither lane is ready', () => {
    const L = limits({}, {});
    expect(laneOfferable('local', L)).toBe(false);
    expect(laneOfferable('hosted', L)).toBe(false);
    expect(laneOfferable('auto', L)).toBe(false);
  });

  it('offers auto as soon as one lane is ready', () => {
    expect(laneOfferable('auto', limits({}, { enabled: true }))).toBe(true);
    expect(laneOfferable('auto', limits({ status: 'probed', ready: true }, {}))).toBe(true);
    expect(laneOfferable('local', limits({}, { enabled: true }))).toBe(false);
  });

  it('names the hosted switch when hosted is off', () => {
    expect(describeHostedLane(hosted({})).fix).toContain('SWAN_ATELIER_MAX_SPEND_USD_DAILY');
  });
});

describe('what a still card may show', () => {
  const base: StillView = { index: 0, lane: 'hosted', image: { kind: 'b64', data: 'AAAA' }, seed: 1, promptHash: 'abc', promptText: 'x', provider: 'openai/gpt-5.4-image-2' };

  it('turns base64 into a data URI and passes a URL through', () => {
    expect(stillSrc(base).src).toBe('data:image/png;base64,AAAA');
    expect(stillSrc({ ...base, image: { kind: 'b64', data: 'https://cdn/x.png' } }).src).toBe('https://cdn/x.png');
  });

  it('never fabricates an <img> for a local path — it says where the file is', () => {
    const r = stillSrc({ ...base, lane: 'local', image: { kind: 'path', path: '/renders/still-1.png', mime: 'image/png' } });
    expect(r.src).toBeNull();
    expect(r.note).toContain('/renders/still-1.png');
  });

  it('prices $0 as local and a hosted batch as count × unit', () => {
    expect(formatCost({ count: 4, model: 'm', unitUsd: 0, totalUsd: 0 })).toContain('$0.00');
    expect(formatCost({ count: 4, model: 'm', unitUsd: 0.0039, totalUsd: 0.0156 })).toContain('4 × $0.0039');
  });
});

describe('a refusal keeps its code and its numbers', () => {
  it('carries code, message, status, retryAfter and VRAM figures', () => {
    const r = readRefusal({ response: { status: 503, data: { code: 'E_VRAM_BUSY', error: 'busy', retryAfterSec: 30, freeMb: 8000, neededMb: 26000 } } }, 'x');
    expect(r).toMatchObject({ code: 'E_VRAM_BUSY', status: 503, retryAfterSec: 30, freeMb: 8000, neededMb: 26000 });
  });

  it('falls back honestly when the body has no code', () => {
    const r = readRefusal(new Error('net'), 'Could not price this brief.');
    expect(r.code).toBe('E_UNKNOWN');
    expect(r.message).toBe('Could not price this brief.');
  });
});

describe('a still says whether it became an asset', () => {
  const base: StillView = { index: 0, lane: 'hosted', image: { kind: 'b64', data: 'AAAA' }, seed: 1, promptHash: 'abc', promptText: 'x', provider: 'p' };
  it('shows the asset id when saved', () => {
    expect(describePersist({ ...base, assetId: '0123456789abcdef', persist: { ok: true, created: true } })).toEqual({ saved: true, text: 'asset 01234567' });
  });
  it('shows the code when not saved, never a bare "saved"', () => {
    const d = describePersist({ ...base, assetId: null, persist: { ok: false, code: 'E_STORAGE_UNCONFIGURED', message: 'no R2' } });
    expect(d.saved).toBe(false);
    expect(d.text).toContain('E_STORAGE_UNCONFIGURED');
  });
});

describe('Motion binds to an asset hash, never to words', () => {
  const base: StillView = { index: 0, lane: 'hosted', image: { kind: 'b64', data: 'AAAA' }, seed: 1, promptHash: 'abc', promptText: 'x', provider: 'p' };
  it('is not bindable without an assetId and sha256', () => {
    expect(motionBindable(null).ok).toBe(false);
    expect(motionBindable(base).ok).toBe(false);
    expect(motionBindable({ ...base, assetId: 'a', sha256: 'h' }).ok).toBe(true);
  });
  it('never shows "queued" alone when nothing can pick the job up', () => {
    const j = { jobId: 'j', status: 'queued', progress: null, errorCode: null, errorMessage: null, r2Key: null, startable: false, workerState: 'NO_WORKER_ONLINE' };
    const d = describeMotionJob(j);
    expect(d.tone).toBe('blocked');
    expect(d.text.toLowerCase()).toContain('offline');
    expect(d.text).not.toBe('Queued');
  });
  it('reports ready and failed with their codes', () => {
    expect(describeMotionJob({ jobId: 'j', status: 'ready', progress: 100, errorCode: null, errorMessage: null, r2Key: 'k', startable: true, workerState: null }).tone).toBe('ready');
    const f = describeMotionJob({ jobId: 'j', status: 'failed', progress: null, errorCode: 'E_BIND_HASH_MISMATCH', errorMessage: 'not the approved frame', r2Key: null, startable: true, workerState: null });
    expect(f.tone).toBe('failed');
    expect(f.text).toContain('E_BIND_HASH_MISMATCH');
  });
});
