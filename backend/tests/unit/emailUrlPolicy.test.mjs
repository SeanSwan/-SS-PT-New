/**
 * F08 — the URL policy that `escapeHtmlAttribute` was mistaken for.
 *
 * Every case below comes from Astra's `tests/unit/emailUrlPolicy.test.mjs` list in
 * `tmp/astra-consult-injection-sinks/reply.md:809-818`, plus the negative cases that
 * pin the two ways a URL allow-list normally fails: suffix matching and a permissive
 * empty configuration.
 *
 * NOTE ON WHAT THIS DOES NOT PROVE. These tests prove the helper's own behaviour.
 * They do not prove any caller uses it — that is why `emailCtaAllowedOrigins` is
 * exported and why the six live sites are recorded rather than silently rewired.
 */
import { describe, it, expect } from 'vitest';
import {
  validateEmailCtaUrl,
  emailCtaAllowedOrigins,
  isKnownDangerousScheme,
  resolveAllowedOrigins,
} from '../../utils/urlPolicy.mjs';

const ORIGINS = ['https://sswanstudios.com'];
const opts = { allowedOrigins: ORIGINS };

describe('validateEmailCtaUrl — accepts', () => {
  it('accepts a configured exact HTTPS origin', () => {
    expect(validateEmailCtaUrl('https://sswanstudios.com/contact', opts))
      .toBe('https://sswanstudios.com/contact');
  });

  it('returns the normalized URL for subsequent attribute encoding', () => {
    // Path and query survive; the value is absolute and re-parseable.
    const out = validateEmailCtaUrl('https://sswanstudios.com/contact?src=welcome', opts);
    expect(out).toBe('https://sswanstudios.com/contact?src=welcome');
    expect(new URL(out).origin).toBe('https://sswanstudios.com');
  });

  it('accepts a non-default port only when the config names that origin', () => {
    expect(validateEmailCtaUrl('https://sswanstudios.com:8443/x', {
      allowedOrigins: ['https://sswanstudios.com:8443'],
    })).toBe('https://sswanstudios.com:8443/x');
  });

  it('accepts the host without a path', () => {
    expect(validateEmailCtaUrl('https://sswanstudios.com', opts))
      .toBe('https://sswanstudios.com/');
  });
});

describe('validateEmailCtaUrl — rejects schemes', () => {
  it('rejects javascript and data schemes', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(validateEmailCtaUrl(bad, opts), bad).toBeNull();
    }
  });

  it('rejects plain http even on an allowed host', () => {
    expect(validateEmailCtaUrl('http://sswanstudios.com/contact', opts)).toBeNull();
  });

  it('rejects plain http unless allowInsecureHttp is explicitly set', () => {
    // The dev escape hatch must be opt-in, and must still require a declared origin.
    expect(validateEmailCtaUrl('http://localhost:5173/x', {
      allowedOrigins: ['http://localhost:5173'],
      allowInsecureHttp: true,
    })).toBe('http://localhost:5173/x');
  });
});

describe('validateEmailCtaUrl — rejects credentials and protocol-relative URLs', () => {
  it('rejects credentials', () => {
    for (const bad of [
      'https://user:pass@sswanstudios.com/x',
      'https://user@sswanstudios.com/x',
      'https://:pass@sswanstudios.com/x',
    ]) {
      expect(validateEmailCtaUrl(bad, opts), bad).toBeNull();
    }
  });

  it('rejects protocol-relative URLs', () => {
    // `//evil.example/x` parses using the base scheme. Without an explicit check it
    // would inherit `https:` and pass a naive scheme test.
    expect(validateEmailCtaUrl('//evil.example/x', opts)).toBeNull();
    expect(validateEmailCtaUrl('//sswanstudios.com/x', opts)).toBeNull();
  });
});

