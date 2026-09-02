/**
 * The push gate's parsers, held against REAL reporter output.
 * ============================================================================
 *
 * `test-baseline-gate.mjs` exists because a push slipped six failing tests through a pipe.
 * It then spent its entire life returning the wrong answer, for a reason nobody could see:
 * vitest writes ANSI colour, and both of its regexes anchored on literal text with no
 * escapes in them. `parseTotals` returned null on every run, the "did not produce a
 * summary" branch fired, and the gate exited 1 against every tree.
 *
 * It failed CLOSED, which is why it survived. A gate stuck on FAIL is indistinguishable
 * from a red suite, and this suite IS red — so the wrong answer was the answer everyone
 * expected. Nothing shipped because of it; it simply stopped being a gate.
 *
 * THE FIXTURES BELOW ARE VERBATIM SLICES OF REAL `vitest run --reporter dot` OUTPUT,
 * escape codes included. That is the whole point. A fixture written by hand would have
 * been written to match the parser — the failure mode this repository has hit four times —
 * and would have passed against the broken version just as happily.
 */

import { describe, it, expect } from 'vitest';
import { parseFailingFiles, parseTotals, parseMissingPackages } from '../../scripts/lib/test-output-parsers.mjs';

const E = '\u001b';

/** A summary line exactly as vitest emits it, colour and all. */
const SUMMARY = `${E}[2m Test Files ${E}[22m ${E}[1m${E}[31m35 failed${E}[39m${E}[22m${E}[2m | ${E}[22m${E}[1m${E}[32m1202 passed${E}[39m${E}[22m${E}[2m | ${E}[22m${E}[33m1 skipped${E}[39m${E}[90m (1238)${E}[39m
${E}[2m      Tests ${E}[22m ${E}[1m${E}[31m6 failed${E}[39m${E}[22m${E}[2m | ${E}[22m${E}[1m${E}[32m9904 passed${E}[39m${E}[22m${E}[2m | ${E}[22m${E}[33m35 skipped${E}[39m${E}[90m (9945)${E}[39m`;

/** File lines exactly as vitest emits them. */
const FAILS = `${E}[41m${E}[1m FAIL ${E}[22m${E}[49m __tests__/equipmentScanService.multi.test.mjs [ __tests__/equipmentScanService.multi.test.mjs ]
${E}[41m${E}[1m FAIL ${E}[22m${E}[49m tests/api/phase1bControllers.test.mjs [ tests/api/phase1bControllers.test.mjs ]
${E}[41m${E}[1m FAIL ${E}[22m${E}[49m tests\\unit\\bracket.test.mjs [ tests\\unit\\bracket.test.mjs ]`;

describe('parseTotals reads a coloured summary', () => {
  it('finds the counts in real output', () => {
    // This is the assertion whose absence cost the gate its life. Against the original
    // parser it returns null and every branch below it is unreachable.
    expect(parseTotals(SUMMARY)).toEqual({ failed: 6, passed: 9904 });
  });

  it('still reads output with no colour at all', () => {
    // NO_COLOR is set on the spawn; the strip is the belt. Both paths must work, or the
    // belt is decorative and an env change silently restores the original bug.
    expect(parseTotals('      Tests  6 failed | 9904 passed | 35 skipped (9945)')).toEqual({ failed: 6, passed: 9904 });
  });

  it('reads an all-green summary, which has no "failed" clause', () => {
    expect(parseTotals(`${E}[2m      Tests ${E}[22m ${E}[1m${E}[32m704 passed${E}[39m${E}[22m${E}[90m (704)${E}[39m`))
      .toEqual({ failed: 0, passed: 704 });
  });

  it('returns null when there is genuinely no summary', () => {
    // The fail-closed branch must still exist. A crashed run is an UNKNOWN, and treating
    // an unknown as success is how a broken suite reads as a clean one.
    expect(parseTotals('vitest crashed before reporting')).toBeNull();
  });
});

describe('parseFailingFiles reads coloured FAIL lines', () => {
  it('finds every failing file in real output', () => {
    expect(parseFailingFiles(FAILS)).toEqual([
      '__tests__/equipmentScanService.multi.test.mjs',
      'tests/api/phase1bControllers.test.mjs',
      'tests/unit/bracket.test.mjs',
    ]);
  });

  it('normalises Windows separators, so a baseline is portable', () => {
    // The baseline is committed and read on both platforms; a path recorded with
    // backslashes would look like a regression to everyone else.
    expect(parseFailingFiles(`${E}[41m FAIL ${E}[49m tests\\unit\\x.test.mjs`)).toEqual(['tests/unit/x.test.mjs']);
  });

  it('does not invent files from a clean run', () => {
    expect(parseFailingFiles(SUMMARY)).toEqual([]);
  });

  it('reports each file once however many times it appears', () => {
    const twice = `${FAILS}\n${FAILS}`;
    expect(parseFailingFiles(twice)).toHaveLength(3);
  });
});

