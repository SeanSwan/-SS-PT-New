/**
 * emailTemplates.mjs — the automation email registry and renderer.
 * ===============================================================
 *
 * Pure functions. No I/O, no network, no env reads, no database. Everything this module
 * needs arrives in `vars`. That is what makes it testable without fixtures and what
 * keeps a template bug from being mistaken for a delivery bug.
 *
 * COPY IS VERBATIM from `02-wireframes.md`. The three subjects are asserted byte-for-byte
 * by the acceptance criteria, so they are reproduced here as literal strings rather than
 * assembled from fragments — an assembled subject is one refactor away from drifting by
 * a space, and the test that catches that drift would be a test of the assembler.
 *
 * Template vars are ALWAYS exactly `{ firstName, unsubscribeUrl }`. Nothing else exists
 * yet, and adding a third var is a contract change, not an implementation detail.
 */

import { escapeHtml } from '../utils/htmlEscape.mjs';

/** The literal footer line required in every html output (and asserted by the tests). */
export const UNSUBSCRIBE_FOOTER =
  "You're receiving this because you contacted SwanStudios.";

/** Fallback when firstName is missing or empty. Matches "Hey there,". */
const FIRST_NAME_FALLBACK = 'there';

/** Email rendering constants, from `02-wireframes.md` "Email rendering rules". */
const COLORS = Object.freeze({
  text: '#1a1a24',
  background: '#ffffff',
  link: '#0066cc',
  rule: '#e5e5e8',
  muted: '#6b7280',
});

const MAX_WIDTH = '600px';
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Normalise vars once, so every template sees the same truth about `firstName` and
 * `unsubscribeUrl`.
 *
 * A whitespace-only firstName falls back too: `{{firstName}}` with a single space would
 * otherwise render "Hey ," which is worse than the fallback.
 *
 * @param {{firstName?: string, unsubscribeUrl?: string|null}} vars
 */
function normaliseVars(vars) {
  const raw = vars?.firstName;
  const firstName =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : FIRST_NAME_FALLBACK;

  const url = vars?.unsubscribeUrl;
  const unsubscribeUrl = typeof url === 'string' && url.length > 0 ? url : null;

  return { firstName, unsubscribeUrl };
}

/**
 * The shared HTML shell: 600px single-column table, inline styles only.
 *
 * Table layout and inline styles are not stylistic choices — email clients strip
 * `<style>` blocks and have no usable flexbox support, so a div-based layout collapses
 * in Outlook. One link colour, dark text on white: emails are LIGHT because inbox
 * convention is light, even though the app is dark-first. The dark-first rule governs
 * the APP, not the inbox.
 *
 * @param {{heading: string, paragraphs: string[], signature: string[], unsubscribeUrl: string|null}} parts
 * @returns {string}
 */
