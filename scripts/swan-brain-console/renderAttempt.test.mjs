/**
 * renderAttempt.test — does the FENCE decide what gets published, and in what order?
 * @module scripts/swan-brain-console/renderAttempt.test
 *
 * WHY THIS FILE EXISTS (Astra round 13, H03)
 * Astra read `shot-diff.mjs` and found that the artifact is published only after the browser
 * work completes: the write sits below the `try/finally` that closes Chromium, so a screenshot
 * exception, an unreadable baseline or a launch failure leaves the process before reaching it.
 * After one successful run, a second attempt that dies leaves the FIRST run's green artifact on
 * disk — fresh, stamped `mode: "compare"` — and Gate Health reports PASS.
 *
 * Her regression, run here verbatim: "seed a green artifact, force the next screenshot to
 * throw, then read Gate Health." It is the first test below.
 *
 * THE ORDERING CLAIM IS TESTED FROM INSIDE THE RUN
 * `the in-progress artifact is published before the run is invoked` reads the artifact from
 * INSIDE the run thunk. That is the only way to observe the property that matters: it is not
 * enough that a killed attempt eventually leaves a non-green file, the previous green must stop
 * being the answer for the whole duration of the attempt. Asserting the final state alone would
 * pass for a fix that published the failure artifact in a `finally`.
 *
 * WHAT IS NOT TESTED HERE, AND WHY (the split is by SUBJECT, and it is a real one)
 * This file owns PUBLICATION: which document wins the artifact, in what order, and what happens
 * when a write is REFUSED — the fence's decisions. Most tests here drive `runAttempt` with an
 * INJECTED reader, which is how a refusal can be produced without winning a real race; only the
 * two tests that ask what the CONSOLE resolves need a file on disk.
 *
 * Its sibling `renderAttempt.artifact.test.mjs` owns CONTENT: what the failure document says,
 * what the documented limits are, and whether `shot-diff.mjs` is wired to this lifecycle at all.
 * The two fail differently — a fence defect publishes the WRONG document, a content defect
 * publishes the RIGHT document that says the wrong thing — and they are read by different people,
 * so they are separated rather than padded into one file that Rule 4 would obey only in letter.
 *
 * The browser half — that `measureFleet` throws when a screenshot fails — is not exercised in
 * either file. These suites prove the LIFECYCLE, which is where the defect was and which needs no
 * browser; the wiring is asserted in the sibling against the real source. A live crash run
 * remains UNVERIFIED, exactly as Astra recorded it.
 *
 * Run: node --test scripts/swan-brain-console/renderAttempt.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { readGateHealth, GATES } from './gateHealth.mjs';
import { buildRenderResult } from './renderResult.mjs';
import { summarize } from './baselineComparison.mjs';
import { runAttempt, attemptRecord, buildAttemptStart, fileWriter } from './renderAttempt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const NOW = Date.parse('2026-09-20T12:00:00Z');
const render = GATES.find((g) => g.id === 'three-worlds-render');

/** The artifact path the reader declares for this gate, under a throwaway repo root. */
function repoWithGreenArtifact() {
  const root = mkdtempSync(join(tmpdir(), 'render-attempt-'));
  const out = join(root, render.path);
  const results = [{ id: 'alpha', status: 'pass' }];
  fileWriter()(out, buildRenderResult({ results, summary: summarize(results), now: new Date(NOW) }));
  return { root, out };
}

/** What the console would show for the render gate, given a repo root. */
const statusAt = (root) => readGateHealth(root, { now: NOW }).gates.find((g) => g.id === render.id);

/* ── Astra's regression ───────────────────────────────────────────────────── */

