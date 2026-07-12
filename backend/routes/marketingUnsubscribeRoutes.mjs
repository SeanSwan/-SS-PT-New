/**
 * Marketing Unsubscribe Route (PUBLIC — no auth)
 * ==============================================
 * One-click CAN-SPAM unsubscribe target for the lead-nurture EMAIL channel. The nurture
 * emails embed `{API}/api/marketing/unsubscribe?lead=<id>&token=<hmac>` (built by
 * emailTemplateService.buildNurtureEmailVars). The HMAC token is verified on BOTH verbs
 * (so the link is not IDOR-enumerable), then the opt-out is recorded in the UNIFIED
 * email-suppression surface — a `Subscriber` row marked `unsubscribed` — which
 * `resolveMarketingSuppression` already honors, so the lead can never be hit again.
 *
 * GET is SIDE-EFFECT-FREE (shows a confirm button) and POST performs the opt-out. This is
 * deliberate: email security scanners / clients PRE-FETCH links, and a GET that mutated
 * would auto-unsubscribe recipients who never clicked. The visible action requires a real
 * POST. Fails safe + generic: an invalid token 400s and suppresses nothing; a valid opt-out
 * never leaks whether the lead/email exists and never 500s a public unsubscribe.
 */
import express from 'express';
import { verifyUnsubscribeToken } from '../services/emailTemplateService.mjs';
import { rateLimiter } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const limit = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }); // per-IP hardening (matches consult-request)

const shell = (title, inner) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F4F8FC;font:400 16px/1.6 'Segoe UI',Arial,sans-serif;color:#0A0A0F;">
<div style="max-width:520px;margin:12vh auto;padding:32px;background:#FFFFFF;border-radius:14px;border:1px solid #DCE6F0;text-align:center;">
<div style="font:600 18px 'Segoe UI',Arial,sans-serif;color:#002060;margin-bottom:12px;">SwanStudios</div>
<h1 style="font-size:22px;color:#002060;margin:0 0 12px;">${title}</h1>${inner}</div></body></html>`;

const INVALID = shell('Link invalid', '<p style="margin:0;color:#5A5F6A;">This unsubscribe link is invalid or has expired.</p>');
const DONE = shell('Unsubscribed', "<p style=\"margin:0;color:#5A5F6A;\">You've been removed from SwanStudios marketing emails and won't receive further messages.</p>");
const PROCESSING = shell('Request received', "<p style=\"margin:0;color:#5A5F6A;\">We're processing your unsubscribe request. If you keep receiving marketing emails, please contact us.</p>");

/** Read lead+token from body+query (POST) or query (GET) and verify the HMAC. */
const parseReq = (req) => {
  // RFC 8058 one-click: Gmail/Yahoo POST `List-Unsubscribe=One-Click` in the BODY while lead+token
  // ride in the URL QUERY — so on POST we must read BOTH (body overrides query for a hand form).
  const src = req.method === 'POST' ? { ...(req.query || {}), ...(req.body || {}) } : req.query;
  const leadId = Number(src.lead);
  const token = String(src.token || '');
  const valid = Number.isInteger(leadId) && leadId > 0 && verifyUnsubscribeToken(leadId, token);
  return { leadId, token, valid };
};

/** Record the opt-out in the unified email-suppression surface (Subscriber `unsubscribed`). */
const suppressLeadEmail = async (leadId) => {
  const { default: Lead } = await import('../models/Lead.mjs');
  const lead = await Lead.findByPk(leadId, { attributes: ['id', 'email'] });
  const email = String(lead?.email || '').trim().toLowerCase();
  if (!email) return true; // no email to suppress (lead gone / never had one) — nothing to do = done

  const { default: Subscriber } = await import('../models/Subscriber.mjs');
  const [subscriber] = await Subscriber.findOrCreate({
    where: { email },
    defaults: { email, status: 'unsubscribed', source: 'lead_unsubscribe', unsubscribedAt: new Date() },
  });
  if (subscriber.status !== 'unsubscribed') {
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
  }
  logger.info(`[MarketingUnsubscribe] lead#${leadId} email suppressed (Subscriber#${subscriber.id})`);
  return true;
};

// GET — side-effect-FREE confirm page (immune to email-scanner link pre-fetch).
router.get('/unsubscribe', limit, (req, res) => {
  const { leadId, token, valid } = parseReq(req);
  if (!valid) return res.status(400).send(INVALID);
  const form = `<p style="margin:0 0 16px;color:#5A5F6A;">Click below to stop receiving marketing emails from SwanStudios.</p>
<form method="POST" action="/api/marketing/unsubscribe">
<input type="hidden" name="lead" value="${leadId}"><input type="hidden" name="token" value="${token}">
<button type="submit" style="background:#002060;color:#FFFFFF;border:none;border-radius:10px;padding:12px 22px;font:600 15px 'Segoe UI',Arial,sans-serif;cursor:pointer;min-height:44px;">Confirm unsubscribe</button>
</form>`;
  return res.status(200).send(shell('Unsubscribe from SwanStudios emails?', form));
});

// POST — performs the opt-out (a deliberate user action, immune to pre-fetch).
// NOT IP-rate-limited: Gmail/Yahoo one-click POSTs share provider egress IPs (a post-batch
// burst would collapse into one bucket, 429, and be recorded as a FAILED unsubscribe = lost
// opt-out / CAN-SPAM violation). The HMAC token already fails closed against abuse.
router.post('/unsubscribe', async (req, res) => {
  const { leadId, valid } = parseReq(req);
  if (!valid) return res.status(400).send(INVALID);
  let recorded = false;
  try {
    recorded = await suppressLeadEmail(leadId);
  } catch (err) {
    logger.error(`[MarketingUnsubscribe] lead#${leadId} suppress failed: ${err?.message}`);
  }
  // Honest: only claim "Unsubscribed" when the opt-out actually recorded. On a transient failure
  // return a non-committal 200 (never 500 a one-click POST) instead of a FALSE success — the user/
  // provider isn't told it worked when it didn't. (Durable retry queue = documented follow-up.)
  return res.status(200).send(recorded ? DONE : PROCESSING);
});

export default router;
