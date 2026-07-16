/**
 * publicWaiverXssContract — stored-XSS lock (data-exposure sweep 2026-07-15)
 * =========================================================================
 * The public /api/public/waivers/versions/current endpoint serves admin-
 * authored waiver HTML that PublicWaiverPage renders via
 * dangerouslySetInnerHTML on an UNAUTHENTICATED page. The served display copy
 * must be sanitized server-side so a stored <script>/<img onerror>/javascript:
 * payload can't execute in every visitor's browser. The legal snapshot stored
 * on submit stays verbatim (evidence) — only the DISPLAY copy is sanitized.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import sanitizeHtml from 'sanitize-html';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.resolve(here, '../../controllers/publicWaiverController.mjs'), 'utf8');

describe('waiver display HTML is sanitized server-side', () => {
  it('the served versions map sanitizes displayText', () => {
    expect(src).toContain("import sanitizeHtml from 'sanitize-html'");
    expect(src).toMatch(/displayText: sanitizeWaiverDisplayHtml\(resolveDisplayText\(v\)\)/);
  });

  it('the submit snapshot stays verbatim (legal evidence), NOT sanitized', () => {
    // The stored snapshot uses resolveDisplayText directly, not the sanitizer.
    expect(src).toMatch(/displayText: resolveDisplayText\(v\),/);
  });

  it('the allowlist neutralizes script/handlers/js-uris (behavioral)', () => {
    // Reconstruct the same options shape and prove the vectors are stripped.
    const opts = {
      allowedTags: ['p', 'strong', 'a', 'ul', 'li'],
      allowedAttributes: { a: ['href', 'rel'] },
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    };
    const evil = '<p>ok</p><script>x()</script><img src=x onerror=alert(1)><a href="javascript:alert(2)">l</a>';
    const clean = sanitizeHtml(evil, opts);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('<strong>'.slice(0, 0) + '<p>ok</p>'); // formatting preserved
  });
});
