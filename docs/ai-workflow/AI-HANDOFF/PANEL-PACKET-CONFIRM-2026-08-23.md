# Hostile review — CONFIRMING ROUND on the six-seat session fixes (2026-08-23)

The prior round found 5 real defects (3 more were disproven). **This reviews those five fixes.**
Files below are COMPLETE. A fix is the most likely place for the next bug.

## The five fixes

1. **HY3 seat shipped broken** — its script has its own spend gate; the seat args omitted
   `--confirm-spend`, so it ran preflight, wrote nothing, and EXITED 0. Now passes the flag + a cap.
2. **Panel reported `null`** for exit-0-with-no-output. Now names the state and the likely cause.
3. **Fuzzer oracle checked EXISTENCE, not IDENTITY** — `isFile(v.key)` passes for any existing file,
   so a wrong-but-existing path passed. Added P4 IDENTITY with ground truth from the generator.
4. **P4 immediately found a real classifier bug**: `node hooks/pre load.mjs` (unquoted space) is TWO
   shell args; the classifier asserted about `load.mjs` instead of the real entrypoint `hooks/pre`.
   Now declines when a bare non-runner operand precedes the candidate.
5. **Degenerate fuzz runs reported proof** — `--iterations 0`/NaN printed a warning then
   "all properties held", exit 0. Now exits 2 and never prints the pass line.
6. **Gemini seed** — a typo silently dropped context; a directory threw EISDIR raw. Both refuse now.

## Questions

- Does the new RUNNERS/stray-operand rule reject any LEGITIMATE registration? (False decline = lost coverage.)
- Can P4 IDENTITY itself produce a false failure, or be satisfied by a wrong verdict?
- Is the degenerate-run detection complete, or is there still a shape that reports proof having tested nothing?
- Any defect in the seat registry or the panel result handling?
- **If you find nothing, say so plainly. Do not invent filler.**

