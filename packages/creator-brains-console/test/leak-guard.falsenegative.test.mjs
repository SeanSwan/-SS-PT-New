/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/leak-guard.falsenegative.test.mjs
 * PURPOSE: Pin the leak detector's FALSE NEGATIVES (hostile round 2, H2).
 * PART OF: Creator Brains Console (LANE B invariant; 12-hy4-review-round2)
 * SLICE: S0
 * ============================================================================
 *
 * WHY A FALSE-NEGATIVE SUITE EXISTS AT ALL.
 *
 * The existing META test proves the detector catches a RENAMED leak
 * (`items: [{ tStartMs, text }]`) while sparing contract prose. That is the
 * reassuring direction, and it is the one a builder writes. But a boundary guard
 * is only as good as what gets THROUGH it, and until 2026-09-18 nothing tested
 * that direction. A hostile probe found **8 of 11** real leaks escaping,
 * including the most important one: any long transcript under any key name that
 * was not in a four-name allowlist.
 *
 * The detector's own docstring claimed it "does not depend on the leaker
 * choosing a predictable name." For prose that was simply false — the check only
 * fired for `text|body|content|caption`. `notes`, `detail`, `snippet` and any
 * nested key walked straight through. This suite exists so that claim is now
 * backed by tests rather than by prose.
 *
 * THE TWO FIXES UNDER TEST, AND THE FALSE POSITIVE THEY ALMOST SHIPPED.
 *
 *  1. A size gate: any single string > 2000 chars is a leak under ANY key name.
 *     Per-string, not aggregated — `backlog.lines` is an array of short lines.
 *  2. Cue detection broadened to renamed timing keys AND to a single cue object
 *     that is not wrapped in an array.
 *
 * Fix 2 initially demanded only that a timing KEY be present, which immediately
 * condemned `throttle` — it carries `{ ..., start, text }` and `throttle.start`
 * is an ISO timestamp. Requiring the timing VALUE to be a NUMBER is what
 * separates a caption cue (numeric ms offset) from an operator object
 * (formatted string). That distinction is itself pinned below.
 *
 * @module creator-brains-console/test/leak-guard.falsenegative
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertNoTranscriptFields } from './leak-guard.mjs';

/** Assert that this payload IS rejected as a LANE B leak. */
function assertCaught(payload, label) {
  assert.throws(
    () => assertNoTranscriptFields(payload),
    /LANE B SHAPE LEAK/,
    `ESCAPED (false negative): ${label}`,
  );
}

/** Assert that this payload is ALLOWED through (guards against over-blocking). */
function assertAllowed(payload, label) {
  assert.doesNotThrow(
    () => assertNoTranscriptFields(payload),
    `FALSE POSITIVE: ${label}`,
  );
}

test('H2: a transcript under any unlisted key name is still a leak', () => {
  const bulk = 'x'.repeat(50_000);
  for (const key of ['notes', 'detail', 'snippet', 'summary', 'raw', 'payload', 'blob']) {
    assertCaught({ [key]: bulk }, `${key} carrying 50k chars`);
  }
});

test('H2: a leak nested under benign keys is still found', () => {
  assertCaught(
    { brain: { meta: { payload: 'y'.repeat(40_000) } } },
    'deeply nested bulk text',
  );
});

test('H2: renamed timing keys do not defeat cue detection', () => {
  for (const timeKey of ['begin', 'offset', 'start', 'tStartMs', 'ms', 't']) {
    assertCaught(
      { items: [{ [timeKey]: 0, text: 'hello world' }] },
      `cue array with timing key '${timeKey}'`,
    );
  }
});

test('H2: a single cue object (not an array) is a leak', () => {
  assertCaught({ cue: { tStartMs: 0, text: 'hello' } }, 'single cue under `cue`');
  assertCaught({ segment: { start: 5, text: 'hello' } }, 'single cue under `segment`');
});

test('H2 (guard): throttle.start is an ISO STRING and must not be read as cue timing', () => {
  // The false positive this fix very nearly shipped. If the detector ever goes
  // back to matching timing keys without checking the value is numeric, this
  // contract-pinned object becomes a "leak" and the status board breaks.
  assertAllowed(
    { active: false, kind: null, until: null, start: '2026-09-18T00:00:00.000Z', text: 'none — traffic is allowed' },
    'throttle object with ISO-string start',
  );
});

test('H2 (guard): genuine contract prose and short arrays still pass', () => {
  assertAllowed({ throttle: { text: 'none — traffic is allowed' } }, 'throttle.text');
  assertAllowed({ backlog: { lines: ['3 videos pending', '1 creator disabled'] } }, 'backlog.lines');
  assertAllowed({
    hits: [{ claimId: 'a', keyPhrase: 'a short claim', tStartMs: 1200, watchUrl: 'https://youtu.be/x?t=1' }],
  }, 'LANE C claim rows');
});
