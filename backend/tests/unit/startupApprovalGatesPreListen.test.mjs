/**
 * The approval-lane boot gates must be PRE-LISTEN. core/startup.mjs has two
 * regions: a critical pre-listen section (throws exit the process) and a
 * non-critical background block after listen (its catch logs "Server continues
 * running"). A gate placed in the second region is decorative — which is exactly
 * where the 5.0 draft put it (Fable 5.1 hostile pass, 2026-09-02). This test
 * pins source ORDER: both gates appear before startServer(app), never after.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../core/startup.mjs', import.meta.url), 'utf8');
const listenAt = src.indexOf('await startServer(app)');

describe('approval-lane gates are pre-listen', () => {
  it('startServer(app) is present exactly once', () => {
    expect(listenAt).toBeGreaterThan(0);
    expect(src.indexOf('await startServer(app)', listenAt + 1)).toBe(-1);
  });
  it('assertOperationSigningKey() runs BEFORE listen and never after', () => {
    const first = src.indexOf('assertOperationSigningKey();');
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(listenAt);
    expect(src.indexOf('assertOperationSigningKey();', listenAt)).toBe(-1);
  });
  it('the Redis approval-store install runs BEFORE listen and never after', () => {
    const first = src.indexOf('installRedisPendingOperationStore()');
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(listenAt);
    expect(src.indexOf('installRedisPendingOperationStore()', listenAt)).toBe(-1);
  });
});
