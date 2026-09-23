import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const query = vi.hoisted(() => vi.fn());

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, res, next) => {
    const raw = req.headers['x-test-user'];
    req.user = raw ? JSON.parse(raw) : null;
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    return next();
  },
  authorize: (roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ success: false, error: 'Forbidden' })
  ),
}));

vi.mock('../database.mjs', () => ({
  default: { query },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { default: adminComplianceRoutes, atRiskComplianceRoutes } =
  await import('../routes/adminComplianceRoutes.mjs');

function buildMountedApp() {
  const app = express();
  app.use(express.json());
  // Synthetic auth seam for this mounted-router harness. The real narrow
  // router still runs its own protect/authorize middleware; this seam lets
  // sibling global-admin routes receive the same test actor.
  app.use('/api/admin', (req, res, next) => {
    const raw = req.headers['x-test-user'];
    req.user = raw ? JSON.parse(raw) : null;
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    return next();
  });
  app.use('/api/admin/compliance/at-risk', atRiskComplianceRoutes);

  // This stands in for the real global admin router boundary. It is mounted
  // after the narrow route just as core/routes.mjs does.
  app.use('/api/admin', (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    return next();
  }, (req, res, next) => {
    if (req.path === '/users') return res.json({ success: true, users: [] });
    return next();
  });

  app.use('/api/admin', adminComplianceRoutes);
  return app;
}

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([[
    {
      id: 7,
      firstName: 'Assigned',
      lastName: 'Client',
      availableSessions: 4,
      clientSource: 'swanstudios',
      sessionBillingMode: 'paid',
      lastWorkoutDate: null,
      workouts7d: 0,
      workouts30d: 0,
      recovery14d: 0,
    },
  ]]);
});

describe('mounted trainer compliance access', () => {
  it('keeps the narrow mount before the global admin router in the real route configuration', () => {
    const source = readFileSync(resolve(process.cwd(), 'core/routes.mjs'), 'utf8');
    expect(source.indexOf("app.use('/api/admin/compliance/at-risk'"))
      .toBeLessThan(source.indexOf("app.use('/api/admin', adminRoutes)"));
  });

  it('allows a trainer through only the narrow at-risk collection', async () => {
    const response = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk')
      .set('x-test-user', JSON.stringify({ id: 12, role: 'trainer' }));

    expect(response.status).toBe(200);
    expect(response.body.clients).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('client_trainer_assignments'),
      expect.objectContaining({
        replacements: expect.objectContaining({ trainerId: 12 }),
      }),
    );
  });

  it('keeps admin siblings behind the global admin guard for trainers', async () => {
    const response = await request(buildMountedApp())
      .get('/api/admin/users')
      .set('x-test-user', JSON.stringify({ id: 12, role: 'trainer' }));

    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('allows an admin through the global admin sibling guard', async () => {
    const response = await request(buildMountedApp())
      .get('/api/admin/users')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'admin' }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, users: [] });
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps business KPIs admin-only even though at-risk is trainer-visible', async () => {
    const response = await request(buildMountedApp())
      .get('/api/admin/analytics/business-kpis')
      .set('x-test-user', JSON.stringify({ id: 12, role: 'trainer' }));

    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('allows admins through the same narrow mount', async () => {
    const response = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'admin' }));

    expect(response.status).toBe(200);
    expect(response.body.clients).toHaveLength(1);
  });

  it('denies a client and anonymous caller before the at-risk query', async () => {
    const clientResponse = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk')
      .set('x-test-user', JSON.stringify({ id: 7, role: 'client' }));
    const anonymousResponse = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk');

    expect(clientResponse.status).toBe(403);
    expect(anonymousResponse.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('uses the current trainer id in the collection scope and returns true empty for no assignment rows', async () => {
    query.mockImplementation(async (_sql, options) => (
      options?.replacements?.trainerId === 13 ? [[]] : [[{
        id: 7,
        firstName: 'Assigned',
        lastName: 'Client',
        availableSessions: 4,
        clientSource: 'swanstudios',
        sessionBillingMode: 'paid',
        lastWorkoutDate: null,
        workouts7d: 0,
        workouts30d: 0,
        recovery14d: 0,
      }]]
    ));

    const assigned = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk')
      .set('x-test-user', JSON.stringify({ id: 12, role: 'trainer' }));
    const revoked = await request(buildMountedApp())
      .get('/api/admin/compliance/at-risk')
      .set('x-test-user', JSON.stringify({ id: 13, role: 'trainer' }));

    expect(assigned.status).toBe(200);
    expect(assigned.body.clients).toHaveLength(1);
    expect(revoked.status).toBe(200);
    expect(revoked.body.clients).toEqual([]);
    expect(query.mock.calls.at(-1)[1].replacements.trainerId).toBe(13);
  });
});