describe('validateEmailCtaUrl — rejects control characters and surrounding whitespace', () => {
  it('rejects control characters', () => {
    for (const bad of [
      'https://sswanstudios.com/a\u0000b',
      'https://sswanstudios.com/a\nb',
      'https://sswanstudios.com/a\rb',
      'https://sswanstudios.com/a\u007Fb',
    ]) {
      expect(validateEmailCtaUrl(bad, opts), JSON.stringify(bad)).toBeNull();
    }
  });

  it('rejects surrounding whitespace rather than trimming it', () => {
    expect(validateEmailCtaUrl(' https://sswanstudios.com/x', opts)).toBeNull();
    expect(validateEmailCtaUrl('https://sswanstudios.com/x ', opts)).toBeNull();
    expect(validateEmailCtaUrl('\thttps://sswanstudios.com/x', opts)).toBeNull();
  });

  it('rejects empty and non-string input', () => {
    for (const bad of ['', null, undefined, 0, 123, {}, [], true]) {
      expect(validateEmailCtaUrl(bad, opts), String(bad)).toBeNull();
    }
  });
});

describe('validateEmailCtaUrl — rejects unconfigured and suffix-lookalike hosts', () => {
  it('rejects suffix-lookalike hosts', () => {
    // The canonical allow-list failure. `endsWith('sswanstudios.com')` accepts all
    // three of these; exact origin comparison accepts none.
    for (const bad of [
      'https://evil-sswanstudios.com/x',
      'https://sswanstudios.com.evil.example/x',
      'https://notsswanstudios.com/x',
      'https://evil.example/?u=sswanstudios.com',
    ]) {
      expect(validateEmailCtaUrl(bad, opts), bad).toBeNull();
    }
  });

  it('rejects a subdomain when only the apex is configured', () => {
    expect(validateEmailCtaUrl('https://mail.sswanstudios.com/x', opts)).toBeNull();
  });

  it('rejects an unconfigured but otherwise valid HTTPS origin', () => {
    expect(validateEmailCtaUrl('https://example.com/x', opts)).toBeNull();
  });
});

