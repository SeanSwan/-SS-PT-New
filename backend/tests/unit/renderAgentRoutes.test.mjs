/**
 * Agent surface — the worker's only door, and the things it must not open.
 * ============================================================================
 *
 * This is a credential-bearing, machine-to-machine surface: a leaked or over-permissive
 * agent token is not a read primitive, it is the ability to claim other people's work,
 * report fabricated completions, and mint asset keys. So the tests that matter here are
 * the refusals, not the happy path.
 *
 * The single most important one: a worker must not be able to widen its own eligibility
 * by CLAIMING a capability at poll time. Capabilities come from the enrolled record.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const authenticateAgent = vi.fn();
const enrolAgent = vi.fn();
const revokeAgent = vi.fn();
const leaseNextJob = vi.fn();
const heartbeat = vi.fn();
const completeJob = vi.fn();
const failJob = vi.fn();

class FakeAuthError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode = statusCode; this.code = code; }
}
class FakeJobError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode = statusCode; this.code = code; }
}

vi.mock('../../services/renderAgentAuthService.mjs', () => ({
  authenticateAgent: (...a) => authenticateAgent(...a),
  enrolAgent: (...a) => enrolAgent(...a),
  revokeAgent: (...a) => revokeAgent(...a),
  RenderAgentAuthError: FakeAuthError,
}));
vi.mock('../../services/videoRenderJobService.mjs', () => ({
  leaseNextJob: (...a) => leaseNextJob(...a),
  heartbeat: (...a) => heartbeat(...a),
  completeJob: (...a) => completeJob(...a),
  failJob: (...a) => failJob(...a),
  VideoRenderJobError: FakeJobError,
}));

let isAdmin = true;
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 1, role: isAdmin ? 'admin' : 'user' }; next(); },
  adminOnly: (_req, res, next) => (isAdmin ? next() : res.status(403).json({ success: false })),
}));

let app;
beforeEach(async () => {
  vi.clearAllMocks();
  isAdmin = true;
  const { default: router } = await import('../../routes/renderAgentRoutes.mjs');
  app = express();
  app.use(express.json());
  app.use('/api/render-agents', router);
});

const AGENT = { id: 'a1', label: 'rig', capabilities: ['ffmpeg', 'mediasync'], maxConcurrency: 1 };
const asAgent = (r) => r.set('Authorization', 'Bearer swan_agent_test');

describe('enrolment — admin only, token shown once', () => {
  it('mints a credential and says it cannot be retrieved again', async () => {
    enrolAgent.mockResolvedValue({ agent: { id: 'a1' }, token: 'swan_agent_secret' });
    const res = await request(app).post('/api/render-agents/enrol')
      .send({ id: 'a1', label: 'rig', capabilities: ['ffmpeg'] });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBe('swan_agent_secret');
    // The operator gets exactly one chance to copy it; the response must say so.
    expect(res.body.message).toMatch(/cannot be retrieved again/i);
  });

  it('refuses a non-admin', async () => {
    isAdmin = false;
    const res = await request(app).post('/api/render-agents/enrol').send({ id: 'a1', label: 'rig' });
    expect(res.status).toBe(403);
    expect(enrolAgent).not.toHaveBeenCalled();
  });

  it('passes validation failures through with their real status', async () => {
    enrolAgent.mockRejectedValue(new FakeAuthError(400, 'VALIDATION_ERROR', 'bad id'));
    const res = await request(app).post('/api/render-agents/enrol').send({ id: '!!', label: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('revokes rather than deletes, and 404s an unknown agent', async () => {
    revokeAgent.mockResolvedValue(false);
    expect((await request(app).post('/api/render-agents/nope/revoke')).status).toBe(404);
    revokeAgent.mockResolvedValue(true);
    expect((await request(app).post('/api/render-agents/a1/revoke')).status).toBe(200);
  });
});

describe('worker surface — refusals first', () => {
  it('rejects a request with no bearer token', async () => {
    authenticateAgent.mockRejectedValue(new FakeAuthError(401, 'NO_TOKEN', 'Agent token required.'));
    const res = await request(app).post('/api/render-agents/lease');
    expect(res.status).toBe(401);
    expect(leaseNextJob).not.toHaveBeenCalled();
  });

  it('rejects a revoked agent with 403, distinct from an unknown token', async () => {
    authenticateAgent.mockRejectedValue(new FakeAuthError(403, 'AGENT_REVOKED', 'revoked'));
    const res = await asAgent(request(app).post('/api/render-agents/lease'));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('AGENT_REVOKED');
  });

  /**
   * THE PRIVILEGE-ESCALATION TEST. If capabilities were read from the request body, any
   * worker could claim `capabilities: ['everything']` and lease jobs it cannot perform —
   * then either fail them in a loop or, worse, report fabricated completions.
   */
  it('ignores capabilities claimed in the request body', async () => {
    authenticateAgent.mockResolvedValue(AGENT);
    leaseNextJob.mockResolvedValue(null);
    await asAgent(request(app).post('/api/render-agents/lease'))
      .send({ capabilities: ['gpu-render', 'admin', 'everything'] });
    expect(leaseNextJob).toHaveBeenCalledWith({
      agentId: 'a1',
      capabilities: ['ffmpeg', 'mediasync'],   // from the ENROLLED record only
    });
  });

  it('cannot act on another agent\'s job by passing a different agentId', async () => {
    authenticateAgent.mockResolvedValue(AGENT);
    heartbeat.mockResolvedValue({ id: 'j' });
    await asAgent(request(app).post('/api/render-agents/jobs/j/heartbeat'))
      .send({ agentId: 'someone-else', progress: 50 });
    // agentId is taken from the authenticated identity, never from the body.
    expect(heartbeat.mock.calls[0][0].agentId).toBe('a1');
  });
});

