import express from 'express';
import request from 'supertest';
import { vi } from 'vitest';

const symbols = vi.hoisted(() => ({
  in: Symbol('in'),
  gte: Symbol('gte'),
  lte: Symbol('lte'),
}));

const mocks = vi.hoisted(() => ({
  listAssignedClientIds: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
  renewalFindAll: vi.fn(),
  renewalCount: vi.fn(),
  renewalFindByPk: vi.fn(),
  renewalFindOne: vi.fn(),
  renewalCreate: vi.fn(),
  update: vi.fn(),
  userModel: {},
  sessionModel: {},
}));

vi.mock('../database.mjs', () => ({
  Op: symbols,
  default: { fn: vi.fn(), col: vi.fn() },
}));

vi.mock('../models/index.mjs', () => ({
  Op: symbols,
  getModel: (name) => ({
    RenewalAlert: {
      findAll: mocks.renewalFindAll,
      count: mocks.renewalCount,
      findByPk: mocks.renewalFindByPk,
      findOne: mocks.renewalFindOne,
      create: mocks.renewalCreate,
    },
    ClientTrainerAssignment: {},
  }[name]),
  getUser: () => mocks.userModel,
  getSession: () => mocks.sessionModel,
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const raw = req.headers['x-test-user'];
    req.user = raw ? JSON.parse(raw) : null;
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    next();
  },
}));

vi.mock('../middleware/verifyClientAccess.mjs', () => ({
  listAssignedClientIds: mocks.listAssignedClientIds,
  assertAssignmentOrAdmin: mocks.assertAssignmentOrAdmin,
}));

const { default: renewalRouter } = await import('../routes/renewalAlertRoutes.mjs');

const trainer = (id = 101) => ({ id, role: 'trainer' });
const admin = (id = 1) => ({ id, role: 'admin' });

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/renewal-alerts', renewalRouter);
  return instance;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAssignedClientIds.mockResolvedValue([901, 902]);
  mocks.assertAssignmentOrAdmin.mockResolvedValue(true);
  mocks.renewalFindAll.mockResolvedValue([]);
  mocks.renewalCount.mockResolvedValue(0);
  mocks.renewalFindByPk.mockResolvedValue({
    id: 77,
    userId: 901,
    update: mocks.update,
  });
  mocks.renewalFindOne.mockResolvedValue(null);
  mocks.renewalCreate.mockResolvedValue({ id: 78, userId: 901 });
});

