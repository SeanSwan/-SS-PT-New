#!/usr/bin/env node
/**
 * drift-check-gate.test.mjs — check 7 (hook-registration integrity) case matrix.
 * ==============================================================================
 * WHY THIS FILE EXISTS: check 7 was rewritten five times in one session, and each
 * rewrite reintroduced the failure it was written to prevent — an input that fell
 * through every branch and produced NO output, which is byte-identical to "checked
 * and healthy". Round 3 even shipped a passing test asserting that a `sh -c '...'`
 * command yields nothing, codifying the outage as correct behaviour.
 *
 * So this file tests TWO different things, and the second one is the important one:
 *   1. Known cases classify correctly.
 *   2. THE INVARIANT — every input yields exactly one verdict. Silence is
 *      unrepresentable. Testing answers alone is what let four rewrites ship with a
 *      silent path; only a completeness check catches that class.
 *
 * Run: node scripts/hooks/drift-check-gate.test.mjs
 * Exit 0 = pass. Non-zero = a case regressed or the invariant broke.
 *
 * This mirrors classifyCommand() rather than importing it, because the gate is a
 * side-effecting hook that reads the real .claude/settings.json at import time.
 * If you change the classifier, change this mirror in the same commit — a mirror
 * that drifts is worse than no test.
 */
import { statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SS_PT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)$/i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const SHELL_META = /[;&|><`$(){}\[\]*?~!#^\n]|\\/;

/** Mirror of drift-check-gate.mjs classifyCommand(). Total function. */
function classifyCommand(cmd) {
  if (typeof cmd !== 'string' || !cmd.trim()) return { kind: 'UNVERIFIED', why: 'no command' };
  const unver = (why) => ({ kind: 'UNVERIFIED', why });
  if (/["']/.test(cmd)) return unver('quoting');
  if (SHELL_META.test(cmd)) return unver('shell syntax');
  if (/%[A-Za-z_][A-Za-z0-9_]*%/.test(cmd)) return unver('windows env');

  const words = cmd.trim().split(/\s+/);
  const candidates = words.filter((w) => SCRIPT_EXT.test(w) && !URL_SCHEME.test(w));
  if (candidates.length === 0) return unver('no script extension');
  if (candidates.length > 1) return unver('multiple script paths');

  const tok = candidates[0];
  if (tok.startsWith('/') || /^[A-Za-z]:\//.test(tok)) return unver('absolute path');
  try {
    return statSync(join(SS_PT, tok)).isFile()
      ? { kind: 'OK' } : { kind: 'MISSING', path: tok };
  } catch (e) {
    if (e?.code === 'ENOENT') return { kind: 'MISSING', path: tok };
    return unver(`stat failed: ${e?.code}`);
  }
}

const REAL = 'scripts/hooks/drift-check-gate.mjs';
const GONE = 'scripts/hooks/definitely-not-here.mjs';

const cases = [
  // OK is the ONLY silent verdict — reserved for a plain command naming one present file
  [`node ${REAL}`, 'OK', 'plain healthy registration'],
  [`node ${REAL} --flag`, 'OK', 'plain args do not confuse it'],

  // MISSING — a real absence, plainly stated
  [`node ${GONE}`, 'MISSING', 'the outage this check exists for'],
  ['node lane-session-start.mjs', 'MISSING', 'bare filename (round 1 blind spot)'],

  // round 5 — two script args: cannot tell which is the entrypoint
  [`node --import ./scripts/preload.mjs ${GONE}`, 'UNVERIFIED', 'R5: first-match picked the loader and missed the guard'],

  // round 4 — these MUST NOT be silent
  [`sh -c 'node ${GONE}'`, 'UNVERIFIED', 'R4: was shipped as a passing "yields nothing" case'],
  ['node "my hooks/x.mjs"', 'UNVERIFIED', 'R4: quoted path with a space'],
  ['node hooks/my-guard', 'UNVERIFIED', 'R4: extensionless registration'],
  ['node $HOOK_DIR/lane-session-start', 'UNVERIFIED', 'R4: extensionless + interpolation'],
  ['node scripts/[h]ooks/x.mjs', 'UNVERIFIED', 'R4: bracket glob'],
  ['node drift\\-check\\-gate.mjs', 'UNVERIFIED', 'R4: POSIX escape'],
  [`node ${REAL} --emit dist/preview.mjs`, 'UNVERIFIED', 'R4/R5: output arg is not the entrypoint'],

  // rounds 2-3 vectors
  ['node $CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs', 'UNVERIFIED', 'R2: canonical portable idiom'],
  ['node ${CLAUDE_PROJECT_DIR}/scripts/h.mjs', 'UNVERIFIED', 'R2: braced form'],
  ['node %CLAUDE_DIR%\\scripts\\h.ps1', 'UNVERIFIED', 'R2: windows env'],
  ['node ~/scripts/hooks/x.mjs', 'UNVERIFIED', 'R3: tilde'],
  [`node ${REAL};echo ok`, 'UNVERIFIED', 'R3: metacharacter glued to path'],
  ['node a.mjs&&node b.mjs', 'UNVERIFIED', 'R3: chained'],
  ['for f in scripts/hooks/*.mjs; do node "$f"; done', 'UNVERIFIED', 'R3: glob loop'],
  ['node /abs/path/hooks/foo.mjs', 'UNVERIFIED', 'R5: absolute is target-machine-relative'],
  ['npm run build', 'UNVERIFIED', 'R4: indirection is not clean'],
  ['curl https://example.com/x.sh', 'UNVERIFIED', 'URL is not a local file'],
  ['', 'UNVERIFIED', 'empty command registers nothing'],
  [undefined, 'UNVERIFIED', 'missing command key'],
];

let failed = 0;
for (const [cmd, want, note] of cases) {
  const got = classifyCommand(cmd).kind;
  const ok = got === want;
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${String(cmd).slice(0, 42).padEnd(42)} ${got.padEnd(10)} ${ok ? '' : `want=${want} `}— ${note}`);
}

// THE INVARIANT. Fuzz odd shapes and assert each produces exactly one legal verdict.
// This is the check the first four rewrites did not have.
const fuzz = ['', ' ', '\n', 'x', 'node', '.mjs', '///', 'node  ', 'a.MJS',
  'node a.mjs b.mjs', 'node\ta.mjs', '--flag', 'node -e "x"', 'node ..', 'node ./'];
let violations = 0;
for (const f of fuzz) {
  const v = classifyCommand(f);
  if (!v || !['OK', 'MISSING', 'UNVERIFIED'].includes(v.kind)) {
    violations += 1;
    console.log(`  INVARIANT VIOLATION on ${JSON.stringify(f)} -> ${JSON.stringify(v)}`);
  }
}

console.log(`\n  cases:     ${cases.length - failed}/${cases.length}`);
console.log(`  invariant: ${fuzz.length - violations}/${fuzz.length} inputs produced exactly one verdict`);
process.exit(failed || violations ? 1 : 0);
