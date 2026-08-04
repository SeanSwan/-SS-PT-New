/**
 * Key-name redaction — the secrets no value-shape rule can catch
 * ==============================================================
 * Every existing rule matches a secret by its SHAPE: a JWT looks like a JWT, a Stripe key starts
 * `sk_live_`, a DB URL has `user:pass@host`. That covers a lot — verified here and in
 * logRedactionShared — but it structurally cannot catch a bare password. `hunter2` is
 * indistinguishable from any other word, so no regex over the VALUE will ever find it.
 *
 * The remaining signal is the KEY. `{ password: 'hunter2' }` is unambiguous even though the value
 * is not, so a small allowlist of unmistakably-secret key names closes the gap.
 *
 * WHY THE ALLOWLIST IS DELIBERATELY NARROW — a bare `token` key is NOT redacted. This codebase
 * logs LLM token *counts* (`piiSafeLogger.error('Failed to track token usage', { ... })`), and
 * redacting those would destroy exactly the debuggability design rule 4 of this module exists to
 * protect. Only compound names that cannot mean anything else (`accessToken`, `refreshToken`) are
 * included. Same reason `sessionId` and every `*Id` are excluded: IDs are the allowed identifier
 * form under Rule 8 and are what make a log actionable.
 */
import { describe, expect, it } from 'vitest';
import { redactLogValue, redactLogString } from '../../utils/redactionRules.mjs';

describe('credential key names are redacted regardless of value shape', () => {
  it('redacts a bare password value that no shape rule can match', () => {
    const out = redactLogValue({ password: 'hunter2' });
    expect(out.password).not.toBe('hunter2');
    expect(String(out.password)).toContain('REDACTED');
  });

  it('redacts the credential-key family', () => {
    const out = redactLogValue({
      passwd: 'a', pwd: 'b', secret: 'c', clientSecret: 'd', apiSecret: 'e',
      apiKey: 'f', accessToken: 'g', refreshToken: 'h', idToken: 'i',
      privateKey: 'j', authorization: 'k', cookie: 'l', sessionToken: 'm',
      csrfToken: 'n', otp: 'o', mfaCode: 'p', pin: 'q',
    });
    for (const [key, value] of Object.entries(out)) {
      expect(String(value), `${key} was not redacted`).toContain('REDACTED');
    }
  });

  it('matches key names case-insensitively and through snake_case', () => {
    const out = redactLogValue({ PASSWORD: 'x', client_secret: 'y', 'Api-Key': 'z' });
    for (const [key, value] of Object.entries(out)) {
      expect(String(value), `${key} was not redacted`).toContain('REDACTED');
    }
  });

  it('redacts nested and array-held credentials', () => {
    const out = redactLogValue({ outer: { inner: { password: 'deep' } }, list: [{ apiKey: 'k' }] });
    expect(String(out.outer.inner.password)).toContain('REDACTED');
    expect(String(out.list[0].apiKey)).toContain('REDACTED');
  });

  it('does NOT redact a bare `token` key — this app logs LLM token counts', () => {
    // Over-redaction is its own defect: destroying identifiers guts the debuggability logs exist
    // for (design rule 4). `token` is ambiguous, so it stays.
    const out = redactLogValue({ token: 1234, tokenUsage: 5678, totalTokens: 99 });
    expect(out.token).toBe(1234);
    expect(out.tokenUsage).toBe(5678);
    expect(out.totalTokens).toBe(99);
  });

  it('does NOT redact identifiers — IDs are preserved on purpose', () => {
    const out = redactLogValue({ userId: 42, sessionId: 'abc', clientId: 7, planId: 3, id: 1 });
    expect(out).toEqual({ userId: 42, sessionId: 'abc', clientId: 7, planId: 3, id: 1 });
  });

  it('leaves ordinary fields untouched', () => {
    const out = redactLogValue({ status: 'completed', count: 3, name: 'Push Day' });
    expect(out).toEqual({ status: 'completed', count: 3, name: 'Push Day' });
  });

  it('still applies value-shape redaction inside a non-credential key', () => {
    // Key-name redaction must ADD to shape redaction, never replace it.
    const out = redactLogValue({ note: 'reach me at victim@example.com' });
    expect(out.note).not.toContain('victim@example.com');
  });

  it('does not break Error, Map, Set or Date handling', () => {
    const err = new Error('boom');
    err.password = 'hunter2';
    const out = redactLogValue({ err, m: new Map([['password', 'x']]), s: new Set(['ok']), d: new Date(0) });
    expect(out.err).toBeInstanceOf(Error);
    expect(String(out.err.password)).toContain('REDACTED');
    expect(out.m).toBeInstanceOf(Map);
    expect(String(out.m.get('password'))).toContain('REDACTED');
    expect(out.s).toBeInstanceOf(Set);
    expect(out.d).toBeInstanceOf(Date);
  });

  it('redacts a credential key whose value is an object or array, not just a string', () => {
    // A structured credential — { authorization: { scheme, token } } — must not survive because
    // the walk descended into it looking for redactable strings. The key alone is the verdict.
    const out = redactLogValue({
      authorization: { scheme: 'Bearer', token: 'abc' },
      apiKey: ['k1', 'k2'],
      password: { hash: 'x', salt: 'y' },
    });
    expect(JSON.stringify(out)).not.toContain('Bearer');
    expect(JSON.stringify(out)).not.toContain('k1');
    expect(JSON.stringify(out)).not.toContain('salt');
  });

  it('never throws — a redaction failure must not suppress a log line', () => {
    const circular = { password: 'p' };
    circular.self = circular;
    expect(() => redactLogValue(circular)).not.toThrow();
    expect(() => redactLogString(null)).not.toThrow();
  });
});
