/**
 * hook-classify.mjs — decide what ONE hook command refers to.
 * ===========================================================
 * Split from hook-registration.mjs 2026-08-23 (confirming round): that file had
 * reached 348 lines against the 300-line cap, and a seat flagged it. The seam was
 * already there — deciding what a command means, and walking a config full of them,
 * are two jobs.
 *
 * THE FAILURE THIS EXISTS FOR (2026-08-22, found by a human from outside the system):
 * `.claude/settings.json` registered two hooks whose files did not exist. The harness
 * cannot run a file it cannot find, so it emitted NOTHING — byte-identical to what a
 * healthy guard that found no problems emits. Every session read as clean for weeks.
 * Registration is not existence.
 *
 * THE INVARIANT, learned over thirteen hostile rounds:
 *
 *     every hook entry returns EXACTLY ONE verdict: OK | MISSING | UNVERIFIED
 *     no path returns nothing — silence is unrepresentable
 *
 * Successive rewrites each shipped with some input that fell through every branch.
 * One shipped a PASSING TEST asserting that `sh -c "..."` yields nothing, codifying
 * the outage as correct behaviour. Testing answers is not enough; completeness is the
 * property that matters, so the fuzzer asserts it directly.
 *
 * ASSERTION IS DELIBERATELY NARROW. Which file a shell command executes is not
 * decidable statically, so this declines wherever it cannot be certain and says so.
 * It verifies less than a cleverer parser would and lies in neither direction — no
 * phantom findings (which train operators to ignore the gate, restoring the outage by
 * consent) and no false clean.
 */

import { readFileSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)$/i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const SHELL_META = /[;&|><`$(){}\[\]*?~!#^\n]|\\/;
const WIN_ENV = /%[A-Za-z_][A-Za-z0-9_]*%/;
/** Interpreter flags that take a FILE argument — their operand is not the entrypoint. */
const FLAG_TAKES_FILE = /^(?:-r|--require|--import|--loader|--experimental-loader|--inspect-brk|-c)$/;

/**
 * Classify one hook command. TOTAL function — always returns a verdict.
 * @param {unknown} cmd raw `command` value from a settings hook entry
 * @param {string} root repo root that relative paths resolve against
 * @returns {{kind:'OK'|'MISSING'|'UNVERIFIED', key:string, path?:string, why?:string}}
 */
export function classifyCommand(cmd, root) {
  if (typeof cmd !== 'string' || !cmd.trim()) {
    return { kind: 'UNVERIFIED', key: `empty:${typeof cmd}:${String(cmd)}`, why: 'hook entry has no usable "command" string — it registers nothing' };
  }
  const brief = cmd.length > 90 ? `${cmd.slice(0, 90)}…` : cmd;
  const unver = (why) => ({ kind: 'UNVERIFIED', key: cmd, why: `\`${brief}\` — ${why}; existence NOT verified` });

  // THE ONE CANONICAL IDIOM, resolved instead of declined (SOUL-delta gap sweep,
  // 2026-08-25). Every hook this repo registers uses the exact shape
  //     node "${CLAUDE_PROJECT_DIR:-.}/scripts/hooks/x.mjs" [args]
  // and the blanket quoting/meta declines below turned ALL of them — eleven entries —
  // into permanent UNVERIFIED noise at every session start. This module's own thesis
  // says sustained noise restores the outage by consent; a wall of false declines on
  // the repo's own canonical form is that failure, not caution. At hook runtime
  // `${CLAUDE_PROJECT_DIR:-.}` IS the project root (the harness sets it; `.` is the
  // fallback and hooks run from the root), which is exactly what `root` names here —
  // so the substitution loses nothing the runtime would have had.
  // DELIBERATELY NARROW: only the double-quoted, `:-.`-defaulted, slash-followed form,
  // and only when the quoted remainder has no spaces, quotes, or `$` (a quoted path
  // WITH a space needs its quotes, and any nested expansion is still undecidable —
  // both fall through to the declines below, unchanged). Bare `$CLAUDE_PROJECT_DIR`
  // and `${CLAUDE_PROJECT_DIR}` forms stay UNVERIFIED per the existing tests.
  cmd = cmd.replace(/"\$\{CLAUDE_PROJECT_DIR:-\.\}(\/[^"\s$]*)"/g, '.$1');

  // JS `\s` matches U+00A0 and friends; a shell does NOT treat them as separators.
  // `node ./a<NBSP>b.mjs` is one runnable file, but the split produced `b.mjs` as the
  // sole candidate and reported a healthy registration MISSING (round 8). Decline
  // rather than split on whitespace the shell would not have split on.
  // The separator set is SPACE, TAB and NEWLINE — nothing else.
  //
  // Round 8 wrote `[^\S \t\n\r\f\v]`, whitelisting VT, FF and CR as if they were
  // separators. A POSIX shell's blank set is space and tab (newline via IFS); VT and
  // FF are ORDINARY WORD CHARACTERS. So `node ./a<VT>b.mjs` — one real, runnable file
  // — passed this guard and was then split by `\s+` into two tokens, producing a
  // phantom MISSING. The inverse is worse: `./gate.mjs<VT>--local` split to an
  // existing `./gate.mjs` and returned OK, while the shell would try to exec
  // `gate.mjs<VT>--local`, fail, and leave the hook dead — silent clean.
  //
  // In other words the round-8 defect survived INSIDE the round-8 fix, in three ASCII
  // bytes. Found by a seat in round 9, which is the ninth round of this same class.
  if (/[^\S \t\n]/.test(cmd)) {
    return unver('contains whitespace a shell does not treat as an argument separator (only space, tab and newline are separators)');
  }
  if (/["']/.test(cmd)) return unver('contains quoting (a subcommand, or a path with spaces) that cannot be resolved statically');
  if (SHELL_META.test(cmd)) return unver('uses shell syntax (variable, glob, operator, subshell or escape)');
  if (WIN_ENV.test(cmd)) return unver('uses Windows environment interpolation');

  // Split on the SAME set the guard above accepts. Using `\s+` here while the guard
  // allowed a wider set is precisely how round 8's fix contradicted itself.
  const words = cmd.trim().split(/[ \t\n]+/);
  const candidates = words.filter((w) => SCRIPT_EXT.test(w) && !URL_SCHEME.test(w));

  if (candidates.length === 0) {
    return unver('no argument carries a recognised script extension, so the registered file could not be identified');
  }
  if (candidates.length > 1) {
    return unver(`names ${candidates.length} script paths (${candidates.join(', ')}) — cannot tell which is the entrypoint`);
  }

  // ONE extension-bearing argument is not yet proof it is the entrypoint. In
  // `node --import ./preload.mjs ./guard`, the only .mjs is the LOADER and the real
  // entrypoint is extensionless — asserting the loader returns OK while the
  // registered guard is never inspected. Silent clean, found in round 6 after round
  // 5 closed only the two-extension subset of the same class.
  const idx = words.indexOf(candidates[0]);
  if (idx > 0 && FLAG_TAKES_FILE.test(words[idx - 1])) {
    return unver(`its only script path is the operand of ${words[idx - 1]}, so the real entrypoint is some other argument`);
  }

  // The candidate must be the FIRST bare operand, not a later argument.
  //
  // `node hooks/pre load.mjs` — an unquoted path containing a space — presents to the
  // shell as TWO arguments, so it runs `hooks/pre` and passes `load.mjs` along. The
  // classifier saw exactly one extension-bearing token and asserted about `load.mjs`:
  // a confident verdict about a file that is not the entrypoint. Found by the fuzzer's
  // identity oracle the moment it was added — the existence-only oracle had been
  // green on it for two rounds.
  //
  // NO RUNNER WHITELIST. The first version listed known interpreters and declined on
  // any other bare word before the candidate. All five seats of the confirming round
  // found the same flaw independently: a whitelist cannot enumerate reality. It
  // wrongly declined `deno run x.ts`, `sudo node x.mjs`, `/usr/bin/env node x.mjs`,
  // `python3.12 x.py`, `yarn tsx x.ts`, `./node_modules/.bin/tsx x.ts` — every one a
  // legitimate registration turned into permanent UNVERIFIED noise. This module's own
  // thesis is that sustained noise restores the outage by consent, so trading a
  // wrong-file assertion for a wall of false declines is not a win.
  //
  // Worse, the whitelist created a false OK: in `sh -c node x.mjs` the `-c` operand is
  // `node` — a listed runner — so nothing looked stray, and the classifier returned OK
  // about `x.mjs`, which becomes $0 and never executes. A dead guard certified healthy.
  //
  // The structural rule needs no list: THE CANDIDATE MUST BE THE FIRST BARE OPERAND
  // AFTER THE COMMAND WORD. That is the only position an entrypoint can occupy in a
  // shape we can read. Everything else — a subcommand (`deno run`), a wrapper
  // (`sudo node`), an interpreter passed to another interpreter (`sh -c node`) — puts
  // some other word there, and we decline rather than guess which one wins.
  // When the COMMAND WORD is itself a path, that file is the entrypoint and anything
  // after it is an argument. `hooks/pre load.mjs` (an unquoted path with a space)
  // executes `hooks/pre` and passes `load.mjs` — the classifier was asserting about
  // `load.mjs`. Found by the fuzzer's identity oracle after the operand rule landed,
  // on the same fixture that motivated the rule: the fix moved the wrong-file
  // assertion one position rather than removing it.
  if (candidates[0] !== words[0] && /[/\\]/.test(words[0])) {
    return unver(`\`${words[0]}\` is itself a path, so IT is the entrypoint and the candidate is an argument to it`);
  }

  const firstOperand = words.slice(1).find((w) => !w.startsWith('-'));
  if (firstOperand !== candidates[0]) {
    return unver(`\`${firstOperand}\` is the first operand, not the script path, so the entrypoint is that word and the candidate is an argument to it`);
  }

  const tok = candidates[0];

  // ...and the EQUALS form is the same defect wearing one token. `--import=./x.mjs`
  // ends in `.mjs`, so it became the sole candidate; the guard above inspects only
  // the PRECEDING word (`node`), never inside the token; and statSync then looked
  // for a literal file named `--import=./x.mjs` and reported a healthy registration
  // as MISSING. All four seats found this in round 7 — round 6 had closed only the
  // space-separated subset. Any candidate beginning with `-` is a flag, not a path.
  if (tok.startsWith('-')) {
    return unver(`its only script path is embedded in the option \`${tok}\`, so the real entrypoint is some other argument`);
  }
  // An absolute path is meaningful only on the machine it names — whether or not a
  // file happens to sit there now. Judging only one half is half a claim.
  if (tok.startsWith('/') || /^[A-Za-z]:\//.test(tok)) {
    return unver('names an absolute path, which is meaningful only on the target machine');
  }

  // A token carrying `=` or `:` is not a plain path. Round 9 found two phantoms of
  // this shape: `FOO=bar.mjs node app` (a shell env-assignment, where the "path" is
  // an assignment VALUE and the hook runs fine) and `docker run -v ./a.sh:/a.sh img`
  // (a bind-mount spec, stat'd as one literal filename). Both reported MISSING —
  // "your protection is off" — about healthy registrations.
  if (tok.includes('=') || tok.includes(':')) {
    return unver(`\`${tok}\` is not a plain path (it carries an assignment or a mount/host separator), so the entrypoint could not be identified`);
  }

  // `..` cannot be judged, because `resolve()` collapses it LEXICALLY before
  // realpathSync ever runs. Given `link/../x.mjs` where `link` is a symlink, the
  // lexical collapse yields `<root>/x.mjs` — comfortably inside the root — while the
  // real target is somewhere else entirely, so containment passes on a path that
  // escapes. Round 8 added realpath containment believing it closed this; round 9
  // showed the collapse happens first and defeats it. Declining is the honest answer.
  if (tok.split(/[/\\]/).includes('..')) {
    return unver('contains a `..` segment, which resolves lexically before symlinks are followed, so containment cannot be established');
  }

  // `..` can resolve outside the repo, where a hit proves nothing about the
  // registered target and a miss is not ours to report. Decline rather than answer
  // confidently about a different file (round 6).
  //
  // Checked on the REAL path, not the lexical one: the lexical form stays inside the
  // root while statSync happily follows a symlinked directory out of it, so `..` was
  // declined and the symlink route was permitted — the same containment claim
  // enforced in one direction and not the other (round 7). realpathSync is the only
  // form that answers the question actually being asked.
  const abs = resolve(root, tok);
  // `inside(child, parent)` without the `parent + sep` trap: at a filesystem root
  // `resolve('/') + sep` is `'//'`, which nothing starts with, so every candidate
  // would decline. Unlikely for a repo root, but this function is exported and takes
  // `root` from its caller (round 8).
  const inside = (child, parent) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);

  if (!inside(abs, resolve(root))) {
    return unver('resolves outside the repository, so its target cannot be judged from here');
  }

  // The realpath containment applies ONLY when realpath actually resolved.
  //
  // Round 7 fell back to the LEXICAL path when realpathSync threw and then compared
  // it against the RESOLVED root — so on any checkout whose root contains a symlink
  // (macOS /tmp -> /private/tmp, CI workspaces, container mounts) the two could never
  // match, and a genuinely absent hook file was demoted from the loud MISSING alarm
  // to "could not be verified". That is precisely the alarm this module exists to
  // raise, neutered by its own containment fix. Three seats found it in round 8.
  //
  // Correct shape: an absent file cannot escape through a symlink, because there is
  // no link to follow. The lexical check above is sufficient for it, and it must be
  // allowed to fall through to statSync and be reported MISSING.
  let real = null;
  try { real = realpathSync(abs); } catch { /* absent — nothing to follow; lexical check stands */ }
  if (real !== null) {
    let rootReal;
    try { rootReal = realpathSync(root); } catch { rootReal = resolve(root); }
    if (!inside(real, rootReal)) {
      return unver('resolves outside the repository via a symlink, so its target cannot be judged from here');
    }
  }

  // isFile, not exists: a DIRECTORY named `x.mjs` satisfies existsSync and would let
  // a phantom registration read as healthy. ENOENT is a genuine absence; any other
  // errno means the file may exist and we merely could not look — reporting that as
  // "DOES NOT EXIST" is a false claim in the loud path, which is how a gate loses trust.
  try {
    return statSync(abs).isFile()
      ? { kind: 'OK', key: tok }
      : { kind: 'MISSING', key: tok, path: tok };
  } catch (e) {
    // ENOTDIR joins ENOENT: a path component that must be a directory is a regular
    // file, so the path CANNOT resolve — that is a certain absence, not an "it may
    // exist but be unreadable". Demoting it to UNVERIFIED softened a certain alarm
    // (round 9).
    if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') return { kind: 'MISSING', key: tok, path: tok };
    return unver(`could not stat ${tok} (${e?.code || 'unknown error'}) — it may exist but be unreadable`);
  }
}
