/**
 * telemetryBeacon.test.mjs — P0-4 (SWA-29) public funnel beacon security contract.
 * The load-bearing control: a client CANNOT emit a server-authoritative event
 * (converted/purchase/lead_captured) — only visit/booking_started/referral are honored.
 */
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock only recordFunnelEvent; keep the REAL CLIENT_FUNNEL_EVENTS allowlist so the route's
// own gate is exercised. Mock the limiter to a pass-through so tests aren't throttled.
const recordFunnelEvent = vi.fn(async () => true);
vi.mock('../../services/acquisitionTelemetry.mjs', async (orig) => ({
  ...(await orig()),
  recordFunnelEvent,
}));
vi.mock('../../middleware/rateLimiter.mjs', () => ({
  telemetryLimiter: (req, res, next) => next(),
}));

const { default: telemetryRoutes } = await import('../../routes/telemetryRoutes.mjs');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/telemetry', telemetryRoutes);
  return a;
}

describe('POST /api/telemetry/funnel — beacon security', () => {
  beforeEach(() => recordFunnelEvent.mockClear());

  it('honors a client event (visit) and returns 204', async () => {
    const res = await request(app()).post('/api/telemetry/funnel').send({ event: 'visit', meta: { source: 'home' } });
    expect(res.status).toBe(204);
    expect(recordFunnelEvent).toHaveBeenCalledWith('visit', expect.objectContaining({ source: 'home' }));
  });

  it('REFUSES a server-authoritative event (converted) — client cannot fake a conversion', async () => {
    const res = await request(app()).post('/api/telemetry/funnel').send({ event: 'converted', meta: { amount: 8400 } });
    expect(res.status).toBe(204); // still 204 — no oracle for the attacker
    expect(recordFunnelEvent).not.toHaveBeenCalled();
  });

  it('REFUSES purchase and lead_captured from the client too', async () => {
    for (const event of ['purchase', 'lead_captured', 'scheduled', 'ref_converted']) {
      await request(app()).post('/api/telemetry/funnel').send({ event });
    }
    expect(recordFunnelEvent).not.toHaveBeenCalled();
  });

  it('drops an unknown event and a missing/garbage body, always 204', async () => {
    expect((await request(app()).post('/api/telemetry/funnel').send({ event: 'made_up' })).status).toBe(204);
    expect((await request(app()).post('/api/telemetry/funnel').send({})).status).toBe(204);
    expect((await request(app()).post('/api/telemetry/funnel').send({ event: 42 })).status).toBe(204);
    expect(recordFunnelEvent).not.toHaveBeenCalled();
  });

  it('merges a top-level ref into meta for referral attribution', async () => {
    await request(app()).post('/api/telemetry/funnel').send({ event: 'ref_landed', ref: 'CODE9' });
    expect(recordFunnelEvent).toHaveBeenCalledWith('ref_landed', expect.objectContaining({ ref: 'CODE9' }));
  });

  it('ignores a non-object meta without throwing', async () => {
    const res = await request(app()).post('/api/telemetry/funnel').send({ event: 'visit', meta: 'not-an-object' });
    expect(res.status).toBe(204);
    expect(recordFunnelEvent).toHaveBeenCalledWith('visit', expect.any(Object));
  });
});
