/**
 * Contact form → CRM Lead capture (Tier 0.2a)
 * ===========================================
 * Regression guard: a public contact submission MUST create an attributed CRM
 * Lead (source 'website') + a LeadActivity, deduped by email, and the lead path
 * MUST be non-blocking — a lead-capture failure can never fail the contact submit.
 * Models are vi.mock'd — this test never touches the real database.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  contactCreate,
  leadFindOrCreate,
  leadActivityCreate,
  createAdminNotification,
} = vi.hoisted(() => ({
  contactCreate: vi.fn(),
  leadFindOrCreate: vi.fn(),
  leadActivityCreate: vi.fn(),
  createAdminNotification: vi.fn(),
}));

vi.mock('../models/contact.mjs', () => ({
  default: { create: contactCreate, count: vi.fn(), findAll: vi.fn() },
}));

vi.mock('../models/Lead.mjs', () => ({
  default: { findOrCreate: leadFindOrCreate },
}));

vi.mock('../models/LeadActivity.mjs', () => ({
  default: { create: leadActivityCreate },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 1, role: 'admin' }; next(); },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', () => ({
  default: {
    getQueryInterface: () => ({ describeTable: () => Promise.resolve({}) }),
  },
}));

vi.mock('../controllers/notificationController.mjs', () => ({
  createAdminNotification,
}));

const { default: contactRoutes } = await import('../routes/contactRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/contact', contactRoutes);

describe('contact form → CRM lead capture (Tier 0.2a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contactCreate.mockResolvedValue({ id: 101, name: 'Jane Doe', email: 'jane@example.com', createdAt: new Date() });
    leadFindOrCreate.mockResolvedValue([{ id: 5, score: 0, contactCount: 0, update: vi.fn() }, true]);
    leadActivityCreate.mockResolvedValue({ id: 1 });
    createAdminNotification.mockResolvedValue(undefined);
  });

  it('creates an attributed CRM lead from a contact submission', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Jane Doe', email: 'Jane@Example.com', message: 'I want to train for golf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(leadFindOrCreate).toHaveBeenCalledTimes(1);
    const call = leadFindOrCreate.mock.calls[0][0];
    expect(call.where).toEqual({ email: 'jane@example.com' }); // deduped + normalized lowercase
    expect(call.defaults.source).toBe('website');
    expect(call.defaults.firstName).toBe('Jane');
    expect(call.defaults.lastName).toBe('Doe');
    expect(leadActivityCreate).toHaveBeenCalledTimes(1);
  });

  it('does NOT duplicate a lead on repeat contact (dedupe by email, bumps engagement)', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{ id: 5, score: 20, contactCount: 1, update }, false]);

    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Jane Doe', email: 'jane@example.com', message: 'Following up' });

    expect(res.status).toBe(200);
    expect(leadFindOrCreate).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1); // engagement bump on the existing lead, no new row
  });

  it('still succeeds when lead capture throws (lead path is non-blocking)', async () => {
    leadFindOrCreate.mockRejectedValue(new Error('leads table missing'));

    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Bob', email: 'bob@example.com', message: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(contactCreate).toHaveBeenCalledTimes(1); // contact still saved
  });

  it('handles single-word names (firstName required, lastName null)', async () => {
    await request(app)
      .post('/api/contact')
      .send({ name: 'Madonna', email: 'm@example.com', message: 'hi' });

    const call = leadFindOrCreate.mock.calls[0][0];
    expect(call.defaults.firstName).toBe('Madonna');
    expect(call.defaults.lastName).toBeNull();
  });
});
