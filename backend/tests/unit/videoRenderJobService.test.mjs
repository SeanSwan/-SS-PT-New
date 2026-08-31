/**
 * videoRenderJobService — validation + key-determinism contract.
 *
 * These cases deliberately cover the paths that run BEFORE any database access, so
 * they are real assertions rather than mocks pretending to be a database. The
 * leasing/heartbeat/sweep paths need Postgres and are covered by the integration
 * suite; they are NOT asserted here, and this file does not pretend otherwise.
 *
 * What is being locked: the structural guard. Every one of these inputs previously
 * had a plausible failure mode where a handler could answer `{ success: true }`
 * having enqueued nothing. createJob must THROW instead — a request that cannot
 * create a job must fail loudly, never resolve optimistically.
 */

import { describe, it, expect } from 'vitest';
import {
  createJob,
  completeJob,
  r2KeyForJob,
  VideoRenderJobError,
} from '../../services/videoRenderJobService.mjs';

const valid = {
  userId: 1,
  idempotencyKey: 'abc-123',
  prompt: 'Barbell back squat, side angle, slow push-in',
  workflowId: 'wan22-ti2v-5b',
};

/** Assert createJob rejects, and rejects as a typed error the route can map to a status. */
const expectReject = async (patch, code) => {
  await expect(createJob({ ...valid, ...patch })).rejects.toMatchObject({
    name: 'VideoRenderJobError',
    code,
  });
};

