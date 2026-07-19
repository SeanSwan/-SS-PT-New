/**
 * PRISM CAPTURE — public email-only lead capture route (leadCaptureRoutes.mjs).
 * DB-free: the canonical capture service + alert services + Lead model are mocked; the router is mounted on a
 * bare express app via supertest. Proves the security-relevant behavior of a PUBLIC unauthenticated endpoint:
 * flag gate, input validation, opaque response, firstName derivation, ref code, and that it is NOT auth-walled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// --- mocks (resolved to the SAME modules the route imports) ---
const captureMock = vi.fn(async () => ({ leadId: 1, created: true }));
const updateMock = vi.fn(async () => {});
vi.mock('../../middleware/rateLimiter.mjs', () => ({ contactLimiter: (req, res, next) => next() }));
vi.mock('../../services/leadCaptureService.mjs', () => ({ captureLeadFromContact: (...a) => captureMock(...a) }));
vi.mock('../../services/leadCaptureShared.mjs', () => ({
  mergeLeadTags: (cur = [], add = []) => [...new Set([...(cur || []), ...add])],
}));
vi.mock('../../controllers/notificationController.mjs', () => ({ createAdminNotification: vi.fn(async () => {}) }));
vi.mock('../../services/smsService.mjs', () => ({ sendSmsMessage: vi.fn(async () => {}) }));
vi.mock('../../services/sendgridService.mjs', () => ({ sendGridEmail: vi.fn(async () => {}) }));
vi.mock('../../models/Lead.mjs', () => ({
  default: { findByPk: vi.fn(async () => ({ tags: [], update: updateMock })) },
}));
vi.mock('../../utils/logger.mjs', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const loadApp = async () => {
  const { default: router } = await import('../../routes/leadCaptureRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/leads', router);
  return app;
};

describe('PRISM CAPTURE — POST /api/leads/capture', () => {
  beforeEach(() => {
    captureMock.mockClear();
    updateMock.mockClear();
    process.env.PRISM_CAPTURE_ENABLED = 'true';
    process.env.REF_CODE_PEPPER = 'test-pepper';
  });

  it('404s when the flag is off (ships dark)', async () => {
    process.env.PRISM_CAPTURE_ENABLED = 'false';
    const res = await request(await loadApp()).post('/api/leads/capture').send({ email: 'a@b.com' });
    expect(res.status).toBe(404);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('400s on a missing/invalid email', async () => {
    const app = await loadApp();
    for (const email of [undefined, '', 'not-an-email', 'a@b']) {
      const res = await request(app).post('/api/leads/capture').send({ email });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: 'valid_email_required' });
    }
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('is PUBLIC — an unauthenticated POST is never 401/403 (mount-order guard)', async () => {
    const res = await request(await loadApp()).post('/api/leads/capture').send({ email: 'a@b.com' });
    expect([401, 403]).not.toContain(res.status);
    expect(res.status).toBe(201);
  });

  it('returns an OPAQUE 201 with a ref for a valid capture', async () => {
    const res = await request(await loadApp()).post('/api/leads/capture').send({ email: 'jane@swan.com' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ref).toBe('string');
    expect(res.body.ref.length).toBe(10); // sha256 slice(0,10) with pepper set
  });

  it('derives firstName from the email local-part and passes it to the canonical service', async () => {
    await request(await loadApp()).post('/api/leads/capture').send({ email: 'john.smith+news@swan.com' });
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls[0][0].formData.name).toBe('John');
    expect(captureMock.mock.calls[0][0].consultationType).toBe('prism_capture');
  });

  it("falls back to 'Friend' when the local-part is not a usable name", async () => {
    await request(await loadApp()).post('/api/leads/capture').send({ email: '99@swan.com' });
    expect(captureMock.mock.calls[0][0].formData.name).toBe('Friend');
  });

  it('only allowlisted intents reach the tags; garbage intent is dropped', async () => {
    await request(await loadApp())
      .post('/api/leads/capture')
      .send({ email: 'x@swan.com', intent: 'trainer', ref: 'abc123', utm: { source: 's', medium: 'm' } });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const tags = updateMock.mock.calls[0][0].tags;
    expect(tags).toContain('prism');
    expect(tags).toContain('prism:intent:trainer');
    expect(tags).toContain('prism:refby:abc123');
    expect(tags).toContain('name:derived');

    updateMock.mockClear();
    await request(await loadApp()).post('/api/leads/capture').send({ email: 'y@swan.com', intent: 'HACK' });
    const tags2 = updateMock.mock.calls[0][0].tags;
    expect(tags2.some((t) => t.startsWith('prism:intent:'))).toBe(false);
  });
});

describe('PRISM CAPTURE — pure helpers', () => {
  it('deriveFirstName handles dotted/plus/underscore local-parts', async () => {
    const { deriveFirstName } = await import('../../routes/leadCaptureRoutes.mjs');
    expect(deriveFirstName('john.smith@x.com')).toBe('John');
    expect(deriveFirstName('mary_jane@x.com')).toBe('Mary');
    expect(deriveFirstName('bob+promo@x.com')).toBe('Bob');
    expect(deriveFirstName('99@x.com')).toBe('Friend');
    expect(deriveFirstName('a@x.com')).toBe('Friend'); // too short
  });

  it('refCodeFor is deterministic + 10 chars with a pepper, and stable per id', async () => {
    const { refCodeFor } = await import('../../routes/leadCaptureRoutes.mjs');
    process.env.REF_CODE_PEPPER = 'pep';
    const a = refCodeFor(42);
    const b = refCodeFor(42);
    expect(a).toBe(b);
    expect(a.length).toBe(10);
    expect(refCodeFor(43)).not.toBe(a);
  });
});
