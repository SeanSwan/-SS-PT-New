/**
 * telemetryRoutes.mjs — P0-4 (SWA-29) public funnel beacon (MEASUREMENT-CHARTER §transport).
 *
 * POST /api/telemetry/funnel — the client-side half of the funnel stream (visit / booking_started /
 * referral). The server-side half (lead_captured / converted) comes from the Lead model hooks.
 *
 * SECURITY (this is a PUBLIC, UNAUTHENTICATED endpoint):
 *  - CLIENT_FUNNEL_EVENTS allowlist: server-authoritative events (converted, purchase, lead_captured,
 *    …) are silently dropped — a client CANNOT fake a conversion or revenue.
 *  - recordFunnelEvent sanitizes (allowlist meta, drop PII, bucket amounts) + is fail-soft.
 *  - telemetryLimiter caps per-IP flooding.
 *  - ALWAYS 204: a beacon never errors the client and never leaks whether the event was honored
 *    (no oracle for an attacker probing which events are accepted).
 */
import express from 'express';
import { telemetryLimiter } from '../middleware/rateLimiter.mjs';
import { recordFunnelEvent, CLIENT_FUNNEL_EVENTS } from '../services/acquisitionTelemetry.mjs';

const router = express.Router();

router.post('/funnel', telemetryLimiter, async (req, res) => {
  try {
    const { event, ref, meta } = req.body ?? {};
    if (typeof event === 'string' && CLIENT_FUNNEL_EVENTS.has(event)) {
      const cleanMeta = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
      await recordFunnelEvent(event, { ...cleanMeta, ...(ref != null ? { ref } : {}) });
    }
  } catch {
    /* fail-soft — a telemetry beacon must never error the client */
  }
  return res.status(204).end();
});

export default router;
