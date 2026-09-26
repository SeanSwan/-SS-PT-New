/**
 * ============================================================================
 * FILE: baselineGateParse.test.mjs
 * PURPOSE: Hold the backend baseline gate's parsers against the REAL bytes vitest
 *          emits in CI, and hold the gate to failing closed when it cannot read.
 *
 * WHY: coach-gate's only backend regression check reported "the suite did not
 * produce a summary — treating as FAILURE" on every main run from at least
 * 2026-09-24 to 2026-09-26. The suite was healthy. The parsers were blind to the
 * ANSI escapes vitest emits when it colors its output, which it does in CI and
 * not on a developer's terminal. The gate was dead, and its message blamed the
 * wrong component, which is why it went unexamined.
 *
 * The fixtures below are the exact byte sequences captured from coach-gate job
 * 108374059668 (main @ 540593778), not paraphrases. The `\x1b` escapes are written
 * literally so the assertion is against what CI really sends.
 *
 * The case that matters most is `does not read a coloured run as green`: repairing
 * only the totals parser would have left the FAIL parser blind, so the baseline
 * diff would see zero failing files, report every baseline entry as fixed, and
 * exit 0 on a red suite. A gate that cannot read its input must fail closed.
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import {
  diffBaseline,
  interpretRun,
  parseFailingFiles,
  parseTotals,
  stripAnsi,
} from '../../scripts/lib/baselineGateParse.mjs';

const ESC = '\x1b';

/** Captured verbatim from coach-gate job 108374059668 — vitest `--reporter dot`, colored. */
const RAW_TOTALS_LINE =
  `${ESC}[2m      Tests ${ESC}[22m ${ESC}[1m${ESC}[31m20 failed${ESC}[39m${ESC}[22m`
  + `${ESC}[2m | ${ESC}[22m${ESC}[1m${ESC}[32m11189 passed${ESC}[39m${ESC}[22m`
  + `${ESC}[2m | ${ESC}[22m${ESC}[33m10 skipped${ESC}[39m${ESC}[90m (11219)${ESC}[39m`;

/** The same line as it appears in the GitHub log after the runner strips colour. */
const CLEAN_TOTALS_LINE = '      Tests  20 failed | 11189 passed | 10 skipped (11219)';

const RAW_FAIL_LINE =
  `${ESC}[41m${ESC}[1m FAIL ${ESC}[22m${ESC}[49m tests/unit/zonedTime.test.mjs`
  + `${ESC}[2m > ${ESC}[22mzonedWallClockToUtc${ESC}[2m > ${ESC}[22mdefaults hour and minute to zero when omitted`;

const RAW_TEST_FILES_LINE =
  `${ESC}[2m Test Files ${ESC}[22m ${ESC}[1m${ESC}[31m7 failed${ESC}[39m${ESC}[22m`
  + `${ESC}[2m | ${ESC}[22m${ESC}[1m${ESC}[32m1320 passed${ESC}[39m${ESC}[22m${ESC}[90m (1327)${ESC}[39m`;

describe('stripAnsi', () => {
  it('leaves the text a human would have seen', () => {
    expect(stripAnsi(RAW_TOTALS_LINE)).toBe(CLEAN_TOTALS_LINE);
  });

  it('removes CSI colour, erase and cursor sequences, and carriage returns', () => {
    expect(stripAnsi(`${ESC}[1mred${ESC}[22m`)).toBe('red');
    expect(stripAnsi(`${ESC}[2Kline`)).toBe('line');
    expect(stripAnsi(`${ESC}[?25lcursor`)).toBe('cursor');
    expect(stripAnsi('a\r\nb')).toBe('a\nb');
  });

  it('is idempotent and safe on already-clean text', () => {
    expect(stripAnsi(CLEAN_TOTALS_LINE)).toBe(CLEAN_TOTALS_LINE);
    expect(stripAnsi(stripAnsi(RAW_TOTALS_LINE))).toBe(CLEAN_TOTALS_LINE);
  });
});

describe('parseTotals', () => {
  it('reads the totals out of the RAW coloured line CI actually sends', () => {
    expect(parseTotals(RAW_TOTALS_LINE)).toEqual({ failed: 20, passed: 11189 });
  });

  it('reads the same numbers out of the colour-stripped line', () => {
    expect(parseTotals(CLEAN_TOTALS_LINE)).toEqual({ failed: 20, passed: 11189 });
  });

  it('reads an all-green run, which has no "failed" clause', () => {
    expect(parseTotals('      Tests  11189 passed (11219)')).toEqual({ failed: 0, passed: 11189 });
  });

  it('returns null — never zero — when there is no totals line', () => {
    // null is UNKNOWN. Returning {failed: 0} here is exactly how a crashed run would
    // read as a green one.
    expect(parseTotals('Vitest crashed before printing anything')).toBeNull();
    expect(parseTotals('')).toBeNull();
  });
});

