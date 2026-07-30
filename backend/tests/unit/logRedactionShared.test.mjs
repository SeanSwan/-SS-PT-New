/**
 * Regression tests for the SHARED log-redaction rules and both loggers that consume them.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28):
 * This backend had two loggers with two independently-maintained redaction lists:
 *   - `utils/logger.mjs`                    (~2841 call sites) — API-key shapes only
 *   - `utils/monitoring/piiSafeLogging.mjs` (~231 call sites)  — keys + PII
 *
 * They drifted, and the drift WAS the bug. Verified by execution: the MAIN logger — the one with
 * 12x the reach — passed **email, SSN, phone, and database credentials** straight through. The
 * concrete leak: `logger.error(err)` on a Postgres connection failure wrote the connection
 * password into the logs, because no credential-URL rule existed on that side.
 *
 * Both now read from `utils/redactionRules.mjs`. These tests pin the three properties that make
 * that safe, and the last two matter as much as the first:
 *   1. PII and secret shapes are redacted — on BOTH loggers.
 *   2. Identifiers are NOT destroyed (migration timestamps, epoch millis, IDs, commit SHAs).
 *   3. Rule ORDER holds: credential URLs are consumed whole, not partially eaten by EMAIL.
 */
import { describe, it, expect, vi } from 'vitest';
import { Writable } from 'node:stream';
import winston from 'winston';
import { redactLogString, LOG_REDACTION_RULES } from '../../utils/redactionRules.mjs';
// NOTE: utils/logger.mjs is deliberately NOT imported normally here. tests/setup.mjs
// mocks it to vi.fn() stubs, and a stub cannot leak, so importing the mock made this
// entire suite vacuous. The real logger is loaded via vi.importActual below.
import { piiSafeLogger, scrubPII } from '../../utils/monitoring/piiSafeLogging.mjs';

// Secret-SHAPED fixtures are assembled at runtime. A literal here trips the repo secret scanner
// (correctly — it cannot tell a synthetic fixture from a real leak) and would block pre-commit.
const dbUrl = (user, secret, host) => ['postgres', '://', user, ':', secret, '@', host].join('');
const JWT = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV'].join('.');

/**
 * The REAL winston logger, bypassing the global mock.
 *
 * tests/setup.mjs does `vi.mock('../utils/logger.mjs')` and replaces the default
 * export with bare `vi.fn()` stubs to keep test output quiet. That mock applies
 * here too — so the `logger.info(...)` calls in this file were hitting a no-op
 * spy that writes nothing, anywhere. The whole "the 2841-call-site logger no
 * longer leaks" block was asserting against a stub, which is why every capture
 * came back ''.
 */
const realLogger = (await vi.importActual('../../utils/logger.mjs')).default;
// Every `logger.*` call in the assertions below must reach the REAL logger.
const logger = realLogger;

/**
 * Capture what winston actually wrote for one logger call.
 *
 * DO NOT patch process.stdout.write here. Winston's Console transport emits
 * through `console.log`, and vitest replaces `console` with its own reporter, so
 * a stdout patch captures EXACTLY ZERO BYTES under the test runner — measured
 * with a probe. Combined with the mock above, every assertion in this block ran
 * against '': the positive "identifiers survive" checks failed loudly, and every
 * `not.toContain(<secret>)` redaction assertion passed VACUOUSLY.
 *
 * Attaching a real winston Stream transport removes the guesswork. The logger's
 * own format chain (redactionFormat FIRST, then timestamp + json) has already run
 * by the time any transport sees the record, so what lands here is exactly what a
 * production transport would receive — and it does not depend on how the runner
 * treats the global console.
 */
const captureMainLogger = (fn) => {
  let captured = '';
  const stream = new Writable({
    write(chunk, _enc, cb) { captured += String(chunk); cb(); },
  });
  const transport = new winston.transports.Stream({ stream, level: 'silly' });
  realLogger.add(transport);
  try { fn(); } finally { realLogger.remove(transport); }
  return captured;
};

