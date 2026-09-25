import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeHtmlAttribute, escapeHtmlSingleLine } from '../../utils/htmlEscape.mjs';

/**
 * HTML-escape contract — backend/utils/htmlEscape.mjs
 * ===================================================
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `backend/package.json` has listed this file in `test:security` since the
 * shared-escaper consolidation (24c30254a), but the file was never committed —
 * the script could not run at all (G9 hostile review, 2026-09-25, finding:
 * "test:security references a file that does not exist anywhere"). This is the
 * port, and it pins the contract the email-injection ratchet
 * (emailHtmlInjectionGuard.test.mjs §19) depends on: callers may rely on
 * escapeHtml's exact entity mapping, its null-to-empty behaviour, and
 * escapeHtmlSingleLine's truncate-before-escape ordering.
 *
 * WHAT IT PINS
 * ------------
 * 1. escapeHtml maps exactly & < > " ' and leaves everything else verbatim.
 * 2. null/undefined become '' (never the literal text "null").
 * 3. Non-string values are coerced, so a number cannot smuggle markup.
 * 4. escapeHtmlAttribute shares the mapping (the quotes are what matter).
 * 5. escapeHtmlSingleLine strips control characters, collapses whitespace,
 *    truncates the SOURCE before escaping, and never emits a partial entity.
 */

describe('escapeHtml contract', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('leaves benign text verbatim', () => {
    expect(escapeHtml('Plain text 123 — nothing to do')).toBe('Plain text 123 — nothing to do');
  });

  it('escapes a full injection payload, not just bare metacharacters', () => {
    const payload = '<a href="https://evil.example/login">Your session expired</a>';
    const out = escapeHtml(payload);
    expect(out).not.toContain('<a ');
    expect(out).toContain('&lt;a href=&quot;https://evil.example/login&quot;&gt;');
  });

  it('renders null and undefined as an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces non-string values before escaping', () => {
    expect(escapeHtml(120)).toBe('120');
    expect(escapeHtml(false)).toBe('false');
    // A number can never carry markup, but the coercion contract is what lets
    // call sites interpolate without pre-checking types.
    expect(escapeHtml(1.5)).toBe('1.5');
  });
});

describe('escapeHtmlAttribute contract', () => {
  it('uses the same entity mapping — quotes included', () => {
    const payload = '" onmouseover="alert(1)';
    const out = escapeHtmlAttribute(payload);
    expect(out).toBe('&quot; onmouseover=&quot;alert(1)');
    expect(out).not.toContain('"');
  });
});

describe('escapeHtmlSingleLine contract', () => {
  it('strips control characters and collapses whitespace', () => {
    expect(escapeHtmlSingleLine('a\nb\tc   d')).toBe('a b c d');
    expect(escapeHtmlSingleLine('a\u0000b\u001Fc')).toBe('a b c');
  });

  it('truncates the source before escaping — output never ends mid-entity', () => {
    // The historical bug (docstring): escaping first produced 'a&lt;b&g' —
    // a visible '&g' fragment. The 7-char source 'a<b>c&d' fits under
    // maxLength 8, so the output is the full escaped form with no cut entity.
    const out = escapeHtmlSingleLine('a<b>c&d', 8);
    expect(out).toBe('a&lt;b&gt;c&amp;d');
    expect(out).not.toMatch(/&[a-z]+$/);
  });

  it('bounds the source text to maxLength', () => {
    const out = escapeHtmlSingleLine('x'.repeat(500));
    // Source is capped at 120 chars; 'x' has no entity expansion, so the
    // output is exactly the cap.
    expect(out).toBe('x'.repeat(120));
  });

  it('escapes markup that survives truncation', () => {
    // First 10 source chars are '<script>al'; the output must contain the
    // escaped opening bracket and closing bracket of that fragment, never a
    // raw '<'.
    const out = escapeHtmlSingleLine('<script>alert("x")</script>', 10);
    expect(out).toBe('&lt;script&gt;al');
  });

  it('treats null and undefined as an empty string', () => {
    expect(escapeHtmlSingleLine(null)).toBe('');
    expect(escapeHtmlSingleLine(undefined)).toBe('');
  });
});
