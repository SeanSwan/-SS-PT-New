/**
 * S3-T6 — live PostgreSQL proof for manual session grant atomicity.
 *
 * This suite intentionally refuses every database except the dedicated
 * loopback PostgreSQL 17 instance named by the S3 contract. It defines a
 * minimal synthetic User model on that database and imports the real manual
 * grant router, so HTTP, Sequelize transactions, row locks and SQL updates
 * all execute without loading the application's .env or production models.
 */
import express from 'express';
import request from 'supertest';
import { DataTypes, Sequelize } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const REQUIRED_DATABASE_URL = 'postgresql://swan_test@127.0.0.1:55432/sspt_full_site_repair_test';
const databaseUrl = process.env.SWAN_FULL_SITE_TEST_DATABASE_URL;

if (databaseUrl !== REQUIRED_DATABASE_URL) {
  throw new Error(
    'S3 PostgreSQL proof requires SWAN_FULL_SITE_TEST_DATABASE_URL to equal the dedicated loopback test URL exactly',
  );
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 8, min: 0, acquire: 30000, idle: 10000 },
});

const User = sequelize.define('ManualGrantTestUser', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  availableSessions: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  clientSource: { type: DataTypes.STRING, allowNull: true },
  sessionBillingMode: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 's3_manual_grant_test_users',
  timestamps: false,
});

const loggerInfo = vi.fn();
const loggerError = vi.fn();

vi.doMock('../../models/User.mjs', () => ({ default: User }));
vi.doMock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 9001, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));
vi.doMock('../../utils/logger.mjs', () => ({
  default: {
    info: loggerInfo,
    warn: vi.fn(),
    error: loggerError,
    debug: vi.fn(),
  },
}));

const { default: sessionPackageManualGrantRoutes } = await import('../../routes/sessionPackageManualGrantRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageManualGrantRoutes);
  return app;
}

const app = buildApp();

async function createFixture(overrides = {}) {
  return User.create({
    firstName: 'S3',
    lastName: 'Synthetic',
    role: 'user',
    availableSessions: 10,
    clientSource: 'swanstudios',
    sessionBillingMode: 'paid_sessions',
    ...overrides,
  });
}

async function balanceOf(id) {
  const user = await User.findByPk(id);
  return user?.availableSessions;
}

beforeAll(async () => {
  await sequelize.authenticate();
  await User.sync({ force: true });
});

beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  loggerInfo.mockClear();
  loggerError.mockClear();
});

afterAll(async () => {
  await User.drop();
  await sequelize.close();
});

