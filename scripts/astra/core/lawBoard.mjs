/**
 * lawBoard.mjs — the guardrail board. `T-U-07` (Law half) / `T-I-07` / INV8.
 *
 * WHAT THIS IS. `capabilities()` answers "which lanes are switched on". This answers the
 * other half of the same question: "which laws are being ENFORCED, and where is the line
 * of code that enforces each one". The `/law` pane renders this, and `AC5.4`'s rule —
 * *no actor enables a REFUSED lane or spec mode* — reads the law rows as the set of things
 * that are NOT dials.
 *
 * THE HONESTY MECHANISM IS THE SAME ONE, DELIBERATELY. Every row names a `marker` — a
 * literal that must exist in the file that runs the law — and `lawBoard()` reads that file
 * and resolves the marker to a live `file:line`. A row whose marker is gone comes back
 * `INCONCLUSIVE`, never `ENFORCED`. The alternative — a table that says "6 laws enforced"
 * because someone typed 6 — is the defect this engagement spent itself fixing:
 *
 *     A COUNT IS A CLAIM ABOUT COMPLETENESS.
 *
 * THE MARKER IS THE ENFORCEMENT SITE, NOT THE LAW'S NAME. This matters, and it is the one
 * design decision worth arguing with. A marker of `'LAW3-kill-list'` would resolve happily
 * against the line that *pushes a violation* — so deleting the loop that FINDS violations
 * would leave the row green, citing the line that reports the failure it can no longer
 * detect. The markers below are therefore the expressions that DO the checking
 * (`GOLD_ALLOWED.test(value)`, `BANNED_FACETS.has(leaf)`, …). A refactor that keeps the
 * behaviour keeps the expression; one that removes the enforcement loses the row.
 *
 * WHAT THIS CANNOT SEE, NAMED RATHER THAN IMPLIED. A marker proves the enforcement
 * expression still exists at a line; it does not prove the expression is REACHED, nor that
 * the pattern it consults is still correct. `swanLawFilter.test.mjs` and
 * `swanLawFilterKillList.test.mjs` carry the behavioural proof (carriage, bypasses,
 * i18n forms); this board is the citation. Neither substitutes for the other, and a row
 * here is not evidence that a law WORKS — only that it is still written down.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, repoRelative } from './paths.mjs';
import { LAW_NAMES, KILL_LIST_TEXT } from '../../../shared/swanLawPatterns.mjs';

/** The runner — the file every law's enforcement marker must be found in. */
export const LAW_RUNNER = join(REPO_ROOT, 'shared', 'swanLawFilter.mjs');

/** The data file the kill-list itself is defined in. */
export const LAW_PATTERNS = join(REPO_ROOT, 'shared', 'swanLawPatterns.mjs');

/**
 * The law table. One row per `LAW_NAMES` entry, in `LAW_NAMES` order.
 *
 * `protects` is what the law guards, in the operator's terms. `onFailure` is what happens
 * when it trips — every one of these blocks the compile and names the slot, because
 * `swanLawFilter.mjs`'s whole stance is that a law blocks rather than strips.
 */
