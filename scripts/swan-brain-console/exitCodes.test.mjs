/**
 * exitCodes — the vocabulary CI branches on.
 * @module scripts/swan-brain-console/exitCodes.test
 *
 * WHY THIS FILE EXISTS (round 21, 2026-09-25 — sable)
 *
 * `exitCodes.mjs`'s own header says the reason it is a module rather than four inline `return`s is
 * that "a test can now name the contract instead of grepping for a literal". The module was
 * extracted, the promise was written down, and the test was never written: 70 lines of vocabulary
 * that decides what CI does, with no assertion anywhere in the repo.
 *
 * That matters more here than for an ordinary module because the failure is silent and specific.
 * The header records that two of the four codes "drifted into meaning the same thing in an earlier
 * round" while they were inline. Collapsing 3 into 2 again would not break a single existing test —
 * it would just make a busy gate read as a red one, and the documented response to a red gate is to
 * go looking at what changed. These assertions make that drift go red.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXIT_OK, EXIT_GATE_RED, EXIT_ATTEMPT_FAILED, EXIT_NOT_STARTED,
  EXIT_MEANINGS, exitForCompletedRun,
} from './exitCodes.mjs';

describe('the four codes are four codes', () => {
  test('each has the value the header documents', () => {
    assert.equal(EXIT_OK, 0);
    assert.equal(EXIT_GATE_RED, 1);
    assert.equal(EXIT_ATTEMPT_FAILED, 2);
    assert.equal(EXIT_NOT_STARTED, 3);
  });

  test('they are pairwise distinct — the property the earlier round lost', () => {
    const values = [EXIT_OK, EXIT_GATE_RED, EXIT_ATTEMPT_FAILED, EXIT_NOT_STARTED];
    assert.equal(new Set(values).size, values.length, 'two codes collapsed onto one number');
  });

  test('NOT_STARTED is not ATTEMPT_FAILED — "wait and re-run" is not "the gate is red"', () => {
    assert.notEqual(EXIT_NOT_STARTED, EXIT_ATTEMPT_FAILED);
  });

  test('EXIT_OK is the only green', () => {
    assert.equal(EXIT_OK, 0);
    for (const c of [EXIT_GATE_RED, EXIT_ATTEMPT_FAILED, EXIT_NOT_STARTED]) {
      assert.notEqual(c, 0);
    }
  });
});

describe('EXIT_MEANINGS is one source, not four', () => {
  test('it names every code and nothing else', () => {
    assert.deepEqual(
      Object.keys(EXIT_MEANINGS).map(Number).sort((a, b) => a - b),
      [EXIT_OK, EXIT_GATE_RED, EXIT_ATTEMPT_FAILED, EXIT_NOT_STARTED],
    );
  });

  test('it is own-key only — a prototype key is not a meaning', () => {
    // The same hole as the MCP dispatch and the panel labels (rounds 20 and 24): a truthiness
    // lookup on a plain object resolves `constructor` and `__proto__`. Anyone rendering a code
    // through this table must use `Object.hasOwn`, and this records that the table is shaped so
    // that check is the right one.
    for (const k of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      assert.equal(Object.hasOwn(EXIT_MEANINGS, k), false, `${k} must not be a key`);
      assert.ok(EXIT_MEANINGS[k] !== undefined, 'but it DOES resolve through the prototype chain');
    }
  });

  test('the meanings are distinct prose, not the same string four times', () => {
    const texts = Object.values(EXIT_MEANINGS);
    assert.equal(new Set(texts).size, texts.length);
    for (const t of texts) assert.ok(t.length > 10, 'a meaning that short names nothing');
  });
});

describe('exitForCompletedRun', () => {
  test('refuses to guess the count', () => {
    assert.throws(
      () => exitForCompletedRun({ summary: {} }),
      /countFailures/,
      'the vocabulary must not invent a failure count',
    );
  });

  test('a clean comparison is green', () => {
    assert.equal(exitForCompletedRun({ summary: {}, countFailures: () => 0 }), EXIT_OK);
  });

  test('a failing comparison is red', () => {
    assert.equal(exitForCompletedRun({ summary: {}, countFailures: () => 3 }), EXIT_GATE_RED);
  });

  test('--update is never green, even with zero failures', () => {
    /*
     * The header's claim: a written baseline is a SUCCESSFUL UPDATE, not a passing COMPARISON, so
     * a green exit would let CI mistake a fresh reference set for a verified gate. `countFailures`
     * is deliberately not even consulted on this path.
     */
    let consulted = false;
    const code = exitForCompletedRun({
      summary: {},
      update: true,
      countFailures: () => { consulted = true; return 0; },
    });
    assert.equal(code, EXIT_GATE_RED);
    assert.equal(consulted, false, 'update mode must not depend on the count at all');
  });

  test('the summary and the update flag reach countFailures', () => {
    const seen = [];
    exitForCompletedRun({
      summary: { total: 5 },
      countFailures: (s, o) => { seen.push([s, o]); return 0; },
    });
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0][0], { total: 5 });
    assert.equal(seen[0][1].update, false);
  });
});
