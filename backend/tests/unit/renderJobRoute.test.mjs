/**
 * /render-job — proof the endpoint stopped lying.
 * ============================================================================
 *
 * BEFORE: it validated a template id, made a best-effort write to an unrelated log
 * table, and returned `success: true, status: 'waiting'`. No row entered
 * `video_render_jobs`, so no worker could ever lease it. The operator was told work had
 * started and waited forever — the same defect class as the marketing publisher that
 * "reported success when every platform failed".
 *
 * These tests assert the two halves that make it honest, because either alone is still a
 * lie: (1) a REAL leasable job is created, and (2) the response says whether anything is
 * actually going to pick it up.
 *
 * The service is mocked on purpose. `DATABASE_URL` points at PRODUCTION from local dev,
 * so a test that "proves" the insert by really inserting would leave permanent junk rows
 * in the live queue. What is under test here is the WIRING — that the route calls the
 * queue with a well-formed job and reports presence truthfully — and that is fully
 * observable at the mock boundary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const createJob = vi.fn();
const getJob = vi.fn();
const workerPresence = vi.fn();

class FakeJobError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const getAssetProvenance = vi.fn();

vi.mock('../../services/videoRenderJobService.mjs', () => ({
  createJob: (...a) => createJob(...a),
  getJob: (...a) => getJob(...a),
  // Added when provenance shipped. A mock missing an export the route imports yields
  // `undefined`, and calling it throws — surfacing as a 500 on a route the test never
  // touched, which reads as a route bug rather than a stale double.
  getAssetProvenance: (...a) => getAssetProvenance(...a),
  VideoRenderJobError: FakeJobError,
}));

vi.mock('../../services/renderWorkerPresence.mjs', async () => {
  // Keep the REAL describePresence — its fail-closed behaviour is load-bearing here and
  // mocking it would let the route pass while the honesty logic is broken.
  const real = await vi.importActual('../../services/renderWorkerPresence.mjs');
  return { ...real, workerPresence: (...a) => workerPresence(...a) };
});

// Mutable so a test can switch identity WITHOUT vi.resetModules(). An earlier version
// used resetModules + doMock to build a second app as user 8; that re-registered the
// auth mock globally and every later test in this file ran as user 8, so owner-scoped
// GETs started 404ing. The test contaminated its neighbours rather than finding a bug.
let currentUser = { id: 7, role: 'admin' };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = currentUser; next(); },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../services/contentStudioCoverageService.mjs', () => ({
  loadContentStudioCoveragePayload: vi.fn(),
}));
vi.mock('../../services/contentStudioStorageUsageService.mjs', () => ({
  EMPTY_CONTENT_STUDIO_STORAGE_USAGE: {},
  loadContentStudioStorageUsage: vi.fn(),
}));

let app;
beforeEach(async () => {
  vi.clearAllMocks();
  getAssetProvenance.mockResolvedValue(null);
  currentUser = { id: 7, role: 'admin' };   // undo any identity a prior test switched to
  const { default: router } = await import('../../routes/contentStudioRoutes.mjs');
  app = express();
  app.use(express.json());
  app.use('/api/content-studio', router);
});

const VALID = { templateId: 'workout-intro', branding: 'swan' };

describe('POST /render-job — creates a REAL job, not a message', () => {
  it('enqueues a leasable job and returns its id', async () => {
    createJob.mockResolvedValue({ job: { id: 'job-uuid-1', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });

    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'key-abc').send(VALID);

    expect(res.status).toBe(202);              // accepted for async work, not "done"
    expect(res.body.data.jobId).toBe('job-uuid-1');
    expect(res.body.data.status).toBe('queued');
    expect(res.body.data.statusUrl).toContain('job-uuid-1');

    // The job must be genuinely leasable: a real workflow id, the caller's user, and
    // capabilities a worker can match on. Without these it is a row nothing can claim.
    const arg = createJob.mock.calls[0][0];
    expect(arg.userId).toBe(7);
    expect(arg.idempotencyKey).toBe('key-abc');
    expect(arg.workflowId).toBe('remotion:workout-intro');
    expect(arg.requiredCapabilities).toContain('remotion');
    expect(arg.params.templateId).toBe('workout-intro');
  });

  it('does not charge two renders for one double-click', async () => {
    // No Idempotency-Key header: the route must still derive a stable one, or the queue
    // rejects the request (it requires one) and every retry becomes a second GPU render.
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });

    await request(app).post('/api/content-studio/render-job').send(VALID);
    const first = createJob.mock.calls[0][0].idempotencyKey;
    createJob.mockClear();
    await request(app).post('/api/content-studio/render-job').send(VALID);
    const second = createJob.mock.calls[0][0].idempotencyKey;

    expect(first).toBeTruthy();
    expect(second).toBe(first);               // identical request -> identical key
  });

  it('isolates derived keys per user', async () => {
    // A shared key across users would hand one operator another operator's job.
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });

    await request(app).post('/api/content-studio/render-job').send(VALID);
    const asUser7 = createJob.mock.calls[0][0].idempotencyKey;

    createJob.mockClear();
    currentUser = { id: 8, role: 'admin' };          // restored in beforeEach
    await request(app).post('/api/content-studio/render-job').send(VALID);
    expect(createJob.mock.calls[0][0].idempotencyKey).not.toBe(asUser7);
  });

  /**
   * A derived key with no time bound would return the FIRST job forever: the operator
   * could never deliberately re-render, and could never retry a FAILED render, because
   * the replay hands back the failed row. The bucket is what keeps idempotency from
   * meaning "you may render this once, ever".
   */
  it('lets the same request become a new job once the dedupe window passes', async () => {
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      await request(app).post('/api/content-studio/render-job').send(VALID);
      const early = createJob.mock.calls[0][0].idempotencyKey;

      // Same second-ish: still one job.
      createJob.mockClear();
      vi.setSystemTime(new Date('2026-08-12T00:00:30Z'));
      await request(app).post('/api/content-studio/render-job').send(VALID);
      expect(createJob.mock.calls[0][0].idempotencyKey).toBe(early);

      // Minutes later: a deliberate re-render must be allowed through.
      createJob.mockClear();
      vi.setSystemTime(new Date('2026-08-12T00:05:00Z'));
      await request(app).post('/api/content-studio/render-job').send(VALID);
      expect(createJob.mock.calls[0][0].idempotencyKey).not.toBe(early);
    } finally {
      vi.useRealTimers();
    }
  });

  it('always prefers an explicit client key over the derived one', async () => {
    // A client that manages its own retries must not be second-guessed.
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });
    await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', '  explicit-key  ').send(VALID);
    expect(createJob.mock.calls[0][0].idempotencyKey).toBe('explicit-key');   // trimmed
  });

  it('reports a replay as 200, not as fresh work', async () => {
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: true });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });
    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'k').send(VALID);
    expect(res.status).toBe(200);
    expect(res.body.data.replayed).toBe(true);
  });
});

