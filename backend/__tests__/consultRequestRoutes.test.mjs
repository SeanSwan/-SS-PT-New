/**
 * consultRequestRoutes — public "book a free consult" endpoint
 * Verifies: valid request 201s + records + notifies owner; invalid email 400s + no capture;
 * honeypot silently no-ops; owner-email failure never fails the prospect; capture error 500s.
 */
import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { capture, sendEmail } = vi.hoisted(() => ({ capture: vi.fn(), sendEmail: vi.fn() }));
vi.mock('../services/consultRequestService.mjs', () => ({ captureConsultRequest: capture }));
vi.mock('../services/sendgridService.mjs', () => ({ sendGridEmail: sendEmail }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../middleware/authMiddleware.mjs', () => ({ rateLimiter: () => (req, res, next) => next() }));

const { default: consultRequestRoutes } = await import('../routes/consultRequestRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/consult-request', consultRequestRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OWNER_EMAIL = 'owner@x.com';
  delete process.env.OWNER_WIFE_EMAIL;
  sendEmail.mockResolvedValue({ success: true });
});

it('records a valid request (201) and notifies the owner', async () => {
  capture.mockResolvedValue({ leadId: 5, created: true, status: 'scheduled' });
  const res = await request(app).post('/api/consult-request').send({ name: 'Alex', email: 'alex@x.com', preferredTime: 'Mon' });
  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(capture).toHaveBeenCalledWith(expect.objectContaining({ email: 'alex@x.com' }));
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

it('400s on an invalid email and does NOT capture', async () => {
  const res = await request(app).post('/api/consult-request').send({ email: 'notanemail' });
  expect(res.status).toBe(400);
  expect(capture).not.toHaveBeenCalled();
});

it('honeypot (website filled) → 200, no capture, no email', async () => {
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com', website: 'spam' });
  expect(res.status).toBe(200);
  expect(capture).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
});

it('owner-email failure does NOT fail the prospect request', async () => {
  capture.mockResolvedValue({ leadId: 9, created: true, status: 'scheduled' });
  sendEmail.mockRejectedValue(new Error('sg down'));
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com' });
  expect(res.status).toBe(201);
});

it('500s when capture returns an error, and does not notify', async () => {
  capture.mockResolvedValue({ error: 'db down' });
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com' });
  expect(res.status).toBe(500);
  expect(sendEmail).not.toHaveBeenCalled();
});

it('H3: notifies BOTH owners as an ARRAY (not a comma-joined string)', async () => {
  process.env.OWNER_WIFE_EMAIL = 'wife@x.com';
  capture.mockResolvedValue({ leadId: 5, created: true, status: 'scheduled' });
  await request(app).post('/api/consult-request').send({ email: 'a@b.com' });
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['owner@x.com', 'wife@x.com'] }));
});

it('H1: an untrusted body leadId is IGNORED (no IDOR — capture called without leadId)', async () => {
  capture.mockResolvedValue({ leadId: 5, created: true, status: 'scheduled' });
  await request(app).post('/api/consult-request').send({ email: 'a@b.com', leadId: 999 });
  expect(capture).toHaveBeenCalledWith(expect.not.objectContaining({ leadId: expect.anything() }));
});

it('M4: 400s on an over-length phone (Lead.phone is STRING(30)) — never a 500', async () => {
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com', phone: '1'.repeat(40) });
  expect(res.status).toBe(400);
  expect(capture).not.toHaveBeenCalled();
});

it('M4: 400s on over-length notes', async () => {
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com', notes: 'x'.repeat(2500) });
  expect(res.status).toBe(400);
});

it('#2 anti-bomb: a repeat consult of an ALREADY-scheduled lead does NOT re-notify the owner', async () => {
  capture.mockResolvedValue({ leadId: 5, created: false, previousStatus: 'scheduled', status: 'scheduled' });
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com' });
  expect(res.status).toBe(201);
  expect(sendEmail).not.toHaveBeenCalled();
});

it('#2 a lead transitioning INTO scheduled DOES notify', async () => {
  capture.mockResolvedValue({ leadId: 5, created: false, previousStatus: 'new', status: 'scheduled' });
  await request(app).post('/api/consult-request').send({ email: 'a@b.com' });
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

it('#7 400s on a name longer than Lead.firstName varchar(100)', async () => {
  const res = await request(app).post('/api/consult-request').send({ email: 'a@b.com', name: 'A'.repeat(101) });
  expect(res.status).toBe(400);
});
