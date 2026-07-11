/**
 * Consult Request Route (PUBLIC — no auth)
 * ========================================
 * POST /api/consult-request — a prospect's "book a free consult" submission. Records the
 * request in the CRM (lead → `scheduled` + `meeting_scheduled` activity) and emails the
 * owner to CONFIRM. Per the ratified plan it creates a consult REQUEST pending Sean's
 * one-tap confirm — NOT a `Session` (no auto-booking without availability checks).
 *
 * Public + hardened: rate-limited, honeypot-guarded, email-validated. Owner notification
 * is best-effort (a mail failure never fails the prospect's request).
 */
import express from 'express';
import { captureConsultRequest } from '../services/consultRequestService.mjs';
import { sendGridEmail } from '../services/sendgridService.mjs';
import { rateLimiter } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// GLOBAL owner-notify throttle (independent of the per-IP request limiter): bounds the owner
// inbox / SendGrid-quota blast from email-rotation abuse (each distinct email = a new lead + an
// alert). In-memory rolling window — a pragmatic per-process cap; a shared/durable cap is a
// documented follow-up. Env-tunable.
const OWNER_NOTIFY_MAX = Number(process.env.SWAN_OWNER_NOTIFY_MAX_PER_HOUR) || 30;
const OWNER_NOTIFY_WINDOW_MS = 60 * 60 * 1000;
let ownerNotifyTimes = [];
const ownerNotifyAllowed = () => {
  const now = Date.now();
  ownerNotifyTimes = ownerNotifyTimes.filter((t) => now - t < OWNER_NOTIFY_WINDOW_MS);
  if (ownerNotifyTimes.length >= OWNER_NOTIFY_MAX) return false;
  ownerNotifyTimes.push(now);
  return true;
};

const notifyOwner = async ({ name, email, phone, preferredTime, notes, result }) => {
  const recipients = [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL].filter(Boolean);
  if (!recipients.length) return;
  const subject = `New consult request — ${name || email}`;
  const text = `New free-consult request (confirm + schedule in the admin CRM):\n\n`
    + `Name: ${name || '(none)'}\nEmail: ${email}\nPhone: ${phone || '(none)'}\n`
    + `Preferred time: ${preferredTime || '(none)'}\nNotes: ${notes || '(none)'}\n`
    + `Lead #${result?.leadId ?? '?'} (status now: ${result?.status ?? '?'})`;
  try {
    await sendGridEmail({ to: recipients, subject, text }); // array → both owners notified
  } catch (err) {
    logger.error(`[ConsultRequest] owner notify failed (non-critical): ${err?.message}`);
  }
};

router.post('/', rateLimiter({ windowMs: 60 * 60 * 1000, max: 15 }), async (req, res) => {
  const body = req.body || {};

  // Honeypot: bots fill the hidden 'website' field — silently accept, do nothing.
  if (body.website) return res.status(200).json({ success: true, message: 'Thanks!' });

  const cleanEmail = String(body.email || '').trim();
  if (!cleanEmail || cleanEmail.length > 255 || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'A valid email is required.' });
  }

  // Trim + cap public free-text (Lead.phone is STRING(30); unbounded notes/name = 500s + bloat).
  // NOTE: body.leadId is intentionally NOT trusted here — a public caller must never target an
  // arbitrary lead by enumerated id (IDOR); dedupe is by validated email only.
  const name = body.name != null ? String(body.name).trim() : null;
  const preferredTime = body.preferredTime != null ? String(body.preferredTime).trim() : null;
  const notes = body.notes != null ? String(body.notes).trim() : null;
  const phone = body.phone != null ? String(body.phone).trim() : null;
  if ((name && name.length > 100) || (preferredTime && preferredTime.length > 120) // name → Lead.firstName STRING(100)
      || (notes && notes.length > 2000) || (phone && (phone.length > 30 || !/^[\d+()\-\s]*$/.test(phone)))) {
    return res.status(400).json({ success: false, message: 'One or more fields are too long or malformed.' });
  }

  try {
    const result = await captureConsultRequest({ name, email: cleanEmail, phone, preferredTime, notes });
    if (result?.error) {
      logger.error(`[ConsultRequest] capture failed: ${result.error}`);
      return res.status(500).json({ success: false, message: 'Could not record your request. Please try again.' });
    }
    // Owner alert for ANY genuine consult (new OR returning high-intent lead), behind the GLOBAL cap
    // so email-rotation abuse can't flood the inbox / SendGrid quota. FIRE-AND-FORGET: the prospect
    // isn't blocked on a SendGrid round-trip, and the response latency is constant regardless of
    // new-vs-existing (no created-vs-existing timing oracle for lead enumeration).
    if (ownerNotifyAllowed()) {
      notifyOwner({ name, email: cleanEmail, phone, preferredTime, notes, result })
        .catch((err) => logger.error(`[ConsultRequest] owner notify failed (non-critical): ${err?.message}`));
    }
    return res.status(201).json({ success: true, message: 'Thanks! Sean will reach out to confirm your consult.' });
  } catch (err) {
    logger.error(`[ConsultRequest] error: ${err?.message}`);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

export default router;
