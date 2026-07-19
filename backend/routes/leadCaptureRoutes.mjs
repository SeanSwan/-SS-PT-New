/**
 * leadCaptureRoutes — PUBLIC email-only speed-to-lead capture ("PRISM CAPTURE", Kimi-adapted 2026-07-19).
 * ==================================================================================================
 * Mounted at /api/leads BEFORE the protected leadRoutes (core/routes.mjs). Defines ONLY `POST /capture`;
 * every other `/api/leads/*` request falls through to the existing protected router UNCHANGED.
 *
 * BIND-ONLY (Rule 27 — the public lead pipeline already exists): reuses `captureLeadFromContact` (dedupe-upsert
 * + CRM lead + attribution) and the canonical alert services. ZERO schema migration — the lead's own share code,
 * intent, referral, and synthetic-name marker all live in `Lead.tags` via `mergeLeadTags` (append-only).
 *
 * SAFETY: public + unauthenticated → hardened. `contactLimiter` rate limit (shared with the contact form);
 * strict input validation + length caps; flag-gated by `PRISM_CAPTURE_ENABLED` env (404 when off, so this
 * ships dark and reversible with an env flip). OPAQUE 201 (identical shape for new & existing emails) so the
 * endpoint can't be used to enumerate who is already a lead.
 * PRIVACY (Rule 8 / 59): the lead email is sent only to the business owner's own alert channels (never to an
 * LLM); it is NEVER written to server logs.
 */
import express from 'express';
import crypto from 'crypto';
import { contactLimiter } from '../middleware/rateLimiter.mjs';
import { captureLeadFromContact } from '../services/leadCaptureService.mjs';
import { mergeLeadTags } from '../services/leadCaptureShared.mjs';
import { createAdminNotification } from '../controllers/notificationController.mjs';
import { sendSmsMessage } from '../services/smsService.mjs';
import { sendGridEmail } from '../services/sendgridService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTENTS = new Set(['book', 'trainer', 'spectrum']);
const enabled = () => process.env.PRISM_CAPTURE_ENABLED === 'true';

// Boot-time env-presence WARN (never throw) — the cheap half of the guaranteed-alert loop. The route works
// flag-off without any of these; when enabled, a missing var degrades one alert channel, not the capture.
for (const k of ['SENDGRID_API_KEY', 'OWNER_EMAIL', 'OWNER_PHONE', 'TWILIO_ACCOUNT_SID', 'REF_CODE_PEPPER']) {
  if (!process.env[k]) logger.warn(`[prism] env ${k} not set — a PRISM alert/ref channel will degrade when enabled`);
}

/** Synthetic first name from an email local-part (Decision D). Tagged `name:derived`; real name overwrites via CRM. */
export function deriveFirstName(email) {
  const local = email.split('@')[0].split('+')[0];
  const seg = local.split(/[._-]/).filter(Boolean)[0] || '';
  return seg.length >= 2 && /[a-z]/i.test(seg) ? seg[0].toUpperCase() + seg.slice(1) : 'Friend';
}

/** Deterministic, unguessable, stable share code from the lead id (Decision B — no column). */
export function refCodeFor(leadId) {
  const pepper = process.env.REF_CODE_PEPPER;
  if (!pepper) return String(leadId); // fallback: raw id (warned at boot). Still stable + returnable.
  return crypto.createHmac('sha256', pepper).update(String(leadId)).digest('hex').slice(0, 10);
}

/** Fire the canonical owner-alert trio. All non-critical; never blocks the response. Email goes to the OWNER only. */
async function fireOwnerAlerts({ email, intent, referred }) {
  const label = intent === 'trainer' ? 'TRAINER' : intent || 'lead';
  const summary = `New Prism lead (${label})${referred ? ' — referred' : ''}: ${email}`;
  try {
    await createAdminNotification({ title: 'New Prism Capture', message: summary, type: 'admin' });
  } catch { /* non-critical */ }

  const emails = [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL].filter(Boolean);
  if (emails.length && process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    try {
      await sendGridEmail({
        to: emails,
        subject: `SwanStudios — new lead (${label})`,
        text: `${summary}\n\nRespond fast — speed-to-lead. Full record is in the CRM lead pipeline.`,
      });
    } catch { /* non-critical */ }
  }

  const phones = [process.env.OWNER_PHONE, process.env.OWNER_WIFE_PHONE].filter(Boolean);
  for (const to of phones) {
    try {
      await sendSmsMessage({ to, body: `SwanStudios: ${summary}` });
    } catch { /* non-critical */ }
  }
}

/**
 * POST /api/leads/capture — one beam in.
 * Body: { email (required), intent?: 'book'|'trainer'|'spectrum', ref?: string, utm?: {source,medium,campaign} }
 * 201 { ok:true, ref } (opaque) · 400 valid_email_required · 404 flag off · 429 rate-limited · 500 { ok:false }
 */
router.post('/capture', contactLimiter, async (req, res) => {
  if (!enabled()) return res.status(404).json({ ok: false });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, error: 'valid_email_required' });
    }
    const intent = INTENTS.has(req.body?.intent) ? req.body.intent : null;
    const ref =
      typeof req.body?.ref === 'string' ? req.body.ref.replace(/[^a-z0-9]/gi, '').slice(0, 32) || null : null;
    const utm = req.body?.utm && typeof req.body.utm === 'object' ? req.body.utm : {};
    const cap = (v) => (typeof v === 'string' ? v.slice(0, 120) : undefined);
    const firstName = deriveFirstName(email);

    // Canonical capture: dedupe-upserts by email, creates the CRM lead + activity, records attribution.
    // The service reads email/name/message from `formData` (verified leadCaptureService.mjs:68-92).
    const result = await captureLeadFromContact({
      contact: { id: null },
      formData: { name: firstName, email, message: '[prism-capture] email-only opt-in' },
      consultationType: 'prism_capture',
      attribution: { utmSource: cap(utm.source), utmMedium: cap(utm.medium), utmCampaign: cap(utm.campaign) },
    });

    let code = null;
    if (result?.leadId) {
      code = refCodeFor(result.leadId);
      const prismTags = ['prism', `prism:refcode:${code}`, 'name:derived'];
      if (intent) prismTags.push(`prism:intent:${intent}`);
      if (ref) prismTags.push(`prism:refby:${ref}`);
      try {
        const { default: Lead } = await import('../models/Lead.mjs');
        const lead = await Lead.findByPk(result.leadId);
        if (lead) await lead.update({ tags: mergeLeadTags(lead.tags, prismTags) });
      } catch {
        logger.warn('[prism] tag augment failed (non-critical)');
      }
      // Alert only on a NEWLY created lead so repeat opt-ins from the same email don't spam the owner.
      // Fire-and-forget: the 201 returns immediately (speed-to-lead), the alert completes in-process.
      if (result.created) fireOwnerAlerts({ email, intent, referred: !!ref }).catch(() => {});
    } else {
      // captureLeadFromContact returns {error}/{skipped} instead of throwing — a DB failure here would
      // otherwise return an opaque 201 while the lead is silently LOST. Log loud (no PII) so it's observable.
      logger.error(`[prism] capture produced no leadId (lead may be lost): ${result?.error || result?.skipped || 'unknown'}`);
    }

    // OPAQUE: identical shape whether the lead was created, existed, or the service skipped — anti-enumeration.
    return res.status(201).json({ ok: true, ref: code });
  } catch (err) {
    logger.error('[prism] capture error:', err?.message); // message only — never the email (Rule 59)
    return res.status(500).json({ ok: false });
  }
});

export default router;
