/**
 * Launch-audit integration (2026-08-03) — admin gallery money-path gate.
 *
 * REGRESSION: `adminGalleryRoutes` admits admin OR trainer at the router level.
 * The print-order money operations (refund / mark-shipped / retry-fulfillment)
 * and destructive photo delete were reachable by ANY trainer — the code already
 * hid `commissionUsd` from trainers, showing the intent to restrict, but the
 * operations themselves were ungated.
 *
 * These tests drive each route as a TRAINER and require 403, plus an admin
 * control proving the gate is not simply denying everyone.
 *
 * MUTATION-VERIFIED (integration hostile round 18). Removing `galleryAdminOnly`:
 *   mark-shipped / retry-fulfillment / photo-delete  -> these tests FAIL,
 *     so the middleware gate is load-bearing and the exposure was real.
 *   refund                                           -> still passes, because
 *     that handler ALREADY carries its own inline admin check ("Refunds move
 *     real money"). The middleware there is deliberate belt-and-braces and
 *     keeps the four money-path routes consistent — do not "simplify" it away
 *     without re-running this mutation.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentUser = { id: 7, role: 'trainer' };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  },
  rateLimiter: () => (_req, _res, next) => next(),
}));

const { default: adminGalleryRoutes } = await import('../../routes/adminGalleryRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/gallery', adminGalleryRoutes);
  return app;
};

const MONEY_PATH_ROUTES = [
  { method: 'post', path: '/api/admin/gallery/print-orders/1/refund', label: 'refund' },
  { method: 'post', path: '/api/admin/gallery/print-orders/1/mark-shipped', label: 'mark-shipped' },
  { method: 'post', path: '/api/admin/gallery/print-orders/1/retry-fulfillment', label: 'retry-fulfillment' },
  { method: 'delete', path: '/api/admin/gallery/photos/1', label: 'photo delete' },
];

describe('admin gallery money-path admin gate', () => {
  beforeEach(() => {
    currentUser = { id: 7, role: 'trainer' };
  });

  for (const route of MONEY_PATH_ROUTES) {
    it(`denies a trainer on ${route.label}`, async () => {
      const res = await request(buildApp())[route.method](route.path).send({});
      expect(res.status).toBe(403);
      expect(res.body?.error).toMatch(/admin/i);
    });
  }

  it('does not deny an admin at the gate (control — gate is not deny-everyone)', async () => {
    currentUser = { id: 1, role: 'admin' };
    const res = await request(buildApp())
      .post('/api/admin/gallery/print-orders/1/mark-shipped')
      .send({});
    // The handler may fail downstream without a DB; what matters is that the
    // request got PAST the role gate rather than being rejected as non-admin.
    expect(res.status).not.toBe(403);
  });
});