describe('redactLogString — redacts PII and secret shapes', () => {
  it.each([
    ['email', 'contact jane.doe@example.com', '<REDACTED-EMAIL>'],
    ['SSN', 'ssn 123-45-6789', '<REDACTED-SSN>'],
    ['phone with separators', 'call 555-123-4567', '<REDACTED-PHONE>'],
    ['phone parenthesized', 'call (555) 123-4567', '<REDACTED-PHONE>'],
    ['JWT', `token ${JWT}`, '<REDACTED-JWT>'],
    ['stripe key', `k sk_live_${'a'.repeat(20)}`, '<REDACTED-STRIPE>'],
    ['openai key', `k sk-proj-${'a'.repeat(30)}`, '<REDACTED-OPENAI>'],
    ['anthropic key', `k sk-ant-${'a'.repeat(25)}`, '<REDACTED-ANTHROPIC>'],
    ['google key', `k AIza${'a'.repeat(35)}`, '<REDACTED-GOOGLE>'],
    ['slack token', `t xoxb-${'a'.repeat(15)}`, '<REDACTED-SLACK>'],
    ['github token', `t ghp_${'a'.repeat(36)}`, '<REDACTED-GITHUB>'],
    ['aws access key id', `id AKIA${'A'.repeat(16)}`, '<REDACTED-AWS_AKID>']
  ])('redacts %s', (_label, input, expected) => {
    expect(redactLogString(input)).toContain(expected);
  });

  it('redacts a multi-line PEM private key block', () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${'a'.repeat(200)}\n-----END PRIVATE KEY-----`;
    expect(redactLogString(`leaked ${pem}`)).toContain('<REDACTED-PRIVATE_KEY>');
  });
});

describe('redactLogString — must NOT destroy identifiers', () => {
  // A redactor that eats IDs guts the debuggability logs exist for. A bare 10-digit run is
  // deliberately not treated as a phone number for exactly this reason.
  it.each([
    ['sequelize migration timestamp', 'migration 20260112000002-create-plans.cjs'],
    ['epoch milliseconds', 'ts 1753664400000'],
    ['bare 10-digit id', 'userId 5551234567'],
    ['commit sha', 'sha 46f54c5fe'],
    ['short numeric id', 'planId 12345'],
    ['ordinary prose', 'Nutrition ethical review incomplete — checks not implemented']
  ])('leaves %s untouched', (_label, input) => {
    expect(redactLogString(input)).toBe(input);
  });
});

describe('redactLogString — rule ORDER is load-bearing', () => {
  it('consumes a whole credential URL instead of letting EMAIL eat part of it', () => {
    // A connection string embeds `password@hostname`, which EMAIL matches. With EMAIL ordered
    // first the password was removed but the result was mislabeled AND the scheme + username
    // survived — a partial disclosure of the connection target. Reordering must not regress this.
    const out = redactLogString(dbUrl('swan', 'n0tR3al', 'db.internal:5432/prod'));
    expect(out).toContain('<REDACTED-DB_URL>');
    expect(out).not.toContain('<REDACTED-EMAIL>');
    expect(out).not.toContain('swan');
    expect(out).not.toContain('db.internal');
  });

  it('consumes a whole http basic-auth URL', () => {
    const out = redactLogString('https://admin:s3cret@internal.host/path');
    expect(out).toContain('<REDACTED-HTTP_AUTH_URL>');
    expect(out).not.toContain('admin');
  });

  it('orders every credential-URL rule ahead of EMAIL', () => {
    const names = LOG_REDACTION_RULES.map(([kind]) => kind);
    expect(names.indexOf('DB_URL')).toBeLessThan(names.indexOf('EMAIL'));
    expect(names.indexOf('HTTP_AUTH_URL')).toBeLessThan(names.indexOf('EMAIL'));
  });
});

describe('redactLogString — never throws, bounded quantifiers', () => {
  it.each([[null], [undefined], ['']  , [42], [{ a: 1 }]])('passes %s through unchanged', (input) => {
    expect(() => redactLogString(input)).not.toThrow();
    expect(redactLogString(input)).toBe(input);
  });

  it.each([
    ['repeated jwt prefix', 'eyJ'.repeat(5000)],
    ['email-like punctuation', `${'a'.repeat(3000)}@${'b.'.repeat(1500)}`],
    ['unterminated pem block', `-----BEGIN PRIVATE KEY-----${'a'.repeat(50000)}`],
    ['unterminated db url', `postgres://${'a'.repeat(50000)}`],
    ['digits and dots', '1.'.repeat(25000)],
    ['many at-signs', 'x@y.'.repeat(20000)]
  ])('completes quickly on %s', (_label, input) => {
    const start = Date.now();
    redactLogString(input);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('utils/logger.mjs — the 2841-call-site logger no longer leaks', () => {
  it('no longer leaks database credentials', () => {
    // THE headline regression. `logger.error(err)` on a Postgres connection failure used to write
    // the connection password into the logs.
    const secret = 'p4ssW0rdX';
    const out = captureMainLogger(() => logger.info(`db fail ${dbUrl('swan', secret, 'db.internal/prod')}`));
    expect(out).not.toContain(secret);
  });

  it.each([
    ['email', 'user jane.doe@example.com signed up', 'jane.doe@example.com'],
    ['SSN', 'ssn 123-45-6789', '123-45-6789'],
    ['phone', 'call 555-123-4567', '555-123-4567']
  ])('no longer leaks %s', (_label, message, leaked) => {
    expect(captureMainLogger(() => logger.info(message))).not.toContain(leaked);
  });

  it('still redacts API keys (no regression on prior behavior)', () => {
    const out = captureMainLogger(() => logger.info(`key sk-proj-${'a'.repeat(30)}`));
    expect(out).not.toContain(`sk-proj-${'a'.repeat(30)}`);
  });

  it('preserves identifiers so logs stay debuggable', () => {
    const out = captureMainLogger(() =>
      logger.info('migration 20260112000002-x.cjs userId 5551234567 sha 46f54c5fe'));
    expect(out).toContain('20260112000002');
    expect(out).toContain('5551234567');
    expect(out).toContain('46f54c5fe');
  });
});

describe('utils/logger.mjs — deep nesting must not bypass redaction', () => {
  // Found by execution during hostile review. `redactValue` checked its recursion cap BEFORE the
  // string branch and returned the value untouched — `if (depth > 4) return v;` — so any string
  // nested deeper than 4 levels was logged RAW. A connection string at depth 5+ went to the logs
  // with its password intact. Real error payloads reach depth 6+ routinely (an ORM error wrapped
  // in a service error wrapped in request context), so this was reachable, not theoretical.
  const nest = (depth, value) => {
    let out = value;
    for (let i = 0; i < depth; i += 1) out = { [`L${i}`]: out };
    return out;
  };

  it.each([1, 4, 5, 6, 8, 12, 20, 50, 200])('redacts credentials nested %i levels deep', (depth) => {
    const secret = 'p4ssW0rdX';
    const payload = nest(depth, `${dbUrl('swan', secret, 'db.internal/prod')} and a@b.com`);
    const out = captureMainLogger(() => logger.error('deep', { payload }));
    expect(out).not.toContain(secret);
    expect(out).not.toContain('a@b.com');
  });

  it('terminates on a circular reference instead of overflowing the stack', () => {
    const circular = { secret: dbUrl('u', 'pw', 'h/d') };
    circular.self = circular;
    expect(() => captureMainLogger(() => logger.error('circ', { circular }))).not.toThrow();
  });
});

describe('piiSafeLogger — still works through the shared module', () => {
  const capture = async (message, meta) => {
    const original = console.info;
    let captured = '';
    console.info = (line) => { captured = line; };
    try { await piiSafeLogger.info(message, meta); } finally { console.info = original; }
    return captured;
  };

  it('re-exports scrubPII as a callable function', () => {
    // A bare `export { x as y } from '...'` creates no local binding; formatLog would throw
    // ReferenceError. The module imports it locally and re-exports.
    expect(typeof scrubPII).toBe('function');
  });

  it('scrubs the message and nested meta', async () => {
    const out = await capture('user jane@example.com', { profile: { email: 'bob@example.com' } });
    expect(out).not.toContain('jane@example.com');
    expect(out).not.toContain('bob@example.com');
  });

  it('preserves user IDs, the allowed identifier form', async () => {
    const out = await capture('action', { userId: 42, planId: 'p-123' });
    expect(out).toContain('42');
    expect(out).toContain('p-123');
  });

  it('keeps both loggers on identical rules so they cannot drift again', () => {
    const sample = `x jane@example.com ${dbUrl('u', 'pw', 'h/d')} 123-45-6789`;
    expect(scrubPII(sample)).toBe(redactLogString(sample));
  });
});
