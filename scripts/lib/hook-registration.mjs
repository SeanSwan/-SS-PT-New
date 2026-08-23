/**
 * hook-registration.mjs — is every hook a config registers actually there?
 * ========================================================================
 * Extracted from scripts/hooks/drift-check-gate.mjs 2026-08-23 (panel round 6):
 * check 7 had grown the gate past the 300-line cap (Rule 4), and keeping the
 * classifier in the hook meant the test had to MIRROR it rather than import it —
 * a mirror that drifts is worse than no test. Now there is one implementation and
 * the test exercises it directly.
 *
 * THE FAILURE THIS EXISTS FOR (2026-08-22, found by a human from outside the system):
 * `.claude/settings.json` registered two hooks whose files did not exist on the
 * branch. The harness cannot run a file it cannot find, so it emitted NOTHING — and
 * nothing is byte-identical to what a healthy guard that found no problems emits.
 * Every session read as clean while the coordination ledger went unread for weeks
 * and pushes went unguarded. Registration is not existence.
 *
 * THE INVARIANT, learned the hard way over six hostile-review rounds:
 *
 *     every hook entry returns EXACTLY ONE verdict: OK | MISSING | UNVERIFIED
 *     no path returns nothing — silence is unrepresentable
 *
 * Five successive rewrites each shipped with some input that fell through every
 * branch and produced no output. One of them shipped a PASSING TEST asserting that
 * `sh -c '...'` yields nothing, codifying the outage as correct behaviour. Testing
 * answers is not enough; the completeness of the classification is the property
 * that matters, so the test fuzzes for it.
 *
 * ASSERTION IS DELIBERATELY NARROW. Determining which file a shell command executes
 * is not decidable statically, so this declines wherever it cannot be certain and
 * says so. It verifies less than a cleverer parser would and lies in neither
 * direction — no phantom findings (which train operators to ignore the gate, which
 * restores the original outage by consent) and no false clean.
 */
import { readFileSync, statSync } from 'node:fs';
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

  if (/["']/.test(cmd)) return unver('contains quoting (a subcommand, or a path with spaces) that cannot be resolved statically');
  if (SHELL_META.test(cmd)) return unver('uses shell syntax (variable, glob, operator, subshell or escape)');
  if (WIN_ENV.test(cmd)) return unver('uses Windows environment interpolation');

  // Safe now: no quotes and no escapes remain, so whitespace split is faithful.
  const words = cmd.trim().split(/\s+/);
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

  const tok = candidates[0];
  // An absolute path is meaningful only on the machine it names — whether or not a
  // file happens to sit there now. Judging only one half is half a claim.
  if (tok.startsWith('/') || /^[A-Za-z]:\//.test(tok)) {
    return unver('names an absolute path, which is meaningful only on the target machine');
  }

  // `..` can resolve outside the repo, where a hit proves nothing about the
  // registered target and a miss is not ours to report. Decline rather than answer
  // confidently about a different file (round 6).
  const abs = resolve(root, tok);
  if (!abs.startsWith(resolve(root) + sep)) {
    return unver('resolves outside the repository, so its target cannot be judged from here');
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
    if (e?.code === 'ENOENT') return { kind: 'MISSING', key: tok, path: tok };
    return unver(`could not stat ${tok} (${e?.code || 'unknown error'}) — it may exist but be unreadable`);
  }
}

/**
 * Audit every hook registration in a repo's project-scope settings files.
 * @returns {{findings: string[], scopeNote: string}}
 */
export function auditHookRegistrations(root) {
  const missing = [];
  const unresolvable = [];
  const shape = [];
  const seen = new Set();

  for (const name of ['settings.json', 'settings.local.json']) {
    let raw;
    try {
      raw = readFileSync(join(root, '.claude', name), 'utf-8');
    } catch (e) {
      // Absent is legitimate (settings.local.json is optional). UNREADABLE is not —
      // collapsing both to "skip" is silence-means-clean one layer above the hooks.
      if (e?.code !== 'ENOENT') {
        shape.push(`.claude/${name} exists but could not be read (${e?.code || 'unknown'}) — the hooks it registers were NOT checked`);
      }
      continue;
    }

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      shape.push(`.claude/${name} is not valid JSON — the harness runs NONE of the hooks it declares`);
      continue;
    }

    // A truthy non-object `hooks` slips through `|| {}` and yields zero iterations.
    if (cfg.hooks != null && (typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks))) {
      shape.push(`.claude/${name} has a "hooks" value that is ${Array.isArray(cfg.hooks) ? 'an array' : typeof cfg.hooks}, not an object — nothing it declares can register`);
      continue;
    }

    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      if (!Array.isArray(groups)) {
        shape.push(`${event} in ${name} is ${groups === null ? 'null' : typeof groups}, not an array — hooks there may not run at all`);
        continue;
      }
      for (const group of groups) {
        if (!Array.isArray(group?.hooks)) {
          shape.push(`a group under ${event} in ${name} has no hooks array — that group registers nothing`);
          continue;
        }
        for (const hook of group.hooks) {
          const v = classifyCommand(hook?.command, root);
          const dedupe = `${name}:${event}:${v.kind}:${v.key}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          if (v.kind === 'MISSING') missing.push(`${v.path} (${event}, ${name})`);
          else if (v.kind === 'UNVERIFIED') unresolvable.push(`${event}, ${name}: ${v.why}`);
          // OK is the only verdict that produces no output.
        }
      }
    }
  }

  const findings = [];
  if (shape.length) {
    findings.push(`${shape.length} hook CONFIG problem(s): ${shape.join('; ')}`);
  }
  if (unresolvable.length) {
    findings.push(
      `${unresolvable.length} hook registration(s) could NOT be verified: ${unresolvable.join('; ')}. ` +
      'This is UNKNOWN, not clean — check these by hand.'
    );
  }
  if (missing.length) {
    findings.push(
      `${missing.length} registered hook file(s) DO NOT EXIST: ${missing.join('; ')}. ` +
      'A hook the harness cannot find emits nothing, which is indistinguishable from a ' +
      'hook that ran and found no problems — so this protection is off and reads as on. ' +
      'Restore the file(s) or remove the registration; do not leave a phantom guard.'
    );
  }
  return {
    findings,
    // Stated so "hook-registration integrity" is never read as broader than it is.
    scopeNote: 'project scope only (.claude/settings.json, settings.local.json); user-global and managed settings are NOT inspected',
  };
}
