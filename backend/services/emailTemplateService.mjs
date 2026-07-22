/**
 * Email Template Service
 * ======================
 * Centralized transactional-nurture EMAIL sending + template rendering — the email
 * sibling of `smsService.mjs`. This is the missing "email channel" that lets the
 * already-built `lead_nurture` automation sequence reach EMAIL-ONLY captured leads
 * (contact-form / confirmed-newsletter prospects who carry no phone).
 *
 * DELIVERABILITY / COMPLIANCE (do not remove):
 * - CAN-SPAM: every template's footer carries a working {unsubscribeUrl} + a physical
 *   postal {businessAddress}. The automation processor MUST supply both; a missing
 *   unsubscribe URL fails the send closed (see sendTemplatedEmail) so we can never ship
 *   a non-compliant nurture email.
 * - Email clients strip CSS custom properties and <style> unreliably: all colors are
 *   INLINED HEX (never var(--token)), and the palette is LIGHT-SAFE (dark ink on light
 *   surface) — dark-first is an APP rule, not an email rule.
 * - Copy discipline: credentials read "26+ years" / NASM-protocol. NEVER claim NASM
 *   certification — that phrasing is a false credential claim, and the exact string is
 *   locked out of source by frontend/src/pages/about/credentialPhrasing.contract.test.ts
 *   (so this note deliberately does not spell it, or it would trip that very lock).
 *   Also: "stretching"/"flexibility", never "yoga"/"meditation".
 *
 * The template NAMES intentionally mirror the SMS template names (welcome, follow_up_day1/3/7)
 * so a single AutomationSequence step drives whichever channel the step declares.
 */

import crypto from 'node:crypto';
import { sendGridEmail } from './sendgridService.mjs';

// Light-safe brand palette (inlined hex only — email clients drop CSS variables).
const INK = '#0A0A0F';        // near-black body text on light
const MUTED = '#5A5F6A';      // secondary text
const SURFACE = '#F4F8FC';    // light card surface
const SAPPHIRE = '#002060';   // Midnight Sapphire — headings / primary
const CYAN = '#2C7BB0';       // darkened Ice Wing for WCAG 4.5:1 on light
const GOLD = '#6B5310';       // Gilded Fern darkened to pass WCAG AA (4.5:1) on white

/** Physical address is CAN-SPAM-required; sourced from env so it is never invented. */
const businessAddressFallback = () => process.env.SWAN_BUSINESS_ADDRESS
  || 'SwanStudios — mailing address on file (set SWAN_BUSINESS_ADDRESS)';

// HTML-escape a value for safe interpolation into email HTML (name/URL contexts).
const htmlEscape = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Substitute {vars} using the FUNCTION form of replace so a value containing `$&`/`$1`
// is inserted literally (never interpreted as a replacement pattern). `transform` decides
// text-vs-HTML context: text is raw, HTML escapes each value (user-controlled clientName).
const renderWith = (template, variables, transform) => (template || '').replace(
  // SINGLE pass over the ORIGINAL template: a substituted value (e.g. a lead named "{consultUrl}")
  // is inserted literally and never rescanned/re-expanded. Unknown placeholders are left as-is.
  /\{([a-zA-Z0-9_]+)\}/g,
  (match, key) => (Object.prototype.hasOwnProperty.call(variables, key) ? transform(variables[key]) : match),
);
const renderText = (template, variables = {}) => renderWith(template, variables, (v) => String(v ?? ''));
const renderHtml = (template, variables = {}) => renderWith(template, variables, (v) => htmlEscape(v));

// Subject sanitizer: strip CR/LF + control chars (header-injection defense-in-depth even though the
// @sendgrid v3 JSON API already blocks it), collapse whitespace, hard-cap length.
const sanitizeSubject = (s) => String(s ?? '').replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

const extractPlaceholders = (template) => {
  const found = new Set();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m;
  while ((m = re.exec(template || '')) !== null) found.add(m[1]);
  return [...found];
};