test('RED — a failed rerun supersedes the previous green (Astra H03)', async () => {
  /*
   * Astra's exact scenario. Before the fix the second attempt threw, `main()` exited 2, and the
   * seeded green artifact was never touched — so this assertion failed with `pass`.
   *
   * MUTATION: remove the `publish(buildAttemptStart(...))` call, or move the failure publish
   * into a path that is not reached. This goes RED.
   */
  const { root, out } = repoWithGreenArtifact();
  assert.equal(statusAt(root).status, 'pass', 'premise: the seeded artifact is green');

  const attempt = await runAttempt({
    resultPath: out,
    write: fileWriter(),
    now: () => new Date(NOW),
    run: () => { throw new Error('screenshot timed out'); },
  });
  assert.equal(attempt.outcome, 'failed', 'the thunk threw and the attempt did not record it');

  const after = statusAt(root);
  assert.notEqual(after.status, 'pass', 'the previous run’s green survived a failed attempt');
  assert.equal(after.status, 'fail', `expected a failure, got ${after.status}: ${after.detail}`);
  rmSync(root, { recursive: true, force: true });
});

test('RED — the in-progress artifact is published BEFORE the run is invoked', async () => {
  /*
   * Read from inside the run. The property is not "a killed attempt ends up non-green" — a fix
   * that published the failure in a `finally` would satisfy that — it is "the previous green
   * stops being the answer for the entire duration of the attempt".
   *
   * This is the one test in this file that needs a real artifact on disk, because the claim is
   * about what the CONSOLE resolves mid-flight, and the console reads through `readGateHealth`.
   * Everything else here drives the fence with an injected reader, which is why the filesystem
   * dependency is confined to these two tests rather than spread across the suite.
   *
   * MUTATION: move the start publish to after `await run()`. This goes RED.
   */
  const { root, out } = repoWithGreenArtifact();
  let midFlight = null;

  await runAttempt({
    resultPath: out,
    write: fileWriter(),
    now: () => new Date(NOW),
    run: async () => {
      midFlight = statusAt(root);
      return { results: [], population: null };
    },
  });

  assert.notEqual(midFlight.status, 'pass', 'the old green was still the answer during the attempt');
  assert.equal(midFlight.status, 'not_evidence');
  assert.match(midFlight.detail, /in-progress/, 'the mid-flight artifact must name its state');
  rmSync(root, { recursive: true, force: true });
});

test('the start artifact is written before the run begins — order is the fix', async () => {
  // The same claim without a filesystem: a recording writer sees `in-progress`, then the run.
  // MUTATION: swap the two statements. This goes RED.
  const calls = [];
  await runAttempt({
    resultPath: '/tmp/ignored-by-this-test.json',
    write: (file, doc) => calls.push(doc.mode),
    now: () => new Date(NOW),
    run: async () => { calls.push('RUN'); return {}; },
  });
  assert.deepEqual(calls, ['in-progress', 'RUN']);
});


/* ── the boundaries that need no filesystem ──────────────────────────────── */

test('with no --result path nothing is published, and the run still happens', async () => {
  /*
   * `shot-diff.mjs` can be run without `--result` (a local look at the diff). There is then no
   * artifact to supersede, and a write must not happen — but the measurement must.
   *
   * MUTATION: drop the `if (resultPath)` guard in `publish`. This goes RED.
   */
  let ran = false;
  const attempt = await runAttempt({
    resultPath: null,
    write: () => { throw new Error('wrote an artifact when no --result path was given'); },
    now: () => new Date(NOW),
    run: async () => { ran = true; return { results: [], population: null }; },
  });
  assert.equal(ran, true, 'the run was skipped because there was no artifact path');
  assert.equal(attempt.outcome, 'complete');
  assert.ok(attempt.attemptId.length > 0, 'every attempt needs an identity');
});


/* ── the refused start (Astra round 16, L03) ──────────────────────────────── */

