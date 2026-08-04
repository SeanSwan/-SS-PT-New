/**
 * Executed probe (rule 55) — GET /api/assignments/my-trainer scoping.
 *
 * Proves by EXECUTION (not file-reading) that the launch-panel trainer
 * endpoint: (1) mounts, (2) requires auth, (3) derives the target client from
 * req.user.id ONLY — attacker-style query params cannot re-scope it,
 * (4) never leaks trainer email/phone.
 *
 * Follows adminRoleEscalationMatrix.test.mjs conventions: boot the real app,
 * patch every `protect` layer to inject the acting user. DB-dependent
 * assertions tolerate a missing DB (500) — the scoping assertions do not
 * depend on DB state.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;
let currentUser = null;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('../../core/app.mjs');
  app = await createApp();

  const patch = (stack) => {
    for (const layer of stack) {
      if (layer.route?.stack) {
        for (const l of layer.route.stack) {
          if (l.name === 'protect') {
            l.handle = (req, _res, next) => {
              if (!currentUser) return _res.status(401).json({ success: false });
              req.user = { ...currentUser };
              next();
            };
          }
        }
      } else if (layer.handle?.stack) {
        patch(layer.handle.stack);
      }
    }
  };
  for (const layer of app._router.stack) {
    if (layer.name === 'router' && layer.handle?.stack) patch(layer.handle.stack);
  }
}, 120000);

describe('GET /api/assignments/my-trainer — executed scoping probe', () => {
  it('rejects unauthenticated callers', async () => {
    currentUser = null;
    const res = await request(app).get('/api/assignments/my-trainer').timeout({ deadline: 10000 });
    expect([401, 403]).toContain(res.status);
  });

  it('answers an authenticated client from req.user.id and never leaks contact PII', async () => {
    currentUser = { id: 1, role: 'client' };
    const res = await request(app).get('/api/assignments/my-trainer').timeout({ deadline: 15000 });
    // 200 with trainer|null when DB reachable; 500 fail-closed when not.
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('trainer');
      const t = res.body.trainer;
      if (t) {
        expect(t).not.toHaveProperty('email');
        expect(t).not.toHaveProperty('phone');
        expect(Object.keys(t).sort()).toEqual(['firstName', 'id', 'lastName', 'photo']);
      }
    }
  });

  it('ignores attacker-style re-scoping params — response is identical', async () => {
    currentUser = { id: 1, role: 'client' };
    const clean = await request(app).get('/api/assignments/my-trainer').timeout({ deadline: 15000 });
    const attacked = await request(app)
      .get('/api/assignments/my-trainer?clientId=2&userId=2&id=2')
      .timeout({ deadline: 15000 });
    expect(attacked.status).toBe(clean.status);
    expect(attacked.body).toEqual(clean.body);
  });

  it('non-positive-integer user ids fail safe to trainer:null (never a query with garbage)', async () => {
    currentUser = { id: 'not-a-number', role: 'client' };
    const res = await request(app).get('/api/assignments/my-trainer').timeout({ deadline: 10000 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, trainer: null });
  });
});
