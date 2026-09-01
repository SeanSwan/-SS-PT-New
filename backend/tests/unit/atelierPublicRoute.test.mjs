/**
 * The one Atelier surface mounted with no auth.
 * ============================================================================
 *
 * `GET /api/atelier/public/:id` is deliberately unauthenticated — a public site cannot hold
 * an admin session — and it had no tests at all. Two things needed proving.
 *
 * A RATE LIMIT. Its safety rested on UUIDv4 ids not being enumerable and on a published-only
 * predicate. Neither bounds VOLUME, and every hit costs a database lookup plus a SigV4
 * presign on an endpoint whose whole purpose is to be embedded in pages.
 *
 * AND THAT 404 MEANS WHAT IT SAYS. The handler returned 404 for every exception, so a
 * rotated credential or an R2 outage told the internet a published asset was GONE — and
 * told the operator to go hunting for a deleted row that is sitting there fine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const ID = '11111111-2222-4333-8444-555555555555';

const resolvePublic = vi.fn();
vi.mock('../../services/atelier/publishAsset.mjs', () => ({
  resolvePublic: (...a) => resolvePublic(...a),
  PUBLIC_PATH: '/api/atelier/public',
}));

const { default: router } = await import('../../routes/atelierPublicRoutes.mjs');

function app() {
  const a = express();
  a.set('trust proxy', 1);
  a.use('/api/atelier/public', router);
  return a;
}

beforeEach(() => { resolvePublic.mockReset(); });

describe('resolving a published permalink', () => {
  it('redirects to a freshly signed URL', async () => {
    resolvePublic.mockResolvedValue({ url: 'https://cdn.example/x?sig=1', mime: 'image/png' });
    const res = await request(app()).get(`/api/atelier/public/${ID}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://cdn.example/x?sig=1');
    // Short cache only: the point of this path is that the signature is fresh per request.
    expect(res.headers['cache-control']).toContain('max-age=300');
  });

  it('404s a malformed id without touching the database', async () => {
    const res = await request(app()).get('/api/atelier/public/not-a-uuid');
    expect(res.status).toBe(404);
    expect(resolvePublic).not.toHaveBeenCalled();
  });

  it('404s an id that resolves to nothing — unpublished, deleted, or never existed', async () => {
    resolvePublic.mockResolvedValue(null);
    expect((await request(app()).get(`/api/atelier/public/${ID}`)).status).toBe(404);
  });
});

describe('a failure to sign is not a missing asset', () => {
  it('502s when the resolver throws, instead of claiming the asset is gone', async () => {
    // A rotated storage credential must not read as "this was deleted" — to a visitor or
    // to the operator reading their own logs.
    resolvePublic.mockRejectedValue(new Error('signature key missing'));
    const res = await request(app()).get(`/api/atelier/public/${ID}`);
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ success: false, error: 'resolve_failed' });
  });

  it('leaks nothing about the underlying failure', async () => {
    // The distinction is for the operator's logs, not the caller's benefit.
    resolvePublic.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    const res = await request(app()).get(`/api/atelier/public/${ID}`);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|5432/);
  });

  it('still 404s the not-found predicate — the two are not merged the other way either', async () => {
    // Fixing one direction by collapsing both into 502 would be the same defect mirrored.
    resolvePublic.mockResolvedValue(null);
    expect((await request(app()).get(`/api/atelier/public/${ID}`)).status).toBe(404);
  });
});

describe('the endpoint is rate limited, without punishing an office', () => {
  // ONE test, not two, because the limiter is a module-level instance with a module-level
  // store: a fresh `app()` does not reset it. Split across two cases, the second would
  // silently depend on the first having already spent the budget — an order dependency
  // wearing the costume of two independent assertions.
  it('lets a NAT-sized burst through, and still stops a treadmill', async () => {
    resolvePublic.mockResolvedValue({ url: 'https://cdn.example/x', mime: 'image/png' });
    const a = app();
    const hit = () => request(a).get(`/api/atelier/public/${ID}`);

    // My first ceiling was 120, reasoned from what ONE reader costs. That is not who
    // shares an IP: fifty people behind one office NAT opening a page with six images is
    // three hundred requests, all legitimate, all one req.ip. A limiter that 429s them has
    // traded real availability for protection it does not provide.
    for (let i = 0; i < 300; i += 1) {
      expect((await hit()).status, `429 at request ${i + 1} — too tight for a shared IP`).not.toBe(429);
    }

    // Bounded is still the point: no single host turns a permalink into a presign treadmill.
    let last = 0;
    for (let i = 0; i < 500; i += 1) {
      last = (await hit()).status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  }, 90000);
});
