/**
 * ============================================================================
 * FILE: adminPackageMutationAudit.test.mjs
 * PURPOSE: Regression lock — every mutation of the revenue catalog must record
 *          WHICH admin did it.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-29
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `adminPackageRoutes.mjs` is gated by `protect` + `requireAdmin` — so ANY
 * `role === 'admin'` user can create, reprice, or delete a storefront package
 * or variant. All six mutating handlers logged "Admin did X" with no actor id,
 * so in a multi-admin production tenant there was no record of who repriced or
 * deleted a package. The file already had the `{ userId: req.user?.id }`
 * pattern on its upload-rejection path; the mutations just never used it.
 *
 * Deletion itself is tombstone-safe by design and is NOT the defect here:
 * `order_items.storefrontItemId` and `.productVariantId` are both
 * `ON DELETE SET NULL`, the original ids are copied into `order_items.metadata`
 * by migration 20260711000001, and OrderItem denormalises name/price/subtotal —
 * so financial history survives a catalog delete. Attribution was the gap.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storefrontItem: { create: vi.fn(), findByPk: vi.fn() },
  productVariant: { findByPk: vi.fn() },
  loggerInfo: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    StorefrontItem: mocks.storefrontItem,
    ProductVariant: mocks.productVariant,
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: mocks.loggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/photoStorageService.mjs', () => ({
  uploadPhoto: vi.fn(),
}));

const ACTOR_ID = 4242;
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: ACTOR_ID, role: 'admin', email: 'admin@example.test' };
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

const adminPackageRoutes = (await import('../../routes/adminPackageRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/packages', adminPackageRoutes);
  return app;
}

/** Every logger.info payload that carried an actorId, flattened. */
function auditedCalls() {
  return mocks.loggerInfo.mock.calls.filter(
    ([, meta]) => meta && Object.prototype.hasOwnProperty.call(meta, 'actorId'),
  );
}

describe('revenue-catalog mutations are attributable to an actor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CREATE package records the acting admin', async () => {
    mocks.storefrontItem.create.mockResolvedValue({ id: 77, name: 'New Pack' });

    const res = await request(makeApp())
      .post('/api/admin/packages')
      // pricePerSession is required for non-product packages (see the handler's
      // missingPackagePrice guard) — omit it and this 400s before ever logging.
      .send({ name: 'New Pack', packageType: 'fixed', sessions: 10, pricePerSession: 175, totalCost: 1750 });

    expect(res.status).toBe(201);
    const audited = auditedCalls();
    expect(audited).toHaveLength(1);
    expect(audited[0][1].actorId).toBe(ACTOR_ID);
  });

  it('UPDATE package records the acting admin', async () => {
    mocks.storefrontItem.findByPk.mockResolvedValue({
      id: 77, name: 'Existing Pack', update: vi.fn(async () => {}),
    });

    const res = await request(makeApp())
      .put('/api/admin/packages/77')
      .send({ totalCost: 9999 });

    expect(res.status).toBe(200);
    const audited = auditedCalls();
    expect(audited).toHaveLength(1);
    expect(audited[0][1].actorId).toBe(ACTOR_ID);
  });

  it('DELETE package records the acting admin', async () => {
    mocks.storefrontItem.findByPk.mockResolvedValue({
      id: 77, name: 'Doomed Pack', destroy: vi.fn(async () => {}),
    });

    const res = await request(makeApp()).delete('/api/admin/packages/77');

    expect(res.status).toBe(200);
    const audited = auditedCalls();
    expect(audited).toHaveLength(1);
    expect(audited[0][1].actorId).toBe(ACTOR_ID);
  });

  it('UPDATE variant records the acting admin', async () => {
    mocks.productVariant.findByPk.mockResolvedValue({
      id: 5, update: vi.fn(async () => {}),
    });

    const res = await request(makeApp())
      .put('/api/admin/packages/variants/5')
      .send({ isActive: false });

    expect(res.status).toBe(200);
    const audited = auditedCalls();
    expect(audited).toHaveLength(1);
    expect(audited[0][1].actorId).toBe(ACTOR_ID);
  });

  it('DELETE variant records the acting admin', async () => {
    mocks.productVariant.findByPk.mockResolvedValue({
      id: 5, destroy: vi.fn(async () => {}),
    });

    const res = await request(makeApp()).delete('/api/admin/packages/variants/5');

    expect(res.status).toBe(200);
    const audited = auditedCalls();
    expect(audited).toHaveLength(1);
    expect(audited[0][1].actorId).toBe(ACTOR_ID);
  });
});
