/**
 * Client-side waiver HTML scrub — SWA-140
 * ========================================
 * The server already sanitizes waiver text before serving it (sanitize-html,
 * allowlisted, contract-tested). This is defense in depth for the one place
 * the page uses `dangerouslySetInnerHTML`: if anything ever reaches the client
 * unsanitized — a cached response, a proxy, a future endpoint — the page still
 * refuses to execute it.
 *
 * Deliberately dependency-free (DOMParser is built in) so hardening the public
 * legal page did not require pulling a new package into the bundle. The
 * allowlist intentionally mirrors backend WAIVER_SANITIZE_OPTIONS.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'DIV',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
};

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/)/i;

function scrubElement(el: Element): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const allowed = ALLOWED_ATTRS[el.tagName]?.has(name);

    // Event handlers and anything not explicitly allowed are removed.
    if (!allowed) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'href' && !SAFE_URL.test(attr.value.trim())) {
      el.removeAttribute(attr.name);
    }
  }

  if (el.tagName === 'A') {
    el.setAttribute('rel', 'noopener noreferrer nofollow');
  }
}

function walk(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    const el = child as Element;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // Unwrap unknown-but-harmless containers, drop executable ones entirely.
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'IFRAME'
        || el.tagName === 'OBJECT' || el.tagName === 'EMBED' || el.tagName === 'LINK') {
        el.remove();
        continue;
      }
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }

    scrubElement(el);
    walk(el);
  }
}

/** Returns HTML safe to inject, or '' when there is nothing to render. */
export function sanitizeWaiverHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return '';
  walk(root);
  return root.innerHTML;
}

/** True when the text looks like HTML rather than plain/markdown text. */
export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export default sanitizeWaiverHtml;
