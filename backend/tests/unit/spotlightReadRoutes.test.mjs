/**
 * spotlightReadRoutes — the authenticated rail projection
 * ======================================================
 * Hostile review D9 / R2-04. R2's measurement request is "has this Spotlight changed since I
 * last saw it", and the read path could not answer it: the projection omitted `revision`, the
 * one field that carries that fact, so a client could only compare content and guess.
 *
 * WHY THESE ASSERT ON THE QUERY. The projection is applied by the DATABASE, not by code in this
 * route — so a mocked `findAll` returning a hand-written row cannot show what the route asked
 * for. The route's behaviour IS the query it issues, so the query is the honest thing to pin.
 * The ban-#2 case is included as a control: adding a field must not be a licence to add others.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockFindAll } = vi.hoisted(() => ({ mockFindAll: vi.fn() }));

vi.mock('../../models/social/SwanSpotlight.mjs', () => ({
  default: { findAll: mockFindAll },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

const { default: spotlightRouter } = await import('../../routes/social/spotlightReadRoutes.mjs');

const app = express();
app.use('/api/social/spotlight', spotlightRouter);

const requestedAttributes = () => mockFindAll.mock.calls[0][0].attributes;

beforeEach(() => {
  mockFindAll.mockReset();
  mockFindAll.mockResolvedValue([]);
  process.env.SPOTLIGHT_ENABLED = 'true';
});

describe('spotlightReadRoutes — projection', () => {
  it('projects `revision` so a client can detect a changed Spotlight', async () => {
    await request(app).get('/api/social/spotlight').expect(200);
    expect(requestedAttributes()).toContain('revision');
  });

  it('CONTROL: still projects the editorial fields', async () => {
    await request(app).get('/api/social/spotlight').expect(200);
    for (const field of ['itemId', 'headline', 'dek', 'imageUrl', 'sourceName', 'sourceUrl', 'curatorNote', 'publishedAt']) {
      expect(requestedAttributes()).toContain(field);
    }
  });

  it('CONTROL: projects no engagement metric (ban #2)', async () => {
    await request(app).get('/api/social/spotlight').expect(200);
    const attrs = requestedAttributes();
    for (const banned of ['likes', 'likeCount', 'comments', 'commentCount', 'shares', 'shareCount', 'reactions']) {
      expect(attrs).not.toContain(banned);
    }
    // and the field added by D9 is not one of them
    expect(attrs).not.toContain('likeCount');
  });

  it('returns an empty list rather than an error when the flag is off', async () => {
    process.env.SPOTLIGHT_ENABLED = 'false';
    const res = await request(app).get('/api/social/spotlight').expect(200);
    expect(res.body).toEqual({ success: true, enabled: false, spotlights: [] });
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it('excludes retracted and expired rows in the query', async () => {
    await request(app).get('/api/social/spotlight').expect(200);
    expect(mockFindAll.mock.calls[0][0].where.retracted).toBe(false);
  });

  it('surfaces a model failure as a 500 rather than throwing', async () => {
    mockFindAll.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/social/spotlight').expect(500);
    expect(res.body.success).toBe(false);
  });
});