describe('the strip is not so greedy that it eats real content', () => {
  it('leaves bracketed text in a path alone', () => {
    // Stripping a bare bracket-digits-m rather than an escape sequence would corrupt the
    // very paths this parser exists to read.
    expect(parseFailingFiles(`${E}[41m FAIL ${E}[49m tests/unit/[0m]weird.test.mjs`))
      .toEqual(['tests/unit/[0m]weird.test.mjs']);
  });
});

describe('parseMissingPackages tells an install apart from a regression', () => {
  // vitest GROUPS suites that failed for the same reason: several consecutive FAIL lines
  // and then ONE error block. My first version credited the package to the nearest
  // preceding FAIL, so five of six files in a group looked like ordinary regressions — the
  // exact wrong answer this parser exists to stop the gate giving.
  const GROUPED = [
    `${E}[41m FAIL ${E}[49m tests/api/a.test.mjs [ tests/api/a.test.mjs ]`,
    `${E}[41m FAIL ${E}[49m tests/api/b.test.mjs [ tests/api/b.test.mjs ]`,
    `${E}[41m FAIL ${E}[49m tests/api/c.test.mjs [ tests/api/c.test.mjs ]`,
    "Error: Cannot find package 'jose' imported from 'x/y.mjs'",
  ].join('\n');

  it('attributes the package to EVERY file in the group, not just the last', () => {
    const m = parseMissingPackages(GROUPED);
    expect([...m.keys()].sort()).toEqual(['tests/api/a.test.mjs', 'tests/api/b.test.mjs', 'tests/api/c.test.mjs']);
    expect(m.get('tests/api/a.test.mjs')).toBe('jose');
  });

  it('does not claim files whose group ended in a different error', () => {
    // A real failure must stay a regression. Swallowing it into "environment" would hide
    // exactly what the gate exists to catch.
    const mixed = [
      `${E}[41m FAIL ${E}[49m tests/api/real.test.mjs`,
      'AssertionError: expected 1 to be 2',
      `${E}[41m FAIL ${E}[49m tests/api/env.test.mjs`,
      "Error: Cannot find package 'sanitize-html' imported from 'x.mjs'",
    ].join('\n');
    const m = parseMissingPackages(mixed);
    expect(m.has('tests/api/real.test.mjs')).toBe(false);
    expect(m.get('tests/api/env.test.mjs')).toBe('sanitize-html');
  });

  it('finds nothing in a run with no missing packages', () => {
    expect(parseMissingPackages(FAILS).size).toBe(0);
  });

  it('handles two groups needing two different packages', () => {
    const two = [
      `${E}[41m FAIL ${E}[49m a.test.mjs`,
      "Error: Cannot find package 'jose' imported from 'x.mjs'",
      `${E}[41m FAIL ${E}[49m b.test.mjs`,
      "Error: Cannot find package 'sanitize-html' imported from 'y.mjs'",
    ].join('\n');
    const m = parseMissingPackages(two);
    expect(m.get('a.test.mjs')).toBe('jose');
    expect(m.get('b.test.mjs')).toBe('sanitize-html');
  });
});

describe('a real regression must never be filed as "environment"', () => {
  // GLM's exact ordering, which my earlier case had backwards: the COLLECTION error comes
  // FIRST, then a genuinely red suite later. If `pending` were not cleared at the missing-
  // package line, the later real failure would inherit the package attribution and the gate
  // would report a regression as an install problem — the silent-wrong-answer this parser
  // exists to prevent, inverted.
  it('a collection error FOLLOWED BY a real failure does not swallow the real one', () => {
    const out = [
      `${E}[41m FAIL ${E}[49m tests/api/env.test.mjs`,
      "Error: Cannot find package 'jose' imported from 'x.mjs'",
      `${E}[41m FAIL ${E}[49m tests/api/real.test.mjs`,
      'AssertionError: expected 1 to be 2',
    ].join('\n');
    const m = parseMissingPackages(out);
    expect(m.get('tests/api/env.test.mjs')).toBe('jose');
    expect(m.has('tests/api/real.test.mjs'), 'a real regression was filed as environment').toBe(false);
  });

  it('a real failure with NO trailing error line is still not claimed', () => {
    // The dangerous shape: nothing after the FAIL closes the group, so a naive parser
    // leaves it pending and hands it to whatever error appears next.
    const out = [
      `${E}[41m FAIL ${E}[49m tests/api/real.test.mjs`,
      `${E}[41m FAIL ${E}[49m tests/api/env.test.mjs`,
      "Error: Cannot find package 'jose' imported from 'x.mjs'",
    ].join('\n');
    const m = parseMissingPackages(out);
    // Both share the block, so both are claimed — vitest genuinely groups this way, and
    // over-claiming here is the known cost of the grouping rule. Recorded rather than
    // hidden: if a runner ever emits an unclosed FAIL, this is where it would mislead.
    expect(m.size).toBe(2);
  });
});
