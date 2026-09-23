/**
 * Public unsubscribe endpoint — API tests (S2)
 * ============================================
 * Covers `GET /api/leads/unsubscribe?lid=&tok=` in backend/routes/leadRoutes.mjs.
 *
 * This endpoint is unusual in two ways that the assertions below pin down:
 *   1. It is registered ABOVE `router.use(protect)`, so it must be reachable
 *      with no Authorization header at all. The auth middleware mock here
 *      actively 401s any request that reaches it — so if the handler were ever
 *      moved below the protect lines, the happy-path test would start failing
 *      with 401 instead of 200. That is the point: the test proves placement.
 *   2. Every outcome is HTTP 200 text/html. Invalid tokens are indistinguishable
 *      from expired ones, and the DB must not be touched on a bad token.
 *
 * Models are imported dynamically inside the route's `getModels()` helper, so
 * they are mocked with `vi.doMock` on the MODULE PATH (not `vi.mock`) and the
 * router is imported afterwards, per the package's vitest-quirk note.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// A fixed secret so both the test and the module under test agree on the HMAC.
process.env.LEAD_UNSUB_SECRET = 'test-unsub-secret-do-not-use-in-prod';
delete process.env.PUBLIC_BASE_URL;

const { leadMock, leadActivityMock } = vi.hoisted(() => ({
  leadMock: { findByPk: vi.fn(), instance: null },
  leadActivityMock: { create: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Auth middleware that genuinely enforces auth. The public route must never
// reach this; protected routes must.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid') {
      req.user = { id: 42, role: 'admin' };
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

import {
  makeUnsubscribeToken,
} from '../../services/leadUnsubscribeToken.mjs';

let router;

/** Build a fresh app around the real router. */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', router);
  return app;
}

/** A lead stub whose `save()` records the tags it was asked to persist. */
function makeLead({ id = 7, tags = [] } = {}) {
  const lead = {
    id,
    tags: [...tags],
    saved: false,
    async save() {
      this.saved = true;
    },
  };
  return lead;
}

beforeEach(async () => {
  vi.clearAllMocks();

  // Dynamic imports inside getModels() mean the model paths must be mocked by
  // path BEFORE the router module is evaluated.
  vi.doMock('../../models/Lead.mjs', () => ({ default: leadMock }));
  vi.doMock('../../models/LeadActivity.mjs', () => ({ default: leadActivityMock }));

  vi.resetModules();
  ({ default: router } = await import('../../routes/leadRoutes.mjs'));
});

afterEach(() => {
  vi.doUnmock('../../models/Lead.mjs');
  vi.doUnmock('../../models/LeadActivity.mjs');
});

describe('GET /api/leads/unsubscribe', () => {
  it('is reachable with NO auth header and returns the success page', async () => {
    const lead = makeLead({ id: 7 });
    leadMock.findByPk.mockResolvedValue(lead);
    leadActivityMock.create.mockResolvedValue({});

    const tok = makeUnsubscribeToken(7);
    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok });
    // No .set('Authorization', ...) on purpose.

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain("You're unsubscribed.");
  });

  it('adds the tag exactly once and creates a LeadActivity', async () => {
    const lead = makeLead({ id: 7 });
    leadMock.findByPk.mockResolvedValue(lead);
    leadActivityMock.create.mockResolvedValue({});

    const tok = makeUnsubscribeToken(7);
    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok });

    expect(res.status).toBe(200);
    expect(lead.tags).toEqual(['email-unsubscribed']);
    expect(lead.tags.filter((t) => t === 'email-unsubscribed')).toHaveLength(1);
    expect(lead.saved).toBe(true);
    expect(leadActivityMock.create).toHaveBeenCalledTimes(1);
    expect(leadActivityMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 7,
        type: 'note_added',
        title: 'Email unsubscribe',
      })
    );
  });

  it('is idempotent — a repeat click changes nothing and adds no activity', async () => {
    const lead = makeLead({ id: 7, tags: ['email-unsubscribed'] });
    leadMock.findByPk.mockResolvedValue(lead);
    leadActivityMock.create.mockResolvedValue({});

    const tok = makeUnsubscribeToken(7);
    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok });

    expect(res.status).toBe(200);
    expect(res.text).toContain("You're unsubscribed.");
    expect(lead.tags).toEqual(['email-unsubscribed']);
    expect(lead.saved).toBe(false);
    expect(leadActivityMock.create).not.toHaveBeenCalled();
  });

  it('preserves pre-existing tags rather than replacing them', async () => {
    const lead = makeLead({ id: 7, tags: ['hot', 'consult-booked'] });
    leadMock.findByPk.mockResolvedValue(lead);
    leadActivityMock.create.mockResolvedValue({});

    const tok = makeUnsubscribeToken(7);
    await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok });

    expect(lead.tags).toEqual(['hot', 'consult-booked', 'email-unsubscribed']);
  });

  it('rejects a bad token with the invalid page and leaves the DB untouched', async () => {
    const tok = makeUnsubscribeToken(7);
    const tampered = (tok[0] === 'a' ? 'b' : 'a') + tok.slice(1);

    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok: tampered });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Link expired or invalid.');
    expect(res.text).not.toContain("You're unsubscribed.");
    expect(leadMock.findByPk).not.toHaveBeenCalled();
    expect(leadActivityMock.create).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric lid without querying the DB', async () => {
    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 'abc', tok: makeUnsubscribeToken(7) });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Link expired or invalid.');
    expect(leadMock.findByPk).not.toHaveBeenCalled();
  });

  it('rejects missing params with the invalid page, never a 500', async () => {
    const res = await request(createApp()).get('/api/leads/unsubscribe');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Link expired or invalid.');
    expect(leadMock.findByPk).not.toHaveBeenCalled();
  });

  it('returns the invalid page (200) when the lead does not exist', async () => {
    leadMock.findByPk.mockResolvedValue(null);

    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok: makeUnsubscribeToken(7) });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Link expired or invalid.');
    expect(leadActivityMock.create).not.toHaveBeenCalled();
  });

  it('swallows a DB failure into the invalid page — never a 500, never internals', async () => {
    leadMock.findByPk.mockRejectedValue(new Error('connection terminated unexpectedly'));

    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok: makeUnsubscribeToken(7) });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Link expired or invalid.');
    expect(res.text).not.toContain('connection terminated');
  });

  it('never echoes an email address or the token back to the visitor', async () => {
    const lead = makeLead({ id: 7 });
    leadMock.findByPk.mockResolvedValue(lead);
    leadActivityMock.create.mockResolvedValue({});

    const tok = makeUnsubscribeToken(7);
    const res = await request(createApp())
      .get('/api/leads/unsubscribe')
      .query({ lid: 7, tok });

    expect(res.text).not.toContain('@');
    expect(res.text).not.toContain(tok);
  });

  it('still 401s on a PROTECTED route with no auth (proving the boundary is real)', async () => {
    const res = await request(createApp()).get('/api/leads');

    expect(res.status).toBe(401);
  });
});
