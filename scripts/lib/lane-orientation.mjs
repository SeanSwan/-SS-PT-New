/**
 * lane-orientation.mjs — orientation classification, isolated from the hook
 * =========================================================================
 * Purpose: decide whether a `digest` run produced a REAL orientation summary,
 * and render the recovery commands. Boundary: this module does NOT parse lane
 * records, infer ownership, or decide edit permission. It executes one child,
 * classifies its output, prints, and returns. It never exits the process.
 *
 * WHY THIS FILE EXISTS (Astra hostile review, 2026-09-20 — F03/F04/F05/F07):
 *   - F03: the old hook did `if (out) { print claim guidance }`. ANY non-empty
 *     stdout counted as success, so a diagnostic printed with exit 0 would have
 *     been presented as a healthy ledger. Marker validation is now explicit and
 *     a failure marker OVERRIDES a marker match.
 *   - F07: the old tests could not force a failure class at all, so they proved
 *     only that a success path succeeds. Every branch here is reachable through
 *     the injected `run`/`exists` seams, which is what makes those cases real.
 *   - F04: recovery commands are rendered from the ACTUAL interpreter and a
 *     root-pinned entry point, never a bare `node scripts/lane.mjs`. An absolute
 *     script path still fails if it is pasted from a subdirectory; the wrapper
 *     pins cwd, which is the whole point.
 *   - F05: pruning is gone. Orientation is read-only.
 *
 * Validation is PRESENTATION validation only. `kind: 'summary'` means "the text
 * looked like a digest" — never "you may edit". Every emitted form says so.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Marker a real digest always prints. */
const MARKER_LEDGER = '[lane] ledger';
const MARKER_ME = '[lane] me:';

/**
 * Text that means orientation FAILED even if the markers are also present.
 * The old hook's own history contains one of these (a non-repo diagnostic), so
 * a marker-only check would have passed on a broken run.
 */
const FAILURE_TEXT =
  /orientation check failed|not a git repository|orientation unavailable|digest produced no output/i;

const DIGEST_TIMEOUT_MS = 25_000;
const MAX_BUFFER = 1_048_576;

/** Fixed copy. Never interpolate a captured stderr or exception message here:
 *  they can carry unrelated absolute paths and sensitive diagnostics. */
const REASON_COPY = {
  MISSING_HELPER: 'the ledger helper is not present in this checkout',
  EMPTY_OUTPUT: 'the helper produced no output',
  INVALID_SUMMARY: 'the helper output did not contain a recognisable digest',
  TIMEOUT: 'the helper exceeded its time budget',
  OUTPUT_LIMIT: 'the helper produced more output than can be shown safely',
  CHILD_FAILURE: 'the helper exited non-zero',
};

/**
 * Render one executable+args as a copy-pasteable command for a given shell.
 *
 * Rejects NUL/CR/LF: a newline inside a quoted argument would render a command
 * that LOOKS correct and runs something else. This restricts printed commands
 * only — lane-file contents are not passed through here.
 */
export function shellCommand(shell, executable, args) {
  const parts = [executable, ...args];
  for (const p of parts) {
    if (typeof p !== 'string') throw new TypeError('command parts must be strings');
    if (/[\0\r\n]/.test(p)) throw new Error('command part contains NUL, CR or LF');
  }
  if (shell === 'powershell') {
    // PowerShell single-quoted strings are literal; an apostrophe is doubled.
    return `& ${parts.map((p) => `'${p.replace(/'/g, "''")}'`).join(' ')}`;
  }
  if (shell === 'posix') {
    // POSIX: close the quote, emit an escaped quote, reopen. ' -> '\''
    return parts.map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(' ');
  }
  throw new Error(`unsupported shell: ${shell}`);
}

/**
 * Run orientation once and return a classification.
 *
 * @returns {{kind:'summary',reason:null}|{kind:'degraded',reason:string}}
 */
export function orient(options) {
  const {
    root,
    execPath = process.execPath,
    run = execFileSync,
    exists = existsSync,
    emit = (line) => console.log(line),
  } = options;

  const helper = resolve(root, 'scripts', 'lane.mjs');
  const wrapper = resolve(root, 'scripts', 'lane-at-root.mjs');
  const queue = resolve(root, '.ai-workflow', 'coordination', 'review-queue.md');

  const out = (kind, reason, digestText) => {
    // Recovery is shown in BOTH states. A degraded orientation that prints no
    // way forward is how an agent concludes the ledger is unavailable and
    // proceeds to edit unclaimed files.
    if (kind === 'summary') {
      if (digestText) emit(digestText);
      // The clearance line is mandatory and deliberately blunt. Astra F01: the
      // digest itself truncates, so even a healthy summary is NOT permission.
      emit(`[lane] status=summary; edit-clearance=unverified`);
    } else {
      emit(`[lane] orientation: degraded (${reason}) — ${REASON_COPY[reason]}`);
      emit(`[lane] status=degraded; edit-clearance=unverified`);
    }
    emit(`[lane] review queue: ${queue}`);
    emit('[lane] recovery — root-pinned entry point, so your cwd does not matter:');
    emit(`[lane]   PowerShell: ${shellCommand('powershell', execPath, [wrapper, 'digest'])}`);
    emit(`[lane]   POSIX:      ${shellCommand('posix', execPath, [wrapper, 'digest'])}`);
    emit('[lane] complete discovery is required before editing; digest alone is not clearance.');
    return { kind, reason };
  };

  if (!exists(helper)) return out('degraded', 'MISSING_HELPER', null);

  let stdout;
  try {
    stdout = run(execPath, [helper, 'digest'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: root,
      timeout: DIGEST_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    // Order matters: an overflow is reported as a spawn error with a distinct
    // code, and a timeout surfaces as ETIMEDOUT or a signal. Check the specific
    // shapes before the generic non-zero case, or every failure reads as
    // CHILD_FAILURE and the reasons stop carrying information.
    const code = err?.code;
    if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return out('degraded', 'OUTPUT_LIMIT', null);
    if (code === 'ETIMEDOUT' || err?.signal) return out('degraded', 'TIMEOUT', null);
    return out('degraded', 'CHILD_FAILURE', null);
  }

  const text = String(stdout ?? '').trim();
  if (!text) return out('degraded', 'EMPTY_OUTPUT', null);
  if (!text.includes(MARKER_LEDGER) || !text.includes(MARKER_ME)) {
    return out('degraded', 'INVALID_SUMMARY', null);
  }
  // Failure text overrides markers: a run can print `[lane] ledger` and then
  // report that it is not a git repository.
  if (FAILURE_TEXT.test(text)) return out('degraded', 'INVALID_SUMMARY', null);

  return out('summary', null, text);
}
