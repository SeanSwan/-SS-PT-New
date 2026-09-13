/**
 * P77-B — capability truthfulness on the video job-queue surface
 * ==============================================================
 * Closes three findings recorded in
 * docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/76-correction-phantom-bullmq-control.md
 * ("RESOLVED 2026-09-13", findings 2, 3 and 4):
 *
 *   (2) FALSE SUCCESS LOG — `completeUpload` awaited `addJob(...)` and then logged
 *       "Enqueued checksum_verify job for video <id>" unconditionally. The real
 *       `addJob` returns `null` (it does not throw) whenever the BullMQ queue was
 *       never initialized — `initVideoJobQueue()` has zero callers — so the
 *       `catch` never fires and the log claimed a job ran when nothing ran.
 *   (3) FALSE CAPABILITY REPORT — `jobQueueHealth` returned `available: true`
 *       because the *module import* succeeded, which is not availability: the
 *       module exports `addJob` even when the queue is uninitialized.
 *   (4) SHADOWED HEALTH ROUTE — `router.get('/:id')` was registered before
 *       `router.get('/job-queue-health')`, so ordered matching sent the health
 *       request to `getVideo`. Doc 76 tagged the HTTP consequence `[LIKELY]`;
 *       the supertest cases below upgrade that to a measured response.
 *
 * Real caller path: the real controller functions and the real Express router are
 * exercised; only their outward dependencies (Sequelize models, sequelize,
 * R2 storage, auth middleware, the queue module) are substituted. On the real
 * `videoJobQueue.mjs` semantics every enqueue resolves to `null` today, so the
 * `mockResolvedValue(null)` case below IS the production behaviour.
 *
 * Every assertion has a POSITIVE CONTROL in the same file: a queue that genuinely
 * enqueues must still be reported as enqueued/available. A blanket "always log
 * failed" or a blanket `available: false` cannot pass this file.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMockRequest, createMockResponse } from '../fixtures/testData.mjs';

// ─── Mock: logger — explicit spies (also mocked globally in tests/setup.mjs) ──
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock: models/index.mjs ─────────────────────────────────────────────────
const mockVideoCatalogModel = {
  findByPk: vi.fn(),
  findOne: vi.fn(),
};

vi.mock('../../models/index.mjs', () => ({
  getVideoCatalog: () => mockVideoCatalogModel,
  getVideoJobLog: vi.fn(() => ({})),
  Op: {
    contains: Symbol('contains'),
    or: Symbol('or'),
    gt: Symbol('gt'),
  },
}));

// ─── Mock: database.mjs (sequelize transaction passthrough) ─────────────────
const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async (cb) => cb(mockTransaction)),
  },
}));

// ─── Mock: R2 storage service ────────────────────────────────────────────────
vi.mock('../../services/r2StorageService.mjs', () => ({
  generateUploadUrl: vi.fn(),
  generatePlaybackUrl: vi.fn(),
  generateThumbnailUrl: vi.fn(),
  generateObjectKey: vi.fn(),
  generateThumbnailKey: vi.fn(),
  headObject: vi.fn(),
  deleteObject: vi.fn(),
}));

// ─── Mock: videoJobQueue — enqueue result and queue instance are per-test ────
vi.mock('../../services/videoJobQueue.mjs', () => ({
  addJob: vi.fn(),
  initVideoJobQueue: vi.fn(),
  getVideoJobQueue: vi.fn(),
}));

// ─── Mock: authMiddleware (the real router is mounted in group 3) ────────────
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
}));

// ─── Imports (after all vi.mock calls) ───────────────────────────────────────
import { completeUpload, jobQueueHealth } from '../../controllers/videoCatalogController.mjs';
import videoCatalogRoutes from '../../routes/videoCatalogRoutes.mjs';
import logger from '../../utils/logger.mjs';
import { addJob, getVideoJobQueue } from '../../services/videoJobQueue.mjs';
import { headObject } from '../../services/r2StorageService.mjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const OBJECT_KEY = 'videos/1/2026-02/uuid-test.mp4';
const VIDEO_ID = 'vid-uuid-1';

// The claim that must only be made when a job was genuinely enqueued.
const ENQUEUED_CLAIM = /enqueued/i;
// The truthful counterpart that must appear when nothing was enqueued.
const NOT_ENQUEUED_CLAIM = /not enqueued/i;

function makeVideo(overrides = {}) {
  return {
    id: VIDEO_ID,
    creatorId: 1,
    uploadMode: 'B',
    declaredChecksum: null,
    declaredFileSize: 1024000,
    declaredMimeType: 'video/mp4',
    pendingObjectKey: OBJECT_KEY,
    hostedKey: null,
    fileChecksumSha256: null,
    update: vi.fn().mockImplementation(function (data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    toJSON: function () { return { ...this }; },
    ...overrides,
  };
}

const infoMessages = () => logger.info.mock.calls.map((call) => String(call[0]));
const warnMessages = () => logger.warn.mock.calls.map((call) => String(call[0]));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/admin/videos', videoCatalogRoutes);
  return app;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Finding 2 — the upload path's success log must be truthful
// ═════════════════════════════════════════════════════════════════════════════
describe('completeUpload — checksum_verify enqueue reporting (finding 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headObject.mockResolvedValue({
      contentLength: 1024000,
      contentType: 'video/mp4',
      checksumSHA256: null,
    });
    // Mode B upload: no checksum at upload time → checksum job is requested.
    mockVideoCatalogModel.findOne.mockResolvedValue(makeVideo({ uploadMode: 'B' }));
  });

  it('does NOT claim the job was enqueued when addJob resolves null (queue uninitialized)', async () => {
    addJob.mockResolvedValue(null);

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: VIDEO_ID, objectKey: OBJECT_KEY },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    // The upload itself still succeeded — no 503, response contract unchanged.
    expect(res.statusCode).toBe(200);
    expect(res.jsonData.success).toBe(true);

    // It did ask the queue to enqueue the job...
    expect(addJob).toHaveBeenCalledWith('checksum_verify', {
      videoId: VIDEO_ID,
      objectKey: OBJECT_KEY,
    });

    // ...but nothing was enqueued, so no log may say it was.
    expect(infoMessages().some((message) => ENQUEUED_CLAIM.test(message))).toBe(false);

    // The operator must be told the job did NOT run, on the queue job's name.
    expect(
      warnMessages().some((message) => /checksum_verify/.test(message) && NOT_ENQUEUED_CLAIM.test(message)),
    ).toBe(true);
  });

  it('POSITIVE CONTROL: reports the enqueue when addJob genuinely returns a job', async () => {
    addJob.mockResolvedValue({ id: 'job-1', name: 'checksum_verify' });

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: VIDEO_ID, objectKey: OBJECT_KEY },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(200);

    // The truthful success log must still exist (a blanket "always log failure" fails here).
    expect(
      infoMessages().some((message) => /checksum_verify/.test(message) && ENQUEUED_CLAIM.test(message)),
    ).toBe(true);

    // ...and the "was not enqueued" warning must NOT be emitted (a blanket
    // "log both" implementation fails here).
    expect(warnMessages().some((message) => NOT_ENQUEUED_CLAIM.test(message))).toBe(false);
  });

  it('still warns with the error message when addJob throws (existing behaviour preserved)', async () => {
    addJob.mockRejectedValue(new Error('redis down'));

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: VIDEO_ID, objectKey: OBJECT_KEY },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(200);
    expect(warnMessages().some((message) => /Failed to enqueue checksum_verify/i.test(message))).toBe(true);
    expect(infoMessages().some((message) => ENQUEUED_CLAIM.test(message))).toBe(false);
  });

  it('Mode A (checksum already verified) never asks the queue for a job', async () => {
    addJob.mockResolvedValue({ id: 'job-1' });
    mockVideoCatalogModel.findOne.mockResolvedValue(makeVideo({
      uploadMode: 'A',
      declaredChecksum: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    }));
    headObject.mockResolvedValue({
      contentLength: 1024000,
      contentType: 'video/mp4',
      checksumSHA256: null, // R2 returned no checksum header → trust declared value
    });

    const req = createMockRequest({
      user: { id: 1, role: 'admin' },
      body: { videoId: VIDEO_ID, objectKey: OBJECT_KEY },
    });
    const res = createMockResponse();

    await completeUpload(req, res);

    expect(res.statusCode).toBe(200);
    expect(addJob).not.toHaveBeenCalled();
    expect(infoMessages().some((message) => ENQUEUED_CLAIM.test(message))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Finding 3 — the health surface must report the real queue state
// ═════════════════════════════════════════════════════════════════════════════
describe('jobQueueHealth — availability reflects the queue, not the import (finding 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports available:false when the queue was never initialized (import succeeded)', () => {
    // The controller imported videoJobQueue.mjs successfully — that is exactly
    // the condition the old code mistook for availability.
    getVideoJobQueue.mockReturnValue(null);

    const res = createMockResponse();
    jobQueueHealth(createMockRequest({}), res);

    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.available).toBe(false);
    expect(typeof res.jsonData.data.timestamp).toBe('string');
  });

  it('reports available:false when no queue instance is exposed at all', () => {
    getVideoJobQueue.mockReturnValue(undefined);

    const res = createMockResponse();
    jobQueueHealth(createMockRequest({}), res);

    expect(res.jsonData.data.available).toBe(false);
  });

  it('fails CLOSED: an unobservable queue instance is reported unavailable, not available', () => {
    // Cannot read the queue instance → cannot prove the queue works → must not
    // claim it does. This is the branch that also keeps a partial test double
    // from taking the module binding down.
    getVideoJobQueue.mockImplementation(() => {
      throw new Error('queue instance not observable');
    });

    const res = createMockResponse();
    jobQueueHealth(createMockRequest({}), res);

    expect(res.jsonData.data.available).toBe(false);
  });

  it('POSITIVE CONTROL: reports available:true when a queue instance really exists', () => {
    getVideoJobQueue.mockReturnValue({ name: 'swanstudios:video-jobs' });

    const res = createMockResponse();
    jobQueueHealth(createMockRequest({}), res);

    expect(res.jsonData.data.available).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Finding 4 — /job-queue-health must survive GET /:id registration order
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v2/admin/videos/job-queue-health — route reachability (finding 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reaches the health handler instead of being shadowed by GET /:id', async () => {
    getVideoJobQueue.mockReturnValue(null);
    mockVideoCatalogModel.findByPk.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/v2/admin/videos/job-queue-health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { available: false, timestamp: expect.any(String) },
    });
    // Proof the request never fell through to getVideo.
    expect(mockVideoCatalogModel.findByPk).not.toHaveBeenCalled();
  });

  it('POSITIVE CONTROL: the same URL reports available:true over HTTP when a queue exists', async () => {
    getVideoJobQueue.mockReturnValue({ name: 'swanstudios:video-jobs' });

    const res = await request(buildApp()).get('/api/v2/admin/videos/job-queue-health');

    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
  });

  it('GET /:id still routes to getVideo for ordinary ids (no routing change)', async () => {
    mockVideoCatalogModel.findByPk.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/v2/admin/videos/abc-123');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Video not found' });
    expect(mockVideoCatalogModel.findByPk).toHaveBeenCalledWith('abc-123');
  });
});