/** Shared HTML shell: light-safe, inlined hex, CAN-SPAM footer. Keeps templates DRY. */
const wrapHtml = (innerHtml) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${SURFACE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #DCE6F0;overflow:hidden;">
<tr><td style="background:${SAPPHIRE};padding:18px 24px;">
<span style="font:600 18px 'Segoe UI',Arial,sans-serif;color:#FFFFFF;letter-spacing:.5px;">SwanStudios</span>
</td></tr>
<tr><td style="padding:24px;font:400 15px/1.6 'Segoe UI',Arial,sans-serif;color:${INK};">
${innerHtml}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #ECF1F6;font:400 12px/1.5 'Segoe UI',Arial,sans-serif;color:${MUTED};">
You are receiving this because you asked SwanStudios to get in touch.
<a href="{unsubscribeUrl}" style="color:${CYAN};text-decoration:underline;">Unsubscribe</a> anytime.<br/>
{businessAddress}
</td></tr>
</table></td></tr></table></body></html>`;

const cta = (label, url = '{consultUrl}') => `<a href="${url}" style="display:inline-block;background:${SAPPHIRE};color:#FFFFFF;font:600 15px 'Segoe UI',Arial,sans-serif;text-decoration:none;padding:12px 22px;border-radius:10px;">${label}</a>`;

// name -> { subject, text(vars), body(vars) }. Body is the inner HTML; wrapHtml adds shell+footer.
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to SwanStudios, {clientName}',
    text: `Hi {clientName},\n\nThanks for reaching out to SwanStudios. I'm Sean — 26+ years coaching real, lasting strength and movement.\n\nWhen you're ready, grab a free intro consult and we'll map your next step: {consultUrl}\n\n— Sean, SwanStudios\n\nUnsubscribe: {unsubscribeUrl}\n{businessAddress}`,
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${SAPPHIRE};">Welcome, {clientName} 👋</h1>
<p style="margin:0 0 16px;">Thanks for reaching out. I'm Sean — <strong>26+ years</strong> coaching real, lasting strength and movement, built around your body and your goals.</p>
<p style="margin:0 0 20px;">When you're ready, grab a free intro consult and we'll map your next step together.</p>
<p style="margin:0 0 8px;">${cta('Book a free consult')}</p>`,
  },
  follow_up_day1: {
    subject: 'One question, {clientName}',
    text: `Hi {clientName},\n\nQuick one: what's the single result you'd most want from training in the next 90 days?\n\nReply and tell me — or book your free consult and we'll build the plan: {consultUrl}\n\n— Sean\n\nUnsubscribe: {unsubscribeUrl}\n{businessAddress}`,
    body: `<h1 style="margin:0 0 12px;font-size:20px;color:${SAPPHIRE};">One question, {clientName}</h1>
<p style="margin:0 0 16px;">What's the single result you'd most want from training in the next <strong>90 days</strong>? Strength, mobility, getting back to a sport, feeling good on your feet again?</p>
<p style="margin:0 0 20px;">Reply and tell me — or book your consult and we'll build the plan around it.</p>
<p style="margin:0 0 8px;">${cta('Book my free consult')}</p>`,
  },
  follow_up_day3: {
    subject: 'The part most people skip',
    text: `Hi {clientName},\n\nMost programs fail on consistency and recovery, not effort. A coach who adjusts to YOUR week is the difference.\n\nWant that? Book a free consult: {consultUrl}\n\n— Sean, 26+ years coaching\n\nUnsubscribe: {unsubscribeUrl}\n{businessAddress}`,
    body: `<h1 style="margin:0 0 12px;font-size:20px;color:${SAPPHIRE};">The part most people skip</h1>
<p style="margin:0 0 16px;">After <strong>26+ years</strong>, here's the truth: programs don't fail on effort — they fail on consistency, recovery, and stretching/mobility that actually fits your week.</p>
<p style="margin:0 0 20px;">A coach who adjusts to <em>your</em> life is the difference. That's what a SwanStudios plan is built to do.</p>
<p style="margin:0 0 8px;">${cta('See if we\'re a fit')}</p>`,
  },
  follow_up_day7: {
    subject: '{clientName}, ready to start?',
    text: `Hi {clientName},\n\nStill here whenever you're ready. One free consult, no pressure — just a clear next step.\n\nBook it here: {consultUrl}\n\n— Sean, SwanStudios\n\nUnsubscribe: {unsubscribeUrl}\n{businessAddress}`,
    body: `<h1 style="margin:0 0 12px;font-size:20px;color:${SAPPHIRE};">Ready when you are, {clientName}</h1>
<p style="margin:0 0 16px;">No pressure — just an open door. One free consult, a clear next step, and a plan that fits.</p>
<p style="margin:0 0 20px;color:${GOLD};font-weight:600;">This is the easiest first move you'll make all week.</p>
<p style="margin:0 0 8px;">${cta('Book my free consult')}</p>`,
  },
};

