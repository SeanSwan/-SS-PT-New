/**
 * consultRequestService — "book a free consult" → CRM
 * Verifies: new prospect becomes a `scheduled` lead + `meeting_scheduled` activity;
 * an existing non-converted lead moves to scheduled; a CONVERTED customer is never
 * downgraded; a nurture-email leadId is honored; no email+no leadId is skipped.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findOrCreate, findByPk, activityCreate } = vi.hoisted(() => ({
  findOrCreate: vi.fn(), findByPk: vi.fn(), activityCreate: vi.fn(),
}));
vi.mock('../models/Lead.mjs', () => ({ default: { findOrCreate, findByPk } }));
vi.mock('../models/LeadActivity.mjs', () => ({ default: { create: activityCreate } }));

const { captureConsultRequest } = await import('../services/consultRequestService.mjs');

beforeEach(() => { vi.clearAllMocks(); activityCreate.mockResolvedValue({}); });

it('creates a NEW lead as scheduled + logs a meeting_scheduled activity', async () => {
  findOrCreate.mockResolvedValue([{ id: 1, status: 'scheduled', tags: [], score: 60 }, true]);
  const res = await captureConsultRequest({ name: 'Alex Doe', email: 'Alex@X.com', preferredTime: 'Mon AM' });
  expect(res).toMatchObject({ leadId: 1, created: true });
  expect(findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
    where: { email: 'alex@x.com' },
    defaults: expect.objectContaining({ status: 'scheduled', firstName: 'Alex' }),
  }));
  expect(activityCreate).toHaveBeenCalledWith(expect.objectContaining({ type: 'meeting_scheduled', leadId: 1 }));
});

it('moves an EXISTING non-converted lead to scheduled', async () => {
  const update = vi.fn();
  findOrCreate.mockResolvedValue([{ id: 2, status: 'new', tags: [], score: 10, contactCount: 1, update }, false]);
  const res = await captureConsultRequest({ email: 'x@y.com' });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
  expect(res.previousStatus).toBe('new');
});

it('NEVER downgrades a converted customer', async () => {
  const update = vi.fn();
  findOrCreate.mockResolvedValue([{ id: 3, status: 'converted', tags: [], score: 90, contactCount: 5, update }, false]);
  await captureConsultRequest({ email: 'c@y.com' });
  expect(update.mock.calls[0][0].status).toBeUndefined(); // status NOT changed
});

it('uses leadId when provided (nurture-email consult link) — no dedupe lookup', async () => {
  const update = vi.fn();
  findByPk.mockResolvedValue({ id: 7, status: 'contacted', tags: [], score: 40, contactCount: 2, update });
  const res = await captureConsultRequest({ leadId: 7, email: 'z@y.com' });
  expect(findByPk).toHaveBeenCalledWith(7);
  expect(findOrCreate).not.toHaveBeenCalled();
  expect(res.leadId).toBe(7);
});

it('skips when there is no email and no leadId', async () => {
  const res = await captureConsultRequest({ name: 'No Email' });
  expect(res).toMatchObject({ skipped: 'no_email' });
  expect(findOrCreate).not.toHaveBeenCalled();
});

it('returns an error object (never throws) when the DB fails', async () => {
  findOrCreate.mockRejectedValue(new Error('db down'));
  const res = await captureConsultRequest({ email: 'a@b.com' });
  expect(res.error).toContain('db down');
});
