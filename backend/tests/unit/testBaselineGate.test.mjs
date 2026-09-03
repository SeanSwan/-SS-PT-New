/**
 * testBaselineGate.test.mjs
 * =========================
 * The gate that certifies every other claim, tested.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/test-baseline-gate.mjs` is the thing that decides whether a change broke
 * anything. Three sessions of security work routed every "no new failures" claim through
 * it. Until 2026-08-26 it compared the set of failing FILE NAMES, which meant a file
 * already in the 23-file baseline could start failing for an entirely new reason and the
 * comparison stayed identical — the certifier could not see a whole class of regression in
 * the thing it was certifying.
 *
 * A hostile-review panel ranked fixing that above every remaining security item, on the
 * argument I could not rebut: every done-when for any later slice is a claim routed
 * through this harness, so if it can lie, later work can regress invisibly.
 *
 * The upgrade is only worth what it can be shown to catch. These are the cases the old
 * comparison passed and the new one must not, exercised against synthetic vitest reports
 * rather than by breaking the real suite — a four-minute run per case would have meant
 * checking one of them, once, by hand.
 */
import { describe, it, expect } from 'vitest';

import { collectFailures, normalizeReason } from '../../scripts/test-baseline-gate.mjs';

/** A vitest --reporter=json report, reduced to what the gate reads. */
const report = (files) => ({
  testResults: files.map((f) => ({
    name: `C:/tmp/swan-p1a/backend/${f.path}`,
    status: f.status || 'passed',
    message: f.message || '',
    assertionResults: (f.tests || []).map((t) => ({
      fullName: t.name,
      status: t.status,
      failureMessages: t.failure ? [t.failure] : [],
    })),
  })),
});

/** What the gate does with two runs — extracted here because it is the whole point. */
function compare(baselineMap, current) {
  const brandNew = [...current.keys()].filter((id) => !baselineMap.has(id));
  const drifted = [...current.entries()]
    .filter(([id, reason]) => baselineMap.has(id) && baselineMap.get(id) !== reason)
    .map(([id]) => id);
  const fixed = [...baselineMap.keys()].filter((id) => !current.has(id));
  return { brandNew, drifted, fixed, blocked: brandNew.length > 0 || drifted.length > 0 };
}

const BASELINE = collectFailures(report([{
  path: 'tests/api/alreadyBroken.test.mjs',
  status: 'failed',
  tests: [
    { name: 'suite > known failure', status: 'failed', failure: 'Error: SDK not installed' },
    { name: 'suite > passing sibling', status: 'passed' },
  ],
}]));

describe('test baseline gate', () => {
  describe('what the file-name comparison could not see', () => {
    it('catches a NEW failing test inside an already-failing file', () => {
      // The headline case. The file was in the baseline, so the old set comparison saw no
      // change at all — while a second test inside it had started failing.
      const current = collectFailures(report([{
        path: 'tests/api/alreadyBroken.test.mjs',
        status: 'failed',
        tests: [
          { name: 'suite > known failure', status: 'failed', failure: 'Error: SDK not installed' },
          { name: 'suite > passing sibling', status: 'failed', failure: 'AssertionError: expected 1 to be 2' },
        ],
      }]));
      const result = compare(BASELINE, current);
      expect(result.brandNew).toEqual([
        'tests/api/alreadyBroken.test.mjs :: suite > passing sibling',
      ]);
      expect(result.blocked).toBe(true);
    });

    it('catches a known failure that starts failing DIFFERENTLY', () => {
      // Same file, same test, same count — and a different defect underneath. Nothing about
      // the old comparison could distinguish this from a clean run.
      const current = collectFailures(report([{
        path: 'tests/api/alreadyBroken.test.mjs',
        status: 'failed',
        tests: [
          { name: 'suite > known failure', status: 'failed', failure: 'TypeError: cannot read x of undefined' },
          { name: 'suite > passing sibling', status: 'passed' },
        ],
      }]));
      const result = compare(BASELINE, current);
      expect(result.drifted).toEqual([
        'tests/api/alreadyBroken.test.mjs :: suite > known failure',
      ]);
      expect(result.blocked).toBe(true);
    });

    it('catches a file that stops COLLECTING, which reports zero failing tests', () => {
      // An import crash produces no assertions at all. Counting only failed assertions
      // would read this as an improvement — the same blindness in a different coat.
      const current = collectFailures(report([{
        path: 'tests/api/alreadyBroken.test.mjs',
        status: 'failed',
        message: 'Error: Cannot find module ./missing.mjs',
        tests: [],
      }]));
      expect([...current.keys()]).toEqual([
        'tests/api/alreadyBroken.test.mjs :: <file did not collect>',
      ]);
      expect(compare(BASELINE, current).blocked).toBe(true);
    });
  });

  describe('what it must NOT block', () => {
    it('passes an unchanged run — the positive control', () => {
      const current = collectFailures(report([{
        path: 'tests/api/alreadyBroken.test.mjs',
        status: 'failed',
        tests: [
          { name: 'suite > known failure', status: 'failed', failure: 'Error: SDK not installed' },
          { name: 'suite > passing sibling', status: 'passed' },
        ],
      }]));
      const result = compare(BASELINE, current);
      expect(result.blocked, 'an unchanged run was blocked — the gate cries wolf').toBe(false);
      expect(result.brandNew).toEqual([]);
      expect(result.drifted).toEqual([]);
    });

    it('reports a baselined failure that now passes, without blocking', () => {
      // A gate that fails on IMPROVEMENT gets routed around, and then it is not a gate.
      const current = collectFailures(report([{
        path: 'tests/api/alreadyBroken.test.mjs',
        status: 'passed',
        tests: [{ name: 'suite > known failure', status: 'passed' }],
      }]));
      const result = compare(BASELINE, current);
      expect(result.fixed).toEqual(['tests/api/alreadyBroken.test.mjs :: suite > known failure']);
      expect(result.blocked).toBe(false);
    });
  });

  describe('the reason fingerprint', () => {
    it('ignores what churns between identical runs', () => {
      // Absolute paths, line numbers and durations differ per machine and per run. If they
      // counted, every run would report drift, and a gate that always fires is off.
      const a = normalizeReason(['AssertionError: expected true C:/repo/x/y.mjs:12:5 (43 ms)']);
      const b = normalizeReason(['AssertionError: expected true D:/other/x/y.mjs:99:1 (7 ms)']);
      expect(a).toBe(b);
    });

    it('does NOT ignore a different assertion', () => {
      expect(normalizeReason(['AssertionError: expected 1 to be 2']))
        .not.toBe(normalizeReason(['TypeError: x is not a function']));
    });

    it('survives a failure with no message at all', () => {
      expect(normalizeReason([])).toBe('');
      expect(normalizeReason(undefined)).toBe('');
    });
  });
});