// ---------------------------------------------------------------------------
// instant_reply — SPEED-TO-LEAD transactional acknowledgment (SWA-40 trial 2).
// Sent once, immediately, in direct response to the lead's OWN inquiry — the
// CAN-SPAM transactional/relationship class, so it uses a transactional footer
// (no unsubscribe machinery; a one-time confirmation is not a mailing-list send).
// Nurture emails keep the full unsubscribe fail-closed path above — unchanged.
const INSTANT_REPLY_TEMPLATE = {
  subject: 'Got your message, {clientName} — here is what happens next',
  text: `Hi {clientName},\n\nThanks for reaching out to SwanStudios — your message just landed on my desk and I personally read every one.\n\nWhat happens next: I'll get back to you shortly (usually same day). If you'd like to skip ahead, you can grab a free consult slot right now: {consultUrl}\n\n— Sean, SwanStudios · 26+ years coaching\n\n{businessAddress}\nYou're receiving this one-time confirmation because you contacted SwanStudios.`,
  body: `<h1 style="margin:0 0 12px;font-size:22px;color:${SAPPHIRE};">Got your message, {clientName}</h1>
<p style="margin:0 0 16px;">Thanks for reaching out to SwanStudios — your message just landed on my desk, and I personally read every one.</p>
<p style="margin:0 0 16px;"><strong>What happens next:</strong> I'll get back to you shortly — usually the same day.</p>
<p style="margin:0 0 20px;">Want to skip ahead? Grab a free consult slot right now.</p>
<p style="margin:0 0 8px;">${cta('Book a free consult')}</p>`,
};
// Registered so listing/preview surfaces see it; sendTemplatedEmail can still render it
// for nurture-style use, but the canonical path is renderInstantReplyEmail below.
EMAIL_TEMPLATES.instant_reply = INSTANT_REPLY_TEMPLATE;

