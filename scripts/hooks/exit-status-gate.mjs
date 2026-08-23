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
/**
 * Blank out heredoc bodies and `#` comments, preserving length so offsets stay valid.
 *
 * KNOWN LIMITS, pinned by tests rather than assumed away — this is an approximation, not a shell
 * parser, and pretending otherwise is how a guard earns false confidence:
 *   · `{ cat a | head; }; echo $?` is MISSED (brace groups are not modelled). A miss, not a false
 *     block, so it fails in the quiet direction.
 *   · `cat a | head & \n echo $?` is BLOCKED though `$?` reads the background launch status.
 *   · `cat a \| head; echo $?` is BLOCKED though the pipe is escaped.
 * Each is rare in practice and each costs one re-issue; none silently reports a wrong exit code.
 */
export function maskNonExecutedText(cmd) {
  const blank = (span) => ' '.repeat(span.length);
  return String(cmd)
    // <<EOF ... EOF and <<'EOF' ... EOF — body is written to a file, not executed by this shell.
    // Delimiter may be bare, 'single' or "double" quoted — all three are real shell forms, and the
    // first version handled only the bare and single cases.
    .replace(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?[\s\S]*?^\1$/gm, blank)
    // Trailing comments. Only when `#` starts a word, so `git show HEAD:a#b` is untouched.
    .replace(/(^|\s)#[^\n]*/g, blank);
}

export function stripQuoted(cmd) {
  /*
   * LENGTH-PRESERVING (fixed 2026-08-23, second regression on this function).
   *
   * The previous version collapsed each quoted span to two characters. That is fine for a boolean
   * "does an unquoted pipe exist" test, but the statement-segmentation added later builds segment
   * OFFSETS from the masked string while locating `$?` in the RAW one. Any length change desyncs
   * the two. Measured: `npm test | tail -5; echo "exit=$?"` is 34 chars raw, 27 masked; statusIdx
   * 31 fell past the end of the masked string, the segment lookup missed, and the gate returned
   * null — silently allowing the exact defect it exists to catch, in its MOST COMMON form, since
   * `$?` usually sits inside double quotes.
   *
   * Masking to the same length keeps every offset valid in both strings at once. The filler is `x`
   * because it is inert to every construct this file inspects: not a pipe, not `;`, `&&`, `||`, a
   * newline, or `$?`.
   */
  return String(cmd).replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (span) => 'x'.repeat(span.length));
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

  /*
   * `$?` reads the status of the IMMEDIATELY PRECEDING statement — not of anything earlier on the
   * line. So the question is not "is there a pipe before the $?" but "was the statement just before
   * it a pipeline".
   *
   * The first rule asked the broader question and blocked correct work: a compound command whose
   * $? follows a BARE command was refused because some earlier, unrelated statement contained a
   * pipe. It fired falsely within two commands of going live. That is not a cosmetic problem — the
   * change request installing this gate says a check that gets in the way of real work is one that
   * gets switched off, and a gate removed for nagging leaves the 44-hit failure completely
   * unguarded. Precision here IS the safety property.
   *
   * Statement boundaries are `;`, `&&`, `||` and newlines, taken outside quoted spans. This is an
   * approximation, not a shell parser: it does not model subshells, `{ }` groups, or backgrounding.
   * It errs toward BLOCKING on anything it cannot segment, because a missed catch is silent and a
   * false block is loud.
   */
  /*
   * Neutralise text that is WRITTEN rather than RUN, before segmenting.
   *
   * A command can legitimately contain this pattern without executing it: a heredoc writing a test
   * file, a comment, a commit message about the gate. The first version inspected the raw string and
   * blocked all of them — it refused the very command that adds these tests, and it would refuse any
   * attempt to document the gate. That is a guard obstructing the work of maintaining itself, which
   * is precisely how a guard gets switched off.
   *
   * Both maskers preserve length, so offsets into `masked` and into `cmd` stay aligned — the
   * property the segmentation below depends on.
   */
  /*
   * ORDER MATTERS, and the live run is what proved it. `stripQuoted` masks `'EOF'` — the quoted
   * heredoc delimiter — so running it first turns `<<'EOF'` into `<<xxxxx` and the heredoc matcher
   * can no longer find the terminator to match against. My unit test used the UNQUOTED `<<EOF`
   * form and passed while the real, quoted form the shell actually receives stayed blocked.
   * Non-executed text is removed first, quotes second.
   */
  const masked = stripQuoted(maskNonExecutedText(cmd));
  const isPipe = (segment) => /(?<!\|)\|(?!\||&)/.test(segment);

  // Split into statements, keeping each piece's offset so the $?-bearing one can be located.
  const segments = [];
  let cursor = 0;
  const boundaryRe = /(;|&&|\|\||\n)/g;
  let boundary;
  while ((boundary = boundaryRe.exec(masked)) !== null) {
    segments.push({ start: cursor, end: boundary.index, text: masked.slice(cursor, boundary.index) });
    cursor = boundary.index + boundary[0].length;
  }
  segments.push({ start: cursor, end: masked.length, text: masked.slice(cursor) });

  const statusSegment = segments.findIndex((segment) => statusIdx >= segment.start && statusIdx <= segment.end);
  if (statusSegment < 0) return null;

  // The $? may sit in the same statement as its own pipeline (`a | b; echo $?` puts it in the
  // NEXT statement, but `echo $? | tee x` puts a pipe in the same one and reads a prior status).
  const previous = segments[statusSegment - 1];
  if (!previous || !isPipe(previous.text)) return null;

  return { firstPipe: previous.start + previous.text.search(/(?<!\|)\|(?!\||&)/), statusIdx };
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
