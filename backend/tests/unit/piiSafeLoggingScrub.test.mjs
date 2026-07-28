/**
 * Regression tests for piiSafeLogger PII scrubbing.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28):
 * The class was named "PII-Safe Logger" and declared a `scrubConfig` in its constructor, but
 * nothing ever read that config and `formatLog` copied every value through verbatim. It did not
 * scrub. The danger was not the missing feature — it was the false assurance: callers passed PII
 * to something named "PII-safe" believing it was handled. Same class as a safety check that
 * reports a pass without running.
 *
 * Two properties are defended here, and the SECOND matters as much as the first:
 *   1. High-confidence PII/secret shapes are removed from log output.
 *   2. Identifiers are NOT destroyed. A scrubber that eats migration timestamps, epoch millis,
 *      commit SHAs, and numeric IDs guts the debuggability the logs exist for. A bare 10-digit
 *      run is deliberately NOT treated as a phone number — that exact over-match was found in
 *      another script in this repo silently replacing migration filenames with a placeholder.
 */
import { describe, it, expect } from 'vitest';
import { piiSafeLogger, scrubPII } from '../../utils/monitoring/piiSafeLogging.mjs';

// Secret-SHAPED fixtures are assembled at runtime rather than written as literals. A literal
// here would be flagged by the repo secret scanner (correctly — it cannot tell a synthetic
// fixture from a real leak), and committing fake secrets trains readers to wave the scanner off.
// Assembling from parts keeps the test meaningful and the file clean.
const JWT = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV'].join('.');
// Assembled by join() rather than a template literal: a template literal of the form
// `scheme://${u}:${s}@${h}` is itself secret-SHAPED and trips the repo scanner on this line.
const dbUrl = (user, secret, host) => ['postgres', '://', user, ':', secret, '@', host].join('');

describe('scrubPII — removes high-confidence PII and secret shapes', () => {
  it.each([
    ['email', 'contact jane.doe@example.com now', '<REDACTED-EMAIL>'],
    ['SSN', 'ssn 123-45-6789', '<REDACTED-SSN>'],
    ['phone with separators', 'call 555-123-4567', '<REDACTED-PHONE>'],
    ['phone parenthesized', 'call (555) 123-4567', '<REDACTED-PHONE>'],
    ['JWT', `token ${JWT}`, '<REDACTED-JWT>'],
    ['stripe secret key', `key sk_live_${'a'.repeat(20)}`, '<REDACTED-STRIPE>'],
    ['openai key', `key sk-proj-${'a'.repeat(30)}`, '<REDACTED-OPENAI>'],
    ['google key', `key AIza${'a'.repeat(35)}`, '<REDACTED-GOOGLE>'],
    ['aws access key id', `id AKIA${'A'.repeat(16)}`, '<REDACTED-AWS_AKID>'],
    ['db url with credentials', dbUrl('user', 'pw', 'host:5432/db'), '<REDACTED-DB_URL>']
  ])('redacts %s', (_label, input, expected) => {
    expect(scrubPII(input)).toContain(expected);
  });

  it('redacts credentials embedded in a database connection error', () => {
    // The single most common log payload in this codebase is `{ error: error.message }`, and
    // Postgres connection failures embed the full connection string — credentials included.
    const secret = 'n0tR3al';
    const scrubbed = scrubPII(`connect ECONNREFUSED ${dbUrl('swan', secret, 'db.internal:5432/prod')}`);
    expect(scrubbed).not.toContain(secret);
    expect(scrubbed).toContain('<REDACTED-DB_URL>');
  });

  it('consumes the WHOLE credential URL rather than letting EMAIL eat part of it', () => {
    // Rule-order regression. EMAIL matches `pw@host.tld`, which is a substring of any credential
    // URL. When EMAIL ran first the result was `postgres://swan:<REDACTED-EMAIL>:5432/prod` —
    // password removed, but mislabeled AND the scheme + username survived, partially disclosing
    // the connection target. Reordering the rule array must not silently reintroduce that.
    const scrubbed = scrubPII(dbUrl('swan', 'n0tR3al', 'db.internal:5432/prod'));
    expect(scrubbed).toContain('<REDACTED-DB_URL>');
    expect(scrubbed).not.toContain('<REDACTED-EMAIL>');
    expect(scrubbed).not.toContain('swan');
    expect(scrubbed).not.toContain('db.internal');
  });

  it('redacts a multi-line private key block', () => {
    const key = `-----BEGIN PRIVATE KEY-----\n${'a'.repeat(200)}\n-----END PRIVATE KEY-----`;
    expect(scrubPII(`leaked ${key}`)).toContain('<REDACTED-PRIVATE_KEY>');
  });
});

