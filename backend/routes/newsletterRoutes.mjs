/**
 * Newsletter Routes (Tier 1.1) — public double-opt-in email list.
 * ===============================================================
 * POST /api/newsletter/subscribe        public, rate-limited, honeypot
 * GET  /api/newsletter/confirm/:token   double-opt-in confirm (HTML page)
 * GET  /api/newsletter/unsubscribe/:token  one-click unsubscribe (HTML page)
 * Send is 1:1 transactional (confirm email) via the existing sendgridService —
 * NO mass/broadcast send here (that is a separate, deliverability-isolated slice).
 */
import express from 'express';
import { rateLimiter } from '../middleware/authMiddleware.mjs';
import { subscribe, confirm, unsubscribe } from '../services/newsletterService.mjs';
import { sendGridEmail } from '../services/sendgridService.mjs';
import { captureLeadFromNewsletter } from '../services/leadCaptureService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const SITE_URL = process.env.FRONTEND_URL || 'https://sswanstudios.com';
const API_URL = process.env.API_BASE_URL || SITE_URL;

const page = (heading, message, cta = null) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} · SwanStudios</title></head>
<body style="margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#0A0A0F;color:#E0ECF4;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px">
<div style="max-width:480px"><h1 style="color:#60C0F0;margin:0 0 12px">${heading}</h1><p style="opacity:.85;line-height:1.6">${message}</p>${cta ? `<p style="margin:24px 0 8px"><a href="${cta.url}" style="display:inline-block;background:linear-gradient(135deg,#60C0F0,#002060);color:#fff;padding:14px 30px;border-radius:10px;text-decoration:none;font-weight:700">${cta.label}</a></p>` : ''}<p style="margin-top:${cta ? '8px' : '24px'}"><a href="${SITE_URL}" style="color:#C6A84B;text-decoration:none;font-weight:600">Return to SwanStudios →</a></p></div>
</body></html>`;

// 1:1 welcome email on confirm — first value-delivery + one booking CTA. Includes
// a one-click unsubscribe link (good practice for any list email).
async function sendWelcomeEmail(subscriber) {
  const bookUrl = `${SITE_URL}/contact`;
  const unsubUrl = `${API_URL}/api/newsletter/unsubscribe/${subscriber.unsubscribeToken}`;
  const hi = subscriber.firstName ? `Hi ${subscriber.firstName}, ` : 'Hi, ';
  await sendGridEmail({
    to: subscriber.email,
    subject: 'Welcome to SwanStudios 🦢',
    text: `${hi}you're confirmed! Get coaching tips and updates from SwanStudios. Ready to start? Book a free assessment: ${bookUrl}\n\nUnsubscribe anytime: ${unsubUrl}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a"><h2 style="color:#002060">Welcome to SwanStudios 🦢</h2><p>${hi}you're confirmed. You'll get coaching tips, programming insights, and member updates — no spam.</p><p style="margin:24px 0"><a href="${bookUrl}" style="display:inline-block;background:#002060;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Book your free assessment</a></p><p style="color:#888;font-size:12px;margin-top:28px">You're receiving this because you confirmed your SwanStudios subscription. <a href="${unsubUrl}" style="color:#888">Unsubscribe</a>.</p></div>`,
  });
}

// Public subscribe — rate-limited; `website` is a honeypot field that traps bots.
router.post('/subscribe', rateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    const { email, firstName, lastName, source, website } = req.body || {};
    if (website) {
      return res.status(200).json({ success: true, message: 'Almost there — check your email to confirm your subscription.' });
    }

    const result = await subscribe({
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      source: source || 'website',
      consentSource: 'newsletter signup form',
      consentIp: req.ip,
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (result.confirmToken) {
      try {
        const confirmUrl = `${API_URL}/api/newsletter/confirm/${result.confirmToken}`;
        await sendGridEmail({
          to: result.subscriber.email,
          subject: 'Confirm your SwanStudios subscription',
          text: `Welcome to SwanStudios! Confirm your subscription: ${confirmUrl}`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto"><h2 style="color:#002060">Confirm your subscription</h2><p>Tap below to confirm you'd like SwanStudios updates.</p><p><a href="${confirmUrl}" style="display:inline-block;background:#002060;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Confirm subscription</a></p><p style="color:#666;font-size:13px">If you didn't request this, ignore this email — you won't be added.</p></div>`,
        });
      } catch (mailErr) {
        logger.warn(`[Newsletter] confirm email failed: ${mailErr.message}`);
      }
    }

    // Generic success regardless of new/existing/already-confirmed — don't reveal who is on the list.
    return res.status(200).json({ success: true, message: 'Almost there — check your email to confirm your subscription.' });
  } catch (err) {
    logger.error(`[Newsletter] subscribe error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Could not process your subscription. Please try again.' });
  }
});

router.get('/confirm/:token', async (req, res) => {
  try {
    const result = await confirm(req.params.token);
    if (!result.ok) {
      return res.status(400).send(page('Link expired', 'This confirmation link is invalid or has already been used. Try subscribing again.'));
    }
    // Newly confirmed -> enter the CRM pipeline + send a welcome email. Both are
    // best-effort and MUST NOT block/break the confirmation page.
    if (result.action === 'confirmed' && result.subscriber) {
      const leadResult = await captureLeadFromNewsletter({
        email: result.subscriber.email,
        firstName: result.subscriber.firstName,
        lastName: result.subscriber.lastName,
      });
      if (leadResult?.error) logger.warn(`[Newsletter] lead capture on confirm failed: ${leadResult.error}`);
      try {
        await sendWelcomeEmail(result.subscriber);
      } catch (mailErr) {
        logger.warn(`[Newsletter] welcome email failed: ${mailErr.message}`);
      }
    }
    return res.status(200).send(page(
      "You're in! 🦢",
      'Your subscription is confirmed. Welcome to SwanStudios — your first tips are on the way.',
      { label: 'Book your free assessment', url: `${SITE_URL}/contact` },
    ));
  } catch (err) {
    logger.error(`[Newsletter] confirm error: ${err.message}`);
    return res.status(500).send(page('Something went wrong', 'Please try the link again shortly.'));
  }
});

router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const result = await unsubscribe(req.params.token);
    if (!result.ok) {
      return res.status(400).send(page('Link invalid', 'This unsubscribe link is invalid.'));
    }
    return res.status(200).send(page('Unsubscribed', "You've been removed from the SwanStudios list and won't receive further emails."));
  } catch (err) {
    logger.error(`[Newsletter] unsubscribe error: ${err.message}`);
    return res.status(500).send(page('Something went wrong', 'Please try the link again shortly.'));
  }
});

export default router;
