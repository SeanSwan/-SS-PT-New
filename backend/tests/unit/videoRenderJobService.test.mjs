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
