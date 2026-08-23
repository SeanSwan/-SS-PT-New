# Hostile review ROUND 9 — dry-check (2026-08-23)

Rounds 1-8 found 8+6+7+8+4+6+4+4 defects, all fixed. **This reviews the round-8 fixes.**

Both files COMPLETE below — nothing elided.

## Round-8 fixes to attack

1. **Regression fix**: realpath containment now applies ONLY when realpathSync resolved.
   R7 fell back to the LEXICAL path on ENOENT and compared it to the RESOLVED root, so on a
   symlinked root a genuinely MISSING file was demoted to UNVERIFIED. Proven fixed with a junction.
2. `hooks: null` is now a finding (`in` distinguishes absent-key from present-and-null).
3. Non-ASCII whitespace declined (JS \s matches U+00A0; shells do not split on it).
4. Containment helper cannot emit a double separator at a filesystem root.
5. Exit-code contract DOCUMENTED (behaviour unchanged: SessionStart advisory, stdout is the signal).

## The invariant

Every hook entry returns EXACTLY ONE verdict: OK | MISSING | UNVERIFIED. No path returns nothing.

## Questions

- Can ANY input yield zero verdicts (silent clean)? Eight rounds have each found one.
- Can a HEALTHY registration read MISSING (phantom)?
- Can a MISSING file be DEMOTED to UNVERIFIED? That was round 8s regression — is it fully closed?
- **If you find nothing, say so plainly. A clean verdict is useful data; do not invent filler.**

## FILE: scripts/lib/hook-registration.mjs (COMPLETE, 270 lines)

```javascript
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

  // JS `\s` matches U+00A0 and friends; a shell does NOT treat them as separators.
  // `node ./a<NBSP>b.mjs` is one runnable file, but the split produced `b.mjs` as the
  // sole candidate and reported a healthy registration MISSING (round 8). Decline
  // rather than split on whitespace the shell would not have split on.
  if (/[^\S \t\n\r\f\v]/.test(cmd)) {
    return unver('contains non-ASCII whitespace, which a shell does not treat as an argument separator');
  }
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

    // The ROOT must be a plain object before anything is read off it. Round 6 guarded
    // the `hooks` VALUE and not the document: a settings.json containing `[]`, `42`
    // or `"str"` left `cfg.hooks` undefined, skipped the guard below, iterated zero
    // times and reported clean — the 2026-08-22 outage signature, one level up from
    // the entries whose silence this module exists to make unrepresentable. A literal
    // `null` was worse: `cfg.hooks` threw, the exception escaped, and the caller's
    // catch replaced the WHOLE audit — including any already-confirmed MISSING — with
    // a generic "could not complete", demoting a certain alarm to unknown. (Round 7.)
    if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) {
      shape.push(`.claude/${name} is valid JSON but its root is ${cfg === null ? 'null' : Array.isArray(cfg) ? 'an array' : typeof cfg}, not an object — the harness registers NOTHING from it`);
      continue;
    }

    // `hooks` must be a plain object if the key is PRESENT at all.
    //
    // Round 7 wrote `cfg.hooks != null`, which is false for null — so `hooks: null`
    // skipped the guard, `Object.entries(null || {})` iterated zero times, and the
    // audit reported clean. Every other bad shape (`false`, `"str"`, `42`, `[]`)
    // produced a finding; only null was silently equated with absent. A duplicate-key
    // hand-edit or bad merge yielding `{"hooks": {...}, "hooks": null}` parses fine
    // (last wins), discards every real registration, and read as healthy. That is the
    // 2026-08-22 outage signature one level up — round EIGHT of the same class.
    //
    // `in` distinguishes "key absent" (legitimate) from "key present and null" (a
    // config that registers nothing), which `!= null` cannot.
    if ('hooks' in cfg && (cfg.hooks === null || typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks))) {
      const what = cfg.hooks === null ? 'null' : Array.isArray(cfg.hooks) ? 'an array' : typeof cfg.hooks;
      shape.push(`.claude/${name} has a "hooks" value that is ${what}, not an object — nothing it declares can register`);
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

```

## FILE: scripts/hooks/drift-check-gate.mjs — check 7 + emit (COMPLETE tail)

```javascript
// ---- 7) Hook-registration integrity ---------------------------------------
//
// A registered guard whose FILE IS ABSENT emits nothing — byte-identical to a
// healthy guard that found no problems. That ambiguity hid two missing hooks on
// this branch for weeks (2026-08-22); it was only ever caught by a human noticing
// a second-order symptom from outside. Registration is not existence.
//
// The classifier lives in scripts/lib/hook-registration.mjs so there is ONE
// implementation and the test imports it rather than mirroring it. Six hostile
// rounds are recorded there, along with the invariant they produced: every hook
// entry yields exactly one verdict, so silence is unrepresentable.
try {
  const { auditHookRegistrations } = await import(
    new URL('../lib/hook-registration.mjs', import.meta.url)
  );
  const audit = auditHookRegistrations(SS_PT);
  // The scope note ships WITH the findings. Round 6 computed it and the caller
  // dropped it on the floor, so a limitation the module deliberately surfaced was
  // never once seen by an operator — a check advertising "hook-registration
  // integrity" while silently covering only project scope. Two seats caught that
  // the deliverable was computed, not emitted. (Round 7.)
  if (audit.findings.length) {
    findings.push(...audit.findings, `hook-registration coverage: ${audit.scopeNote}`);
  }
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. A guard that cannot run must SAY it could not run;
  // reporting nothing would be the very ambiguity this check exists to remove.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

// ---- Emit: silent when clean ----------------------------------------------
if (findings.length) {
  process.stdout.write(
    '[drift-check] ⚠ ' + findings.length + ' drift finding(s) — a doc that reads as ' +
    'authoritative may be wrong:\n' +
    findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n') +
    '\nFull procedure (7 checks incl. stale registry, stale index, missing tooling, ' +
    'guard coverage gaps, hook-registration integrity): .claude/skills/drift-check/SKILL.md\n'
  );
}

// EXIT CODE CONTRACT — always 0, deliberately, even with a confirmed MISSING.
//
// Three panel seats read the unconditional 0 as a defect in round 8 ("the gate cannot
// gate"), and the reasoning is sound for a CI check. It is wrong for THIS one, and the
// contract was never written down, which is the actual defect they found.
//
// This is a SessionStart hook. A non-zero exit here does not fail a build — it risks
// failing the operator's session, on a repo that is merely drifted. Blocking every
// session because a hook file is absent would trade a silent gap for a hard stop on
// unrelated work, and the first thing anyone would do is disable the hook. That is
// the same outage arriving through the operator's own frustration.
//
// The SIGNAL here is stdout, not the exit status, and stdout is silent when clean —
// so anything printed is already the alarm. Enforcement that must BLOCK belongs in a
// PreToolUse or Stop gate, where refusing is proportionate.
//
// exitCode rather than process.exit(): when stdout is a pipe (always, under the
// harness) Node queues writes asynchronously and process.exit() tears the loop down
// without draining. MISSING findings are appended LAST, so under backpressure the
// highest-severity alarm truncates first — a diagnostic whose whole contract is
// "never silently lose the signal", losing it nondeterministically. (Round 6.)
process.exitCode = 0;

```
