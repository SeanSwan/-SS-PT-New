/**
 * S7 — isolated PostgreSQL proof for mounted avatar marketplace transactions.
 *
 * This suite refuses every database except the dedicated loopback PostgreSQL
 * instance. It uses a synthetic AvatarHome table and the real mounted router,
 * route handler, Sequelize transaction, row lock, catalog and access gate.
 */
import express from 'express';
import request from 'supertest';
import { DataTypes, Sequelize } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const REQUIRED_DATABASE_URL = 'postgresql://swan_test@127.0.0.1:55432/sspt_full_site_repair_test';
const databaseUrl = process.env.SWAN_FULL_SITE_TEST_DATABASE_URL;

if (databaseUrl !== REQUIRED_DATABASE_URL) {
  throw new Error(
    'S7 PostgreSQL proof requires SWAN_FULL_SITE_TEST_DATABASE_URL to equal the dedicated loopback test URL exactly',
  );
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 8, min: 0, acquire: 30000, idle: 10000 },
});

const AvatarHome = sequelize.define('S7AvatarHome', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  unlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ownedItems: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  crystalBalance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 's7_avatar_marketplace_test_homes',
  timestamps: false,
});

let activeUserId = 7001;

vi.doMock('../../database.mjs', () => ({ default: sequelize }));
vi.doMock('../../models/AvatarHome.mjs', () => ({ default: AvatarHome }));
vi.doMock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer s7-test-token') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.user = { id: activeUserId, role: 'client' };
    return next();
  },
}));

const { default: avatarHomeRoutes } = await import('../../routes/avatarHomeRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/avatar-home', avatarHomeRoutes);
  return app;
}

const app = buildApp();

async function createHome(overrides = {}) {
  return AvatarHome.create({
    userId: activeUserId,
    unlocked: true,
    ownedItems: [],
    crystalBalance: 1000,
    ...overrides,
  });
}

async function currentHome() {
  return AvatarHome.findOne({ where: { userId: activeUserId } });
}

function marketplaceRequest(method, path) {
  const testRequest = request(app);
  return testRequest[method](path).set('Authorization', 'Bearer s7-test-token');
}

beforeAll(async () => {
  await sequelize.authenticate();
  await AvatarHome.sync({ force: true });
});

beforeEach(async () => {
  activeUserId = 7001;
  await AvatarHome.destroy({ where: {}, truncate: true, restartIdentity: true });
});

afterAll(async () => {
  await AvatarHome.drop();
  await sequelize.close();
});

