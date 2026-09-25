/**
 * verifyReport.test — the reporter must not call a run that checked nothing a pass.
 * @module scripts/swan-brain-console/verifyReport.test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportResults, formatResult } from './verifyReport.mjs';

/** Collect what the reporter printed, without touching stdout. */
function capture() {
  const lines = [];
  return { lines, log: (s) => lines.push(String(s)) };
}

describe('a run that checked nothing is NOT a pass', () => {
  /**
   * The measured defect. The inline tally printed `0/0 checks passed` and returned 0
   * failures, so `process.exit(failed.length ? 1 : 0)` exited GREEN on a run that
   * asserted nothing.
   */
  it('returns a fatal count for an empty result set', () => {
    const { lines, log } = capture();
    const fatal = reportResults([], '[browser]', { log });
    assert.equal(fatal, 1, 'zero checks must be fatal, not a pass');
    assert.ok(lines.some((l) => /no checks ran/.test(l)), 'the reason must be printed');
    assert.ok(lines.some((l) => /VACUOUS/.test(l)), 'the tally must be marked vacuous');
  });

  it('says 0/0 in the tally, so the number alone cannot be mistaken for success', () => {
    const { lines, log } = capture();
    reportResults([], '[browser]', { log });
    const tally = lines.find((l) => l.includes('checks passed'));
    assert.ok(tally.includes('0/0'));
    assert.ok(tally.includes('VACUOUS'));
  });

  it('treats a non-array as vacuous rather than crashing', () => {
    const { log } = capture();
    assert.equal(reportResults(undefined, '[x]', { log }), 1);
    assert.equal(reportResults(null, '[x]', { log }), 1);
  });
});

describe('the ordinary tallies still behave', () => {
  it('returns 0 when every check passed', () => {
    const { log } = capture();
    assert.equal(reportResults([{ ok: true, name: 'a' }, { ok: true, name: 'b' }], '[x]', { log }), 0);
  });

  it('returns the failure count, not a boolean', () => {
    const { log } = capture();
    const results = [
      { ok: true, name: 'a' },
      { ok: false, name: 'b', detail: 'boom' },
      { ok: false, name: 'c', detail: '' },
    ];
    assert.equal(reportResults(results, '[x]', { log }), 2);
  });

  it('counts one pass out of two correctly', () => {
    const { lines, log } = capture();
    reportResults([{ ok: true, name: 'a' }, { ok: false, name: 'b' }], '[x]', { log });
    assert.ok(lines.some((l) => l.includes('1/2 checks passed')));
  });
});

describe('formatResult', () => {
  it('prints PASS and FAIL with the name', () => {
    assert.equal(formatResult({ ok: true, name: 'boot' }), 'PASS  boot');
    assert.equal(formatResult({ ok: false, name: 'boot' }), 'FAIL  boot');
  });

  it('appends the detail only when there is one', () => {
    assert.equal(formatResult({ ok: false, name: 'boot', detail: '404' }), 'FAIL  boot  — 404');
    assert.equal(formatResult({ ok: false, name: 'boot', detail: '' }), 'FAIL  boot');
  });
});

describe('rule 4', () => {
  it('both files stay within 300 lines', () => {
    for (const f of ['verifyReport.mjs', 'verifyReport.test.mjs']) {
      const lines = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines`);
    }
  });
});
