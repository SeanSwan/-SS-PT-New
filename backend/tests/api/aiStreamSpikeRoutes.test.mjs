/**
 * aiStreamSpikeRoutes — B1b spike security + stream-shape tests
 * =============================================================
 * The spike endpoint is throwaway, but its gates are not:
 *   1. FAIL-CLOSED kill switch — 404 unless SWAN_STREAM_SPIKE_ENABLED
 *      is the literal string 'true', even for an authenticated admin.
 *   2. Admin-only — trainer/client/user roles get a clean denial.
 *   3. Stream shape — SSE content type, counter ticks, terminal done
 *      event, no user data in the payload.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mirror of the repo-wide route-test pattern (see
// aiCommandRouteFrontendDispatch.test.mjs): protect injects the role the
// test asks for via header; adminOnly mirrors the real middleware's
// role check + 403 shape.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.user = { id: 7, role };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const aiStreamSpikeRoutes = (await import('../../routes/aiStreamSpikeRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use('/api/ai-chat/stream-spike', aiStreamSpikeRoutes);
  return app;
}

const ENV_KEYS = [
  'SWAN_STREAM_SPIKE_ENABLED',
  'SWAN_STREAM_SPIKE_TICKS',
  'SWAN_STREAM_SPIKE_INTERVAL_MS',
];
const savedEnv = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('stream-spike kill switch (fail-closed)', () => {
  it('returns 404 for an admin when the env flag is unset', async () => {
    const res = await request(makeApp())
      .get('/api/ai-chat/stream-spike')
      .set('x-test-role', 'admin');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when the flag is any value other than the literal "true"', async () => {
    for (const value of ['1', 'TRUE', 'yes', 'on', '']) {
      process.env.SWAN_STREAM_SPIKE_ENABLED = value;
      const res = await request(makeApp())
        .get('/api/ai-chat/stream-spike')
        .set('x-test-role', 'admin');
      expect(res.status, `flag value: ${JSON.stringify(value)}`).toBe(404);
    }
  });
});

describe('stream-spike role gate', () => {
  beforeEach(() => {
    process.env.SWAN_STREAM_SPIKE_ENABLED = 'true';
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(makeApp()).get('/api/ai-chat/stream-spike');
    expect(res.status).toBe(401);
  });

  it.each(['trainer', 'client', 'user'])('rejects role %s with 403', async (role) => {
    const res = await request(makeApp())
      .get('/api/ai-chat/stream-spike')
      .set('x-test-role', role);
    expect(res.status).toBe(403);
  });
});

describe('stream-spike SSE stream shape', () => {
  beforeEach(() => {
    process.env.SWAN_STREAM_SPIKE_ENABLED = 'true';
    process.env.SWAN_STREAM_SPIKE_TICKS = '3';
    process.env.SWAN_STREAM_SPIKE_INTERVAL_MS = '10';
  });

  it('streams counter ticks and a terminal done event for an admin', async () => {
    const res = await request(makeApp())
      .get('/api/ai-chat/stream-spike')
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-transform');

    const body = res.text;
    expect(body).toContain(': spike-start');
    expect(body).toContain('"tick":1');
    expect(body).toContain('"tick":3');
    expect(body).not.toContain('"tick":4'); // respects the tick config
    expect(body).toContain('event: done');
    expect(body).toContain('"ticks":3');
    // No user data leaks into the stream payload
    expect(body).not.toContain('"id":7');
    expect(body).not.toContain('admin');
  });

  it('caps a hostile tick config at the hard maximum (50)', async () => {
    process.env.SWAN_STREAM_SPIKE_TICKS = '99999';
    process.env.SWAN_STREAM_SPIKE_INTERVAL_MS = '1'; // floor-clamped to 10ms
    const res = await request(makeApp())
      .get('/api/ai-chat/stream-spike')
      .set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('"ticks":50');
    expect(res.text).not.toContain('"tick":51');
  }, 15000);
});
