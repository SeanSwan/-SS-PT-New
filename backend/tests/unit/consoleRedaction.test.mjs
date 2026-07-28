/**
 * Tests for the console redaction wrapper.
 *
 * WHY THIS EXISTS (SWA-71, 2026-07-28):
 * Both loggers redact, but **543 direct `console.*` calls in runtime code bypassed them** — 240 in
 * routes, 189 in controllers, 108 in services, 6 in middleware — and 454 of those log an error
 * object, a request, or a user. `console.error(err)` on a Postgres failure writes the connection
 * password to stdout, which on Render is the log stream.
 *
 * Editing 454 call sites during a launch is the wrong shape. One wrapper at the entry point covers
 * all of them, including scripts/ and seeders/ — the same "fix the chokepoint, not the callers"
 * move that fixed the two loggers.
 *
 * Wrapping a GLOBAL is invasive, so these tests pin the properties that make it safe to ship:
 * it never throws, it cannot recurse, it is idempotent, it has a kill switch, and it preserves
 * both format specifiers and object shape so existing log output does not change meaning.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  installConsoleRedaction,
  uninstallConsoleRedaction,
  isConsoleRedactionInstalled
} from '../../utils/consoleRedaction.mjs';

// Secret-shaped fixtures are assembled at runtime so the repo secret scanner does not flag them.
const dbUrl = (user, secret, host) => ['postgres', '://', user, ':', secret, '@', host].join('');
const SECRET = 'p4ssW0rdX';

/** Capture what actually reached stdout for one call. */
const capture = (fn) => {
  const original = process.stdout.write.bind(process.stdout);
  let out = '';
  process.stdout.write = (chunk) => { out += String(chunk); return true; };
  try { fn(); } finally { process.stdout.write = original; }
  return out;
};

afterEach(() => {
  uninstallConsoleRedaction();
  delete process.env.SWAN_CONSOLE_REDACTION;
});

describe('installConsoleRedaction — lifecycle', () => {
  it('installs, reports installed, and is idempotent', () => {
    expect(installConsoleRedaction()).toBe(true);
    expect(isConsoleRedactionInstalled()).toBe(true);
    // Double-wrapping would double the work per call and make the original unrecoverable.
    expect(installConsoleRedaction()).toBe(false);
  });

  it('restores the original console on uninstall', () => {
    installConsoleRedaction();
    uninstallConsoleRedaction();
    expect(isConsoleRedactionInstalled()).toBe(false);
    expect(capture(() => console.log(`raw ${SECRET}`))).toContain(SECRET);
  });

  it('honors the SWAN_CONSOLE_REDACTION=off kill switch', () => {
    // This ships on launch night; it must be reversible by an env var, not a code change.
    process.env.SWAN_CONSOLE_REDACTION = 'off';
    expect(installConsoleRedaction()).toBe(false);
    expect(isConsoleRedactionInstalled()).toBe(false);
  });
});

describe('console redaction — secrets and PII do not reach stdout', () => {
  it('redacts database credentials from a plain string', () => {
    installConsoleRedaction();
    expect(capture(() => console.log(`db ${dbUrl('swan', SECRET, 'db.internal/prod')}`))).not.toContain(SECRET);
  });

  it('redacts an email', () => {
    installConsoleRedaction();
    expect(capture(() => console.log('user jane@example.com'))).not.toContain('jane@example.com');
  });

  it('redacts credentials inside an Error — the headline case', () => {
    // `console.error(err)` on a connection failure is how the password reached the log stream.
    // Error does not enumerate message/stack as own keys, so a naive key walk misses them.
    installConsoleRedaction();
    const err = new Error(`connect ECONNREFUSED ${dbUrl('swan', SECRET, 'db.internal/prod')}`);
    expect(capture(() => console.log(err))).not.toContain(SECRET);
  });

  it('redacts deeply nested object values', () => {
    installConsoleRedaction();
    expect(capture(() => console.log({ a: { b: { c: dbUrl('u', SECRET, 'h/d') } } }))).not.toContain(SECRET);
  });

  it('redacts values inside arrays', () => {
    installConsoleRedaction();
    expect(capture(() => console.log(['x', dbUrl('u', SECRET, 'h/d')]))).not.toContain(SECRET);
  });
});

describe('console redaction — must not damage normal output', () => {
  it('preserves identifiers so logs stay debuggable', () => {
    installConsoleRedaction();
    const out = capture(() => console.log('migration 20260112000002-x.cjs userId 5551234567 sha 46f54c5fe'));
    expect(out).toContain('20260112000002');
    expect(out).toContain('5551234567');
    expect(out).toContain('46f54c5fe');
  });

  it('preserves format specifiers and argument count', () => {
    // Only VALUES are redacted; %s/%d positions and arity are untouched.
    installConsoleRedaction();
    const out = capture(() => console.log('user %s did %d reps', 'Alice', 12));
    expect(out).toContain('Alice');
    expect(out).toContain('12');
  });

  it('keeps objects as objects rather than stringifying them', () => {
    installConsoleRedaction();
    expect(capture(() => console.log({ k: 'v' }))).toContain('k');
  });
});

describe('console redaction — must not destroy built-in types', () => {
  // Found by hostile review AFTER the first ship. The value walker rebuilt every object as a plain
  // `{}` via Object.keys(), which erased Date -> {}, RegExp -> {}, Map -> {}, Set -> {}, and
  // Buffer -> { '0': 97 }. That violates the rule this whole effort is built on: never destroy the
  // information a log exists to carry.
  it.each([
    ['Date', new Date(0), /1970/],
    ['RegExp', /x/g, /\/x\/g/],
    ['Map', new Map([['k', 'v']]), /Map/],
    ['Set', new Set([1]), /Set/],
    ['Buffer', Buffer.from('ab'), /Buffer/]
  ])('preserves %s instead of flattening it to {}', (_label, value, expected) => {
    installConsoleRedaction();
    expect(capture(() => console.log(value))).toMatch(expected);
  });

  it.each([
    ['Map', new Map([['e', 'jane@example.com']])],
    ['Set', new Set(['jane@example.com'])]
  ])('still redacts values inside a %s', (_label, collection) => {
    // Preserving the type must not cost the redaction.
    installConsoleRedaction();
    expect(capture(() => console.log(collection))).not.toContain('jane@example.com');
  });
});

describe('console redaction — cannot take the process down', () => {
  it('does not hang or throw on a circular reference', () => {
    installConsoleRedaction();
    const circular = { s: dbUrl('u', SECRET, 'h/d') };
    circular.self = circular;
    expect(() => capture(() => console.log(circular))).not.toThrow();
  });

  it.each([[null], [undefined], [42], [Symbol('x')], [() => {}]])(
    'handles the exotic argument %s without throwing',
    (arg) => {
      installConsoleRedaction();
      expect(() => capture(() => console.log(arg))).not.toThrow();
    }
  );

  it('stays fast enough for a hot path', () => {
    installConsoleRedaction();
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;
    const start = Date.now();
    try {
      for (let i = 0; i < 2000; i += 1) console.log('request handled', { userId: i, route: '/api/x' });
    } finally {
      process.stdout.write = original;
    }
    // Measured ~10us/call; this bound is deliberately loose for slower CI hardware.
    expect(Date.now() - start).toBeLessThan(4000);
  });
});
