/**
 * closeout-gate.test.mjs — coverage for the unified Stop boundary.
 * Run: node scripts/hooks/closeout-gate.test.mjs
 *
 * These are END-TO-END tests: they spawn the real gate as a subprocess and
 * assert on its real stdout, against fixture children written to a temp dir.
 * Testing the contract rather than the internals is deliberate — the contract
 * (stdin -> exit 0 silent | stdout {decision:"block"}) is what Claude Code
 * actually depends on, and it is the thing that must not regress.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATE = join(dirname(fileURLToPath(import.meta.url)), 'closeout-gate.mjs');

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const dir = mkdtempSync(join(tmpdir(), 'closeout-gate-'));

/** Write a fixture child that blocks with `reason`. */
const blocker = (name, reason) => writeFileSync(join(dir, `${name}.mjs`),
  `process.stdout.write(JSON.stringify({decision:"block",reason:${JSON.stringify(reason)}}));\n`);

/** Write a fixture child that allows (silent, exit 0). */
const allower = (name) => writeFileSync(join(dir, `${name}.mjs`), 'process.exit(0);\n');

/** Write a fixture child that emits garbage on stdout. */
const garbler = (name) => writeFileSync(join(dir, `${name}.mjs`), 'process.stdout.write("not json");\n');

/** Write a fixture child that never exits (exercises the timeout path). */
const hanger = (name) => writeFileSync(join(dir, `${name}.mjs`), 'setInterval(()=>{},1000);\n');

/** Run the gate against a child spec. Returns { stdout, parsed }. */
function run(spec, stdin = '{"stop_hook_active":false}') {
  const r = spawnSync(process.execPath, [GATE], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, SWAN_CLOSEOUT_HOOK_DIR: dir, SWAN_CLOSEOUT_CHILDREN: spec },
  });
  const out = (r.stdout || '').trim();
  return { code: r.status, stdout: out, parsed: out ? JSON.parse(out) : null };
}

console.log('closeout-gate');

t('all children allow -> silent allow', () => {
  allower('a'); allower('b');
  const { code, stdout } = run('a:5000:0,b:5000:0');
  assert.equal(code, 0);
  assert.equal(stdout, '', 'an allowing turn must emit nothing');
});

t('one blocker -> single block, singular wording', () => {
  allower('a'); blocker('b', 'needs a memo');
  const { parsed } = run('a:5000:0,b:5000:0');
  assert.equal(parsed.decision, 'block');
  assert.match(parsed.reason, /1 requirement is unmet/);
  assert.match(parsed.reason, /\[b\] needs a memo/);
});

t('THE POINT: three blockers -> ONE block carrying all three reasons', () => {
  blocker('a', 'linear sync missing');
  blocker('b', 'hermes memo missing');
  blocker('c', 'dual-tier summary missing');
  const { stdout, parsed } = run('a:5000:0,b:5000:0,c:5000:0');
  assert.equal(parsed.decision, 'block');
  assert.match(parsed.reason, /3 requirements are unmet/);
  assert.match(parsed.reason, /linear sync missing/);
  assert.match(parsed.reason, /hermes memo missing/);
  assert.match(parsed.reason, /dual-tier summary missing/);
  // Exactly one JSON document on stdout — not three.
  assert.equal(stdout.split('}{').length, 1, 'must emit exactly one decision object');
});

t('fail-open child that is MISSING does not block', () => {
  allower('a');
  const { code, stdout } = run('a:5000:0,does-not-exist:5000:0');
  assert.equal(code, 0);
  assert.equal(stdout, '', 'a missing fail-open gate must not wedge the session');
});

t('fail-CLOSED child that is MISSING blocks (R8-1 preserved)', () => {
  allower('a');
  const { parsed } = run('a:5000:0,does-not-exist:5000:1');
  assert.equal(parsed.decision, 'block');
  assert.match(parsed.reason, /MISSING and this gate is fail-closed/);
});

t('fail-CLOSED child emitting garbage blocks; fail-open one does not', () => {
  garbler('g');
  assert.equal(run('g:5000:0').stdout, '', 'garbage from a fail-open gate = allow');
  assert.equal(run('g:5000:1').parsed.decision, 'block', 'garbage from a fail-closed gate = block');
});

t('fail-CLOSED child that hangs blocks on timeout; fail-open one does not', () => {
  hanger('h');
  assert.equal(run('h:400:0').stdout, '', 'a hung fail-open gate must not wedge the session');
  const { parsed } = run('h:400:1');
  assert.equal(parsed.decision, 'block');
  assert.match(parsed.reason, /timed out/);
});

t('degraded children are named in the output, not swallowed', () => {
  blocker('a', 'real reason');
  const { parsed } = run('a:5000:0,does-not-exist:5000:0');
  assert.match(parsed.reason, /did not report cleanly/);
  assert.match(parsed.reason, /does-not-exist=missing/);
});

t('stdin is forwarded verbatim to children', () => {
  writeFileSync(join(dir, 'echo.mjs'),
    'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{' +
    'process.stdout.write(JSON.stringify({decision:"block",reason:"saw:"+s}))});\n');
  const { parsed } = run('echo:5000:0', '{"stop_hook_active":true,"marker":"XYZZY"}');
  assert.match(parsed.reason, /XYZZY/, 'children must receive the original payload');
});

rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail.length} failed`);
if (fail.length) { console.error('FAILED: ' + fail.join(', ')); process.exit(1); }
