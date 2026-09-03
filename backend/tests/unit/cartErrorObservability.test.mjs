/**
 * Contract: a cart 500 must be diagnosable from the logs.
 *
 * Incident (verified 2026-09-02): GET /api/cart returned 500 for a valid,
 * refresh-capable session. sendInternalError collapses every throw to a generic
 * 500 and logCartError recorded only errorName + errorCode — so the production
 * log named the error CLASS and nothing else. No root cause could be assigned,
 * only guessed. These assertions pin the diagnostic fields in place and pin the
 * privacy boundary (IDs and error text only) around them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'routes/cartRoutes.mjs'), 'utf8');

/** Extract the object literal returned by toCartErrorMetadata. */
const metadataBlock = () => {
  const start = source.indexOf('const toCartErrorMetadata');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('});', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('cart error observability', () => {
  it('logs the error message, not just its class', () => {
    expect(metadataBlock()).toMatch(/message:\s*error\?\.message/);
  });

  it('logs a bounded stack so the throwing module is nameable', () => {
    const block = metadataBlock();
    expect(block).toMatch(/stack:/);
    expect(block).toMatch(/slice\(0,\s*6\)/);
  });

  it('surfaces the underlying Postgres/Sequelize cause', () => {
    const block = metadataBlock();
    expect(block).toMatch(/pgCode:/);
    expect(block).toMatch(/error\?\.original\?\.code/);
    expect(block).toMatch(/parentMessage:/);
  });

  it('logs no PII — user identity stays an id', () => {
    const start = source.indexOf('const logCartError');
    const block = source.slice(start, source.indexOf('};', start));
    expect(block).toMatch(/userId:\s*req\?\.authUserId/);
    for (const forbidden of ['req.body', 'req.user.email', 'email:', 'token', 'password']) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('still returns a generic 500 body to the client (no internals leak)', () => {
    const start = source.indexOf('const sendInternalError');
    const block = source.slice(start, source.indexOf('});', start));
    expect(block).toMatch(/status\(500\)/);
    expect(block).toMatch(/error:\s*INTERNAL_ERROR/);
    expect(block).not.toMatch(/stack/);
  });
});