export const LAW_ROWS = Object.freeze([
  {
    law: 'LAW2-gold-allowlist',
    protects: 'gold, which is a Swan accent and not a colour to fill with',
    onFailure: 'the compile is blocked; gold is permitted only as a PR numeral + delta, '
      + '<=1px filigree, a focus ring, or one badge',
    marker: 'GOLD_ALLOWED.test(value)',
  },
  {
    law: 'LAW3-kill-list',
    protects: 'the banned aesthetic families — and the fact that the ban is still CARRIED',
    onFailure: 'the compile is blocked; the offending slot is named, and the refusal quotes '
      + 'the family it matched',
    // THE CARRY CHECK, NOT THE SCAN LOOP. `LAW3-kill-list` has two conditions: a scan of the
    // positive slots, and the A4b check that the `negative` slot still names at least one
    // family. The second is the one that was missing while the check reported green, so it
    // is the one cited here — a marker on the scan loop would resolve even if an override
    // could still delete the kill-list.
    marker: 'KILL_LIST.some(',
    note: 'Second condition added in A4b: `resolveSlots` applies overrides LAST, so the '
      + 'negative slot could be emptied and every check still reported green.',
  },
  {
    law: 'LAW3-banned-facet',
    protects: 'the taxonomy — facets that are banned for Swan surfaces',
    onFailure: 'the compile is blocked and the facet is named',
    marker: 'BANNED_FACETS.has(leaf)',
  },
  {
    law: 'LAW4-optics-not-creatures',
    protects: 'optics over illustration — no literal creature rendered',
    onFailure: 'the compile is blocked; an occluder exemption exists but is a SHAPE '
      + 'allowance, not a rendering licence',
    marker: 'CREATURE.test(withoutIdioms)',
  },
  {
    law: 'LAW9-retired-palette',
    protects: 'the retired Galaxy-Swan palette, by hex and by name',
    onFailure: 'the compile is blocked, including when the retired value arrives through a '
      + 'var() fallback',
    marker: 'RETIRED_HEX.some(',
  },
  {
    law: 'LAW10-content',
    protects: 'content wording — yoga/meditation phrasing and an assembled credential claim',
    onFailure: 'the compile is blocked; unlike the taste laws, this one applies to the '
      + 'negative slot too',
    marker: 'YOGA.test(value)',
  },
]);

/** The marker that proves the kill-list itself is still defined. */
export const KILL_LIST_MARKER = 'export const KILL_LIST_TEXT';

/** Resolve a marker to `file:line` in `file`, or `null`. Exported so a test can fire it. */
export function cite(file, marker) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch (e) {
    return { source: repoRelative(file), sourceLine: null, missing: true, why: `E_LAW_UNREADABLE: ${e.code || e.message}` };
  }
  const idx = src.split('\n').findIndex((line) => line.includes(marker));
  if (idx === -1) {
    return {
      source: repoRelative(file),
      sourceLine: null,
      missing: true,
      why: `marker ${JSON.stringify(marker)} not found in ${repoRelative(file)} — the row's `
        + 'claim is no longer supported by code, so the status is not asserted.',
    };
  }
  return { source: `${repoRelative(file)}:${idx + 1}`, sourceLine: idx + 1, missing: false, why: null };
}

/**
 * Build the board. Every row carries `source` (`file:line`) and `status`.
 *
 * `rows` is injectable for the same reason `capabilities()`'s `lanes` is: the DEGRADATION
 * has to be shown firing. A board that can only be observed in its healthy state is a board
 * whose failure mode nobody has seen.
 */
export function lawBoard({ rows = LAW_ROWS, runner = LAW_RUNNER, patterns = LAW_PATTERNS } = {}) {
  const board = rows.map((row) => {
    const c = cite(runner, row.marker);
    return {
      ...row,
      source: c.source,
      sourceLine: c.sourceLine,
      sourceMissing: c.missing,
      status: c.missing ? 'INCONCLUSIVE' : 'ENFORCED',
      reason: c.why,
    };
  });
  // The kill-list is a second thing to cite: the laws say the ban is enforced, and this
  // says what the ban CONTAINS. A kill-list whose definition vanished while the enforcement
  // expression survived would be a law enforcing an empty list.
  const kill = cite(patterns, KILL_LIST_MARKER);
  return {
    board,
    killList: {
      entries: KILL_LIST_TEXT,
      count: KILL_LIST_TEXT.length,
      source: kill.source,
      sourceLine: kill.sourceLine,
      sourceMissing: kill.missing,
      reason: kill.why,
    },
    // The order the laws run in is `LAW_NAMES`'s order, and asserting it here means the
    // board cannot quietly cover a different set from the filter.
    covered: LAW_NAMES,
    byStatus: board.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}),
    inconclusive: board.filter((r) => r.status === 'INCONCLUSIVE').map((r) => r.law),
  };
}
