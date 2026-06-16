/**
 * Tests for the fusion retention prune selector.
 * Run: node --test scripts/fusion-prune.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findStaleRuns, RETENTION_DAYS } from './fusion-prune.mjs';

const DAY = 24 * 60 * 60 * 1000;

test('findStaleRuns keeps recent runs, drops aged ones', () => {
  const now = Date.parse('2026-06-15T00:00:00Z');
  const entries = [
    { name: 'fresh', mtimeMs: now - 1 * DAY },
    { name: 'edge-89d', mtimeMs: now - 89 * DAY },
    { name: 'edge-91d', mtimeMs: now - 91 * DAY },
    { name: 'ancient', mtimeMs: now - 400 * DAY },
  ];
  const stale = findStaleRuns(entries, now, 90);
  assert.deepEqual(stale.sort(), ['ancient', 'edge-91d']);
});

test('findStaleRuns returns nothing for an all-fresh set', () => {
  const now = Date.parse('2026-06-15T00:00:00Z');
  const entries = [{ name: 'a', mtimeMs: now - 5 * DAY }, { name: 'b', mtimeMs: now }];
  assert.deepEqual(findStaleRuns(entries, now, 90), []);
});

test('default retention is 90 days (Sean 2026-06-15)', () => {
  assert.equal(RETENTION_DAYS, 90);
});