## FILE: scripts/lib/hook-registration.mjs (COMPLETE)

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
  // Anything bare before the candidate that is not a recognised runner means the real
  // entrypoint is that earlier word. Declining costs a little coverage on exotic
  // invocations and removes the wrong-file assertion class entirely.
  const RUNNERS = /^(?:node|npx|npm|bun|deno|tsx|ts-node|bash|sh|zsh|python3?|ruby|pwsh|powershell|env)$/i;
  const before = words.slice(0, words.indexOf(candidates[0]));
  const strayOperand = before.find((w) => !w.startsWith('-') && !RUNNERS.test(w));
  if (strayOperand) {
    return unver(`\`${strayOperand}\` precedes the only script path, so IT is the entrypoint and the candidate is an argument`);
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

## FILE: scripts/hooks/drift-check-gate.fuzz.mjs (COMPLETE)

```javascript
#!/usr/bin/env node
/**
 * drift-check-gate.fuzz.mjs — property-based round on check 7's classifier.
 * =========================================================================
 * WHY A FUZZER, AFTER NINE PANEL ROUNDS: every round so far was the same vantage —
 * a model reading the file. That found ~43 real defects, but the last two lived
 * INSIDE the previous round's fix, which is a loop feeding itself. Reading cannot
 * escape it. This round changes the instrument.
 *
 * A reader checks cases it thought of. A fuzzer checks PROPERTIES over inputs nobody
 * thought of — which is the only way to attack a bug class whose signature is
 * "some input we did not consider falls through".
 *
 * THE THREE PROPERTIES, each mapping to a failure this loop actually shipped:
 *
 *   P1 TOTALITY      every input yields exactly one of OK|MISSING|UNVERIFIED.
 *                    Rounds 1-5 each shipped an input that yielded nothing, and
 *                    nothing is byte-identical to "checked and healthy".
 *
 *   P2 NO-PHANTOM    MISSING implies the asserted path is genuinely not a file.
 *                    Rounds 2,3,7,9 each reported a healthy registration missing.
 *                    A phantom trains the operator to ignore the gate, which
 *                    restores the original outage by consent.
 *
 *   P3 NO-FALSE-OK   OK implies the asserted path IS a file on disk. Round 9 found
 *                    a command that split to an existing file and returned OK while
 *                    the shell would have failed to exec the real token.
 *
 * Deterministic by seed so a failure is reproducible: `--seed 12345`.
 * Run: node scripts/hooks/drift-check-gate.fuzz.mjs [--iterations N] [--seed S]
 */
import { statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCommand } from '../lib/hook-registration.mjs';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const ITERATIONS = Number(arg('--iterations', '20000'));
const SEED = Number(arg('--seed', '1'));

/** xorshift32 — deterministic, so any failure reproduces from its seed alone. */
let state = SEED >>> 0 || 1;
const rnd = () => {
  state ^= state << 13; state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5; state >>>= 0;
  return state / 0x100000000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const maybe = (p) => rnd() < p;

// A real sandbox: some of these files exist, some do not. The properties below are
// checked against the ACTUAL filesystem, not against expectations.
const root = mkdtempSync(join(tmpdir(), 'hookfuzz-'));
mkdirSync(join(root, 'hooks'), { recursive: true });
mkdirSync(join(root, 'nested', 'deep'), { recursive: true });
writeFileSync(join(root, 'hooks', 'present.mjs'), '// real\n');
writeFileSync(join(root, 'nested', 'deep', 'also.sh'), '# real\n');
mkdirSync(join(root, 'hooks', 'dir-named.mjs'), { recursive: true }); // a DIRECTORY

const INTERPRETERS = ['node', 'npx', 'bash', 'sh', 'python3', 'node --enable-source-maps', ''];
const PATHS = [
  'hooks/present.mjs', './hooks/present.mjs', 'nested/deep/also.sh',
  'hooks/absent.mjs', './hooks/absent.mjs', 'hooks/dir-named.mjs',
  'hooks/present', 'hooks/present.MJS', 'nested/../hooks/present.mjs',
  '/abs/hooks/x.mjs', 'C:/abs/hooks/x.mjs', '../outside/x.mjs',
  'hooks/pre load.mjs', 'hooks/a.mjs:b.mjs', 'FOO=x.mjs',
];
const FLAGS = ['', '--flag', '-r ./hooks/present.mjs', '--import=./hooks/present.mjs',
  '--emit out.mjs', '--ref nested/deep/also.sh', '-e'];
const NOISE = ['', ';echo hi', ' && node b.mjs', ' | tee log', ' # comment',
  ' $VAR', ' ${VAR}', ' %VAR%', ' ~/x', ' *.mjs', ' `id`', ' (sub)'];
const WEIRD_WS = ['', '\u00A0', '\u000B', '\u000C', '\r', '\u2003', '\u3000'];
const QUOTES = ['', '"', "'"];

/**
 * Generate one command.
 *
 * The FIRST version of this generator appended shell noise on nearly every draw, so a
 * 20k run produced 19,896 UNVERIFIED against 39 OK and 65 MISSING — it reported "all
 * properties held" while barely exercising the two properties that matter (P2 and P3
 * only have teeth on the assert path). A fuzzer that green-lights a corpus it never
 * drove is the same silence-looks-like-success failure this module exists to kill,
 * relocated into the instrument.
 *
 * So the corpus is now deliberately WEIGHTED: roughly half plain commands that reach
 * the assert path, half adversarial. The verdict histogram is printed and a run that
 * fails to produce both OK and MISSING declares its own coverage incomplete.
 */
function generate() {
  if (maybe(0.02)) return { cmd: pick([undefined, null, '', '   ', 42, {}, []]), intended: null };

  // ~55%: plain, assertable — these drive P2/P3 and carry GROUND TRUTH.
  //
  // The intended entrypoint is returned alongside the command, because knowing WHICH
  // token the classifier should have picked is the difference between checking
  // existence and checking identity. The first version threw this away, and that made
  // P2/P3 unable to catch the very class they were written for (see the oracle below).
  if (maybe(0.55)) {
    const target = pick(PATHS);
    const parts = [pick(['node', 'npx', 'bash', 'node --enable-source-maps']), target];
    if (maybe(0.25)) parts.push('--flag');
    // Ground truth is only claimable when the shell would actually see ONE argument.
    // An unquoted path containing a space is two arguments, so "intended" would be a
    // fiction and P4 would fail the classifier for being right. The instrument must
    // not assert something the shell cannot express.
    const coherent = !/\s/.test(target);
    return { cmd: parts.join(' '), intended: coherent ? target : null };
  }

  // ~45%: adversarial — quoting, weird whitespace, flags, shell noise.
  const q = pick(QUOTES);
  let p = pick(PATHS);
  if (maybe(0.25)) {
    const w = pick(WEIRD_WS);
    if (w) p = p.slice(0, 3) + w + p.slice(3);
  }
  if (q) p = q + p + q;
  const parts = [pick(INTERPRETERS), pick(FLAGS), p].filter(Boolean);
  if (maybe(0.3)) parts.push(pick(FLAGS));
  // Adversarial: no ground truth claimed — these drive P1 and the decline paths.
  return { cmd: parts.join(' ') + pick(NOISE), intended: null };
}

const KINDS = ['OK', 'MISSING', 'UNVERIFIED'];
const isFile = (rel) => { try { return statSync(resolve(root, rel)).isFile(); } catch { return false; } };

const failures = [];
const record = (prop, cmd, detail) => {
  if (failures.length < 12) failures.push({ prop, cmd, detail });
};

const counts = { OK: 0, MISSING: 0, UNVERIFIED: 0 };

for (let i = 0; i < ITERATIONS; i += 1) {
  const { cmd, intended } = generate();
  let v;
  try {
    v = classifyCommand(cmd, root);
  } catch (e) {
    record('P1 TOTALITY (threw)', cmd, e?.message || String(e));
    continue;
  }

  // P1 — exactly one legal verdict, always.
  if (!v || !KINDS.includes(v.kind)) {
    record('P1 TOTALITY', cmd, `verdict=${JSON.stringify(v)}`);
    continue;
  }
  counts[v.kind] += 1;

  // P2 — MISSING must name a path that genuinely is not a file. Any MISSING on a
  // real file is a phantom in the loud path.
  if (v.kind === 'MISSING') {
    if (typeof v.path !== 'string' || !v.path) {
      record('P2 NO-PHANTOM (no path)', cmd, `verdict=${JSON.stringify(v)}`);
    } else if (isFile(v.path)) {
      record('P2 NO-PHANTOM', cmd, `reported MISSING but ${v.path} IS a file`);
    }
  }

  // P3 — OK must name a path that IS a file. An OK on a non-file is a false clean,
  // which is the outage this whole module exists to prevent.
  if (v.kind === 'OK') {
    if (typeof v.key !== 'string' || !isFile(v.key)) {
      record('P3 NO-FALSE-OK', cmd, `returned OK but ${v.key} is not a file`);
    }
  }

  // P4 IDENTITY — the verdict must be about the RIGHT file, not merely about A file.
  //
  // P2 and P3 alone check EXISTENCE, and existence is not identity. A classifier bug
  // that returns a wrong-but-existing path passes P3 with a green light: given
  // `node -r ./hooks/present.mjs hooks/absent.mjs`, a classifier keying on the first
  // path-like token returns {OK, key:'./hooks/present.mjs'} — that file exists, P3
  // passes, exit 0 — while the REAL entrypoint is missing and the gate certifies a
  // broken registration. That is round 9's false-OK class surviving the instrument
  // built to catch it, and two seats found it by reading the oracle rather than the
  // subject. The plain branch knew the intended token all along and discarded it.
  if (intended && (v.kind === 'OK' || v.kind === 'MISSING')) {
    const named = v.kind === 'OK' ? v.key : v.path;
    // Normalise only the leading `./` — anything else differing is a real mismatch.
    const norm = (x) => String(x).replace(/^\.\//, '');
    if (norm(named) !== norm(intended)) {
      record('P4 IDENTITY', cmd, `asserted about ${named} but the intended entrypoint was ${intended}`);
    }
  }
}

rmSync(root, { recursive: true, force: true });

console.log(`  seed=${SEED}  iterations=${ITERATIONS}`);
console.log(`  verdicts: OK=${counts.OK}  MISSING=${counts.MISSING}  UNVERIFIED=${counts.UNVERIFIED}`);
// A run that never produced an OK or a MISSING proved nothing about P2/P3/P4. The
// first version printed a warning and then exited 0 with "all properties held" — so
// `--iterations 0`, a bad `--iterations` string (Number -> NaN, loop never entered),
// or a classifier that only ever returns UNVERIFIED would all report PROVEN having
// tested nothing. In CI that is indistinguishable from a real pass. Silence looking
// like success, inside the instrument written to hunt exactly that. (Found by a seat
// reading the oracle rather than the subject, 2026-08-23.)
const degenerate = !Number.isFinite(ITERATIONS) || ITERATIONS <= 0 || !counts.OK || !counts.MISSING;
if (degenerate) {
  console.log('  ⚠ DEGENERATE RUN — the corpus did not exercise both OK and MISSING, so P2/P3/P4 proved nothing.');
  console.log('  ⚠ This is NOT a pass. Exiting non-zero so it cannot be mistaken for one.');
}
if (failures.length) {
  console.log(`\n  ${failures.length} PROPERTY VIOLATION(S):`);
  for (const f of failures) console.log(`    ${f.prop}\n      cmd:    ${JSON.stringify(f.cmd)}\n      detail: ${f.detail}`);
  process.exit(1);
}
// A degenerate corpus must never print the pass line, let alone exit 0. Printing a
// warning and then "all properties held" was the worst of both: the reassuring
// sentence is the one a human remembers and the exit code is the one CI reads.
if (degenerate) process.exit(2);
console.log('\n  all properties held');
process.exit(0);

```