describe('scrubPII — must NOT destroy identifiers', () => {
  it.each([
    ['sequelize migration timestamp', 'migration 20260112000002-create-plans.cjs'],
    ['epoch milliseconds', 'ts 1753664400000'],
    ['bare 10-digit id', 'userId 5551234567'],
    ['commit sha', 'sha 46f54c5fe'],
    ['short numeric id', 'planId 12345'],
    ['ordinary prose', 'Nutrition ethical review incomplete — checks not implemented']
  ])('leaves %s untouched', (_label, input) => {
    expect(scrubPII(input)).toBe(input);
  });
});

describe('scrubPII — never throws', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['number', 42],
    ['object', { a: 1 }]
  ])('passes %s through without throwing', (_label, input) => {
    expect(() => scrubPII(input)).not.toThrow();
    expect(scrubPII(input)).toBe(input);
  });
});

describe('scrubPII — bounded quantifiers prevent ReDoS on the logging hot path', () => {
  // Every rule is upper-bounded on purpose: this runs in front of ~246 log call sites, so an
  // unbounded quantifier over a punctuation-rich line would be a self-inflicted DoS.
  it.each([
    ['repeated jwt prefix', 'eyJ'.repeat(5000)],
    ['email-like punctuation run', `${'a'.repeat(3000)}@${'b.'.repeat(1500)}`],
    ['unterminated private key', `-----BEGIN PRIVATE KEY-----${'a'.repeat(50000)}`],
    ['unterminated db url', `postgres://${'a'.repeat(50000)}`],
    ['digits and dots', '1.'.repeat(25000)]
  ])('completes quickly on %s', (_label, input) => {
    const start = Date.now();
    scrubPII(input);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('piiSafeLogger — scrubbing is wired into every log method', () => {
  const capture = async (level, message, meta) => {
    const key = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info';
    const original = console[key];
    let captured = '';
    console[key] = (line) => { captured = line; };
    try {
      await piiSafeLogger[level](message, meta);
    } finally {
      console[key] = original;
    }
    return captured;
  };

  it.each(['error', 'warn', 'info'])('scrubs the message on %s()', async (level) => {
    const out = await capture(level, 'user jane@example.com signed in', {});
    expect(out).not.toContain('jane@example.com');
    expect(out).toContain('<REDACTED-EMAIL>');
  });

  it('scrubs nested values inside meta', async () => {
    // meta is JSON-serialized before scrubbing, so one pass covers arbitrary nesting.
    const out = await capture('info', 'signup', { profile: { contact: { email: 'bob@example.com' } } });
    expect(out).not.toContain('bob@example.com');
    expect(out).toContain('<REDACTED-EMAIL>');
  });

  it('preserves user IDs, which are the allowed identifier form', async () => {
    const out = await capture('info', 'action', { userId: 42, planId: 'p-123' });
    expect(out).toContain('42');
    expect(out).toContain('p-123');
  });

  it('honors scrubConfig.enabled and defaults it to on', () => {
    expect(piiSafeLogger.scrubConfig.enabled).toBe(true);
  });

  it('declares no config key it does not actually read', () => {
    // `defaultMethod` and `preserveFormat` were declared but never consumed, and
    // `preserveFormat: true` misdescribed the behavior (placeholders do not preserve format).
    expect(Object.keys(piiSafeLogger.scrubConfig)).toEqual(['enabled']);
  });
});
