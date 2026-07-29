/**
 * ============================================================================
 * FILE: creditsCommissionTrainerType.test.mjs
 * PURPOSE: Regression lock — the credit-grant rails must pay an INDEPENDENT
 *          trainer 85%, not the affiliated default of 65%.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-29
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `creditsController.adminPurchaseAndGrant` called `calculateCommissionSplit`
 * with only 4 arguments. The 5th (`{ trainerType }`) was never passed, so the
 * calculator fell through `options.trainerType || 'hired'` into its else-branch
 * and wrote a 35/65 split for EVERY trainer — including independents who are
 * owed 15/85. That is a constant 20 points of gross short on every package.
 *
 * The split is PERSISTED to `trainer_commissions`, which is what payouts read,
 * so these tests assert the persisted row — not the response body (which does
 * not even expose the rates).
 *
 * Both rails are driven because the trainer-facing route self-assigns
 * `req.user.id`, meaning an independent trainer shorts THEMSELVES.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  users: new Map(),
  storefrontItem: { findByPk: vi.fn() },
  order: { create: vi.fn() },
  orderItem: { create: vi.fn() },
  trainerCommission: { create: vi.fn() },
  clientTrainerAssignment: { findOne: vi.fn() },
  transaction: { commit: vi.fn(), rollback: vi.fn() },
  countCompletedPaidTrainingSessions: vi.fn(),
}));

const userModel = {
  findByPk: vi.fn(async (id) => mocks.users.get(Number(id)) ?? null),
};

vi.mock('../../models/index.mjs', () => ({
  getUser: () => userModel,
  getModel: (name) => {
    switch (name) {
      case 'Order': return mocks.order;
      case 'OrderItem': return mocks.orderItem;
      case 'StorefrontItem': return mocks.storefrontItem;
      case 'TrainerCommission': return mocks.trainerCommission;
      case 'ClientTrainerAssignment': return mocks.clientTrainerAssignment;
      case 'Session': return {};
      case 'DailyWorkoutForm': return {};
      default: return {};
    }
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => mocks.transaction) },
}));

// Tax is not under test — keep it at zero so gross === package cost.
vi.mock('../../utils/taxCalculator.mjs', () => ({
  calculateTax: vi.fn(async (packageCost) => ({
    grossAmount: packageCost,
    taxRate: 0,
    taxAmount: 0,
    netAfterTax: packageCost,
    taxChargedToClient: false,
    clientState: null,
  })),
}));

vi.mock('../../services/creditGrantLoyaltyService.mjs', () => ({
  countCompletedPaidTrainingSessions: mocks.countCompletedPaidTrainingSessions,
}));

// Auth is not under test — the route guards are covered elsewhere. The role is
// swapped per-test so each rail can be driven as its real caller.
let currentUser = { id: 1, role: 'admin' };
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

const creditsRoutes = (await import('../../routes/creditsRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', creditsRoutes);
  return app;
}

/** $8,400 / 96-session package — a real SwanStudios 3-month tier. */
const PACKAGE = {
  id: 501,
  name: '3-Month Training',
  description: '3 months',
  packageType: 'fixed',
  sessions: 48,
  totalCost: '8400.00',
  isActive: true,
};

function seedClient() {
  const client = {
    id: 9001,
    role: 'client',
    email: 'client@example.test',
    firstName: 'Test',
    lastName: 'Client',
    availableSessions: 0,
    update: vi.fn(async () => {}),
  };
  mocks.users.set(client.id, client);
  return client;
}

function seedTrainer(trainerType) {
  const trainer = {
    id: 7001,
    role: 'trainer',
    email: 'trainer@example.test',
    firstName: 'Test',
    lastName: 'Trainer',
    trainerType,
  };
  mocks.users.set(trainer.id, trainer);
  return trainer;
}

function commissionRow() {
  expect(mocks.trainerCommission.create).toHaveBeenCalledTimes(1);
  return mocks.trainerCommission.create.mock.calls[0][0];
}

describe('credit-grant commission truth: trainerType must reach the calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.users.clear();
    currentUser = { id: 1, role: 'admin' };
    mocks.storefrontItem.findByPk.mockResolvedValue(PACKAGE);
    mocks.order.create.mockImplementation(async (payload) => ({ id: 12345, ...payload }));
    mocks.orderItem.create.mockResolvedValue({ id: 1 });
    mocks.trainerCommission.create.mockResolvedValue({ id: 1 });
    mocks.clientTrainerAssignment.findOne.mockResolvedValue({ id: 1, status: 'active' });
    mocks.countCompletedPaidTrainingSessions.mockResolvedValue(0);
  });

  it('admin rail: an INDEPENDENT trainer is persisted at 85%, not 65%', async () => {
    seedClient();
    seedTrainer('independent');

    const res = await request(makeApp())
      .post('/api/admin/credits/purchase-and-grant')
      .send({
        clientId: 9001,
        storefrontItemId: 501,
        trainerId: 7001,
        leadSource: 'platform',
      });

    expect(res.status).toBe(200);
    const row = commissionRow();
    expect(row.commissionRateTrainer).toBe(85);
    expect(row.commissionRateBusiness).toBe(15);
    // 85% of $8,400 — the $1,680 that was being withheld.
    expect(row.trainerCut).toBe(7140);
    expect(row.businessCut).toBe(1260);
  });

  it('admin rail: an AFFILIATED trainer stays at 65% (no regression)', async () => {
    seedClient();
    seedTrainer('affiliated');

    const res = await request(makeApp())
      .post('/api/admin/credits/purchase-and-grant')
      .send({
        clientId: 9001,
        storefrontItemId: 501,
        trainerId: 7001,
        leadSource: 'platform',
      });

    expect(res.status).toBe(200);
    const row = commissionRow();
    expect(row.commissionRateTrainer).toBe(65);
    expect(row.commissionRateBusiness).toBe(35);
  });

  it('admin rail: a trainer with NO trainerType set falls back to affiliated 65%', async () => {
    seedClient();
    seedTrainer(null);

    const res = await request(makeApp())
      .post('/api/admin/credits/purchase-and-grant')
      .send({
        clientId: 9001,
        storefrontItemId: 501,
        trainerId: 7001,
        leadSource: 'platform',
      });

    expect(res.status).toBe(200);
    expect(commissionRow().commissionRateTrainer).toBe(65);
  });

  it('trainer rail: an independent trainer buying for their own client is NOT short-changed', async () => {
    seedClient();
    seedTrainer('independent');
    currentUser = { id: 7001, role: 'trainer' };

    const res = await request(makeApp())
      .post('/api/trainer/credits/purchase-and-grant')
      .send({
        clientId: 9001,
        storefrontItemId: 501,
        leadSource: 'platform',
      });

    expect(res.status).toBe(200);
    const row = commissionRow();
    expect(row.trainerId).toBe(7001);
    expect(row.commissionRateTrainer).toBe(85);
    expect(row.trainerCut).toBe(7140);
  });

  it('the trainer-type lookup survives lead-source and loyalty modifiers', async () => {
    seedClient();
    seedTrainer('independent');
    // trainer_brought takes 5 points off the business cut: 15 -> 10, trainer 90.
    const res = await request(makeApp())
      .post('/api/admin/credits/purchase-and-grant')
      .send({
        clientId: 9001,
        storefrontItemId: 501,
        trainerId: 7001,
        leadSource: 'trainer_brought',
      });

    expect(res.status).toBe(200);
    const row = commissionRow();
    expect(row.commissionRateBusiness).toBe(10);
    expect(row.commissionRateTrainer).toBe(90);
  });
});