describe('renewal alert assignment boundary', () => {
  it('filters trainer collections before limit and enrichment', async () => {
    const response = await request(app())
      .get('/api/renewal-alerts?limit=1')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(response.status).toBe(200);
    expect(mocks.listAssignedClientIds).toHaveBeenCalledWith(101);
    expect(mocks.renewalFindAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 1,
      where: expect.objectContaining({
        status: 'active',
        userId: expect.objectContaining({ [symbols.in]: expect.anything() }),
      }),
    }));
    const query = mocks.renewalFindAll.mock.calls[0][0];
    expect(query.where.userId[symbols.in]).toEqual([901, 902]);
  });

  it('keeps an empty active assignment set empty instead of falling back to global alerts', async () => {
    mocks.listAssignedClientIds.mockResolvedValue([]);

    const response = await request(app())
      .get('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(response.status).toBe(200);
    expect(mocks.renewalFindAll).toHaveBeenCalled();
    const query = mocks.renewalFindAll.mock.calls[0][0];
    expect(query.where.userId?.[symbols.in]).toEqual([]);
  });

  it('applies the same fresh assignment scope to critical alerts and every stats aggregate', async () => {
    const critical = await request(app())
      .get('/api/renewal-alerts/critical')
      .set('x-test-user', JSON.stringify(trainer()));
    const stats = await request(app())
      .get('/api/renewal-alerts/stats')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(critical.status).toBe(200);
    expect(stats.status).toBe(200);
    const criticalQuery = mocks.renewalFindAll.mock.calls[0][0];
    expect(criticalQuery.where.userId[symbols.in]).toEqual([901, 902]);
    expect(mocks.renewalCount).toHaveBeenCalledTimes(5);
    for (const [query] of mocks.renewalCount.mock.calls) {
      expect(query.where.userId[symbols.in]).toEqual([901, 902]);
    }
    const statsDistributionQuery = mocks.renewalFindAll.mock.calls[1][0];
    expect(statsDistributionQuery.where.userId[symbols.in]).toEqual([901, 902]);
  });

  it('returns unavailable when assignment lookup fails, without reading alerts', async () => {
    const unavailable = new Error('Assignment lookup unavailable');
    unavailable.code = 'ASSIGNMENT_LOOKUP_UNAVAILABLE';
    mocks.listAssignedClientIds.mockRejectedValue(unavailable);

    const response = await request(app())
      .get('/api/renewal-alerts/stats')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(response.status).toBe(503);
    expect(response.body.error).toBeUndefined();
    expect(mocks.renewalCount).not.toHaveBeenCalled();
    expect(mocks.renewalFindAll).not.toHaveBeenCalled();
  });

  it('denies a cross-client user read before alert reads', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .get('/api/renewal-alerts/user/902')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(response.status).toBe(403);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(
      101,
      'trainer',
      902,
      { throwOnUnavailable: true },
    );
    expect(mocks.renewalFindAll).not.toHaveBeenCalled();
  });

  it('authorizes the persisted alert owner before any row mutation', async () => {
    mocks.renewalFindByPk.mockResolvedValue({ id: 77, userId: 902, update: mocks.update });
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .patch('/api/renewal-alerts/77/contacted')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(403);
    expect(mocks.renewalFindByPk).toHaveBeenCalledWith(77);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing alert before assignment checks or writes', async () => {
    mocks.renewalFindByPk.mockResolvedValue(null);

    const response = await request(app())
      .patch('/api/renewal-alerts/77/contacted')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(404);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ['/contacted', 'contacted'],
    ['/renewed', 'renewed'],
    ['/dismissed', 'dismissed'],
  ])('blocks cross-client %s mutation before writing', async (path) => {
    mocks.renewalFindByPk.mockResolvedValue({ id: 77, userId: 902, update: mocks.update });
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .patch(`/api/renewal-alerts/77${path}`)
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ['/contacted', 'contacted'],
    ['/renewed', 'renewed'],
    ['/dismissed', 'dismissed'],
  ])('allows an assigned trainer to complete the %s mutation', async (path) => {
    const response = await request(app())
      .patch(`/api/renewal-alerts/77${path}`)
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('returns sanitized 503 on a mutation assignment lookup outage without writing', async () => {
    const unavailable = new Error('synthetic database outage');
    unavailable.code = 'ASSIGNMENT_LOOKUP_UNAVAILABLE';
    mocks.assertAssignmentOrAdmin.mockRejectedValue(unavailable);

    const response = await request(app())
      .patch('/api/renewal-alerts/77/contacted')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Client access is temporarily unavailable');
    expect(response.body.message).not.toContain('synthetic');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects malformed identifiers without model or assignment reads', async () => {
    const response = await request(app())
      .patch('/api/renewal-alerts/not-an-id/dismissed')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ notes: 'synthetic' });

    expect(response.status).toBe(400);
    expect(mocks.renewalFindByPk).not.toHaveBeenCalled();
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
  });

  it('allows an assigned trainer to create a manual alert and keeps admin global access', async () => {
    const trainerResponse = await request(app())
      .post('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ userId: 901, notes: 'synthetic' });
    const adminResponse = await request(app())
      .post('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(admin()))
      .send({ userId: 999, notes: 'synthetic' });

    expect(trainerResponse.status).toBe(201);
    expect(adminResponse.status).toBe(201);
    expect(mocks.renewalCreate).toHaveBeenCalled();
  });

  it('blocks manual creation for an unassigned trainer before reading or writing an alert', async () => {
    mocks.assertAssignmentOrAdmin.mockResolvedValue(false);

    const response = await request(app())
      .post('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ userId: 902, notes: 'synthetic' });

    expect(response.status).toBe(403);
    expect(mocks.renewalFindOne).not.toHaveBeenCalled();
    expect(mocks.renewalCreate).not.toHaveBeenCalled();
  });

  it.each([0, false, [], {}])('rejects malformed manual-alert client ID %j before reads or writes', async (userId) => {
    const response = await request(app())
      .post('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()))
      .send({ userId, notes: 'synthetic' });

    expect(response.status).toBe(400);
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.renewalFindOne).not.toHaveBeenCalled();
    expect(mocks.renewalCreate).not.toHaveBeenCalled();
  });

  it('re-reads assignment scope after revocation instead of reusing a prior roster', async () => {
    mocks.listAssignedClientIds
      .mockResolvedValueOnce([901])
      .mockResolvedValueOnce([]);

    const first = await request(app())
      .get('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()));
    const second = await request(app())
      .get('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(trainer()));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.listAssignedClientIds).toHaveBeenCalledTimes(2);
    const secondQuery = mocks.renewalFindAll.mock.calls[1][0];
    expect(secondQuery.where.userId[symbols.in]).toEqual([]);
  });

  it('keeps admin collections global', async () => {
    const response = await request(app())
      .get('/api/renewal-alerts')
      .set('x-test-user', JSON.stringify(admin()));

    expect(response.status).toBe(200);
    const query = mocks.renewalFindAll.mock.calls[0][0];
    expect(query.where.userId).toBeUndefined();
    expect(mocks.listAssignedClientIds).not.toHaveBeenCalled();
  });
});