describe('S3 manual grant route — dedicated PostgreSQL proof', () => {
  it('preserves both concurrent grants under independent HTTP transactions', async () => {
    const user = await createFixture();

    const [first, second] = await Promise.all([
      request(app).post('/api/session-packages/add-sessions').send({ clientId: user.id, sessions: 5 }),
      request(app).post('/api/session-packages/add-sessions').send({ clientId: user.id, sessions: 7 }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await balanceOf(user.id)).toBe(22);
    const firstBalance = first.body.user.availableSessions;
    const secondBalance = second.body.user.availableSessions;
    expect(
      (firstBalance === 15 && secondBalance === 22)
      || (firstBalance === 22 && secondBalance === 17),
    ).toBe(true);
  });

  it('preserves a booking-style deduction interleaved with a grant', async () => {
    const user = await createFixture();

    const deduction = sequelize.transaction(async (transaction) => {
      const locked = await User.findByPk(user.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await locked.increment('availableSessions', { by: -1, transaction });
    });
    const grant = request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 5 });

    const [deductionResult, grantResult] = await Promise.all([deduction, grant]);

    expect(deductionResult).toBeUndefined();
    expect(grantResult.status).toBe(200);
    expect(await balanceOf(user.id)).toBe(14);
  });

  it('waits for a held row lock and reports the held transaction balance', async () => {
    const user = await createFixture();
    const heldTransaction = await sequelize.transaction();
    const heldUser = await User.findByPk(user.id, {
      transaction: heldTransaction,
      lock: heldTransaction.LOCK.UPDATE,
    });
    await heldUser.increment('availableSessions', { by: 3, transaction: heldTransaction });

    let releaseHeldTransaction;
    const releasePromise = new Promise((resolve) => {
      releaseHeldTransaction = resolve;
    });
    const heldCommit = releasePromise.then(() => heldTransaction.commit());

    let lockAttemptedResolve;
    const lockAttempted = new Promise((resolve) => {
      lockAttemptedResolve = resolve;
    });
    const originalFindByPk = User.findByPk.bind(User);
    const findSpy = vi.spyOn(User, 'findByPk').mockImplementation((...args) => {
      const result = originalFindByPk(...args);
      if (args[1]?.transaction) lockAttemptedResolve();
      return result;
    });

    const grantPromise = request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 5 })
      .then((response) => response);
    await lockAttempted;
    // Allow the SELECT ... FOR UPDATE to be dispatched before controlled release.
    await new Promise((resolve) => setImmediate(resolve));
    releaseHeldTransaction();
    await heldCommit;
    const grant = await grantPromise;
    findSpy.mockRestore();

    expect(grant.status).toBe(200);
    expect(grant.body.user.availableSessions).toBe(18);
    expect(await balanceOf(user.id)).toBe(18);
    expect(loggerInfo).toHaveBeenCalledWith('Manual session grant applied', expect.objectContaining({
      targetUserId: user.id,
      previousBalance: 13,
      newBalance: 18,
    }));
  });

  it('rolls back after increment succeeds and allows the next grant', async () => {
    const user = await createFixture();
    const reloadSpy = vi.spyOn(User.prototype, 'reload').mockImplementationOnce(async () => {
      throw new Error('synthetic post-increment receipt failure');
    });

    const failed = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 5 });
    reloadSpy.mockRestore();

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ success: false, message: 'Server error adding sessions' });
    expect(await balanceOf(user.id)).toBe(10);

    const recovered = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 5 });

    expect(recovered.status).toBe(200);
    expect(recovered.body.user.availableSessions).toBe(15);
    expect(await balanceOf(user.id)).toBe(15);
  });

  it('normalizes a persisted NULL balance to zero under the row lock', async () => {
    const user = await createFixture({ availableSessions: null });

    const response = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 5 });

    expect(response.status).toBe(200);
    expect(response.body.user.availableSessions).toBe(5);
    expect(await balanceOf(user.id)).toBe(5);
  });

  it('rejects a database integer overflow without mutating the balance', async () => {
    const user = await createFixture({ availableSessions: 2147483647 });

    const response = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 1 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Session balance exceeds the database integer limit',
    });
    expect(await balanceOf(user.id)).toBe(2147483647);
  });

  it('rejects malformed and unsafe amounts before opening a write transaction', async () => {
    const user = await createFixture();

    for (const sessions of [2.5, '1e3', '9007199254740992']) {
      const response = await request(app)
        .post('/api/session-packages/add-sessions')
        .send({ clientId: user.id, sessions });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, message: 'Valid number of sessions is required' });
    }
    expect(await balanceOf(user.id)).toBe(10);
  });

  it('keeps missing and free-tracking targets unchanged with their existing responses', async () => {
    const freeUser = await createFixture({ clientSource: 'external' });

    const missing = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: freeUser.id + 100000, sessions: 2 });
    const free = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: freeUser.id, sessions: 2 });

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ success: false, message: 'User not found' });
    expect(free.status).toBe(409);
    expect(free.body).toEqual({
      success: false,
      message: 'Manual paid-session grants are disabled for free-tracking clients',
    });
    expect(await balanceOf(freeUser.id)).toBe(10);
  });

  it('records a structured grant log without request notes or client payload', async () => {
    const user = await createFixture();

    const response = await request(app)
      .post('/api/session-packages/add-sessions')
      .send({ clientId: user.id, sessions: 2, notes: 'synthetic private note' });

    expect(response.status).toBe(200);
    expect(loggerInfo).toHaveBeenCalledWith('Manual session grant applied', expect.objectContaining({
      actorUserId: 9001,
      targetUserId: user.id,
      sessionsAdded: 2,
      previousBalance: 10,
      newBalance: 12,
    }));
    expect(JSON.stringify(loggerInfo.mock.calls)).not.toContain('synthetic private note');
  });
});