describe('worker surface — the poll loop', () => {
  beforeEach(() => authenticateAgent.mockResolvedValue(AGENT));

  it('204s when there is no work, so idling stays cheap', async () => {
    leaseNextJob.mockResolvedValue(null);
    const res = await asAgent(request(app).post('/api/render-agents/lease'));
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns the leased job', async () => {
    leaseNextJob.mockResolvedValue({ id: 'j1', kind: 'generate', workflowId: 'mediasync:pair' });
    const res = await asAgent(request(app).post('/api/render-agents/lease'));
    expect(res.status).toBe(200);
    expect(res.body.data.job.id).toBe('j1');
  });

  it('requires an artifact key on completion', async () => {
    const res = await asAgent(request(app).post('/api/render-agents/jobs/j/complete')).send({});
    expect(res.status).toBe(400);
    expect(completeJob).not.toHaveBeenCalled();
  });

  it('forwards a lease conflict as 409 rather than swallowing it', async () => {
    // The sweeper may have reclaimed this job. The worker must learn that, not be told
    // its completion succeeded.
    completeJob.mockRejectedValue(new FakeJobError(409, 'LEASE_CONFLICT', 'lease lost'));
    const res = await asAgent(request(app).post('/api/render-agents/jobs/j/complete'))
      .send({ r2Key: 'jobs/j/out.json' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('LEASE_CONFLICT');
  });

  it('defaults a failure to RETRYABLE when the worker does not say', async () => {
    // A worker that cannot classify its own error must not silently burn the job's only
    // remaining attempt; the attempt counter still bounds the retries.
    failJob.mockResolvedValue({ id: 'j' });
    await asAgent(request(app).post('/api/render-agents/jobs/j/fail')).send({ errorMessage: 'boom' });
    expect(failJob.mock.calls[0][0].retryable).toBe(true);
  });

  it('honours an explicit permanent failure', async () => {
    failJob.mockResolvedValue({ id: 'j' });
    await asAgent(request(app).post('/api/render-agents/jobs/j/fail'))
      .send({ errorCode: 'AGENT_UNSUPPORTED', retryable: false });
    expect(failJob.mock.calls[0][0].retryable).toBe(false);
  });
});