/** Transactional shell: same brand chrome as wrapHtml, transactional footer (no unsubscribe). */
const wrapTransactionalHtml = (innerHtml) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${SURFACE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #DCE6F0;overflow:hidden;">
<tr><td style="background:${SAPPHIRE};padding:18px 24px;">
<span style="font:600 18px 'Segoe UI',Arial,sans-serif;color:#FFFFFF;letter-spacing:.5px;">SwanStudios</span>
</td></tr>
<tr><td style="padding:24px;font:400 15px/1.6 'Segoe UI',Arial,sans-serif;color:${INK};">
${innerHtml}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #ECF1F6;font:400 12px/1.5 'Segoe UI',Arial,sans-serif;color:${MUTED};">
You're receiving this one-time confirmation because you contacted SwanStudios.<br/>
{businessAddress}
</td></tr>
</table></td></tr></table></body></html>`;

/** Render the instant-reply acknowledgment: { subject, text, html }. Pure render, no send. */
export const renderInstantReplyEmail = ({ clientName } = {}) => {
  const appBase = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  const vars = {
    clientName: clientName || 'there',
    consultUrl: process.env.SWAN_CONSULT_URL || (appBase ? `${appBase}/contact` : 'https://sswanstudios.com/contact'),
    businessAddress: businessAddressFallback(),
  };
  return {
    subject: sanitizeSubject(renderText(INSTANT_REPLY_TEMPLATE.subject, vars)),
    text: renderText(INSTANT_REPLY_TEMPLATE.text, vars),
    html: renderHtml(wrapTransactionalHtml(INSTANT_REPLY_TEMPLATE.body), vars),
  };
};

export const listEmailTemplates = () => Object.entries(EMAIL_TEMPLATES).map(([name, t]) => ({ name, subject: t.subject }));

const SAMPLE_VARS = {
  clientName: 'Alex',
  consultUrl: 'https://sswanstudios.com/consult',
  unsubscribeUrl: 'https://sswanstudios.com/unsubscribe?token=SAMPLE',
  businessAddress: businessAddressFallback(),
};

/** Render every email template with sample (or provided) vars WITHOUT sending — the
 *  approval/readiness surface. Flags unresolved {placeholders} so broken copy can't ship. */
export const previewEmailTemplates = (variables = {}) => {
  const vars = { ...SAMPLE_VARS, ...variables };
  return Object.entries(EMAIL_TEMPLATES).map(([name, t]) => {
    const subject = renderText(t.subject, vars);
    const text = renderText(t.text, vars);
    const placeholders = [...new Set([...extractPlaceholders(t.subject), ...extractPlaceholders(t.text), ...extractPlaceholders(t.body)])];
    return {
      name,
      subject,
      text,
      placeholders,
      unresolved: placeholders.filter((p) => vars[p] === undefined),
    };
  });
};

/**
 * Render + send one templated nurture email. Fails CLOSED on a missing unsubscribe URL
 * (CAN-SPAM) or unknown template — an automation step must never emit a non-compliant
 * or empty email. Returns `{ success, body?, subject?, error? }` mirroring sendTemplatedSMS.
 */
export const sendTemplatedEmail = async ({ to, templateName, variables = {} }) => {
  const tpl = EMAIL_TEMPLATES[templateName];
  if (!tpl) return { success: false, error: 'Template not found' };

  const vars = { businessAddress: businessAddressFallback(), ...variables };
  // CAN-SPAM fail-closed: never send without BOTH a working unsubscribe URL and a real
  // physical postal address. A missing SWAN_BUSINESS_ADDRESS must block the send (the
  // placeholder is for the non-sending preview surface only), not ship non-compliant mail.
  if (!vars.unsubscribeUrl) return { success: false, error: 'missing_unsubscribe_url' };
  if (!process.env.SWAN_BUSINESS_ADDRESS || !String(process.env.SWAN_BUSINESS_ADDRESS).trim()) {
    return { success: false, error: 'missing_business_address' };
  }

  const subject = sanitizeSubject(renderText(tpl.subject, vars));
  const text = renderText(tpl.text, vars);
  const html = renderHtml(wrapHtml(tpl.body), vars);

  // RFC 8058 one-click unsubscribe headers (Gmail/Yahoo 2024 bulk-sender requirement) —
  // points at the already-existing signed POST /api/marketing/unsubscribe.
  const headers = {
    'List-Unsubscribe': `<${vars.unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  const result = await sendGridEmail({ to, subject, text, html, headers, replyTo: process.env.SWAN_REPLY_TO || undefined });
  return {
    success: Boolean(result?.success),
    subject,
    body: text,
    retryable: result?.retryable === true, // transient send failure → caller defers, never drops
    error: result?.success ? undefined : (result?.error?.message || 'email_send_failed'),
  };
};

/**
 * Compose the per-lead variables the nurture email templates require: a consult CTA URL,
 * a SIGNED unsubscribe URL (HMAC over the leadId), and the physical address. The
 * unsubscribe URL is only built when a base URL AND a signing secret are configured;
 * otherwise it is left undefined so `sendTemplatedEmail` fails CLOSED (a nurture email
 * can never go out without a working unsubscribe — CAN-SPAM). The token is verifiable
 * server-side via `verifyUnsubscribeToken`, so the link is not IDOR-enumerable.
 */
export const buildNurtureEmailVars = ({ leadId, clientName } = {}) => {
  const appBase = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  const apiBase = (process.env.API_URL || appBase || '').replace(/\/+$/, '');
  const secret = process.env.SWAN_UNSUBSCRIBE_SECRET || ''; // dedicated secret only — never borrow JWT_SECRET (rotation would invalidate live links)
  let unsubscribeUrl;
  if (apiBase && /^https:\/\//i.test(apiBase) && leadId != null && secret) { // https only — never send the token over cleartext http
    const token = crypto.createHmac('sha256', secret).update(`lead:${leadId}`).digest('hex').slice(0, 32);
    unsubscribeUrl = `${apiBase}/api/marketing/unsubscribe?lead=${encodeURIComponent(leadId)}&token=${token}`;
  }
  const consultUrl = process.env.SWAN_CONSULT_URL || (appBase ? `${appBase}/contact` : 'https://sswanstudios.com/contact');
  return { clientName: clientName || 'there', consultUrl, unsubscribeUrl, businessAddress: businessAddressFallback() };
};

/** Constant-time verify of a lead unsubscribe token — for the /unsubscribe endpoint. */
export const verifyUnsubscribeToken = (leadId, token) => {
  const secret = process.env.SWAN_UNSUBSCRIBE_SECRET || ''; // dedicated secret only — never borrow JWT_SECRET (rotation would invalidate live links)
  if (!secret || leadId == null || !token) return false;
  const expected = crypto.createHmac('sha256', secret).update(`lead:${leadId}`).digest('hex').slice(0, 32);
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export default { listEmailTemplates, previewEmailTemplates, sendTemplatedEmail, buildNurtureEmailVars, verifyUnsubscribeToken, renderInstantReplyEmail };
