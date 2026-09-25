/**
 * stageReport — the gate's verdict predicate.
 * @module scripts/swan-brain-console/stageReport.test
 *
 * WHY THIS FILE EXISTS (round 21, 2026-09-25 — sable)
 *
 * `classifyStageOutput` decides whether the gate says "the product is red" or "I could not tell you
 * about the product". That is the single most consequential branch in the console's verify chain,
 * and until this file it had no test at all: the predicate lived inline inside `run()`'s closure,
 * where no test could reach it.
 *
 * The case in the middle of this file — `a repeated phrase does not turn a blocker into a product
 * failure` — is the defect the review found. It is written as an assertion rather than a comment so
 * that reintroducing the occurrence-counting form goes red instead of quietly agreeing with itself.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStageOutput, countBlockedFiles, countBlockedTests } from './stageReport.mjs';

/*
 * The real measured shape, copied from a live run of
 * `node --test scripts/swan-brain-console/mcp/server.test.mjs` in this sandbox: the blocker is
 * thrown at import time, node prefixes the child's stderr with `# `, and the file is reported as
 * one failing test.
 */
const REAL_BLOCKED = [
  'TAP version 13',
  '# file:///C:/repo/scripts/swan-brain-console/mcp/server.test.mjs:101',
  '#   throw new Error(',
  '#         ^',
  '# Error: SPAWN-UNAVAILABLE: the MCP server child process could not be started (EBUSY).',
  '#     at file:///C:/repo/scripts/swan-brain-console/mcp/server.test.mjs:101:9',
  '# Node.js v22.22.2',
  '# SPAWN-BLOCKER: C:/repo/scripts/swan-brain-console/mcp/server.test.mjs',
  '# Subtest: scripts\\swan-brain-console\\mcp\\server.test.mjs',
  'not ok 1 - scripts\\swan-brain-console\\mcp\\server.test.mjs',
  '  ---',
  "  error: 'test failed'",
  '  ...',
  '1..1',
  '# tests 1',
  '# suites 0',
  '# pass 0',
  '# fail 1',
].join('\n');

describe('classifyStageOutput — a stage that could not RUN is not a stage that FAILED', () => {
  test('every failing test is a blocker -> blocked', () => {
    assert.equal(classifyStageOutput(REAL_BLOCKED), 'blocked');
  });

  test('two blocked files against `# fail 2` -> blocked', () => {
    const out = [
      '# SPAWN-BLOCKER: C:/repo/a.test.mjs',
      '# SPAWN-BLOCKER: C:/repo/b.test.mjs',
      'not ok 1 - a', 'not ok 2 - b',
      '# fail 2',
    ].join('\n');
    assert.equal(classifyStageOutput(out), 'blocked');
  });

  test('a blocker alongside a real assertion failure -> failed, not blocked', () => {
    // Astra's round-18 condition: a genuine failure must never hide behind a blockage.
    const out = [
      '# SPAWN-BLOCKER: C:/repo/a.test.mjs',
      'not ok 1 - a', 'not ok 2 - a real assertion',
      '# fail 2',
    ].join('\n');
    assert.equal(classifyStageOutput(out), 'failed');
  });

  test('no blocker at all -> null, and the caller falls through to FAILED', () => {
    const out = ['not ok 1 - a real assertion', '# fail 1'].join('\n');
    assert.equal(classifyStageOutput(out), null);
  });

  test('a blocker with no parseable `# fail` -> null, never a guess', () => {
    const out = '# SPAWN-BLOCKER: C:/repo/a.test.mjs\noutput was truncated';
    assert.equal(classifyStageOutput(out), null);
  });

  test('a repeated phrase does not turn a blocker into a product failure', () => {
    /*
     * THE ROUND-21 DEFECT, PINNED. The old predicate counted `SPAWN-UNAVAILABLE` occurrences and
     * compared them to `# fail N`. Here the phrase appears twice while one test failed, so the old
     * form returned "not equal -> FAILED" and reported a purely environmental stage as a product
     * failure. The marker line appears once, so the correct answer is 'blocked'.
     */
    const out = [
      '# Error: SPAWN-UNAVAILABLE: child could not be started (EBUSY).',
      '# note: SPAWN-UNAVAILABLE is an environment condition, not a defect.',
      '# SPAWN-BLOCKER: C:/repo/a.test.mjs',
      'not ok 1 - a',
      '# fail 1',
    ].join('\n');
    assert.equal(classifyStageOutput(out), 'blocked');

    // and the old form, kept here so the difference is visible rather than asserted:
    const oldBlocked = (out.match(/SPAWN-UNAVAILABLE/g) ?? []).length;
    assert.equal(oldBlocked, 2, 'the phrase really does appear twice in this input');
    assert.notEqual(oldBlocked, 1, 'which is exactly why counting it disagreed with `# fail 1`');
  });
});