describe('S7 mounted avatar marketplace — dedicated PostgreSQL proof', () => {
  it('enforces mounted authentication and the existing unlock gate', async () => {
    await createHome({ unlocked: false, crystalBalance: 1000 });

    const unauthenticated = await request(app).post('/api/avatar-home/marketplace/purchase').send({ itemId: 'starter_casual' });
    const locked = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });

    expect(unauthenticated.status).toBe(401);
    expect(locked.status).toBe(403);
    expect(locked.body).toEqual({ success: false, message: 'Reach Level 10 to unlock this feature' });
  });

  it('preserves two concurrent purchases under the row lock', async () => {
    await createHome({ crystalBalance: 700 });

    const [first, second] = await Promise.all([
      marketplaceRequest('post', '/api/avatar-home/marketplace/purchase').send({ itemId: 'starter_casual' }),
      marketplaceRequest('post', '/api/avatar-home/marketplace/purchase').send({ itemId: 'golden_dragon' }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const home = await currentHome();
    expect(home.crystalBalance).toBe(0);
    expect(home.ownedItems.map((item) => item.id).sort()).toEqual(['golden_dragon', 'starter_casual']);
  });

  it('uses the committed purchase receipt for a subsequent equip', async () => {
    await createHome({ crystalBalance: 100 });

    const purchase = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });
    const equip = await marketplaceRequest('post', '/api/avatar-home/marketplace/equip')
      .send({ itemId: 'starter_casual', target: 'active' });

    expect(purchase.status).toBe(200);
    expect(equip.status).toBe(200);
    expect((await currentHome()).ownedItems).toEqual([
      expect.objectContaining({ id: 'starter_casual', equippedIn: 'active' }),
    ]);
  });

  it('keeps insufficient balance and duplicate purchase state unchanged', async () => {
    await createHome({ crystalBalance: 99 });

    const insufficient = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });
    expect(insufficient.status).toBe(400);
    expect(insufficient.body).toEqual({ success: false, message: 'Not enough crystals' });
    expect((await currentHome()).crystalBalance).toBe(99);

    await AvatarHome.update({
      crystalBalance: 100,
      ownedItems: [{ id: 'starter_casual', type: 'outfit', name: 'Casual Workout Tee', rarity: 'common', equippedIn: null }],
    }, { where: { userId: activeUserId } });
    const duplicate = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ success: false, message: 'Already owned' });
    expect((await currentHome()).crystalBalance).toBe(100);
  });

  it('preserves both a concurrent purchase and an equip of an already owned item', async () => {
    await createHome({
      crystalBalance: 600,
      ownedItems: [{ id: 'starter_casual', type: 'outfit', name: 'Casual Workout Tee', rarity: 'common', equippedIn: null }],
    });
    const [purchase, equip] = await Promise.all([
      marketplaceRequest('post', '/api/avatar-home/marketplace/purchase').send({ itemId: 'golden_dragon' }),
      marketplaceRequest('post', '/api/avatar-home/marketplace/equip').send({ itemId: 'starter_casual', target: 'active' }),
    ]);
    expect(purchase.status).toBe(200);
    expect(equip.status).toBe(200);
    const home = await currentHome();
    expect(home.crystalBalance).toBe(0);
    expect(home.ownedItems).toHaveLength(2);
    expect(home.ownedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'starter_casual', equippedIn: 'active' }),
      expect.objectContaining({ id: 'golden_dragon' }),
    ]));
  });

  it('rolls back after the row write fails and allows the next purchase', async () => {
    await createHome({ crystalBalance: 100 });
    const originalUpdate = AvatarHome.prototype.update;
    const updateSpy = vi.spyOn(AvatarHome.prototype, 'update').mockImplementationOnce(async function updateThenFail(...args) {
      await originalUpdate.apply(this, args);
      throw new Error('synthetic post-write marketplace failure');
    });

    const failed = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });
    updateSpy.mockRestore();

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ success: false, message: 'Purchase failed' });
    expect((await currentHome()).crystalBalance).toBe(100);
    expect((await currentHome()).ownedItems).toEqual([]);

    const recovered = await marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' });
    expect(recovered.status).toBe(200);
    expect((await currentHome()).crystalBalance).toBe(0);
  });

  it('waits for a held row lock and evaluates the balance after release', async () => {
    await createHome({ crystalBalance: 100 });
    const heldTransaction = await sequelize.transaction();
    const heldHome = await AvatarHome.findOne({
      where: { userId: activeUserId },
      transaction: heldTransaction,
      lock: heldTransaction.LOCK.UPDATE,
    });
    await heldHome.update({ crystalBalance: 200 }, { transaction: heldTransaction });

    let releaseHeldTransaction;
    const releasePromise = new Promise((resolve) => { releaseHeldTransaction = resolve; });
    const heldCommit = releasePromise.then(() => heldTransaction.commit());
    let lockAttemptedResolve;
    const lockAttempted = new Promise((resolve) => { lockAttemptedResolve = resolve; });
    const originalFindOne = AvatarHome.findOne.bind(AvatarHome);
    const findSpy = vi.spyOn(AvatarHome, 'findOne').mockImplementation((...args) => {
      if (args[0]?.transaction) lockAttemptedResolve();
      return originalFindOne(...args);
    });

    const purchasePromise = marketplaceRequest('post', '/api/avatar-home/marketplace/purchase')
      .send({ itemId: 'starter_casual' })
      .then((response) => response);
    await lockAttempted;
    await new Promise((resolve) => setImmediate(resolve));
    releaseHeldTransaction();
    await heldCommit;
    const purchase = await purchasePromise;
    findSpy.mockRestore();

    expect(purchase.status).toBe(200);
    expect(purchase.body.data.crystalBalance).toBe(100);
    expect((await currentHome()).crystalBalance).toBe(100);
  });
});
