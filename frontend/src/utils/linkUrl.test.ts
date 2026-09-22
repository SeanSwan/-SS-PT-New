/**
 * linkUrl — the href scheme allowlist.
 *
 * The behavioural half is the real check: these drive `sanitizeLinkHref` itself.
 * The source-text half pins the SINK, because a correct helper that nothing calls protects
 * nothing — the defect this module closes was a URL reaching `href` unvalidated, not a
 * missing function.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sanitizeLinkHref } from './linkUrl';

describe('sanitizeLinkHref — allowlist', () => {
  it('returns ordinary http(s) publisher URLs unchanged', () => {
    expect(sanitizeLinkHref('https://example.com/story')).toBe('https://example.com/story');
    expect(sanitizeLinkHref('http://example.com/story')).toBe('http://example.com/story');
    expect(sanitizeLinkHref('https://example.com/a?b=1#c')).toBe('https://example.com/a?b=1#c');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeLinkHref('  https://example.com/x  ')).toBe('https://example.com/x');
  });

  it('refuses script-executing schemes', () => {
    // The exact payload the sink was reachable with. React 18 renders this href unchanged.
    expect(sanitizeLinkHref('javascript:alert(document.cookie)')).toBeNull();
    expect(sanitizeLinkHref('JaVaScRiPt:alert(1)')).toBeNull();
    expect(sanitizeLinkHref('vbscript:msgbox(1)')).toBeNull();
  });

  it('refuses a scheme smuggled behind a control character', () => {
    // WHATWG URL strips TAB/LF/CR before parsing, so these normalise to `javascript:` and
    // must be caught by the protocol allowlist rather than by a prefix match.
    expect(sanitizeLinkHref('java\tscript:alert(1)')).toBeNull();
    expect(sanitizeLinkHref('java\nscript:alert(1)')).toBeNull();
    expect(sanitizeLinkHref('\u0000https://example.com')).toBeNull();
  });

  it('refuses non-navigational schemes', () => {
    expect(sanitizeLinkHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeLinkHref('blob:https://example.com/uuid')).toBeNull();
    expect(sanitizeLinkHref('file:///C:/Windows/System32/')).toBeNull();
  });

  it('refuses relative and protocol-relative URLs', () => {
    // Not a security claim — these are simply not absolute publisher links, and the rail
    // renders a source chip only for a real outbound source.
    expect(sanitizeLinkHref('/uploads/x.png')).toBeNull();
    expect(sanitizeLinkHref('//evil.example/x')).toBeNull();
    expect(sanitizeLinkHref('example.com/story')).toBeNull();
  });

  it('refuses empty and non-string input', () => {
    expect(sanitizeLinkHref('')).toBeNull();
    expect(sanitizeLinkHref('   ')).toBeNull();
    expect(sanitizeLinkHref(null)).toBeNull();
    expect(sanitizeLinkHref(undefined)).toBeNull();
  });

  it('does not over-refuse: a publisher URL with unusual but legal characters survives', () => {
    // §14 guard: a rule that refuses the normal case is broken, not fail-closed.
    expect(sanitizeLinkHref('https://example.com/a%20b?q=x&r=%2F')).toBe('https://example.com/a%20b?q=x&r=%2F');
    expect(sanitizeLinkHref('https://sub.example.co.uk:8443/path')).toBe('https://sub.example.co.uk:8443/path');
    expect(sanitizeLinkHref('https://example.com/ünïcode')).toBe('https://example.com/ünïcode');
  });
});

describe('SpotlightRail — the href sink is guarded', () => {
  const railSrc = readFileSync(resolve(__dirname, '../components/Social/Spotlight/SpotlightRail.tsx'), 'utf8');

  it('imports sanitizeLinkHref', () => {
    expect(railSrc).toMatch(/import\s*\{[^}]*\bsanitizeLinkHref\b/);
    expect(railSrc).toMatch(/from\s+['"][./]+utils\/linkUrl['"]/);
  });

  it('never passes a raw sourceUrl into href', () => {
    // The defect was literally `href={item.sourceUrl}`. Assert no bare prop reaches href,
    // and that whatever does reach it is a variable derived from sanitizeLinkHref.
    const hrefArgs = [...railSrc.matchAll(/href=\{([^}]+)\}/g)].map((m) => m[1].trim());
    expect(hrefArgs.length, 'expected the rail to render at least one href').toBeGreaterThan(0);

    const derived = new Set(
      [...railSrc.matchAll(/const\s+([\w$]+)\s*=\s*[^;\n]*?\bsanitizeLinkHref\s*\(/g)].map((m) => m[1]),
    );
    const violations = hrefArgs.filter((arg) => !derived.has(arg));
    expect(violations, `href fed by non-sanitized expression(s): ${JSON.stringify(violations)}`).toEqual([]);
  });
});
