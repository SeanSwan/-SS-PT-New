import express from 'express';
import request from 'supertest';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  resolveClient: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
  startDebate: vi.fn(),
  getDebateStatus: vi.fn(),
  getDebateResult: vi.fn(),
  getDebateJob: vi.fn(),
  deIdentifyClient: vi.fn(),
}));

vi.mock('../database.mjs', () => ({
  default: { query: mocks.query, QueryTypes: { SELECT: 'SELECT' } },
  QueryTypes: { SELECT: 'SELECT' },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const raw = req.headers['x-test-user'];
    req.user = raw ? JSON.parse(raw) : null;
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    next();
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user?.role === 'trainer' || req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, error: 'Trainer or admin access required' });
  },
}));

vi.mock('../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
}));

vi.mock('../services/ai/clientResolver.mjs', () => ({
  resolveClient: mocks.resolveClient,
}));

vi.mock('../services/ai/debate/debateOrchestrator.mjs', () => ({
  startDebate: mocks.startDebate,
  getDebateStatus: mocks.getDebateStatus,
  getDebateResult: mocks.getDebateResult,
  getDebateJob: mocks.getDebateJob,
}));

vi.mock('../services/ai/deIdentifier.mjs', () => ({
  deIdentifyClient: mocks.deIdentifyClient,
}));

const { default: debateRouter } = await import('../routes/aiDebateRoutes.mjs');

const trainer = (id = 101) => ({ id, role: 'trainer' });
const admin = (id = 1) => ({ id, role: 'admin' });

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/ai/debate', debateRouter);
  return instance;
}

function seedClientQuery(client = { id: 901, isActive: true, firstName: 'A', lastName: 'Client' }) {
  mocks.query.mockImplementation(async (sql) => {
    if (String(sql).includes('FROM "Users"')) return client ? [client] : [];
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertAssignmentOrAdmin.mockResolvedValue(true);
  mocks.resolveClient.mockResolvedValue({
    resolved: { id: 901, firstName: 'A', lastName: 'Client' },
    suggestions: [],
    error: null,
  });
  mocks.deIdentifyClient.mockReturnValue({ deIdentified: { client: 'synthetic' } });
  mocks.startDebate.mockReturnValue('job-901');
  seedClientQuery();
});

describe('AI debate start assignment boundary', () => {
  it('denies an unassigned trainer before client-domain reads or debate/provider work', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('passes trainer scope into client-reference resolution and rechecks the resolved assignment', async () => {
    mocks.resolveClient.mockResolvedValue({
      resolved: { id: 901, firstName: 'A', lastName: 'Client' },
      suggestions: [],
      error: null,
    });
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientRef: 'A Client' });

    expect(response.status).toBe(403);
    expect(mocks.resolveClient).toHaveBeenCalledWith(
      'A Client',
      expect.anything(),
      { trainerId: 101 },
    );
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('rejects malformed direct IDs before assignment, domain, or provider work', async () => {
    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientId: '901.5' });

    expect(response.status).toBe(400);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it.each([0, false, [], {}])('rejects malformed direct ID payload %j before any work', async (clientId) => {
    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientId });

    expect(response.status).toBe(400);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('denies a client role at the staff gate before assignment or client-domain work', async () => {
    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify({ id: 901, role: 'client' }))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(403);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('returns sanitized 503 on an opted-in assignment lookup outage before any domain/provider work', async () => {
    const unavailable = new Error('synthetic database outage');
    unavailable.code = 'ASSIGNMENT_LOOKUP_UNAVAILABLE';
    mocks.assertAssignmentOrAdmin.mockRejectedValue(unavailable);

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Client access is temporarily unavailable');
    expect(response.body.error).not.toContain('synthetic');
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('allows an assigned trainer and starts only after the authorization boundary', async () => {
    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(200);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(
      101,
      'trainer',
      901,
      { throwOnUnavailable: true },
    );
    expect(mocks.query).toHaveBeenCalled();
    expect(mocks.startDebate).toHaveBeenCalledWith(
      'workout_plan',
      { client: 'synthetic' },
      101,
      {},
    );
  });

  it('preserves admin access without requiring an assignment row', async () => {
    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(admin()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(200);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(
      1,
      'admin',
      901,
      { throwOnUnavailable: true },
    );
    expect(mocks.startDebate).toHaveBeenCalled();
  });

  it('returns not-found after an authorized lookup finds no active client', async () => {
    seedClientQuery(null);

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(admin()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(404);
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('returns sanitized 503 when required health enrichment fails before provider work', async () => {
    mocks.query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM "Users"')) {
        return [{ id: 901, isActive: true, firstName: 'A', lastName: 'Client' }];
      }
      if (String(sql).includes('client_pain_entries')) {
        throw new Error('synthetic pain table outage');
      }
      return [];
    });

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(admin()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Client health data is temporarily unavailable');
    expect(JSON.stringify(response.body)).not.toContain('synthetic');
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });

  it('returns sanitized 503 when the authorized client profile lookup fails', async () => {
    mocks.query.mockRejectedValueOnce(new Error('synthetic profile database outage'));

    const response = await request(app())
      .post('/api/ai/debate/start')
      .set('x-test-user', JSON.stringify(admin()))
      .send({ debateType: 'workout_plan', clientId: 901 });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Client health data is temporarily unavailable');
    expect(JSON.stringify(response.body)).not.toContain('synthetic');
    expect(mocks.startDebate).not.toHaveBeenCalled();
  });
});