describe('countBlockedFiles — one line, one file', () => {
  test('counts lines, not substrings', () => {
    const out = '# SPAWN-BLOCKER: a\n# SPAWN-BLOCKER: b\n# SPAWN-BLOCKER: c';
    assert.equal(countBlockedFiles(out), 3);
  });

  test('a marker inside a longer diagnostic line still counts', () => {
    assert.equal(countBlockedFiles('#  SPAWN-BLOCKER: a'), 1);
  });

  test('an unprefixed mention is not a marker', () => {
    // The emitter writes through console.error, which node prefixes with `# `; a bare mention in
    // prose is not a blocked file and must not inflate the count.
    assert.equal(countBlockedFiles('SPAWN-BLOCKER: a'), 0);
  });
});

/* ── the second blocker class: the sandbox's spent delete budget ─────────────── */

const DELETE_BLOCKED_TEST = [
  'not ok 78 - RED — a REAL busy process exits 3, publishes nothing',
  '  ---',
  '  duration_ms: 4096.3071',
  "  error: '[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {\"count\":50,\"threshold\":50}'",
  "  code: 'ERR_TEST_FAILURE'",
  '  ...',
].join('\n');

describe('countBlockedTests — two blocker shapes, one unit', () => {
  test('a spawn marker and a delete-blocked test are both counted', () => {
    const out = [
      '# SPAWN-BLOCKER: C:/repo/mcp/server.test.mjs',
      'not ok 45 - C:/repo/mcp/server.test.mjs',
      '  ---',
      "  error: 'test failed'",
      '  ...',
      DELETE_BLOCKED_TEST,
      '# fail 2',
    ].join('\n');
    assert.deepEqual(countBlockedTests(out), { bySpawn: 1, byDelete: 1, total: 2 });
  });

  test('THE FIRST BLOCK IS NOT DISCARDED — output beginning with `not ok` still counts', () => {
    /*
     * Found 2026-09-25 by this file, in production code — the second defect of the round.
     * `String.prototype.split` emits NO leading empty part when a zero-width match sits at index 0,
     * so `'not ok …'.split(/^(?=not ok )/m)` returns ONE part, not `['', 'not ok …']`. The
     * `.slice(1)` that used to be here therefore threw away the first failing block whenever the
     * stage's output began with `not ok`: `countBlockedTests` reported 0 against `# fail 1`,
     * `classifyStageOutput` returned `null`, `run()` fell through to FAILED, and a stage whose only
     * failure was the sandbox's spent delete budget printed as a PRODUCT FAILURE.
     *
     * The two tests below fail if this regresses; this one names the mechanism.
     */
    assert.deepEqual(countBlockedTests([DELETE_BLOCKED_TEST, '# fail 1'].join('\n')), {
      bySpawn: 0,
      byDelete: 1,
      total: 1,
    });
  });

  test('every failing test blocked -> the stage is BLOCKED, not FAILED', () => {
    const out = [DELETE_BLOCKED_TEST, '# fail 1'].join('\n');
    assert.equal(classifyStageOutput(out), 'blocked');
  });

  test('a delete-blocked test beside a real failure -> FAILED', () => {
    const out = [
      DELETE_BLOCKED_TEST,
      'not ok 79 - a real assertion', '  ---', "  error: 'expected 3 to equal 4'", '  ...',
      '# fail 2',
    ].join('\n');
    assert.equal(classifyStageOutput(out), 'failed');
  });

  test('THE LAST BLOCK IS BOUNDED — later output is not absorbed into it', () => {
    /*
     * Measured 2026-09-25 on a real gate run, and it is the reason `tapBlockBody` exists. The last
     * `not ok` block has no following `not ok` to end it, so an unbounded split ran it to
     * end-of-output and swallowed the NEXT stage's blocked-stage message — which named the same
     * shim diagnostic. One blocked suite was counted as two, total exceeded `# fail`, and a
     * genuinely BLOCKED stage was reported as a FAILED one: a false product failure, produced by
     * the parser rather than by the product.
     */
    const out = [
      '# SPAWN-BLOCKER: C:/repo/mcp/server.test.mjs',
      'not ok 45 - C:/repo/mcp/server.test.mjs',
      '  ---',
      "  error: 'test failed'",
      '  ...',
      '1..45',
      '# tests 45',
      '# fail 1',
      '',
      'BLOCKED  gallery-verify — error when starting dev server:',
      '  [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":179,"threshold":50}',
    ].join('\n');
    assert.deepEqual(countBlockedTests(out), { bySpawn: 1, byDelete: 0, total: 1 });
    assert.equal(classifyStageOutput(out), 'blocked');
  });
});