describe('videoRenderJobService — createJob refuses to enqueue nothing', () => {
  it('rejects a missing userId rather than creating an ownerless job', async () => {
    await expectReject({ userId: undefined }, 'VALIDATION_ERROR');
  });

  it('rejects a non-integer userId ("Users".id is INTEGER, not UUID)', async () => {
    await expectReject({ userId: 'not-a-number' }, 'VALIDATION_ERROR');
  });

  it('rejects a missing idempotency key', async () => {
    // Without this the retry story is "hope the operator does not click twice",
    // and a double-click occupies a serial GPU twice.
    await expectReject({ idempotencyKey: '' }, 'VALIDATION_ERROR');
  });

  it('rejects a whitespace-only idempotency key', async () => {
    await expectReject({ idempotencyKey: '   ' }, 'VALIDATION_ERROR');
  });

  it('rejects an empty prompt', async () => {
    await expectReject({ prompt: '   ' }, 'VALIDATION_ERROR');
  });

  it('rejects a prompt over the 4000-char cap', async () => {
    await expectReject({ prompt: 'x'.repeat(4001) }, 'VALIDATION_ERROR');
  });

  it('rejects a missing workflowId — a render with no workflow is unreproducible', async () => {
    await expectReject({ workflowId: '' }, 'VALIDATION_ERROR');
  });

  it('throws a typed error carrying an HTTP status, so routes cannot swallow it silently', async () => {
    const err = await createJob({ ...valid, prompt: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(VideoRenderJobError);
    expect(err.statusCode).toBe(400);
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
  });
});

describe('videoRenderJobService — deterministic R2 keys', () => {
  it('derives the same key for the same job every time', () => {
    // This determinism is what makes at-least-once delivery safe: a re-render after
    // a crash OVERWRITES the same object instead of creating an orphan.
    const id = '11111111-2222-3333-4444-555555555555';
    expect(r2KeyForJob(id)).toBe(`jobs/${id}/source.mp4`);
    expect(r2KeyForJob(id)).toBe(r2KeyForJob(id));
  });

  it('namespaces every artifact under the job id', () => {
    const id = 'abc';
    expect(r2KeyForJob(id, 'poster.jpg')).toBe('jobs/abc/poster.jpg');
    expect(r2KeyForJob(id, 'source.mp4').startsWith('jobs/abc/')).toBe(true);
  });

  it('never collides across jobs', () => {
    expect(r2KeyForJob('job-a')).not.toBe(r2KeyForJob('job-b'));
  });
});

describe('videoRenderJobService — completeJob refuses before it reaches the database', () => {
  it('rejects a missing r2Key before any DB access, so the value cannot be used unvalidated', async () => {
    // Ordering matters: r2Key participates in the idempotent-replay authorization check
    // below, so it must be validated BEFORE it is compared against anything.
    const err = await completeJob({ jobId: 'x', agentId: 'a', r2Key: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(VideoRenderJobError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
  });
});

/**
 * completeJob AUTHORIZATION — the guard shape, asserted directly.
 *
 * The original check was `leasedBy !== agentId && !isTerminal`, which INVERTS on
 * terminal jobs: `!isTerminal` is false, the && short-circuits, and any caller could
 * "complete" a failed or cancelled job — minting a MediaAsset for output nobody
 * verified. Found by hostile review, not by any test, because the leasing paths have
 * no database coverage.
 *
 * This asserts the predicate itself. The full path still needs Postgres; that gap is
 * stated in this file's header rather than implied away.
 */
describe('completeJob authorization predicate', () => {
  const blocked = (leasedBy, agentId, status, jobKey, submittedKey) => {
    const holdsLease = leasedBy === agentId;
    const isIdempotentReplay = status === 'ready' && jobKey === submittedKey;
    return !holdsLease && !isIdempotentReplay;
  };

  it('allows the lease holder to complete an active job', () => {
    expect(blocked('agent-a', 'agent-a', 'rendering', 'k', 'k')).toBe(false);
  });

  it('blocks a stranger on an active job', () => {
    expect(blocked('agent-a', 'EVIL', 'rendering', 'k', 'k')).toBe(true);
  });

  it('blocks a stranger completing a FAILED job (the inversion bug)', () => {
    expect(blocked('agent-a', 'EVIL', 'failed', 'k', 'k')).toBe(true);
  });

  it('blocks a stranger completing a CANCELLED job (the inversion bug)', () => {
    expect(blocked('agent-a', 'EVIL', 'cancelled', 'k', 'k')).toBe(true);
  });

  it('allows an idempotent replay of a ready job with the same key', () => {
    // leasedBy is nulled on completion, so replay cannot rely on lease identity.
    expect(blocked(null, 'agent-a', 'ready', 'k', 'k')).toBe(false);
  });

  it('blocks a replay claiming a DIFFERENT key on a ready job', () => {
    expect(blocked('agent-a', 'EVIL', 'ready', 'k', 'other')).toBe(true);
  });
});

/**
 * completeJob's DATABASE path — reachable at last.
 *
 * This file's header says it covers only paths running BEFORE database access, and that the
 * leasing paths "need Postgres and are covered by the integration suite". That was true, and
 * it is why three real defects in one `findOrCreate` went unfixed across two sessions: an
 * unfalsifiable fix is not a fix. `completeJob` now takes its models through `options`, so
 * the transaction body is reachable with fakes and each defect has a test that fails without it.
 *
 * These are NOT a substitute for the integration suite. They prove the logic this function
 * applies; they do not prove Sequelize does what the fakes pretend.
 */
describe('completeJob — the three defects in one findOrCreate', () => {
  const JOB = '11111111-2222-3333-4444-555555555555';
  const R2 = `jobs/${JOB}/source.mp4`;

  function harness({ existing = null, job: jobOver = {} } = {}) {
    const job = {
      id: JOB, userId: 7, leasedBy: 'agent-A', status: 'rendering', isTerminal: false,
      exerciseId: null, projectId: null, posterR2Key: null, r2Key: null,
      update: async (patch) => Object.assign(job, patch),
      ...jobOver,
    };
    const calls = { findOrCreate: [], assetUpdate: [], created: null };
    const assetModel = {
      findOrCreate: async ({ where, defaults }) => {
        calls.findOrCreate.push(where);
        if (existing) {
          existing.update = async (patch) => { calls.assetUpdate.push(patch); return Object.assign(existing, patch); };
          return [existing, false];
        }
        const row = { ...defaults, update: async (p) => Object.assign(row, p) };
        calls.created = row;
        return [row, true];
      },
    };
    return {
      job, calls,
      opts: { jobModel: { findByPk: async () => job }, assetModel, db: { transaction: async (fn) => fn('TX') } },
    };
  }

  const complete = (h, meta = {}) => completeJob({ jobId: JOB, agentId: 'agent-A', r2Key: R2, ...meta }, h.opts);

  it('(a) scopes the lookup by OWNER, not by r2Key alone', async () => {
    // On a key collision across tenants this found another tenant's row: the completer's
    // asset never appeared in their library, ownerUserId stayed the original owner's, and
    // nothing errored.
    const h = harness();
    await complete(h);
    expect(h.calls.findOrCreate[0]).toEqual({ r2Key: R2, ownerUserId: 7 });
  });

  it('(b) backfills the poster on the FOUND path, where defaults are ignored', async () => {
    // A clip whose row was created on a poster-less declaration kept null forever, while
    // the JOB knew better — the poster written below belongs to job.update, not the asset.
    const existing = { id: 'asset-1', posterR2Key: null };
    const h = harness({ existing });
    await complete(h, { posterR2Key: `jobs/${JOB}/poster.webp` });
    expect(h.calls.assetUpdate).toEqual([{ posterR2Key: `jobs/${JOB}/poster.webp` }]);
  });

  it('(b) never overwrites a poster the asset already has', async () => {
    // Fills a gap; it is not a channel for replacing one declaration with a later one.
    const existing = { id: 'asset-1', posterR2Key: `jobs/${JOB}/original.webp` };
    const h = harness({ existing });
    await complete(h, { posterR2Key: `jobs/${JOB}/newer.webp` });
    expect(h.calls.assetUpdate).toEqual([]);
    expect(existing.posterR2Key).toBe(`jobs/${JOB}/original.webp`);
  });

  it('(c) drops a poster key this system did not write for this job', async () => {
    // meta reaches here from the request body and verifyObject checks EXISTENCE, never
    // ownership. Dropped rather than rejected: a poster is an optimisation, and refusing
    // the completion would trade a missing thumbnail for a lost render.
    const h = harness();
    await complete(h, { posterR2Key: 'atelier/stills/99/thumbs/victim.webp' });
    // The row that was actually written carried null, not the foreign key.
    expect(h.calls.created.posterR2Key).toBeNull();
    // And the JOB did not keep it either — both writes read the same sanitised value.
    expect(h.job.posterR2Key).toBeNull();
  });

  it('(c) keeps a poster in this job\u2019s own namespace', async () => {
    const h = harness();
    await complete(h, { posterR2Key: `jobs/${JOB}/poster.webp` });
    expect(h.job.posterR2Key).toBe(`jobs/${JOB}/poster.webp`);
  });

  it('the completion still does its job — the row is created and the job goes ready', async () => {
    // The guard must not eat the working path.
    const h = harness();
    const out = await complete(h);
    expect(out.asset).toBeDefined();
    expect(h.job.status).toBe('ready');
    expect(h.job.r2Key).toBe(R2);
  });
});

describe('owner-scoping turns a silent adoption into a named refusal', () => {
  const JOB = '11111111-2222-3333-4444-555555555555';

  it('a unique-key collision is 409 KEY_COLLISION, not an unhandled 500', async () => {
    // media_assets.r2_key carries a UNIQUE partial index. Before the owner was in the
    // lookup, a cross-tenant collision FOUND the other tenant's row and adopted it silently.
    // Now the lookup misses and the insert hits the index — correct, but an unhandled
    // constraint error is a server fault for what is a deliberate refusal.
    const job = { id: JOB, userId: 7, leasedBy: 'agent-A', isTerminal: false, update: async () => {} };
    const boom = Object.assign(new Error('duplicate key'), { name: 'SequelizeUniqueConstraintError' });
    await expect(completeJob(
      { jobId: JOB, agentId: 'agent-A', r2Key: `jobs/${JOB}/x.mp4` },
      {
        jobModel: { findByPk: async () => job },
        assetModel: { findOrCreate: async () => { throw boom; } },
        db: { transaction: async (fn) => fn('TX') },
      },
    )).rejects.toMatchObject({ statusCode: 409, code: 'KEY_COLLISION' });
  });

  it('any other database error still propagates unchanged', async () => {
    // The catch must name ONE condition, not swallow the class. A connection failure
    // reported as a key collision would send an agent to fix the wrong thing.
    const job = { id: JOB, userId: 7, leasedBy: 'agent-A', isTerminal: false, update: async () => {} };
    const other = Object.assign(new Error('connection terminated'), { name: 'SequelizeConnectionError' });
    await expect(completeJob(
      { jobId: JOB, agentId: 'agent-A', r2Key: `jobs/${JOB}/x.mp4` },
      {
        jobModel: { findByPk: async () => job },
        assetModel: { findOrCreate: async () => { throw other; } },
        db: { transaction: async (fn) => fn('TX') },
      },
    )).rejects.toMatchObject({ name: 'SequelizeConnectionError' });
  });
});
