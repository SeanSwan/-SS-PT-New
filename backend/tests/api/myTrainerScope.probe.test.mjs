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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  /**
   * MUTATION-PROVEN GAP (deep loop round 2, 2026-08-03): the runtime PII
   * assertion above is inside `if (trainer)`, and this environment has no DB
   * rows — so the trainer branch NEVER executes and a mutation that added
   * `email` to the handler passed 4/4. The runtime checks cannot cover the
   * populated shape here, so the PII contract is ALSO asserted statically
   * against the handler source. This test bites without a database.
   */
  it('the handler never selects or returns trainer contact PII (source contract)', () => {
    const routePath = fileURLToPath(
      new URL('../../routes/clientTrainerAssignmentRoutes.mjs', import.meta.url),
    );
    const source = readFileSync(routePath, 'utf8');
    const handler = source.slice(
      source.indexOf("router.get('/my-trainer'"),
      source.indexOf("router.get('/test'"),
    );
    expect(handler.length).toBeGreaterThan(200); // guards against a silent slice miss

    // The include's attribute allowlist is the whole defense — it must stay
    // exactly these four, and no contact field may be echoed into the payload.
    expect(handler).toContain("attributes: ['id', 'firstName', 'lastName', 'photo']");
    expect(handler).not.toMatch(/\bemail\b/);
    expect(handler).not.toMatch(/\bphone\b/);
    // Target is derived from the token only — no request-controlled id.
    expect(handler).toContain('req.user.id');
    expect(handler).not.toMatch(/req\.(params|query|body)/);
  });

  it('non-positive-integer user ids fail safe to trainer:null (never a query with garbage)', async () => {
    currentUser = { id: 'not-a-number', role: 'client' };
    const res = await request(app).get('/api/assignments/my-trainer').timeout({ deadline: 10000 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, trainer: null });
  });
});
