import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from './sanitizeHtml';

/**
 * Stored-XSS regression tests for sanitizeRichText (hostile-review fix:
 * the public waiver pages rendered DB-stored displayText raw).
 */
describe('sanitizeRichText', () => {
  it('strips script tags but keeps their text context inert', () => {
    const out = sanitizeRichText('<p>Waiver</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<p>Waiver</p>');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeRichText('<p onclick="steal()">Sign</p><img src=x onerror=alert(1)>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('<img');
  });

  it('neutralizes javascript: and data: URLs in links', () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">x</a><a href="data:text/html,<script>alert(1)</script>">y</a>');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('data:');
  });

  it('drops iframes, styles and forms entirely', () => {
    const out = sanitizeRichText('<iframe src="//evil"></iframe><style>body{}</style><form action="//evil"></form>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('<form');
  });

  it('preserves ordinary legal-text formatting', () => {
    const input = '<h2>Terms</h2><p>I <strong>agree</strong> to <em>these</em> terms.</p><ul><li>One</li><li>Two</li></ul><blockquote>Quote</blockquote>';
    const out = sanitizeRichText(input);
    expect(out).toContain('<h2>Terms</h2>');
    expect(out).toContain('<strong>agree</strong>');
    expect(out).toContain('<em>these</em>');
    expect(out).toContain('<li>Two</li>');
    expect(out).toContain('<blockquote>Quote</blockquote>');
  });

  it('keeps safe https links and forces rel=noopener noreferrer', () => {
    const out = sanitizeRichText('<a href="https://sswanstudios.com/terms" target="_blank">Terms</a>');
    expect(out).toContain('href="https://sswanstudios.com/terms"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('handles null/undefined/empty input', () => {
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
    expect(sanitizeRichText('')).toBe('');
  });
});
