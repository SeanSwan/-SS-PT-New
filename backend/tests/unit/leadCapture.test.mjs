/**
 * PRISM CAPTURE — public email-only lead capture route (leadCaptureRoutes.mjs).
 * DB-free: the canonical capture service + alert services + Lead model are mocked; the router is mounted on a
 * bare express app via supertest. Proves the security-relevant behavior of a PUBLIC unauthenticated endpoint:
 * flag gate, input validation, OPAQUE response (created vs existing identical, no enumeration), no owner-alert on
 * existing leads, fail-LOUD on backend error (no silent lead loss), firstName derivation/sanitization, ref code,
 * and that it is NOT auth-walled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// --- mocks (resolved to the SAME modules the route imports) ---
const captureMock = vi.fn(async () => ({ leadId: 1, created: true }));
const updateMock = vi.fn(async () => {});
const adminMock = vi.fn(async () => {});
const smsMock = vi.fn(async () => {});
const emailMock = vi.fn(async () => {});
vi.mock('../../middleware/rateLimiter.mjs', () => ({ contactLimiter: (req, res, next) => next() }));
vi.mock('../../services/leadCaptureService.mjs', () => ({ captureLeadFromContact: (...a) => captureMock(...a) }));
vi.mock('../../services/leadCaptureShared.mjs', () => ({
  mergeLeadTags: (cur = [], add = []) => [...new Set([...(cur || []), ...add])],
}));
vi.mock('../../controllers/notificationController.mjs', () => ({ createAdminNotification: (...a) => adminMock(...a) }));
vi.mock('../../services/smsService.mjs', () => ({ sendSmsMessage: (...a) => smsMock(...a) }));
vi.mock('../../services/sendgridService.mjs', () => ({ sendGridEmail: (...a) => emailMock(...a) }));
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
const flush = () => new Promise((r) => setImmediate(r)); // let the fire-and-forget alert microtasks run

describe('PRISM CAPTURE — POST /api/leads/capture', () => {
  beforeEach(() => {
    captureMock.mockClear().mockResolvedValue({ leadId: 1, created: true });
    updateMock.mockClear();
    adminMock.mockClear();
    smsMock.mockClear();
    emailMock.mockClear();
    process.env.PRISM_CAPTURE_ENABLED = 'true';
    process.env.REF_CODE_PEPPER = 'test-pepper';
    delete process.env.OWNER_PHONE;
    delete process.env.OWNER_EMAIL;
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

  // NOTE: this proves the capture route is not self-auth-walled (public). The real /api/leads mount ORDER
  // (leadCaptureRoutes before the protected leadRoutes) is verified in core/routes.mjs, not exercisable here.
  it('is PUBLIC — an unauthenticated POST is never 401/403', async () => {
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

  it('ANTI-ENUMERATION: an EXISTING lead (created:false) returns a byte-identical 201 and fires NO owner alert', async () => {
    process.env.OWNER_PHONE = '+15550001111';
    process.env.OWNER_EMAIL = 'owner@swan.com';
    process.env.SENDGRID_API_KEY = 'k';
    process.env.SENDGRID_FROM_EMAIL = 'from@swan.com';

    captureMock.mockResolvedValueOnce({ leadId: 7, created: true });
    const created = await request(await loadApp()).post('/api/leads/capture').send({ email: 'new@swan.com' });
    await flush();

    captureMock.mockResolvedValueOnce({ leadId: 7, created: false });
    adminMock.mockClear();
    smsMock.mockClear();
    emailMock.mockClear();
    const existing = await request(await loadApp()).post('/api/leads/capture').send({ email: 'existing@swan.com' });
    await flush();

    // identical shape (both 201 {ok, ref}); same leadId 7 → same ref value → truly indistinguishable
    expect(existing.status).toBe(created.status);
    expect(Object.keys(existing.body).sort()).toEqual(Object.keys(created.body).sort());
    expect(existing.body).toEqual(created.body);
    // no owner alert for an existing lead
    expect(adminMock).not.toHaveBeenCalled();
    expect(smsMock).not.toHaveBeenCalled();
    expect(emailMock).not.toHaveBeenCalled();

    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  it('FAIL-LOUD: a backend {error} returns 500 (lead recoverable via retry), not a silent 201', async () => {
    captureMock.mockResolvedValueOnce({ error: 'db exploded' });
    const res = await request(await loadApp()).post('/api/leads/capture').send({ email: 'x@swan.com' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false });
  });

  it('pepper missing → ref is null (never the raw sequential id), no refcode tag, capture still 201', async () => {
    delete process.env.REF_CODE_PEPPER;
    const res = await request(await loadApp()).post('/api/leads/capture').send({ email: 'y@swan.com' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, ref: null });
    // N3: the conditional refcode tag must be OMITTED (never `prism:refcode:` / `prism:refcode:null`).
    const tags = updateMock.mock.calls[0][0].tags;
    expect(tags.some((t) => t.startsWith('prism:refcode:'))).toBe(false);
  });

  it('external owner-alert budget caps SMS/email under a flood; in-app notification is uncapped (N2)', async () => {
    // Fresh module → counter starts at 0 (the budget is module-level state; isolate it here for a deterministic cap).
    vi.resetModules();
    process.env.OWNER_PHONE = '+15550001111';
    process.env.OWNER_EMAIL = 'owner@swan.com';
    process.env.SENDGRID_API_KEY = 'k';
    process.env.SENDGRID_FROM_EMAIL = 'from@swan.com';
    adminMock.mockClear();
    emailMock.mockClear();
    const app = await loadApp();
    for (let i = 0; i < 31; i += 1) {
      captureMock.mockResolvedValueOnce({ leadId: 100 + i, created: true });
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/leads/capture').send({ email: `flood${i}@swan.com` });
      // eslint-disable-next-line no-await-in-loop
      await flush(); // let the fire-and-forget alert run before the next request
    }
    expect(adminMock).toHaveBeenCalledTimes(31); // in-app is free — every lead alerts
    expect(emailMock).toHaveBeenCalledTimes(30); // external (paid) is capped at 30/window — the 31st is suppressed

    delete process.env.OWNER_PHONE;
    delete process.env.OWNER_EMAIL;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  it('passes email AND derived name to the canonical service (contract lock)', async () => {
    await request(await loadApp()).post('/api/leads/capture').send({ email: 'john.smith+news@swan.com' });
    expect(captureMock).toHaveBeenCalledTimes(1);
    const arg = captureMock.mock.calls[0][0];
    expect(arg.formData.email).toBe('john.smith+news@swan.com'); // email placement locked
    expect(arg.formData.name).toBe('John');
    expect(arg.consultationType).toBe('prism_capture');
  });

  it('only allowlisted intents reach the tags; garbage intent is dropped', async () => {
    await request(await loadApp())
      .post('/api/leads/capture')
      .send({ email: 'x@swan.com', intent: 'trainer', ref: 'abc123', utm: { source: 's', medium: 'm' } });
    const tags = updateMock.mock.calls[0][0].tags;
    expect(tags).toContain('prism');
    expect(tags).toContain('prism:intent:trainer');
    expect(tags).toContain('prism:refby:abc123');
    expect(tags).toContain('name:derived');

    updateMock.mockClear();
    await request(await loadApp()).post('/api/leads/capture').send({ email: 'z@swan.com', intent: 'HACK' });
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

  it('deriveFirstName strips non-alphanumerics (no XSS) and caps length (no varchar overflow)', async () => {
    const { deriveFirstName } = await import('../../routes/leadCaptureRoutes.mjs');
    expect(deriveFirstName('<b>x@x.com')).toBe('Bx'); // <, >, / stripped
    expect(/[^a-zA-Z0-9]/.test(deriveFirstName("o'br@x.com"))).toBe(false); // quote gone
    expect(deriveFirstName('a'.repeat(120) + '@x.com').length).toBeLessThanOrEqual(40);
  });

  it('refCodeFor: null without a pepper; deterministic 10-char with one', async () => {
    const { refCodeFor } = await import('../../routes/leadCaptureRoutes.mjs');
    delete process.env.REF_CODE_PEPPER;
    expect(refCodeFor(42)).toBeNull();
    process.env.REF_CODE_PEPPER = 'pep';
    const a = refCodeFor(42);
    expect(a).toBe(refCodeFor(42));
    expect(a.length).toBe(10);
    expect(refCodeFor(43)).not.toBe(a);
  });
});
