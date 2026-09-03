/**
 * The client digest MUST equal the server digest, case for case, from the SHARED
 * fixture. If this file goes red, do not "fix" the fixture — the two
 * implementations have drifted and every confirmation in production would fail.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJson, digestSubject, renderDigestOf } from './renderDigest';

const FIXTURE = path.resolve(
  __dirname, '..', '..', '..', 'backend', 'tests', 'fixtures', 'render-digest.json',
);
const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));

describe('renderDigest parity with the backend', () => {
  it('the shared fixture is present and non-empty', () => {
    expect(fixture.cases.length).toBeGreaterThan(3);
    expect(fixture.algorithm).toContain('sha256');
  });

  for (const c of fixture.cases) {
    it(`canonical form matches the backend: ${c.name}`, () => {
      expect(canonicalJson(digestSubject(c.op))).toBe(c.canonical);
    });

    it(`digest matches the backend: ${c.name}`, async () => {
      expect(await renderDigestOf(c.op)).toBe(c.digest);
    });
  }

  it('key order does not change the digest (the property the fixture encodes)', async () => {
    const a = { id: 'x', commandType: 'c', type: 'DELETE', description: 'd', affectedCount: 1, params: { b: 2, a: 1 } };
    const b = { params: { a: 1, b: 2 }, affectedCount: 1, description: 'd', type: 'DELETE', commandType: 'c', id: 'x' };
    expect(await renderDigestOf(a)).toBe(await renderDigestOf(b));
  });

  it('array order DOES change the digest (order is meaning)', async () => {
    const a = { id: 'x', params: { tags: ['a', 'b'] } };
    const b = { id: 'x', params: { tags: ['b', 'a'] } };
    expect(await renderDigestOf(a)).not.toBe(await renderDigestOf(b));
  });

  it('a changed description changes the digest — the field the human reads is covered', async () => {
    const base = { id: 'x', commandType: 'c', type: 'DELETE', description: 'Cancel one session', affectedCount: 1, params: { id: 1 } };
    const tampered = { ...base, description: 'Cancel ALL sessions' };
    expect(await renderDigestOf(base)).not.toBe(await renderDigestOf(tampered));
  });

  it('undefined and null are identical IN MEMORY (cannot be fixture-driven: undefined does not survive JSON)', async () => {
    const withNull = { id: 'x', params: { a: null, b: null } };
    const withUndef = { id: 'x', params: { a: null, b: undefined } };
    expect(canonicalJson(digestSubject(withUndef))).toBe(canonicalJson(digestSubject(withNull)));
    expect(await renderDigestOf(withUndef)).toBe(await renderDigestOf(withNull));
  });

  it('expiresAt and signature are NOT covered — clock skew and server secrets must not break a confirm', async () => {
    const base = { id: 'x', commandType: 'c', type: 'DELETE', description: 'd', affectedCount: 1, params: { id: 1 } };
    const withNoise = { ...base, expiresAt: '2026-01-01T00:00:00.000Z', signature: 'deadbeef' } as typeof base;
    expect(await renderDigestOf(withNoise)).toBe(await renderDigestOf(base));
  });
});
