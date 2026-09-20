/**
 * ============================================================================
 * FILE: htmlEscape.mjs
 * PURPOSE: HTML escaping for values interpolated into outbound email bodies.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Two files had each grown a private `escapeHtml` (controllers/orientationController.mjs:29,
 * routes/newsletterRoutes.mjs:29) and **seven other files that build HTML emails interpolated raw
 * values instead** — including an unauthenticated public contact form whose fields land in the
 * owner's inbox (`routes/contactRoutes.mjs`). So the codebase already knew the fix; it just had no
 * single place to get it from, and no shared helper to reach for.
 *
 * Email is a rendering context like any other. A `firstName` of
 * `<a href="https://evil.example/login">Your session expired — re-authenticate</a>` arrives in a
 * message sent from the real `SENDGRID_FROM_EMAIL`, which is exactly what makes it work as
 * phishing. An `<img src="https://evil.example/track">` leaks that the mail was opened, plus the
 * reader's IP and user-agent.
 *
 * USAGE
 * -----
 *   import { escapeHtml, escapeHtmlAttribute } from '../utils/htmlEscape.mjs';
 *
 *   html: `<p><strong>Name:</strong> ${escapeHtml(formData.name)}</p>`
 *
 * ESCAPE EVERY INTERPOLATED VALUE, including ones that "look like" they came from the database.
 * Names, locations and notes are user-supplied on the way in; the database does not sanitise.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value for interpolation into an HTML text node or a quoted attribute.
 * `null`/`undefined` become an empty string rather than the literal text "null".
 */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

/**
 * Escape a value for interpolation into a quoted HTML attribute (`href="..."`, `title="..."`).
 * Identical mapping — the quotes are what matter — but named separately at call sites so the
 * intent is legible and so this can diverge later (e.g. URL-scheme allow-listing) without
 * changing text-node behaviour.
 */
export const escapeHtmlAttribute = escapeHtml;

/**
 * Normalise then escape: strip control characters, collapse whitespace, truncate, and escape last.
 * For single-line display fields (a name in a subject line or heading) where newlines would break
 * the layout.
 *
 * ORDER MATTERS: truncation happens BEFORE escaping, not after. Slicing an escaped string can cut
 * an entity in half — `escapeHtmlSingleLine('a<b>c&d', 8)` used to return `a&lt;b&g`, which renders
 * as a visible `&g` and is no longer valid HTML. Truncating the input first cannot do that.
 *
 * Consequence: the *output* may exceed `maxLength`, because escaping expands characters
 * (`&` -> `&amp;`). `maxLength` bounds the source text, not the rendered length. Callers that need a
 * hard output bound must check `result.length` themselves.
 */
export const escapeHtmlSingleLine = (value, maxLength = 120) =>
  escapeHtml(
    String(value ?? '')
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength),
  );