function renderShell({ paragraphs, signature, unsubscribeUrl }) {
  const body = paragraphs
    .map(
      (p) =>
        `<tr><td style="padding:0 0 16px 0;font-family:${FONT_STACK};font-size:16px;line-height:24px;color:${COLORS.text};">${p}</td></tr>`,
    )
    .join('');

  const sig = signature
    .map(
      (line, i) =>
        `<div style="font-family:${FONT_STACK};font-size:${i === 0 ? '16px' : '13px'};line-height:${i === 0 ? '24px' : '20px'};color:${i === 0 ? COLORS.text : COLORS.muted};">${line}</div>`,
    )
    .join('');

  // Fail-closed on secrets: when there is no signed URL the footer renders WITHOUT a
  // link rather than with an unsigned one (see leadUnsubscribeToken.mjs).
  const unsubscribeLine =
    unsubscribeUrl === null
      ? ''
      : `<div style="padding:4px 0 0 0;font-family:${FONT_STACK};font-size:13px;line-height:20px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:${COLORS.link};text-decoration:underline;">Unsubscribe</a></div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.background};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.background};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="${MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${MAX_WIDTH};max-width:${MAX_WIDTH};background:${COLORS.background};">
<tr><td style="padding:0 0 8px 0;font-family:${FONT_STACK};font-size:15px;font-weight:700;letter-spacing:1px;color:${COLORS.text};">SWANSTUDIOS</td></tr>
<tr><td style="padding:0 0 24px 0;"><div style="border-top:1px solid ${COLORS.rule};"></div></td></tr>
${body}
<tr><td style="padding:8px 0 0 0;">${sig}</td></tr>
<tr><td style="padding:24px 0 0 0;"><div style="border-top:1px solid ${COLORS.rule};"></div></td></tr>
<tr><td style="padding:12px 0 0 0;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLORS.muted};">
<div>${UNSUBSCRIBE_FOOTER}</div>
${unsubscribeLine}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/**
 * Shared signature block. E1 carries the full credentials, E2/E3 the short form —
 * matching the wireframes, which vary it deliberately.
 */
const SIGNATURE_FULL = [
  '&mdash; Sean Swan',
  '26+ years experience &middot; NASM-protocol training',
  'SwanStudios &middot; <a href="https://sswanstudios.com" style="color:#0066cc;text-decoration:underline;">https://sswanstudios.com</a>',
];

const SIGNATURE_SHORT = ['&mdash; Sean'];

/**
 * The registry. Subjects are literal strings taken verbatim from `02-wireframes.md`.
 *
 * Note `stl_followup_5d` takes no firstName: its subject has no placeholder, and the
 * contract types it as `() => ...`. Implementing it as firstName-bearing would make the
 * byte-for-byte subject assertion fail — which is the intended outcome, since the copy
 * is the product surface here.
 */
export const EMAIL_TEMPLATES = Object.freeze({
  stl_instant_reply: Object.freeze({
    subject: (v) => `Got your message \u2014 here's your next step, ${v.firstName}`,
    text: (v) =>
      [
        `Hey ${v.firstName},`,
        '',
        'Thanks for reaching out \u2014 you just did the part most people put off for years.',
        '',
        "Here's what happens next: I personally read every message, and I'll get back to",
        'you within one business day. If you asked about the free movement & performance',
        "assessment, we'll set up a time that fits your schedule.",
        '',
        'In the meantime, one question worth thinking about: what\u2019s the ONE thing you',
        'want your body to do better six months from now? Have that answer ready \u2014 it\u2019s',
        "where we'll start.",
        '',
        '\u2014 Sean Swan',
        '26+ years experience \u00b7 NASM-protocol training',
        'SwanStudios \u00b7 https://sswanstudios.com',
        '',
        UNSUBSCRIBE_FOOTER,
        ...(v.unsubscribeUrl ? [`Unsubscribe: ${v.unsubscribeUrl}`] : []),
      ].join('\n'),
    html: (v) =>
      renderShell({
        paragraphs: [
          `Hey ${escapeHtml(v.firstName)},`,
          `Thanks for reaching out \u2014 you just did the part most people put off for years.`,
          "Here's what happens next: I personally read every message, and I'll get back to you within one business day. If you asked about the free movement &amp; performance assessment, we'll set up a time that fits your schedule.",
          `In the meantime, one question worth thinking about: what\u2019s the ONE thing you want your body to do better six months from now? Have that answer ready \u2014 it\u2019s where we'll start.`,
        ],
        signature: SIGNATURE_FULL,
        unsubscribeUrl: v.unsubscribeUrl,
      }),
  }),

  stl_followup_2d: Object.freeze({
    subject: (v) => `Your free assessment is still open, ${v.firstName}`,
    text: (v) =>
      [
        `Hey ${v.firstName},`,
        '',
        'Quick nudge \u2014 your free movement & performance assessment is still open. It',
        "takes about 30 minutes, there's nothing to prepare, and you leave knowing exactly",
        'what your body needs next. No obligation, no hard sell \u2014 that\u2019s not how I work.',
        '',
        "Reply to this email with two times that work this week and we'll lock one in.",
        '',
        '\u2014 Sean',
        '',
        UNSUBSCRIBE_FOOTER,
        ...(v.unsubscribeUrl ? [`Unsubscribe: ${v.unsubscribeUrl}`] : []),
      ].join('\n'),
    html: (v) =>
      renderShell({
        paragraphs: [
          `Hey ${escapeHtml(v.firstName)},`,
          `Quick nudge \u2014 your free movement &amp; performance assessment is still open. It takes about 30 minutes, there's nothing to prepare, and you leave knowing exactly what your body needs next. No obligation, no hard sell \u2014 that\u2019s not how I work.`,
          `Reply to this email with two times that work this week and we'll lock one in.`,
        ],
        signature: SIGNATURE_SHORT,
        unsubscribeUrl: v.unsubscribeUrl,
      }),
  }),

  stl_followup_5d: Object.freeze({
    subject: () => `No pressure \u2014 door's open when you're ready`,
    text: (v) =>
      [
        `Hey ${v.firstName},`,
        '',
        "I'll leave you be after this one. Life gets busy \u2014 I get it. When you're ready",
        'to work on how you move, perform, and feel, the assessment offer stands. Just',
        'reply to this email, any time.',
        '',
        "Until then: train smart, and don't let the perfect plan stop the good workout.",
        '',
        '\u2014 Sean',
        '',
        UNSUBSCRIBE_FOOTER,
        ...(v.unsubscribeUrl ? [`Unsubscribe: ${v.unsubscribeUrl}`] : []),
      ].join('\n'),
    html: (v) =>
      renderShell({
        paragraphs: [
          `Hey ${escapeHtml(v.firstName)},`,
          `I'll leave you be after this one. Life gets busy \u2014 I get it. When you're ready to work on how you move, perform, and feel, the assessment offer stands. Just reply to this email, any time.`,
          `Until then: train smart, and don't let the perfect plan stop the good workout.`,
        ],
        signature: SIGNATURE_SHORT,
        unsubscribeUrl: v.unsubscribeUrl,
      }),
  }),
});

/**
 * Render a template.
 *
 * @param {string} templateName key of EMAIL_TEMPLATES
 * @param {{firstName?: string, unsubscribeUrl?: string|null}} vars
 * @returns {{subject: string, text: string, html: string}}
 * @throws {Error} `Unknown email template: <name>` when the key is absent
 */
export function renderEmailTemplate(templateName, vars = {}) {
  const template = Object.prototype.hasOwnProperty.call(EMAIL_TEMPLATES, templateName)
    ? EMAIL_TEMPLATES[templateName]
    : undefined;

  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const normalised = normaliseVars(vars);

  return {
    subject: template.subject(normalised),
    text: template.text(normalised),
    html: template.html(normalised),
  };
}

/**
 * @returns {Array<{name: string, subjectPreview: string}>} for preview routes.
 *   `renderEmailTemplate` with `{{firstName}}` left visible as the placeholder, so the
 *   preview shows the author's intent rather than a sample person's name.
 */
export function listEmailTemplates() {
  return Object.keys(EMAIL_TEMPLATES).map((name) => ({
    name,
    subjectPreview: EMAIL_TEMPLATES[name].subject({ firstName: '{{firstName}}' }),
  }));
}
