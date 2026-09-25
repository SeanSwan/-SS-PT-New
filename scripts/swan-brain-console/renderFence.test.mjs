/**
 * renderFence.test — may an attempt publish over evidence that is NEWER than it is?
 * @module scripts/swan-brain-console/renderFence.test
 *
 * WHY THIS FILE IS SEPARATE FROM `renderAttempt.test.mjs`
 * Two questions, and only the first was asked until round 14. `renderAttempt.test.mjs` asks
 * whether a failed rerun leaves the PREVIOUS green authoritative — a question about ORDER in a
 * serial run. This file asks whether an attempt that has been SUPERSEDED can still publish — a
 * question about CONCURRENCY, and the answer was yes until `publicationDefect` existed.
 *
 * Astra round 14 (J02) reproduced both schedules with controlled promises:
 *
 *     A starts → B starts → B fails → A finishes and publishes   => PASS from attempt A
 *     C starts → D starts → C finishes and publishes (D running) => PASS from attempt C
 *
 * The lifecycle recorded `attemptId` but never consulted it, so publication was unconditional
 * and H03's supersession held only for runs that happened to be serial. Both schedules are the
 * first two tests below, executed against the shipped lifecycle and the shipped publish path.
 *
 * THE LIMITATION THIS FILE DOES NOT CLAIM AWAY
 * The fence is a read-then-write. Within one process they cannot interleave — there is no `await`
 * between them — but two separate PROCESSES whose windows overlap can still land out of order.
 * Closing that needs OS-level locking, which this subsystem does not have. The tests here prove
 * the fence, not mutual exclusion, and the last test asserts that the limitation is still
 * DISCLOSED in the module rather than quietly dropped.
 *
 * Run: node --test scripts/swan-brain-console/renderFence.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { readGateHealth, GATES } from './gateHealth.mjs';
import { buildRenderResult } from './renderResult.mjs';
import { summarize } from './baselineComparison.mjs';
import {
  runAttempt, attemptRecord, fileWriter, publishIfNewest, publicationDefect,
} from './renderAttempt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const NOW = Date.parse('2026-09-20T12:00:00Z');
const render = GATES.find((g) => g.id === 'three-worlds-render');
const iso = (ms) => new Date(ms).toISOString();

/** A throwaway repo whose render artifact is a green comparison with NO `attempt` field. */
function seeded() {
  const root = mkdtempSync(join(tmpdir(), 'render-fence-'));
  const out = join(root, render.path);
  const results = [{ id: 'alpha', status: 'pass' }];
  fileWriter()(out, buildRenderResult({ results, summary: summarize(results), now: new Date(NOW) }));
  return { root, out };
}

const read = (out) => JSON.parse(readFileSync(out, 'utf8'));
const statusAt = (root) => readGateHealth(root, { now: NOW }).gates.find((g) => g.id === render.id);
const tick = () => new Promise((r) => { setTimeout(r, 5); });

/** What `main()` publishes on success — the same builder, the same attempt record. */
function successDoc(attempt) {
  const results = [{ id: 'alpha', status: 'pass' }];
  return buildRenderResult({
    results,
    summary: summarize(results),
    now: new Date(NOW),
    attempt: attemptRecord({ attemptId: attempt.attemptId, startedAt: attempt.startedAt }),
  });
}

/* ── Astra's two schedules ────────────────────────────────────────────────── */

test('RED — an older attempt cannot overwrite a newer FAILURE (J02)', async () => {
  /*
   * Schedule 1. The previous green is replaced by B's failure, and A — which started first —
   * must not put its success back on top of it.
   *
   * MUTATION: publish unconditionally (drop the fence from `publishIfNewest`). The `refused`
   * assertion and the `attempt.id === 'B'` assertion both go RED.
   */
  const { root, out } = seeded();
  const write = fileWriter();

  let releaseA;
  const gateA = new Promise((res) => { releaseA = res; });
  const aPromise = runAttempt({
    resultPath: out, write, attemptId: 'A', run: () => gateA, now: () => new Date(NOW),
  });
  await tick();

  const b = await runAttempt({
    resultPath: out,
    write,
    attemptId: 'B',
    now: () => new Date(NOW + 1000),
    run: () => { throw new Error('B died'); },
  });
  assert.equal(b.outcome, 'failed', 'premise: B failed');
  assert.equal(b.superseded, null, 'premise: B was the newest attempt, so it published');
  assert.equal(read(out).attempt.id, 'B', 'premise: B owns the artifact');

  releaseA({ results: [{ id: 'alpha', status: 'pass' }] });
  const a = await aPromise;
  const refused = publishIfNewest({ resultPath: out, write, doc: successDoc(a) });

  assert.ok(refused, 'the superseded attempt A published its green over B’s failure');
  assert.match(refused, /NEWER/);
  assert.equal(read(out).attempt.id, 'B', 'B’s failure was overwritten');
  assert.equal(statusAt(root).status, 'fail', 'the console read A’s green while B’s failure was newest');
});

