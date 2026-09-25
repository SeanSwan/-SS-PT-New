/**
 * gateHealth.producerless.test — "no producer is declared" is not "it did not run".
 * @module scripts/swan-brain-console/gateHealth.producerless.test
 *
 * WHY THIS IS A SEPARATE FILE FROM `gateHealth.test.mjs`
 * That suite pins one invariant: an absent, corrupt, stale or simulated result must never be
 * reported as `pass`. It is about what a MISSING result means for the status.
 *
 * This file is about a different question that the same missing result raises — WHOSE missing
 * result it is. `readGateHealth` originally returned one detail string for every absent file, and
 * `app/app-gates.mjs` rendered that as the headline "2 never ran". For `three-worlds-render` that
 * is false: CI produces it, uploads the artifact, and never commits it, so its absence here says
 * nothing whatever about whether it ran. For `engine-contract` no writer exists at all, so no
 * result can ever appear until one is defined. One sentence for both was Astra's round-15 K07.
 *
 * The two suites answer different questions and must be able to fail separately — the seventh
 * Rule 4 split in this subsystem, and the same reason as the sixth: the provenance rules and the
 * coherence rules do not belong in one file just because one reader emits both.
 *
 * The fix is deliberately a QUALIFICATION, not a status: `not_run` is still what the reader has,
 * and `summary.producerless` is a count of how many of those have no declared writer. Adding it to
 * `STATUSES` would double-count it in every partition check, which the second test here pins.
 *
 * Run: node --test scripts/swan-brain-console/gateHealth.producerless.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { readGateHealth, STATUSES } from './gateHealth.mjs';

/** Build a throwaway repo containing only the gate files a test names. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'gate-health-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return root;
}

/* ── round 15 (K07): a producerless gate is a different absence ───────────── */

test('RED — a gate with NO PRODUCER says so, rather than implying it did not run (K07)', () => {
  /*
   * Astra's K07: for a missing file the reader returned `not_run` and never consulted the contract,
   * so a gate whose contract declares NO WRITER AT ALL read exactly like a gate whose result is
   * merely not committed here — and `app/app-gates.mjs` turned that into the headline "2 never ran",
   * a claim about execution this reader cannot support.
   *
   * The distinction is not cosmetic. `three-worlds-render` IS produced, by CI, which uploads the
   * artifact and never commits it — so its absence says nothing about whether it ran. For
   * `engine-contract` no writer exists, so no result can EVER appear until one is defined. One
   * detail string for both was the defect.
   *
   * MUTATION: drop the `producerless` branch from the missing-file case. The detail assertions go
   * RED. MUTATION: stop counting `summary.producerless`. The last assertion goes RED.
   */
  const root = fixture({});
  try {
    const out = readGateHealth(root, { now: Date.now() });
    const engine = out.gates.find((g) => g.id === 'engine-contract');
    const render = out.gates.find((g) => g.id === 'three-worlds-render');
    assert.ok(engine && render, 'the gate registry changed — re-derive this test');

    // The status is unchanged: `not_run` is what the reader has, and the panel renders it.
    assert.equal(engine.status, 'not_run', 'a missing file is still not_run');
    assert.equal(engine.producerless, true, 'a producerless gate is not flagged as one');
    assert.match(engine.detail, /NO PRODUCER IS DECLARED/, 'the detail does not name the real gap');
    assert.doesNotMatch(engine.detail, /never ran/i, 'the detail claims the gate did not run');

    assert.equal(render.producerless, false, 'a gate WITH a producer was flagged producerless');
    assert.match(render.detail, /no result is committed/,
      'the detail no longer distinguishes "not committed here" from "no producer exists"');

    assert.equal(out.summary.producerless, 1,
      `summary.producerless is ${out.summary.producerless}; exactly one gate has no declared producer`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the producerless count does not disturb the status partition (K07)', () => {
  /*
   * `summary.producerless` is a QUALIFICATION, not a status: those gates are already counted under
   * `not_run`, because that is what the reader has. If it were added to `STATUSES` the partition
   * test would double-count and this suite's own B10 check would fail — so the separation is
   * asserted rather than assumed.
   *
   * MUTATION: add `producerless` to `STATUSES`. RED.
   */
  assert.ok(!STATUSES.includes('producerless'),
    'producerless became a status, so a gate with no producer is now counted twice');
  const root = fixture({});
  try {
    const out = readGateHealth(root, { now: Date.now() });
    const counted = STATUSES.reduce((n, s) => n + (out.summary[s] ?? 0), 0);
    assert.equal(counted, out.summary.total,
      `the statuses sum to ${counted} against a total of ${out.summary.total}`);
    assert.equal(out.summary.not_run, out.gates.length, 'every gate is missing, so all are not_run');
    assert.ok(out.summary.producerless >= 1, 'the producerless count vanished');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
