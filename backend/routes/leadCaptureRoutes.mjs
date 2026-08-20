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
import { sendSpeedToLeadReply } from '../services/speedToLeadService.mjs';
import { mergeLeadTags, CAPTURE_INTENTS } from '../services/leadCaptureShared.mjs';
import { createAdminNotification } from '../controllers/notificationController.mjs';
import { sendSmsMessage } from '../services/smsService.mjs';
import { sendGridEmail } from '../services/sendgridService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Shared with the contact form's capture path so the two public funnels tag one vocabulary.
const INTENTS = new Set(CAPTURE_INTENTS);
const enabled = () => process.env.PRISM_CAPTURE_ENABLED === 'true';

// Boot-time env-presence WARN (never throw) — the cheap half of the guaranteed-alert loop. The route works
// flag-off without any of these; when enabled, a missing var degrades one alert channel, not the capture.
for (const k of ['SENDGRID_API_KEY', 'OWNER_EMAIL', 'OWNER_PHONE', 'TWILIO_ACCOUNT_SID', 'REF_CODE_PEPPER']) {
  if (!process.env[k]) logger.warn(`[prism] env ${k} not set — a PRISM alert/ref channel will degrade when enabled`);
}

/**
 * Synthetic first name from an email local-part (Decision D). Tagged `name:derived`; real name overwrites via CRM.
 * HARDENED: strip to ALPHANUMERIC (EMAIL_RE permits `<>"'/(){}` in the local part — a raw segment could carry an
 * XSS payload into the CRM admin UI or overflow `Lead.firstName varchar(100)` → INSERT throw → silent lead loss).
 * Alphanumeric-only + a 40-char cap makes it safe by construction and always ≤ the column width.
 */
export function deriveFirstName(email) {
  const local = String(email).split('@')[0].split('+')[0];
  const raw = local.split(/[._-]/).filter(Boolean)[0] || '';
  const seg = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40); // alnum only, capped well under varchar(100)
  return seg.length >= 2 && /[a-z]/i.test(seg) ? seg[0].toUpperCase() + seg.slice(1) : 'Friend';
}

/**
 * Deterministic, unguessable, stable share code from the lead id (Decision B — no column).
 * FAIL-CLOSED: when `REF_CODE_PEPPER` is unset we return null (NOT the raw id). Emitting `String(leadId)` in the
 * public 201 would leak the sequential DB primary key — an enumeration + pipeline-volume oracle that defeats the
 * opaque-response goal. Null simply hides the share ray; capture still succeeds.
 */
export function refCodeFor(leadId) {
  const pepper = process.env.REF_CODE_PEPPER;
  if (!pepper) return null; // fail-closed: no pepper → no public code (share ray hidden), never the raw id
  return crypto.createHmac('sha256', pepper).update(String(leadId)).digest('hex').slice(0, 10);
}

// Global owner-alert budget — caps external SMS/email cost + owner-phone DoS when a distributed flood of UNIQUE
// emails each creates a new lead (the per-IP contactLimiter can't stop a botnet with rotating IPs). In-process:
// on multi-instance Render the cap is per-instance — a shared store (Redis) is the follow-up. In-app admin
// notifications are NOT capped (they cost nothing). CRM-row creation is inherent to any public capture (same
// exposure as the existing contact form); a CAPTCHA/PoW is the real defense there and is tracked separately.
const ALERT_WINDOW_MS = 60 * 60 * 1000;
const ALERT_MAX_PER_WINDOW = 30;
let alertWindowStart = 0;
let alertCount = 0;
function externalAlertBudgetOk() {
  const now = Date.now();
  if (now - alertWindowStart > ALERT_WINDOW_MS) {
    alertWindowStart = now;
    alertCount = 0;
  }
  if (alertCount >= ALERT_MAX_PER_WINDOW) return false;
  alertCount += 1;
  return true;
}

/** Fire the canonical owner-alert trio. All non-critical; never blocks the response. Email goes to the OWNER only. */
async function fireOwnerAlerts({ email, intent, referred }) {
  const label = intent === 'trainer' ? 'TRAINER' : intent || 'lead';
  const summary = `New Prism lead (${label})${referred ? ' — referred' : ''}: ${email}`;
  // In-app admin notification is free — always fire (an honest per-lead trail Sean can see even during a flood).
  try {
    await createAdminNotification({ title: 'New Prism Capture', message: summary, type: 'admin' });
  } catch { /* non-critical */ }

  // External (paid) channels are budgeted: a flood is visible in-app + CRM but can't run up Twilio/SendGrid spend.
  if (!externalAlertBudgetOk()) {
    logger.warn('[prism] external owner-alert budget exhausted this window — suppressing SMS/email (CRM + in-app unaffected)');
    return;
  }

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

    // Speed-to-lead (SWA-40): instant branded acknowledgment to the LEAD, flag-gated,
    // fire-and-forget — never blocks the 201 or the tag/alert pipeline below.
    sendSpeedToLeadReply({ email, name: firstName, leadId: result?.leadId, source: 'prism' })
      .catch((err) => logger.warn(`[prism] speed-to-lead failed (non-critical): ${err?.message}`));

    let code = null;
    if (result?.leadId) {
      code = refCodeFor(result.leadId);
      const prismTags = ['prism', 'name:derived'];
      if (code) prismTags.push(`prism:refcode:${code}`); // omit when pepper unset (code null)
      if (intent) prismTags.push(`prism:intent:${intent}`);
      if (ref) prismTags.push(`prism:refby:${ref}`);
      // utm_campaign is dropped by the shared deriveChannel (source/medium only) — keep it as a tag so
      // campaign attribution isn't lost. Sanitized to a safe token.
      const campaign = typeof utm.campaign === 'string' ? utm.campaign.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) : '';
      if (campaign) prismTags.push(`prism:utm_campaign:${campaign}`);
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

      // OPAQUE 201: identical shape whether the lead was CREATED or already EXISTED (result.created true|false) —
      // anti-enumeration. `code` is null when the pepper is unset (share ray hidden), same for both cases.
      return res.status(201).json({ ok: true, ref: code });
    }

    // No leadId → captureLeadFromContact returned {error}/{skipped} (it returns, doesn't throw). Returning an
    // opaque 201 here would silently LOSE the lead. Fail LOUD (500) so the frontend shows Retry and the lead is
    // recoverable. Enumeration is not leaked: created-vs-existing both go through the 201 branch above; only a
    // genuine backend failure reaches here. Log a CLASSIFIER only, never `result.error` — a driver-level Postgres
    // message can embed the email value (`Key (email)=(…)`), which would break the "email never logged" guarantee.
    logger.error(`[prism] capture produced no leadId — lead not saved (${result?.skipped ? 'skipped' : 'backend_error'})`);
    return res.status(500).json({ ok: false });
  } catch (err) {
    logger.error('[prism] capture error:', err?.message); // message only — never the email (Rule 59)
    return res.status(500).json({ ok: false });
  }
});

export default router;