describe('validateEmailCtaUrl — rejects empty or invalid allowed-origin configuration', () => {
  it('rejects when the origin set is absent or empty', () => {
    expect(validateEmailCtaUrl('https://sswanstudios.com/x')).toBeNull();
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', {})).toBeNull();
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', { allowedOrigins: [] })).toBeNull();
  });

  it('rejects when every configured origin is invalid', () => {
    for (const bad of [
      ['sswanstudios.com'],            // no scheme — do not guess https
      ['not a url'],
      [''],
      [null],
      ['https://sswanstudios.com/x'],  // path: not an origin
      ['https://user:pass@sswanstudios.com'],
      [' https://sswanstudios.com'],   // surrounding whitespace in config is a config bug
    ]) {
      expect(validateEmailCtaUrl('https://sswanstudios.com/x', { allowedOrigins: bad }),
        JSON.stringify(bad)).toBeNull();
    }
  });

  it('treats a partly-invalid set as its valid subset, not as all-or-nothing', () => {
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', {
      allowedOrigins: ['garbage', 'https://sswanstudios.com'],
    })).toBe('https://sswanstudios.com/x');
  });

  // Hostile-review findings, 2026-09-22. The module's contract says a rejected CTA
  // "must drop the link, not fail the mail" — i.e. return null rather than throw. Two
  // input shapes broke that promise, and both are realistic misuses for a caller who
  // reads `@property {Iterable<string>}` and reaches for the nearest thing.
  //
  // These assert on `resolveAllowedOrigins`, not only on the accept/reject outcome. A
  // bare string and a valid one-element array BOTH reject an unrecognized URL, so an
  // outcome-only assertion cannot tell a correct rejection from an accident.
  //
  // HONEST SCOPE: the string case below is a CONTRACT test, not a mutation-proof one.
  // Removing the `isString` guard in `resolveAllowedOrigins` does not fail it, because
  // the fall-through iterates the string into single characters and `normalizeOrigin`
  // rejects every one, yielding the same empty set. The guard is defence in depth; the
  // mutation that removes it SURVIVES and that is documented in the module itself. The
  // non-iterable test below IS mutation-proof: removing that guard throws.
  it('resolves a bare string to the empty set instead of iterating it into characters', () => {
    expect([...resolveAllowedOrigins('https://sswanstudios.com')]).toEqual([]);
    expect([...resolveAllowedOrigins('h')]).toEqual([]);
    // The contrast that gives the assertion its meaning: the array form resolves.
    expect([...resolveAllowedOrigins(['https://sswanstudios.com'])])
      .toEqual(['https://sswanstudios.com']);
    // ...and the rejection still holds at the decision layer.
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', {
      allowedOrigins: 'https://sswanstudios.com',
    })).toBeNull();
  });

  it('returns null for a non-iterable set rather than throwing a TypeError', () => {
    // `for...of` on a number or a plain object throws. A throw here propagates out of
    // the mail renderer and fails the send — the exact opposite of the contract.
    for (const bad of [42, {}, true, Symbol('nope')]) {
      expect(() => resolveAllowedOrigins(bad), String(bad)).not.toThrow();
      expect([...resolveAllowedOrigins(bad)], String(bad)).toEqual([]);
      expect(() => validateEmailCtaUrl('https://sswanstudios.com/x', { allowedOrigins: bad }))
        .not.toThrow();
      expect(validateEmailCtaUrl('https://sswanstudios.com/x', { allowedOrigins: bad }),
        String(bad)).toBeNull();
    }
  });

  it('still accepts a genuine iterable that is not an array', () => {
    // The rejection above must not narrow the type the contract actually documents.
    expect([...resolveAllowedOrigins(new Set(['https://sswanstudios.com']))])
      .toEqual(['https://sswanstudios.com']);
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', {
      allowedOrigins: new Set(['https://sswanstudios.com']),
    })).toBe('https://sswanstudios.com/x');
    expect(validateEmailCtaUrl('https://sswanstudios.com/x', {
      allowedOrigins: (function* () { yield 'https://sswanstudios.com'; }()),
    })).toBe('https://sswanstudios.com/x');
  });
});

describe('emailCtaAllowedOrigins — configuration, not a new env var', () => {
  it('reads a comma-separated declaration when present', () => {
    expect(emailCtaAllowedOrigins({
      EMAIL_CTA_ALLOWED_ORIGINS: 'https://sswanstudios.com, https://www.sswanstudios.com',
      FRONTEND_URL: 'https://ignored.example',
    })).toEqual(['https://sswanstudios.com', 'https://www.sswanstudios.com']);
  });

  it('falls back to FRONTEND_URL', () => {
    expect(emailCtaAllowedOrigins({ FRONTEND_URL: 'https://sswanstudios.com' }))
      .toEqual(['https://sswanstudios.com']);
  });

  it('returns an empty set rather than a default when nothing is configured', () => {
    // Empty is a meaningful answer: no CTA links are emitted. A baked-in default
    // would make the module permissive on the day a domain changes.
    expect(emailCtaAllowedOrigins({})).toEqual([]);
    expect(emailCtaAllowedOrigins({ EMAIL_CTA_ALLOWED_ORIGINS: '  ', FRONTEND_URL: '' })).toEqual([]);
  });

  it('is frozen so a caller cannot widen the set in place', () => {
    expect(Object.isFrozen(emailCtaAllowedOrigins({ FRONTEND_URL: 'https://a.example' }))).toBe(true);
  });
});

describe('isKnownDangerousScheme — diagnostics only', () => {
  it('flags dangerous schemes', () => {
    expect(isKnownDangerousScheme('javascript:alert(1)')).toBe(true);
    expect(isKnownDangerousScheme('data:text/html,x')).toBe(true);
    expect(isKnownDangerousScheme('https://sswanstudios.com')).toBe(false);
    expect(isKnownDangerousScheme('not a url')).toBe(false);
    expect(isKnownDangerousScheme(null)).toBe(false);
  });
});
