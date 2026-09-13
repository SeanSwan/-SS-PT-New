/**
 * Manual grant atomicity contract.
 *
 * These tests use a transaction-shaped model double to lock the handler's
 * protocol before the live PostgreSQL proof runs in tests/integration/.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByPk: vi.fn(),
  transaction: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 9001, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: mocks.info,
    warn: mocks.warn,
    error: mocks.error,
    debug: vi.fn(),
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: {
    findByPk: mocks.findByPk,
    sequelize: { transaction: mocks.transaction },
  },
}));

const { default: sessionPackageManualGrantRoutes } = await import('../routes/sessionPackageManualGrantRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageManualGrantRoutes);
  return app;
}

function makeTransaction() {
  return {
    LOCK: { UPDATE: 'UPDATE' },
    finished: undefined,
    commit: vi.fn(async function commit() {
      this.finished = 'commit';
    }),
    rollback: vi.fn(async function rollback() {
      this.finished = 'rollback';
    }),
  };
}

function makeUser({ balance = 10, clientSource = 'swanstudios', sessionBillingMode = 'paid_sessions', increment } = {}) {
  const user = {
    id: 7,
    firstName: 'Synthetic',
    lastName: 'Grant',
    role: 'client',
    clientSource,
    sessionBillingMode,
    availableSessions: balance,
    increment: increment || vi.fn(async (_field, { by }) => {
      user.availableSessions += by;
    }),
    reload: vi.fn(async () => user),
  };
  return user;
}

describe('manual grant atomic transaction contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async () => makeTransaction());
  });

  it('locks the canonical user row and commits each concurrent grant', async () => {
    let persistedBalance = 10;
    mocks.findByPk.mockImplementation(async () => makeUser({
      balance: persistedBalance,
      increment: vi.fn(async (_field, { by }) => {
        persistedBalance += by;
      }),
    }));

    const app = buildApp();
    const [first, second] = await Promise.all([
      request(app).post('/api/session-packages/add-sessions').send({ clientId: 7, sessions: 5 }),
      request(app).post('/api/session-packages/add-sessions').send({ clientId: 7, sessions: 7 }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(persistedBalance).toBe(22);
    expect(mocks.findByPk).toHaveBeenCalledTimes(2);
    for (const call of mocks.findByPk.mock.calls) {
      expect(call[0]).toBe(7);
      expect(call[1].lock).toBe('UPDATE');
      expect(call[1].transaction).toBeDefined();
    }
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.info).toHaveBeenCalledWith('Manual session grant applied', expect.objectContaining({
      targetUserId: 7,
      sessionsAdded: expect.any(Number),
      newBalance: expect.any(Number),
    }));
    expect(mocks.info.mock.calls.flat()).not.toContain(expect.stringContaining('Notes:'));
  });

  it('rolls back failed increments and reports the existing server-error shape', async () => {
    const transaction = makeTransaction();
    mocks.transaction.mockResolvedValue(transaction);
    const increment = vi.fn(async () => {
      throw new Error('synthetic increment failure');
    });
    const user = makeUser({ increment });
    mocks.findByPk.mockResolvedValue(user);

    const response = await request(buildApp())
      .post('/api/session-packages/add-sessions')
      .send({ clientId: 7, sessions: 5, notes: 'private note must not be logged' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Server error adding sessions' });
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
    expect(transaction.commit).not.toHaveBeenCalled();
    expect(mocks.info).not.toHaveBeenCalled();
    expect(mocks.error.mock.calls.flat().join(' ')).not.toContain('private note');
  });

  it('rejects a balance overflow before increment and rolls back', async () => {
    const transaction = makeTransaction();
    mocks.transaction.mockResolvedValue(transaction);
    const increment = vi.fn();
    mocks.findByPk.mockResolvedValue(makeUser({
      balance: Number.MAX_SAFE_INTEGER - 1,
      increment,
    }));

    const response = await request(buildApp())
      .post('/api/session-packages/add-sessions')
      .send({ clientId: 7, sessions: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Session balance exceeds the database integer limit',
    });
    expect(increment).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('keeps free-tracking clients non-deducting and rolls back', async () => {
    const transaction = makeTransaction();
    mocks.transaction.mockResolvedValue(transaction);
    const increment = vi.fn();
    mocks.findByPk.mockResolvedValue(makeUser({ clientSource: 'external', increment }));

    const response = await request(buildApp())
      .post('/api/session-packages/add-sessions')
      .send({ clientId: 7, sessions: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Manual paid-session grants are disabled for free-tracking clients',
    });
    expect(increment).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });
});
