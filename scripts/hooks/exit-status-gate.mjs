#!/usr/bin/env node
/**
 * exit-status-gate.mjs — PreToolUse(Bash). Blocks reading `$?` after a pipeline.
 *
 * WHY THIS EXISTS
 *   `exit code` appears 39 times and `piped exit code` 5 more across the 2,096-bullet memo corpus:
 *   44 hits, the single most-recurring mechanism in the whole record with NO governing rule. Fable
 *   5's Final-Decider ruling (2026-08-23) ranked it the #2 plank by evidence strength, behind only
 *   the tethered-rule architecture itself.
 *
 * THE DEFECT IT KILLS
 *   In `cmd | tail; echo $?`, `$?` is TAIL's status, not cmd's. tail almost never fails, so the
 *   pipeline reports success no matter what cmd did. The agent reads "0", concludes the command
 *   worked, and moves on. This is not a hypothetical: it happened three times in one session on
 *   2026-08-22 while building the two mechanisms that preceded this one — including once inside a
 *   test of a gate, where it produced a false negative that nearly caused working code to be
 *   "fixed".
 *
 * WHY A HOOK AND NOT A RULE
 *   Rule-shaped versions of this already existed as prose (Rule 80, second-vantage) and were
 *   violated FOUR TIMES IN ONE SESSION after being written up. The corpus measured zero catches
 *   attributable to rule recall against ~84 attributable to an executed check. Prose does not hold
 *   this; a block at the moment of the act does.
 *
 * DELIBERATELY NARROW
 *   Pipes are not blocked. Only the precise combination that produces a false reading:
 *     a pipeline  +  a later bare `$?`  +  no PIPESTATUS  +  no pipefail
 *   A gate that blocks ordinary work gets switched off, and a switched-off gate protects nothing —
 *   which is the failure mode this repo records more than any other. The fix it demands is one
 *   token long, so complying is cheaper than bypassing.
 *
 * FAILS OPEN, LOUDLY. A broken gate must never brick the toolchain.
 */
import { readFileSync } from 'node:fs';

const ALLOW = () => process.exit(0);

/**
 * Strip quoted spans so a `|` inside `grep 'a|b'` or a regex is not read as a pipeline.
 * `$?` is deliberately NOT stripped — it most often lives inside double quotes (`echo "x=$?"`),
 * and missing it there would blind the gate to its most common real-world form.
 */
export function stripQuoted(cmd) {
  return String(cmd)
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

/**
 * Returns the offending detail, or null when the command is fine.
 * Exported for tests: a gate nobody has watched go red is indistinguishable from one that does
 * nothing (Fable rec#4).
 */
export function pipedStatusRead(rawCmd) {
  const cmd = String(rawCmd || '');
  if (!cmd) return null;

  // Correct forms — explicit and unambiguous. Never block these.
  if (/PIPESTATUS/.test(cmd)) return null;
  if (/pipefail/.test(cmd)) return null;

  // A bare `$?` read. ${PIPESTATUS[0]} is already excluded above.
  const statusIdx = cmd.search(/\$\?/);
  if (statusIdx < 0) return null;

  // A real pipeline, ignoring quoted spans, `||`, and `|&`.
  const masked = stripQuoted(cmd);
  const pipeRe = /(?<!\|)\|(?!\||&)/g;
  let m;
  let firstPipe = -1;
  while ((m = pipeRe.exec(masked)) !== null) {
    firstPipe = m.index;
    break;
  }
  if (firstPipe < 0) return null;

  // The pipe must PRECEDE the status read; `echo $?` before an unrelated later pipe is fine.
  if (firstPipe > statusIdx) return null;

  return { firstPipe, statusIdx };
}

/**
 * Stdin is read INSIDE main(), never at module load.
 *
 * The first draft read stdin in the module body. That is what every sibling hook does and it works
 * when the file is executed — but it makes the module unimportable: `node --test` hung forever on
 * import, waiting on a stdin that never arrives. A gate whose logic cannot be unit-tested is a gate
 * whose controls cannot be run, which is how an unfireable gate ships looking healthy. Caught by
 * the test suite hanging, which is itself the control working.
 */
function main() {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    ALLOW();
  }

  const payload = JSON.parse(raw || '{}');
  const cmd = payload?.tool_input?.command || '';
  const hit = pipedStatusRead(cmd);
  if (!hit) ALLOW();

  console.error(
    [
      '',
      '  EXIT-STATUS GATE — `$?` after a pipeline reads the WRONG command.',
      '',
      '  In `cmd | tail; echo $?` the status belongs to tail, not cmd. tail almost never',
      '  fails, so this reports success regardless of what cmd actually did. You would read',
      '  0 and conclude it worked.',
      '',
      '  This is the most-recurring mechanism in the failure corpus (44 hits) and it has no',
      '  rule, because prose did not hold it — Rule 80 was violated four times in one session',
      '  after being written up.',
      '',
      '  FIX — pick one:',
      '    ${PIPESTATUS[0]}      read the first command\'s status explicitly',
      '    set -o pipefail       make the pipeline itself fail',
      '    drop the pipe         run the command bare when you need its status',
      '',
      '  Nothing was run. Re-issue with one of the above and it passes silently.',
      '',
    ].join('\n'),
  );
  process.exit(2); // non-zero blocks the tool call
}

// Only run the gate when EXECUTED, never on import. See main()'s header.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('exit-status-gate.mjs')) {
  try {
    main();
  } catch (err) {
    console.error(`[exit-status] gate error, failing open: ${err?.message}`);
    ALLOW();
  }
}
