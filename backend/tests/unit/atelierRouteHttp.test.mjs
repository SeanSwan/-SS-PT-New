/**
 * The Atelier route, over real HTTP.
 *
 * Every other atelier suite calls a SERVICE with injected collaborators. This one mounts
 * the router in Express and makes requests, which is the only way to exercise the parts
 * that live between them: the auth middleware, the error-code -> HTTP-status map, the
 * JSON envelope, and what a storage failure actually shows a client.
 *
 * Added during a dry-loop round for exactly that reason — the boundary had no coverage,
 * so a refusal could have been correct in the service and a 500 at the wire.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 7, role: 'admin' }; next(); },
  adminOnly: (_req, _res, next) => next(),
}));

let app;
beforeAll(async () => {
  const routes = (await import('../../routes/atelierComposeRoutes.mjs')).default;
  app = express();
  app.use(express.json());
  app.use('/api/atelier/compose', routes);
});

describe('round 1 — the mounted route answers', () => {
  it('GET /assets refuses a bad filter with 400 and a code, not a 500', async () => {
    const r = await request(app).get('/api/atelier/compose/assets?kind=gif');
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ success: false, code: 'E_BAD_FILTER' });
  });

  it('GET /assets refuses a forged cursor with 400', async () => {
    const r = await request(app).get('/api/atelier/compose/assets?cursor=not-a-cursor');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('E_BAD_CURSOR');
  });

  it('GET /limits answers with brandKits and a ledger state', async () => {
    const r = await request(app).get('/api/atelier/compose/limits');
    expect(r.status).toBe(200);
    expect(r.body.data.brandKits.map((k) => k.id)).toEqual(['swanstudios', 'universal']);
    expect(r.body.data.ledger).toBeTruthy();
    expect(r.body.data.note).not.toMatch(/No spend ledger exists yet/);
  });

  it('POST /stills refuses a workspace without a brand kit at the HTTP boundary', async () => {
    const r = await request(app).post('/api/atelier/compose/stills')
      .send({ brief: { text: 'a glacier at dawn' }, workspaceId: 'ws-1', lane: 'hosted' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('E_BRAND_KIT_REQUIRED');
  });

  it('POST /stills refuses an unknown brand kit at the HTTP boundary', async () => {
    const r = await request(app).post('/api/atelier/compose/stills')
      .send({ brief: { text: 'a glacier at dawn' }, brandKit: 'nope', lane: 'hosted' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('E_UNKNOWN_BRAND_KIT');
  });

  it('GET /stills/:batchId rejects a malformed id with 400, not 404', async () => {
    const r = await request(app).get('/api/atelier/compose/stills/not-a-uuid');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('E_BAD_BATCH_ID');
  });
});

describe('round 1b — what a failure at the storage layer actually returns', () => {
  it('does not leak a stack trace or a driver message to the client', async () => {
    // No database here, so this is the genuine unhappy path: whatever findAll throws.
    const r = await request(app).get('/api/atelier/compose/assets');
    expect([200, 500, 503]).toContain(r.status);
    if (r.status !== 200) {
      const body = JSON.stringify(r.body);
      expect(body).not.toMatch(/at Object\.|node_modules|\.mjs:\d+/);   // no stack
      expect(body).not.toMatch(/password|postgres:\/\/|SCRAM/i);        // no credentials
      expect(r.body.success).toBe(false);
      expect(r.body.error).toBeTruthy();
    }
  });
});
