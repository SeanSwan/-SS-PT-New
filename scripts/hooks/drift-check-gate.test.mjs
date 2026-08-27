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
import { hasRulebookTrailer } from './rulebook-review-guard.mjs';

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

  // 2026-08-25 SOUL-delta gap sweep: the ONE canonical quoted idiom every real hook
  // uses is RESOLVED, not declined — eleven permanent UNVERIFIED rows per session was
  // the alarm-fatigue failure this module's own header warns about.
  [`node "\${CLAUDE_PROJECT_DIR:-.}/${REAL}"`, 'OK', 'canonical quoted idiom resolves against root'],
  [`node "\${CLAUDE_PROJECT_DIR:-.}/scripts/hooks/definitely-gone.mjs"`, 'MISSING', 'canonical idiom with an absent file is a REAL finding'],
  ['node "${CLAUDE_PROJECT_DIR:-.}/scripts/$SUB/x.mjs"', 'UNVERIFIED', 'nested expansion inside the quoted remainder still declines'],
  ['node "${CLAUDE_PROJECT_DIR:-.}/my hooks/x.mjs"', 'UNVERIFIED', 'quoted path with a space keeps its quotes and declines'],

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
  // R9: the round-8 fix whitelisted VT/FF/CR and then split on them anyway — the very
  // phantom it was written to kill, surviving inside the fix, in three ASCII bytes.
  [`node ./a${String.fromCharCode(0x0B)}b.mjs`, 'UNVERIFIED', 'R9: VT is an ordinary word char to a shell'],
  [`node ./a${String.fromCharCode(0x0C)}b.mjs`, 'UNVERIFIED', 'R9: FF likewise'],
  // ...and the inverse, which is worse: this split to an EXISTING file and returned
  // OK while the shell would fail to exec it. Silent clean on a dead hook.
  [`node ${REAL}${String.fromCharCode(0x0B)}--local`, 'UNVERIFIED', 'R9: VT mid-token had returned OK on a dead hook'],
  ['FOO=bar.mjs node app', 'UNVERIFIED', 'R9: env-assignment value is not a path'],
  ['docker run -v ./a.sh:/a.sh img', 'UNVERIFIED', 'R9: bind-mount spec is not a path'],
  ['node link/../hooks/x.mjs', 'UNVERIFIED', 'R9: `..` collapses lexically before symlinks resolve'],
  // R13: the RUNNERS whitelist was replaced by a structural rule — the candidate must
  // be the FIRST bare operand after the command word. All five seats found that a
  // whitelist cannot enumerate reality; each of these was a false decline under it.
  ['deno run hooks/gate.ts', 'UNVERIFIED', 'R13: subcommand occupies the operand slot'],
  ['sudo node hooks/x.mjs', 'UNVERIFIED', 'R13: wrapper occupies the operand slot'],
  ['/usr/bin/env node hooks/x.mjs', 'UNVERIFIED', 'R13: path-invoked runner'],
  ['yarn tsx hooks/x.ts', 'UNVERIFIED', 'R13: package-manager indirection'],
  // The one that mattered most: `-c` takes `node` as its operand, so x.mjs becomes $0
  // and NEVER executes. The whitelist returned OK here — a dead guard certified healthy.
  ['sh -c node hooks/x.mjs', 'UNVERIFIED', 'R13: was a FALSE OK under the whitelist'],
  // And the inverse of a false decline: a versioned binary is still just a command
  // word, so its first operand IS the entrypoint and asserting is correct.
  [`python3.12 ${GONE}`, 'MISSING', 'R13: versioned runner still asserts correctly'],
  // R14 (mutation testing): deleting the command-word-is-a-path rule left BOTH the
  // suite and the fuzzer green — nothing covered this shape. `hooks/pre load.mjs`
  // executes `hooks/pre` and passes `load.mjs`, so asserting about `load.mjs` is a
  // verdict about an argument. The rule was written in R13 and never tested.
  ['hooks/pre load.mjs', 'UNVERIFIED', 'R14: command word is itself a path (mutation SURVIVED before this)'],
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

// R14 (mutation testing): reverting ENOTDIR to "may exist but be unreadable" left
// both the suite and the fuzzer green — nothing covered it. A path component that
// must be a directory but is a regular FILE cannot resolve, so that is a certain
// absence; calling it "unreadable" softens a MISSING into the skim category. Needs a
// real filesystem, so it lives here rather than in the table.
const t0 = mkdtempSync(join(tmpdir(), 'hooknotdir-'));
writeFileSync(join(t0, 'notadir.mjs'), '// a FILE, not a directory\n');
{
  const got = classifyCommand('node notadir.mjs/child.mjs', t0).kind;
  const ok = got === 'MISSING';
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${'R14: ENOTDIR is a certain absence'.padEnd(42)} ${got.padEnd(10)} want=MISSING`);
}
rmSync(t0, { recursive: true, force: true });

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

// ---- Rulebook trailer test (shared guard/probe single source, Ox r3 F1) ------
// NOTE: this section's first landing was a `test(...)` block appended AFTER the
// process.exit above — dead code that read as a passing test. The runner here is
// hand-rolled; new cases join ITS convention, before the exit.
for (const [msg, want, note] of [
  ['RULEBOOK: add - reviewed-by: GLM-5.3', true, 'same-line form'],
  ['subject\n\nRULEBOOK: amend\nReviewed-by: seat', true, 'git-conventional multi-line, capitalized (the shape the old regex rejected)'],
  ['RULEBOOK: retire\nREVIEWED-BY: X', true, 'any case'],
  ['RULEBOOK: add', false, 'verb without reviewed-by fails'],
  ['Reviewed-by: X', false, 'reviewed-by without verb line fails'],
  ['RULEBOOK: destroy - reviewed-by: X', false, 'unknown verb fails'],
  ['', false, 'empty message'],
  [undefined, false, 'missing message'],
  // Ox r4 F2 — prose resistance: a message DISCUSSING the convention must not pass.
  ['fix: docs\n\nRULEBOOK: amend flow is broken, and someone should add a reviewed-by: line next time', false,
    'prose mention of reviewed-by mid-sentence is not a trailer'],
  ['note that the RULEBOOK: add form needs care\nAlso reviewed-by: is required they say', false,
    'reviewed-by not at line start and not on the verb line'],
  ['RULEBOOK: amend the caps\nreviewed-by: GLM-5.3', true, 'line-start reviewed-by still passes'],
  ['RULEBOOK: add - peer-reviewed-by: someone', false, 'hyphen-prefixed reviewed-by is not attribution (GLM r4)'],
  ['RULEBOOK: add\npeer-reviewed-by: someone', false, 'hyphen-prefixed at line start fails the ^ anchor too'],
]) {
  const got = hasRulebookTrailer(msg);
  const ok = got === want;
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${('trailer: ' + note).slice(0, 60).padEnd(60)} got=${got} want=${want}`);
}

console.log(`\n  cases:     ${cases.length - failed}/${cases.length}`);
console.log(`  invariant: ${fuzz.length - violations}/${fuzz.length} inputs produced exactly one verdict`);
process.exit(failed || violations ? 1 : 0);
