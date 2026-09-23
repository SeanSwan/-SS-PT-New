import DOMPurify from 'dompurify';

/**
 * sanitizeRichText — the ONLY sanctioned way to render server-stored HTML.
 *
 * Hostile-review fix (stored XSS on the public waiver pages): waiver
 * `displayText` is admin-authored and stored in the database, then rendered
 * through dangerouslySetInnerHTML on a PUBLIC, unauthenticated page. Anything
 * that ever writes that column — a compromised admin session, a future import
 * tool, an API bug — becomes stored XSS on every visitor. Sanitizing at the
 * render boundary makes the sink safe regardless of source.
 *
 * Allowlist is deliberately small: legal-text formatting only. DOMPurify's
 * default behaviour already strips <script>, event handler attributes
 * (onerror, onclick, ...), javascript:/data: URLs and <style>/<iframe> —
 * none of those tags/attrs are allowed here anyway.
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'strong', 'i', 'em', 'u', 's',
    'p', 'br', 'hr', 'blockquote',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'span', 'div', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

// Links that survive sanitization never get window.opener access to the
// waiver page.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeRichText(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, RICH_TEXT_CONFIG) as unknown as string;
}
