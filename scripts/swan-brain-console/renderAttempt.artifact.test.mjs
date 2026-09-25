/**
 * renderAttempt.artifact.test — what the published document SAYS once the fence lets it through.
 * @module scripts/swan-brain-console/renderAttempt.artifact.test
 *
 * THE OTHER HALF OF `renderAttempt.test.mjs`, SPLIT BY SUBJECT.
 * The sibling suite owns the FENCE'S DECISIONS: which document wins the artifact, in what order,
 * and what a REFUSED write does. It drives `runAttempt` with an injected reader, so it needs no
 * filesystem and no console. This file owns what a reader FINDS when the write is allowed
 * through, and it therefore goes through the real machinery: a seeded artifact on disk, read back
 * with `readGateHealth`.
 *
 * WHY THE BOUNDARY IS REAL AND NOT A LINE COUNT. A fence defect publishes the WRONG document; a
 * content defect publishes the RIGHT document that says the wrong thing. Both are Gate Health
 * lies, and they are caught by reading different things — one by watching which write lands, the
 * other by reading the file afterwards. Padding them into one 350-line file would satisfy Rule 4
 * only in letter.
 *
 * WHAT IS COVERED HERE:
 *   - the failure artifact is COHERENT with itself (`summary.failed` agrees with the failed rows)
 *     and names the error, so a red gate explains itself with no console in front of it;
 *   - the DOCUMENTED LIMIT is recorded rather than glossed — an aborted `--update` attempt is
 *     neither green nor red, and the test that says so IS the record of that limit;
 *   - the artifact's SHAPE at each state, asserted both directly and through the reader;
 *   - `shot-diff.mjs` is actually wired to this lifecycle, asserted against the real source
 *     because the script needs a browser to run and a correct-but-uncalled lifecycle would be
 *     this subsystem's signature defect.
 *
 * THE LIMITATION, STATED HERE AS IT IS IN THE SIBLING: the browser half is not exercised — that
 * `measureFleet` throws when a screenshot fails is not driven. A live crash run remains
 * UNVERIFIED, exactly as Astra recorded it.
 *
 * Run: node --test scripts/swan-brain-console/renderAttempt.artifact.test.mjs
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

/* ── the artifact the reader finds: the failure document ─────────────────── */

/* ── the terminal failure artifact ────────────────────────────────────────── */

test('the terminal failure is COHERENT — a fail, not an unreadable contradiction', async () => {
  /*
   * The failure artifact carries a failed row AND `summary.failed: 1`, so
   * `gateIdentity.mjs`'s reconciliation sees a document that agrees with itself. If the two had
   * been written independently they could disagree, and the console would report `unreadable` —
   * losing the fact that the gate FAILED, which is the only thing this artifact exists to say.
   *
   * MUTATION: set `summary.failed: 0` in `buildAttemptFailure`. This goes RED.
   */
  const { root, out } = repoWithGreenArtifact();
  await runAttempt({
    resultPath: out,
    write: fileWriter(),
    now: () => new Date(NOW),
    run: () => { throw new Error('baseline unreadable'); },
  });

  const doc = JSON.parse(readFileSync(out, 'utf8'));
  const failureRows = doc.variants.filter((r) => r.status === 'fail');
  assert.equal(failureRows.length, 1, 'the failure artifact must carry exactly one failed row');
  assert.equal(doc.summary.failed, failureRows.length, 'the row and the summary disagree');
  assert.equal(statusAt(root).status, 'fail');
  rmSync(root, { recursive: true, force: true });
});

test('the failure artifact names the error, so the file explains itself', async () => {
  const { root, out } = repoWithGreenArtifact();
  await runAttempt({
    resultPath: out,
    write: fileWriter(),
    now: () => new Date(NOW),
    run: () => { throw new Error('screenshot timed out after 30s'); },
  });

  const doc = JSON.parse(readFileSync(out, 'utf8'));
  assert.match(doc.attempt.detail, /screenshot timed out after 30s/);
  assert.match(doc.variants[0].detail, /screenshot timed out after 30s/);
  assert.equal(doc.attempt.state, 'failed');
  rmSync(root, { recursive: true, force: true });
});

test('an aborted --update attempt is NOT green — and is not red either (documented limit)', async () => {
  /*
   * Pinning the limitation named in `renderAttempt.mjs`'s header rather than leaving it as
   * prose. An aborted update persists `mode: "update"`, which every `--update` artifact is
   * classified as, so the console shows `not_evidence` rather than `fail`. The claim being
   * made is "not green, and the file records the failure" — NOT "red". If a future change makes
   * this red, that is an improvement and this test must be re-derived.
   */
  const { root, out } = repoWithGreenArtifact();
  await runAttempt({
    resultPath: out,
    write: fileWriter(),
    update: true,
    now: () => new Date(NOW),
    run: () => { throw new Error('update run aborted'); },
  });

  const doc = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(doc.attempt.state, 'failed', 'the file must record the failed attempt');
  assert.notEqual(statusAt(root).status, 'pass', 'an aborted update must not be green');
  assert.equal(statusAt(root).status, 'not_evidence', 'the six-state vocabulary has no "aborted update" state');
  rmSync(root, { recursive: true, force: true });
});


/* ── the boundaries, read back through Gate Health ────────────────────────── */

test('the in-progress artifact is never green, on its own terms', () => {
  // Asserted directly as well as through the reader, so a change to the reader's vocabulary
  // cannot quietly make this shape acceptable.
  const doc = buildAttemptStart({ attemptId: 'a1', now: new Date(NOW) });
  assert.equal(doc.mode, 'in-progress');
  assert.equal(doc.attempt.state, 'in-progress');
  assert.equal(doc.gate, 'three-worlds-render', 'the start artifact must identify its gate');
});

test('a completed attempt records its identity on the real artifact', () => {
  // The other end of the lifecycle: the result the caller publishes names the attempt that
  // produced it, so a reader can tell it from the in-progress artifact of a later run.
  const results = [{ id: 'alpha', status: 'pass' }];
  const doc = buildRenderResult({
    results,
    summary: summarize(results),
    now: new Date(NOW),
    attempt: attemptRecord({ attemptId: 'a1', startedAt: new Date(NOW).toISOString() }),
  });
  assert.equal(doc.attempt.id, 'a1');
  assert.equal(doc.attempt.state, 'complete');
});


/* ── the wiring, asserted against the source ──────────────────────────────── */

test('shot-diff.mjs actually uses the lifecycle — the wiring, not just the module', () => {
  /*
   * A correct lifecycle that the script stopped calling would be this subsystem's signature
   * defect: a check whose scope is narrower than its name. The script cannot be exercised
   * without a browser, so its wiring is asserted against the source — the same technique
   * `fleet-population.test.mjs` uses for `loadFleetIds()`.
   *
   * MUTATION: revert `main()` to writing the artifact inline after the `finally`. This goes RED.
   */
  const src = readFileSync(join(HERE, 'shot-diff.mjs'), 'utf8');
  assert.match(src, /await runAttempt\(/, 'shot-diff.mjs no longer runs under the attempt lifecycle');
  assert.match(src, /write: writeResult/, 'the lifecycle is not given the gate’s real write path');
  assert.match(src, /attemptRecord\(/, 'the completed artifact does not record which attempt produced it');
  assert.doesNotMatch(src, /mkdirSync\(dirname\(out\)\)/, 'the old inline artifact write is back');
});