describe('parseFailingFiles', () => {
  it('reads a failing file out of the RAW coloured FAIL line', () => {
    expect(parseFailingFiles(RAW_FAIL_LINE)).toEqual(['tests/unit/zonedTime.test.mjs']);
  });

  it('deduplicates: vitest repeats the FAIL line once per failing test in the file', () => {
    const output = [RAW_FAIL_LINE, RAW_FAIL_LINE, RAW_FAIL_LINE].join('\n');
    expect(parseFailingFiles(output)).toEqual(['tests/unit/zonedTime.test.mjs']);
  });

  it('collects every distinct file and normalises Windows separators', () => {
    const output = [
      RAW_FAIL_LINE,
      `${ESC}[41m${ESC}[1m FAIL ${ESC}[22m${ESC}[49m tests/api/bootcampGenerateProfileIdor.test.mjs${ESC}[2m > ${ESC}[22msuite`,
      `${ESC}[41m FAIL tests\\unit\\bootcampCustomStructure.test.mjs`,
    ].join('\n');
    expect(parseFailingFiles(output)).toEqual([
      'tests/api/bootcampGenerateProfileIdor.test.mjs',
      'tests/unit/bootcampCustomStructure.test.mjs',
      'tests/unit/zonedTime.test.mjs',
    ]);
  });

  it('does not mistake the Test Files summary line for a failing file', () => {
    expect(parseFailingFiles(RAW_TEST_FILES_LINE)).toEqual([]);
  });
});

describe('interpretRun', () => {
  it('is not blind on a coloured failing run', () => {
    const out = [RAW_FAIL_LINE, RAW_TEST_FILES_LINE, RAW_TOTALS_LINE].join('\n');
    const verdict = interpretRun(out, 1);
    expect(verdict.blind).toBe(false);
    expect(verdict.failing).toEqual(['tests/unit/zonedTime.test.mjs']);
    expect(verdict.totals).toEqual({ failed: 20, passed: 11189 });
  });

  it('is not blind on an all-green run', () => {
    const verdict = interpretRun('      Tests  11205 passed (11219)', 0);
    expect(verdict.blind).toBe(false);
    expect(verdict.failing).toEqual([]);
    expect(verdict.totals).toEqual({ failed: 0, passed: 11205 });
  });

  it('fails closed when the run printed no summary', () => {
    const verdict = interpretRun('some output, then nothing', 1);
    expect(verdict.blind).toBe(true);
    expect(verdict.reason).toBe('no-summary');
  });

  it('fails closed when totals claim failures but no FAIL line was parsed', () => {
    // The file parser is blind even though the totals parser is not. Diffing the
    // baseline here would report every entry as fixed.
    const verdict = interpretRun(RAW_TOTALS_LINE, 1);
    expect(verdict.blind).toBe(true);
    expect(verdict.reason).toBe('failures-without-files');
  });

  it('fails closed on a non-zero exit that parsed no FAIL lines', () => {
    // A load-failure (a file that cannot import) exits non-zero and may print no
    // FAIL line in the shape we match. That must never read as clean.
    const verdict = interpretRun('      Tests  11205 passed (11219)', 1);
    expect(verdict.blind).toBe(true);
    expect(verdict.reason).toBe('nonzero-exit-without-files');
  });
});

describe('the regression this module was written to prevent', () => {
  it('a naive parse of the RAW coloured line yields nothing at all', () => {
    // The pre-2026-09-26 regexes, applied to the real bytes. Both return empty, which
    // is the whole defect: no summary AND no failing files.
    const oldTotals = RAW_TOTALS_LINE.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
    const oldFailing = RAW_FAIL_LINE.match(/^\s*FAIL\s+(\S+)/);
    expect(oldTotals).toBeNull();
    expect(oldFailing).toBeNull();
  });

  it('does not read a coloured red run as green against a baseline', () => {
    // The dangerous half of the defect. With only the totals parser repaired, the
    // baseline diff sees no failing files and calls the whole baseline fixed.
    const out = [RAW_FAIL_LINE, RAW_TEST_FILES_LINE, RAW_TOTALS_LINE].join('\n');
    const { failing } = interpretRun(out, 1);
    const baseline = ['tests/unit/zonedTime.test.mjs', 'tests/api/phase1bControllers.test.mjs'];
    const { regressions, fixed } = diffBaseline(failing, baseline);
    expect(regressions).toEqual([]);
    // The real file is correctly recognised as STILL failing, not as fixed.
    expect(fixed).toEqual(['tests/api/phase1bControllers.test.mjs']);
  });
});

describe('diffBaseline', () => {
  it('separates a new failure from a standing one and from a fixed one', () => {
    const { regressions, fixed } = diffBaseline(
      ['tests/unit/standing.test.mjs', 'tests/unit/new.test.mjs'],
      ['tests/unit/standing.test.mjs', 'tests/unit/healed.test.mjs'],
    );
    expect(regressions).toEqual(['tests/unit/new.test.mjs']);
    expect(fixed).toEqual(['tests/unit/healed.test.mjs']);
  });

  it('reports nothing when the run matches the baseline exactly', () => {
    const same = ['tests/unit/a.test.mjs', 'tests/unit/b.test.mjs'];
    expect(diffBaseline(same, same)).toEqual({ regressions: [], fixed: [] });
  });
});
