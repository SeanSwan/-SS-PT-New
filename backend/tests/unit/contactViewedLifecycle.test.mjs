/**
 * SWA-138 S3 — persisted read-state for contact "Business Intelligence Alerts".
 * Locks: mark-all-viewed + per-contact viewed PATCH routes, first-view
 * preservation, param-route shadowing order, and viewedAt in the list payload.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 1, role: 'admin', email: 'admin@example.test' }; next(); },
  adminOnly: (_req, _res, next) => next(),
}));
vi.mock('../../middleware/rateLimiter.mjs', () => ({
  contactLimiter: (_req, _res, next) => next(),
}));
vi.mock('../../models/contact.mjs', () => ({
  default: {
    findAll: vi.fn(),
    count: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../../database.mjs', () => ({
  default: {
    getQueryInterface: () => ({
      describeTable: async () => ({ priority: {}, viewedAt: {} }),
    }),
  },
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createAdminNotification: vi.fn(),
}));
vi.mock('../../services/leadCaptureService.mjs', () => ({
  captureLeadFromContact: vi.fn(async () => ({})),
}));
vi.mock('../../services/speedToLeadService.mjs', () => ({
  sendSpeedToLeadReply: vi.fn(async () => {}),
}));

const { default: Contact } = await import('../../models/contact.mjs');
const { default: contactRoutes } = await import('../../routes/contactRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/contact', contactRoutes);

describe('contact read-state lifecycle (SWA-138 S3)', () => {
  beforeEach(() => {
    Contact.findAll.mockReset().mockResolvedValue([]);
    Contact.count.mockReset().mockResolvedValue(0);
    Contact.findByPk.mockReset();
    Contact.update.mockReset();
  });

  it('PATCH /mark-all-viewed stamps every unread contact and reports the count', async () => {
    Contact.update.mockResolvedValue([3]);
    const res = await request(app).patch('/api/contact/mark-all-viewed');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, updated: 3 });
    const [values, options] = Contact.update.mock.calls[0];
    expect(values.viewedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ where: { viewedAt: null } });
  });

  it('PATCH /:id/viewed 404s for a missing contact', async () => {
    Contact.findByPk.mockResolvedValue(null);
    const res = await request(app).patch('/api/contact/999/viewed');
    expect(res.status).toBe(404);
  });

  it('PATCH /:id/viewed stamps an unread contact', async () => {
    const row = {
      id: 7,
      viewedAt: null,
      update: vi.fn(async function updateImpl(vals) { Object.assign(this, vals); return this; }),
    };
    Contact.findByPk.mockResolvedValue(row);
    const res = await request(app).patch('/api/contact/7/viewed');
    expect(res.status).toBe(200);
    expect(row.update).toHaveBeenCalledTimes(1);
    expect(res.body.contact.id).toBe(7);
    expect(res.body.contact.viewedAt).toBeTruthy();
  });

  it('PATCH /:id/viewed preserves the FIRST view timestamp (idempotent)', async () => {
    const row = { id: 7, viewedAt: '2026-08-01T00:00:00.000Z', update: vi.fn() };
    Contact.findByPk.mockResolvedValue(row);
    const res = await request(app).patch('/api/contact/7/viewed');
    expect(res.status).toBe(200);
    expect(row.update).not.toHaveBeenCalled();
    expect(res.body.contact.viewedAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('GET / includes viewedAt in the selected attributes when the column exists', async () => {
    const res = await request(app).get('/api/contact?limit=5');
    expect(res.status).toBe(200);
    const attributes = Contact.findAll.mock.calls[0][0].attributes;
    expect(attributes).toContain('viewedAt');
  });

  it('declares /mark-all-viewed BEFORE /:id/viewed so the param route cannot shadow it (Rule 31)', () => {
    const source = readFileSync(
      resolvePath(process.cwd(), 'routes/contactRoutes.mjs'),
      'utf8',
    );
    const bulkIdx = source.indexOf("router.patch('/mark-all-viewed'");
    const paramIdx = source.indexOf("router.patch('/:id/viewed'");
    expect(bulkIdx).toBeGreaterThan(-1);
    expect(paramIdx).toBeGreaterThan(-1);
    expect(bulkIdx).toBeLessThan(paramIdx);
  });
});
