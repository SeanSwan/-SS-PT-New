/**
 * SMS Webhook Routes
 * ==================
 * Public Twilio webhook handlers for inbound SMS compliance events.
 */
import express from 'express';
import twilio from 'twilio';
import logger from '../utils/logger.mjs';
import { recordSmsOptOut } from '../services/smsSuppressionService.mjs';

const router = express.Router();
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

const publicBaseUrl = () => (
  process.env.TWILIO_WEBHOOK_PUBLIC_BASE_URL ||
  process.env.SWAN_API_BASE_URL ||
  ''
).replace(/\/+$/, '');

const requestUrlFor = (req) => {
  const base = publicBaseUrl();
  if (base) return `${base}${req.originalUrl}`;
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
};

const twilioSignatureRequired = () => (
  process.env.NODE_ENV === 'production' &&
  process.env.TWILIO_WEBHOOK_SIGNATURE_REQUIRED !== 'false'
);

const verifyTwilioSignature = (req) => {
  if (!twilioSignatureRequired()) return { ok: true };

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.error('[smsWebhook] TWILIO_AUTH_TOKEN missing; cannot validate inbound webhook');
    return { ok: false, status: 503, message: 'Twilio webhook validation unavailable' };
  }

  const signature = req.get('x-twilio-signature') || '';
  if (typeof twilio.validateRequest !== 'function') {
    logger.error('[smsWebhook] twilio.validateRequest unavailable');
    return { ok: false, status: 503, message: 'Twilio webhook validation unavailable' };
  }

  const valid = twilio.validateRequest(authToken, signature, requestUrlFor(req), req.body || {});
  return valid ? { ok: true } : { ok: false, status: 403, message: 'Forbidden' };
};

router.post('/inbound', async (req, res) => {
  const signature = verifyTwilioSignature(req);
  if (!signature.ok) {
    return res.status(signature.status).type('text/plain').send(signature.message);
  }

  try {
    await recordSmsOptOut({
      from: req.body?.From || req.body?.from,
      body: req.body?.Body || req.body?.body,
      messageSid: req.body?.MessageSid || req.body?.SmsMessageSid || req.body?.messageSid,
      raw: req.body || {},
    });

    return res.status(200).type('text/xml').send(EMPTY_TWIML);
  } catch (error) {
    logger.error('[smsWebhook] Failed to persist inbound SMS opt-out:', error);
    return res.status(500).type('text/xml').send(EMPTY_TWIML);
  }
});

export default router;
