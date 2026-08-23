#!/usr/bin/env node
/**
 * drift-check-gate.test.mjs — check 7 (hook-registration integrity) case matrix.
 * ==============================================================================
 * WHY THIS FILE EXISTS: the classifier was rewritten five times in one session, and
 * each rewrite reintroduced the failure it was written to prevent — an input that
 * fell through every branch and produced NO output, which is byte-identical to
 * "checked and healthy". One round shipped a PASSING test asserting that a
 * `sh -c '...'` command yields nothing, codifying the outage as correct behaviour.
 *
 * So this tests TWO things, and the second matters more:
 *   1. Known cases classify correctly.
 *   2. THE INVARIANT — every input yields exactly one verdict. Silence is
 *      unrepresentable. Testing answers alone is what let five rewrites ship with a
 *      silent path; only a completeness check catches that class.
 *
 * It IMPORTS the real classifier rather than mirroring it. An earlier version kept a
 * copy in this file and warned in its own header that "a mirror that drifts is worse
 * than no test" — extracting the classifier to scripts/lib/ (round 6) removed the
 * need to take that risk at all.
 *
 * Run: node scripts/hooks/drift-check-gate.test.mjs   (exit 0 = pass)
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCommand, auditHookRegistrations } from '../lib/hook-registration.mjs';

const SS_PT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const classify = (cmd) => classifyCommand(cmd, SS_PT);

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
  [`node --import ./scripts/preload.mjs ${GONE}`, 'UNVERIFIED', 'R5: two script paths — cannot tell the entrypoint'],
  [`node --import ${REAL} ./scripts/guard`, 'UNVERIFIED', 'R6: only script arg is a loader operand; entrypoint is extensionless'],
  [`node --import=${REAL} ./scripts/guard`, 'UNVERIFIED', 'R7: equals-form loader (all 4 seats) — was a PHANTOM MISSING'],
  [`node --require=./scripts/preload.mjs ./guard`, 'UNVERIFIED', 'R7: equals-form, joined path'],
  ['node ../../other-repo/hook.mjs', 'UNVERIFIED', 'R6: resolves outside the repo'],

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
  [`node ./a${String.fromCharCode(0x00A0)}b.mjs`, 'UNVERIFIED', 'R8: NBSP — JS \\s splits it, a shell does not'],
  ['', 'UNVERIFIED', 'empty command registers nothing'],
  [undefined, 'UNVERIFIED', 'missing command key'],
];

let failed = 0;
for (const [cmd, want, note] of cases) {
  const got = classify(cmd).kind;
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
  const v = classify(f);
  if (!v || !['OK', 'MISSING', 'UNVERIFIED'].includes(v.kind)) {
    violations += 1;
    console.log(`  INVARIANT VIOLATION on ${JSON.stringify(f)} -> ${JSON.stringify(v)}`);
  }
}

// ---- Filesystem cases: shapes and roots that string tests cannot reach -------
// Round 8 found both of these, and one of them was a REGRESSION introduced by the
// round-7 containment fix. They need a real temp filesystem, so they live here
// rather than in the table above.
const t = mkdtempSync(join(tmpdir(), 'hookaudit-'));
mkdirSync(join(t, '.claude'));
for (const [label, body, want] of [
  // `hooks: null` slipped past `!= null`, iterated zero times and read CLEAN while
  // every other bad shape was flagged. Round 8, and the eighth round of this class.
  ['hooks:null', '{"hooks":null}', 1],
  ['hooks:false', '{"hooks":false}', 1],
  ['hooks:[]', '{"hooks":[]}', 1],
  ['root is an array', '[1,2,3]', 1],
  ['hooks key absent (legitimate)', '{}', 0],
]) {
  writeFileSync(join(t, '.claude', 'settings.json'), body);
  const n = auditHookRegistrations(t).findings.length;
  const ok = n === want;
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} findings=${n}  want=${want}`);
}
rmSync(t, { recursive: true, force: true });

// A symlinked root made realpath(root) !== resolve(root); round 7's fallback then
// compared a LEXICAL path to a REAL root, so an absent file could never match and
// MISSING was demoted to UNVERIFIED — the one alarm this module exists to raise,
// neutered by its own containment fix.
const base = mkdtempSync(join(tmpdir(), 'hooklink-'));
const realRoot = join(base, 'realroot');
mkdirSync(join(realRoot, 'hooks'), { recursive: true });
writeFileSync(join(realRoot, 'hooks', 'present.mjs'), '// here\n');
const linkRoot = join(base, 'linkroot');
try {
  symlinkSync(realRoot, linkRoot, 'junction');
  for (const [label, cmd, want] of [
    ['ABSENT file under symlinked root', 'node hooks/gone.mjs', 'MISSING'],
    ['PRESENT file under symlinked root', 'node hooks/present.mjs', 'OK'],
  ]) {
    const got = classifyCommand(cmd, linkRoot).kind;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} ${got.padEnd(10)} want=${want}`);
  }
} catch {
  console.log('  SKIP  symlink unavailable on this host — symlinked-root case not exercised');
}
rmSync(base, { recursive: true, force: true });

console.log(`\n  cases:     ${cases.length - failed}/${cases.length}`);
console.log(`  invariant: ${fuzz.length - violations}/${fuzz.length} inputs produced exactly one verdict`);
process.exit(failed || violations ? 1 : 0);