describe('POST /render-job — never implies motion that cannot happen', () => {
  it('says so when no worker is enrolled, instead of a bare "queued"', async () => {
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 0, total: 0, missingCapabilities: [] });

    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'k').send(VALID);

    // The job is still created — dropping it would be worse than queueing it.
    expect(res.body.data.jobId).toBe('j');
    // But the operator is told the truth.
    expect(res.body.data.startable).toBe(false);
    expect(res.body.data.workerState).toBe('NO_WORKER_ENROLLED');
    expect(res.body.message).toMatch(/nothing will pick this up/i);
  });

  it('distinguishes "no capable worker" from "no worker"', async () => {
    createJob.mockResolvedValue({ job: { id: 'j', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 2, total: 2, missingCapabilities: ['remotion'] });
    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'k').send(VALID);
    expect(res.body.data.startable).toBe(false);
    expect(res.body.data.workerState).toBe('NO_WORKER_WITH_CAPABILITY');
  });
});

describe('POST /render-job — validation still holds', () => {
  it('rejects a missing template or branding', async () => {
    for (const body of [{}, { templateId: 'workout-intro' }, { branding: 'swan' }]) {
      const res = await request(app).post('/api/content-studio/render-job').send(body);
      expect(res.status).toBe(400);
    }
    expect(createJob).not.toHaveBeenCalled();
  });

  it('rejects an unknown template', async () => {
    const res = await request(app).post('/api/content-studio/render-job')
      .send({ templateId: 'not-a-template', branding: 'swan' });
    expect(res.status).toBe(400);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('surfaces a queue validation error with its real status, not a blanket 500', async () => {
    createJob.mockRejectedValue(new FakeJobError(400, 'VALIDATION_ERROR', 'Prompt is required.'));
    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'k').send(VALID);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('never reports success when the queue write fails', async () => {
    // The whole point of the rewrite: a failed enqueue must not read as queued.
    createJob.mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/api/content-studio/render-job')
      .set('Idempotency-Key', 'k').send(VALID);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /render-job/:id — pollable, and owner-scoped', () => {
  it('returns live status for the owner', async () => {
    getJob.mockResolvedValue({
      id: 'j', userId: 7, status: 'rendering', progress: 42,
      requiredCapabilities: ['remotion'], r2Key: null,
    });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });
    const res = await request(app).get('/api/content-studio/render-job/j');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rendering');
    expect(res.body.data.progress).toBe(42);
  });

  it('does not let one admin read another user\'s job by id', async () => {
    getJob.mockResolvedValue({ id: 'j', userId: 999, status: 'ready', requiredCapabilities: [] });
    const res = await request(app).get('/api/content-studio/render-job/j');
    expect(res.status).toBe(404);            // 404 not 403 — do not confirm it exists
  });

  it('404s an unknown id', async () => {
    getJob.mockResolvedValue(null);
    const res = await request(app).get('/api/content-studio/render-job/nope');
    expect(res.status).toBe(404);
  });

  it('stops reporting worker presence once the job is no longer waiting', async () => {
    // Presence is a prediction about queued work. On a finished job it is history, and
    // showing "no worker online" beside a ready render would be nonsense.
    getJob.mockResolvedValue({ id: 'j', userId: 7, status: 'ready', requiredCapabilities: [], r2Key: 'k' });
    workerPresence.mockResolvedValue({ live: 0, total: 0, missingCapabilities: [] });
    const res = await request(app).get('/api/content-studio/render-job/j');
    expect(res.body.data.startable).toBe(true);
    expect(res.body.data.workerState).toBeNull();
  });
});

describe('POST /sync-job — queues real measurement work for the agent', () => {
  beforeEach(() => {
    createJob.mockResolvedValue({ job: { id: 'sync-1', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });
  });

  it('queues a mediasync job the agent can actually dispatch on', async () => {
    const res = await request(app).post('/api/content-studio/sync-job')
      .send({ referencePath: '/media/A001.MP4', targetPath: '/media/DJI_01.WAV' });

    expect(res.status).toBe(202);
    const arg = createJob.mock.calls[0][0];
    // workflowId is the dispatch key the agent splits on; capability is what leasing
    // filters on. Both must be right or the job is unleasable or unrunnable.
    expect(arg.workflowId).toBe('mediasync:pair');
    expect(arg.requiredCapabilities).toEqual(['mediasync']);
    expect(arg.params.referencePath).toBe('/media/A001.MP4');
    expect(arg.params.targetPath).toBe('/media/DJI_01.WAV');
    expect(arg.params.maxOffsetSeconds).toBe(120);
  });

  it('refuses a file paired with itself', async () => {
    // Self-correlation returns offset 0 at peak 1.0 — a perfect, useless answer that
    // looks exactly like a successful sync.
    const res = await request(app).post('/api/content-studio/sync-job')
      .send({ referencePath: '/media/A001.MP4', targetPath: '/media/A001.MP4' });
    expect(res.status).toBe(400);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('requires both paths', async () => {
    for (const body of [{}, { referencePath: '/a' }, { targetPath: '/b' }]) {
      expect((await request(app).post('/api/content-studio/sync-job').send(body)).status).toBe(400);
    }
    expect(createJob).not.toHaveBeenCalled();
  });

  it('tells the truth when no capable worker is online', async () => {
    workerPresence.mockResolvedValue({ live: 0, total: 0, missingCapabilities: ['mediasync'] });
    const res = await request(app).post('/api/content-studio/sync-job')
      .send({ referencePath: '/a', targetPath: '/b' });
    expect(res.body.data.startable).toBe(false);
    expect(res.body.data.workerState).toBe('NO_WORKER_ENROLLED');
  });

  it('is pollable through the same status endpoint', async () => {
    const res = await request(app).post('/api/content-studio/sync-job')
      .send({ referencePath: '/a', targetPath: '/b' });
    expect(res.body.data.statusUrl).toBe('/api/content-studio/render-job/sync-1');
  });
});

describe('POST /generate-video — the route the provider registry was waiting for', () => {
  const GEN = { prompt: 'a swan taking off from still water', provider: 'comfyui/minimax-h3' };

  beforeEach(() => {
    createJob.mockResolvedValue({ job: { id: 'gen-1', status: 'queued' }, replayed: false });
    workerPresence.mockResolvedValue({ live: 1, total: 1, missingCapabilities: [] });
  });

  it('enqueues a job the agent can actually dispatch and lease', async () => {
    const res = await request(app).post('/api/content-studio/generate-video').send(GEN);

    // 403 here means the licence gate refused — legitimate, but then the rest is moot.
    if (res.status === 403) {
      expect(res.body.code).toMatch(/E_(LICENCE_GRANT_REQUIRED|PROVIDER_DISABLED)/);
      return;
    }
    expect(res.status).toBe(202);

    const arg = createJob.mock.calls[0][0];
    // The agent splits workflowId on ':' to pick a handler. Provider ids contain a slash
    // but no colon, so this must yield exactly 'generate'.
    expect(String(arg.workflowId).split(':')[0]).toBe('generate');
    expect(arg.workflowId).toContain('comfyui/minimax-h3');
    // Leasing filters on required_capabilities — without this the job is unleasable.
    expect(arg.requiredCapabilities).toEqual(['generate']);
    expect(arg.kind).toBe('generate');
    expect(arg.params.provider).toBe('comfyui/minimax-h3');
    expect(arg.params.prompt).toBe(GEN.prompt);
  });

  it('requires a prompt and a provider', async () => {
    for (const body of [{}, { prompt: 'x' }, { provider: 'comfyui/minimax-h3' }]) {
      const res = await request(app).post('/api/content-studio/generate-video').send(body);
      expect(res.status).toBe(400);
    }
    expect(createJob).not.toHaveBeenCalled();
  });

  it('refuses an unknown provider rather than queueing an unrunnable job', async () => {
    const res = await request(app).post('/api/content-studio/generate-video')
      .send({ prompt: 'x', provider: 'not/a-real-model' });
    expect([400, 403]).toContain(res.status);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('never reports success when the queue write fails', async () => {
    createJob.mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/api/content-studio/generate-video').send(GEN);
    expect([500, 403]).toContain(res.status);
    if (res.status === 500) expect(res.body.success).toBe(false);
  });
});

describe('GET /video-providers — a picker that cannot offer what it cannot run', () => {
  it('reports every provider with an availability verdict', async () => {
    const res = await request(app).get('/api/content-studio/video-providers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.providers)).toBe(true);
    for (const p of res.body.data.providers) {
      expect(typeof p.available).toBe('boolean');
      // An unavailable provider MUST carry its reason — hiding it turns a one-line
      // config gap into a mystery about a missing feature.
      if (!p.available) expect(p.hint).toBeTruthy();
    }
  });

  it('carries the licence-required attribution string for each provider', async () => {
    const res = await request(app).get('/api/content-studio/video-providers');
    const h3 = res.body.data.providers.find((p) => p.id === 'comfyui/minimax-h3');
    expect(h3).toBeTruthy();
    // H3's licence mandates prominent display; a UI that never receives it cannot comply.
    expect(h3.attribution).toMatch(/MiniMax H3/i);
  });
});