test('RED — a REFUSED start publish means the run NEVER RUNS (Astra L03)', async () => {
  /*
   * THE DEFECT WAS `value: await run()` UNCONDITIONALLY. The fence's refusal message was carried
   * in `superseded` and nothing branched on it, so a superseded attempt published its in-progress
   * document, had it REFUSED, and then launched the browser, compared the renders and wrote the
   * baseline anyway. Every side effect of an attempt whose evidence had already been declared
   * stale happened regardless — and the baseline write is the expensive, irreversible one.
   *
   * NO FILESYSTEM IS NEEDED, AND THAT IS THE POINT. `publishIfNewest` reads through `read` and
   * writes through `write`, both injected; so the fence can be made to refuse by handing it a
   * reader that reports a NEWER attempt already on the artifact. Driving this on a real file would
   * require winning a genuine race, which is the same mistake as testing a lock by sleeping.
   *
   * WHAT THIS ASSERTS, AND WHY EACH HALF MATTERS:
   *   - the run was NOT invoked (`ran === false`) — the side effects did not happen;
   *   - there is NO VALUE (`value === null`) — a caller cannot mistake it for a measurement;
   *   - the outcome is `'not-started'`, NOT `'failed'` — a failed attempt MEASURED and failed, and
   *     reporting this as a failure would publish a failure artifact over the newer attempt's
   *     state, which is the K01 defect one level up. Exit code 3 exists for exactly this.
   *
   * MUTATION: restore `outcome: 'complete', value: await run()` on the refused path. This goes RED
   * on the first two assertions while the outcome assertion still passes — which is why the
   * assertions are ordered run-first: the side effect is the harm, the label is the reporting.
   */
  const refusals = [];
  let invoked = false;
  const attempt = await runAttempt({
    resultPath: '/tmp/ignored-by-this-test.json',
    now: () => new Date(NOW),
    // A reader that always finds a newer attempt: the fence refuses every write this attempt makes.
    read: () => ({
      attempt: { id: 'the-winner', startedAt: new Date(NOW + 60000).toISOString(), state: 'in-progress' },
      mode: 'not_evidence',
    }),
    write: (file, doc) => refusals.push(doc.mode),
    run: async () => { invoked = true; return { results: [], population: null }; },
  });

  assert.equal(invoked, false, 'a SUPERSEDED attempt still ran — its side effects happened for nothing');
  assert.equal(attempt.ran, false, 'the outcome claims the run happened');
  assert.equal(attempt.value, null, 'a not-started attempt carried a value a caller could mistake for a measurement');
  assert.equal(attempt.outcome, 'not-started',
    'a refused start was reported as a measurement rather than as no attempt at all');
  assert.match(String(attempt.superseded), /superseded/,
    'the refusal reason was dropped, so the caller cannot say WHY nothing ran');
  /*
   * AND THE WRITE NEVER HAPPENED — `refusals` is EMPTY, not `['in-progress']`.
   *
   * This assertion was written the other way round first, expecting the refused write to be
   * attempted and recorded. It is not: `publishIfNewest` returns the defect BEFORE calling
   * `write`, so a refused publication is never even offered to the filesystem. Asserting the
   * attempted-write shape would have demanded a change to correct code — an empty list is the
   * stronger claim, because it says the artifact was not touched at all rather than touched
   * and rejected.
   */
  assert.deepEqual(refusals, [],
    'a refused start publish still reached the writer — the fence is being applied after the write');
});

test('a start publish that SUCCEEDS still runs the attempt — the refusal path is not the whole story', async () => {
  /*
   * The other half of L03, and without it the fix above is indistinguishable from "never run
   * anything". A fence that refused unconditionally would satisfy the previous test perfectly.
   *
   * MUTATION: make `publish` always return a refusal. This goes RED.
   */
  let invoked = false;
  const attempt = await runAttempt({
    resultPath: '/tmp/ignored-by-this-test.json',
    now: () => new Date(NOW),
    read: () => null, // nothing is published yet, so the fence permits the start
    write: () => null,
    run: async () => { invoked = true; return { results: [], population: null }; },
  });

  assert.equal(invoked, true, 'an attempt with a free artifact did not run');
  assert.equal(attempt.ran, true);
  assert.equal(attempt.outcome, 'complete');
  assert.notEqual(attempt.value, null, 'a completed attempt delivered no value');
});