test('RED — an older attempt cannot publish while a newer attempt is RUNNING (J02)', async () => {
  /*
   * Schedule 2, and the one that matters most: D has started and has not finished. Its
   * in-progress artifact is what stops the console answering with the previous green, and C —
   * started earlier — must not replace it with a completed result that describes an older run.
   *
   * MUTATION: publish unconditionally. All three assertions go RED.
   */
  const { root, out } = seeded();
  const write = fileWriter();

  let releaseD;
  const gateD = new Promise((res) => { releaseD = res; });
  const dPromise = runAttempt({
    resultPath: out, write, attemptId: 'D', run: () => gateD, now: () => new Date(NOW + 1000),
  });
  await tick();
  assert.equal(read(out).attempt.state, 'in-progress', 'premise: D has published its start');

  const refused = publishIfNewest({
    resultPath: out,
    write,
    doc: buildRenderResult({
      results: [{ id: 'alpha', status: 'pass' }],
      summary: summarize([{ id: 'alpha', status: 'pass' }]),
      now: new Date(NOW),
      attempt: attemptRecord({ attemptId: 'C', startedAt: iso(NOW) }),
    }),
  });

  assert.ok(refused, 'the older attempt C published over a newer in-progress attempt');
  assert.equal(read(out).attempt.id, 'D', 'D’s in-progress artifact was overwritten');
  assert.equal(statusAt(root).status, 'not_evidence', 'the console answered with C’s stale green');

  releaseD({ results: [] });
  await dPromise;
});

/* ── the fence must not become a refusal of everything ────────────────────── */

test('the NEWEST attempt publishes normally (J02)', async () => {
  // The failure mode the cure invites: a fence that refuses real publications. MUTATION: invert
  // the comparison in `publicationDefect`. RED.
  const { root, out } = seeded();
  const write = fileWriter();
  const refused = publishIfNewest({
    resultPath: out,
    write,
    doc: buildRenderResult({
      results: [{ id: 'alpha', status: 'pass' }],
      summary: summarize([{ id: 'alpha', status: 'pass' }]),
      now: new Date(NOW + 5000),
      attempt: attemptRecord({ attemptId: 'E', startedAt: iso(NOW + 5000) }),
    }),
  });
  assert.equal(refused, null, `the newest attempt was refused: ${refused}`);
  assert.equal(read(out).attempt.id, 'E');
  assert.equal(statusAt(root).status, 'pass');
});

test('an artifact from before the lifecycle is still replaceable (J02)', () => {
  /*
   * Artifacts written before round 14 carry no `attempt` field. Refusing to publish over one
   * would break the gate rather than protect it, so absence is not a fence. MUTATION: refuse when
   * the on-disk artifact has no attempt id. RED.
   */
  const { out } = seeded();
  assert.equal(read(out).attempt, undefined, 'premise: the seeded artifact predates the lifecycle');
  const refused = publishIfNewest({
    resultPath: out,
    write: fileWriter(),
    doc: buildRenderResult({
      results: [{ id: 'alpha', status: 'pass' }],
      summary: summarize([{ id: 'alpha', status: 'pass' }]),
      now: new Date(NOW + 5000),
      attempt: attemptRecord({ attemptId: 'F', startedAt: iso(NOW + 5000) }),
    }),
  });
  assert.equal(refused, null, 'a pre-lifecycle artifact blocked publication');
  assert.equal(read(out).attempt.id, 'F');
});

test('publicationDefect is ONE monotonic comparison (J02)', () => {
  // Pinned as a unit so the fence's rule is readable in one place: only a STRICTLY newer start
  // wins, and anything unreadable is not a fence.
  const at = (t, id) => ({ attempt: { id, startedAt: t } });
  assert.equal(publicationDefect(null, at(iso(NOW), 'a')), null, 'nothing on disk');
  assert.equal(publicationDefect({}, at(iso(NOW), 'a')), null, 'no attempt field on disk');
  assert.equal(publicationDefect(at(iso(NOW), 'a'), at(iso(NOW), 'b')), null, 'same instant');
  assert.equal(publicationDefect(at(iso(NOW), 'a'), at(iso(NOW + 1), 'b')), null, 'newer wins');
  assert.match(publicationDefect(at(iso(NOW + 1), 'b'), at(iso(NOW), 'a')), /NEWER/);
  assert.equal(publicationDefect(at('garbage', 'b'), at(iso(NOW), 'a')), null, 'unparseable stamp');
});

