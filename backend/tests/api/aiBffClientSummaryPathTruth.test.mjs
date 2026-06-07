import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const aiBffSource = readFileSync(resolve(__dirname, '../../routes/aiBffRoutes.mjs'), 'utf8');
const adminClientRoutesSource = readFileSync(resolve(__dirname, '../../routes/adminClientRoutes.mjs'), 'utf8');
const painEntryRoutesSource = readFileSync(resolve(__dirname, '../../routes/painEntryRoutes.mjs'), 'utf8');
const aiBffRoutes = (await import('../../routes/aiBffRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/ai-bff', aiBffRoutes);
  return app;
}

describe('AI BFF client summary path truth contracts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('anchors the client summary BFF under the mounted admin AI BFF router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin/ai-bff', aiBffRoutes)");
    expect(aiBffSource).toContain("router.get('/client-summary/:clientId'");
  });

  it('uses mounted internal sources for pain entries and workout stats', () => {
    expect(coreRoutesSource).toContain("app.use('/api/pain-entries', painEntryRoutes)");
    expect(painEntryRoutesSource).toContain("router.get('/:userId/active'");
    expect(adminClientRoutesSource).toContain("router.get('/clients/:clientId/workout-stats'");

    expect(aiBffSource).not.toContain('/api/pain/${clientId}/active');
    expect(aiBffSource).not.toContain('/api/admin/clients/${clientId}/workouts');
    expect(aiBffSource).toContain('/api/pain-entries/${clientId}/active');
    expect(aiBffSource).toContain('/api/admin/clients/${clientId}/workout-stats');
  });

  it('scopes client summary cache entries by requester and client', () => {
    expect(aiBffSource).not.toContain('const cacheKey = `client_summary_${clientId}`;');
    expect(aiBffSource).toContain("const requesterCacheScope = `${req.user?.role || 'unknown'}_${req.user?.id || 'anonymous'}`;");
    expect(aiBffSource).toContain('const cacheKey = `client_summary_${requesterCacheScope}_${clientId}`;');
  });

  it('rejects malformed client summary IDs before internal fetches', async () => {
    const response = await request(makeApp())
      .get('/api/admin/ai-bff/client-summary/42junk')
      .expect(400);

    expect(response.body).toEqual({ error: 'Invalid client ID' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not embed internal upstream errors in aggregated client summary cards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('private ai-bff upstream host');
    }));

    const response = await request(makeApp())
      .get('/api/admin/ai-bff/client-summary/42')
      .expect(200);

    expect(JSON.stringify(response.body)).not.toContain('private ai-bff');
    expect(response.body.profile).toEqual({ error: 'unavailable', status: 500 });
    expect(response.body.activePain).toEqual({ error: 'unavailable', status: 500 });
    expect(response.body.latestMeasurements).toEqual({ error: 'unavailable', status: 500 });
    expect(response.body.recentWorkouts).toEqual({ error: 'unavailable', status: 500 });
  });
});
