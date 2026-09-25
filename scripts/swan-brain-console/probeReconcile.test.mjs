/**
 * probeReconcile — which of the gate's two instruments to believe when they disagree.
 * @module scripts/swan-brain-console/probeReconcile.test
 *
 * WHY THIS FILE EXISTS (round 28 D1, 2026-09-25 — sable)
 *
 * Round 28 found that `verify-all.mjs` calls `spawnCapability()` and prints a warning, and that is
 * the entire use: the probe's verdict never reaches `summary()`, and the summary's blocked-count
 * never reaches the probe. Two instruments, one question, nothing comparing them.
 *
 * The fix is reconciliation rather than merging — the probe is right to stay advisory, because
 * gating the exit code on a single start-of-run spawn would turn a transient failure into a
 * whole-gate verdict. But an advisory instrument whose disagreement with the authoritative one is
 * SILENT is an instrument that will be believed on the wrong day. These assertions pin the line
 * that speaks up, and — in the last case — pin that it stays advisory.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileProbe } from './probeReconcile.mjs';

describe('reconcileProbe — the probe and the stage verdicts, compared', () => {
  test('they agree, both able -> nothing to say', () => {
    assert.equal(reconcileProbe(true, 0), null);
  });

  test('they agree, both unable -> nothing to say', () => {
    // A blocked probe beside a blocked stage is a consistent picture, not a conflict.
    assert.equal(reconcileProbe(false, 2), null);
  });

  test('probe able but a stage blocked -> the per-stage cause is authoritative', () => {
    const line = reconcileProbe(true, 2);
    assert.ok(line, 'a disagreement must produce a line');
    assert.match(line, /able to spawn a child/);
    assert.match(line, /2 stage\(s\) could not execute/);
    assert.match(line, /authoritative/);
    assert.match(line, /single sample/, 'it must say why the probe loses the argument');
  });

  test('probe unable but every stage passed -> the probe is not the verdict', () => {
    const line = reconcileProbe(false, 0);
    assert.ok(line, 'a disagreement must produce a line');
    assert.match(line, /unable to spawn a child/);
    assert.match(line, /not the verdict/);
  });

  test('it never reclassifies — neither line carries a stage verdict word', () => {
    /*
     * The line explains; it does not decide. If it ever started printing PASS or FAILED it would be
     * a third verdict in a gate that already has two instruments, which is the defect, not the fix.
     */
    for (const line of [reconcileProbe(true, 1), reconcileProbe(false, 0)]) {
      assert.doesNotMatch(line, /\bPASS\b/);
      assert.doesNotMatch(line, /\bFAILED\b/);
      assert.doesNotMatch(line, /\bBLOCKED\b/);
    }
  });

  test('the stage count reaches the line — it is not a fixed sentence', () => {
    // A reconciliation that cannot name the disagreement it is reconciling is decoration.
    assert.match(reconcileProbe(true, 1), /1 stage\(s\)/);
    assert.match(reconcileProbe(true, 5), /5 stage\(s\)/);
  });
});