/* ── the wiring, and the disclosure ───────────────────────────────────────── */

test('shot-diff.mjs publishes its SUCCESS through the fence, and reports a refusal', () => {
  /*
   * The success publish lives in `main()`, not in the lifecycle, so it is the one call site the
   * module cannot cover by itself. Asserted against the source, the technique
   * `fleet-population.test.mjs` uses for `loadFleetIds()`.
   *
   * MUTATION: revert to `writeResult(resultPath, buildRenderResult({ … }))`. The first and third
   * assertions go RED.
   */
  const src = readFileSync(join(HERE, 'shot-diff.mjs'), 'utf8');
  assert.match(src, /publishIfNewest\(\{/, 'the success publish bypasses the fence');
  assert.match(src, /refusing to publish/, 'a fenced publish is not reported to the operator');
  assert.doesNotMatch(src, /writeResult\(resultPath,/, 'the unfenced success write is back');
});

test('the cross-process limitation is DISCLOSED, not implied away (J02)', () => {
  /*
   * A guard built on a claim the code cannot support is this repository's recurring defect. The
   * fence cannot serialize two processes, and saying so is part of shipping it: if this assertion
   * fails, the disclosure was edited out and the module now claims more than it does.
   */
  const src = readFileSync(join(HERE, 'renderAttempt.mjs'), 'utf8');
  assert.match(src, /does not[\s\S]{0,12}LOCK it/,
    'the cross-process limitation is no longer disclosed in renderAttempt.mjs');
  assert.match(src, /OS-level locking/, 'the named remedy for the residual race was removed');
});

/* ── the baseline generation moved out, and this is why ───────────────────── */

/*
 * THE J03 TEST USED TO LIVE HERE AND IT WAS THE DEFECT ASTRA NAMED IN ROUND 15 (K05).
 *
 * It asserted that `fleetMeasure.mjs` contained `staged.push(...)` after the loop and a publish
 * loop after that — source text, not behaviour. Astra executed three mutations that delete the
 * behaviour while leaving every marker in place, and the callback stayed green for all three:
 *
 *     - `writeFileSync(file, shot)` added immediately after `staged.push(...)`  => mixed generation
 *     - the refusal throw replaced by `void plan.refusal`                      => subset update writes
 *     - `results.push(...plan.rows)` replaced by `void plan.rows`              => failure row vanishes
 *
 * A guard that reads a file cannot tell a rule from a comment, and this file's whole subject is
 * ORDERING, so the ordering guard belongs where the ordering can be EXECUTED. It now drives
 * `measureFleet` through injected browser and filesystem boundaries, in `fleetMeasure.test.mjs`.
 * Removed rather than kept alongside, because two guards for one claim where one of them cannot
 * fail is worse than one that can.
 */

test('the FENCE itself adds no sidecar, lock file or temp path', () => {
  /*
   * `publicationDefect` is a comparison over two documents. This pins that: after a publish the
   * throwaway repo contains exactly the artifact and nothing else.
   *
   * ROUND 15 (Astra K01) — THE COMMENT HERE USED TO ARGUE THAT A LOCK FILE "would be a worse
   * failure mode than the race it closes". That argument lost: Astra executed three schedules the
   * fence does not close, and the decision was to add cross-process synchronization anyway. So this
   * test now claims something narrower and true — that the FENCE is not the thing that creates a
   * file. The lock does, deliberately, and `attemptLock.test.mjs` asserts it is removed on every
   * path including the red ones. The distinction matters because the two mechanisms have different
   * failure modes and only one of them can leak a file.
   *
   * MUTATION: implement the fence with a lock file and no cleanup. RED.
   */
  const { root, out } = seeded();
  const refused = publishIfNewest({
    resultPath: out,
    write: fileWriter(),
    doc: buildRenderResult({
      results: [{ id: 'alpha', status: 'pass' }],
      summary: summarize([{ id: 'alpha', status: 'pass' }]),
      now: new Date(NOW + 5000),
      attempt: attemptRecord({ attemptId: 'G', startedAt: iso(NOW + 5000) }),
    }),
  });
  assert.equal(refused, null, 'premise: the publish succeeded');
  // The artifact's own directory, so a sidecar written BESIDE it is caught. A recursive listing
  // would also return the directories on the way down, which is not what is being claimed.
  const beside = readdirSync(join(root, dirname(render.path)));
  assert.deepEqual(beside, ['three-worlds-render.json'],
    `the fence left extra files beside the artifact: ${beside.join(', ')}`);
  rmSync(root, { recursive: true, force: true });
});
