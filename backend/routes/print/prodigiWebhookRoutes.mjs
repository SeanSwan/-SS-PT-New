// backend/routes/print/prodigiWebhookRoutes.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3c — inbound Prodigi status webhook. Prodigi calls this when an order
// advances (dispatched/shipped) so we can record tracking + flip to 'shipped'.
//
// Auth: a shared secret (PRODIGI_WEBHOOK_SECRET), matched from a header (preferred,
// keeps it out of URL logs) or a query param. Fail-closed if unset/mismatched.
// TODO(live): confirm Prodigi's real callback auth + payload shape against their
// dashboard/docs when the account exists; the parser below is defensive.
// ─────────────────────────────────────────────────────────────────────────────
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import logger from '../../utils/logger.mjs';
import { prodigiWebhookSecret } from '../../services/print/prodigiConfig.mjs';
import { applyProviderStatus, extractProviderStatus } from '../../services/print/printFulfillmentService.mjs';

const router = express.Router();

/** Constant-time string compare (avoids leaking the secret via response timing). */
function secretMatches(provided, configured) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(configured));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

router.post('/prodigi/status', async (req, res) => {
  const configured = prodigiWebhookSecret();
  if (!configured) {
    logger.warn('[Prodigi Webhook] PRODIGI_WEBHOOK_SECRET not set — rejecting callback (fail-closed)');
    return res.status(503).json({ error: 'not_configured' });
  }
  // HEADER ONLY — a query-param secret would land in access logs (Rule 59). Configure
  // Prodigi to send the shared secret in the x-prodigi-webhook-secret header.
  const provided = req.get('x-prodigi-webhook-secret') || '';
  if (!secretMatches(provided, configured)) {
    logger.warn('[Prodigi Webhook] rejected callback with bad/missing secret');
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Shared parser (single source of truth for the Prodigi body shape — no duplication).
    const { providerOrderId, prodigiStatus, trackingNumber } = extractProviderStatus(req.body);
    if (!providerOrderId) return res.status(400).json({ error: 'missing_order_id' });

    const result = await applyProviderStatus({ providerOrderId, prodigiStatus, trackingNumber });
    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    logger.error('[Prodigi Webhook] processing error: %s', err.message);
    return res.status(500).json({ error: 'processing_error' });
  }
});

export default router;
