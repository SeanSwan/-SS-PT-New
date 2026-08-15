/**
 * packet-gate.test.mjs — unit + CLI-contract tests for the outbound packet preflight.
 * Run: node --test scripts/packet-gate/tests/packet-gate.test.mjs
 *
 * DELIBERATELY COMPLEMENTARY to scripts/packet-gate/selftest.mjs, not a copy of it. The selftest is
 * the *canary suite*: it drives each gate red on purpose and its JSON output is what R15 reads at
 * runtime. These tests cover what the canaries do not — fence-parsing edge cases, CRLF handling,
 * and the CLI's exit-code contract — plus one test that asserts the canary suite itself is green,
 * so CI fails if a gate stops being provably failable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFences, remitFromDoc, checkProvenance, checkPremises, checkSize } from '../checks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GATE = join(ROOT, 'scripts', 'packet-gate.mjs');
const SELFTEST = join(ROOT, 'scripts', 'packet-gate', 'selftest.mjs');
const tmp = () => mkdtempSync(join(tmpdir(), 'packet-gate-'));

/** Run the CLI and return its exit code + combined output, without throwing on nonzero. */
function runGate(args) {
  try {
    const stdout = execFileSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

// --- fence parsing edge cases -------------------------------------------------------------------

test('a fence with no info string is uncited and never byte-checked', () => {
  const [b] = parseFences('```\nplain\n```');
  assert.equal(b.cited, false);
  assert.deepEqual(checkProvenance([b], () => null), []);
});

test('tilde fences parse, and a longer closing run closes them', () => {
  const blocks = parseFences('~~~js path=a.mjs lines=1-1\nbody\n~~~~');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].attrs.path, 'a.mjs');
  assert.equal(blocks[0].body, 'body');
});

test('a shorter inner fence run does not close a longer outer fence', () => {
  const blocks = parseFences('````md path=a.md lines=1-3\n```\ninner\n```\n````');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].body, '```\ninner\n```');
});

test('quoted attribute values survive parsing', () => {
  const [b] = parseFences('```js path="dir with space/a.mjs" lines=1-1\nx\n```');
  assert.equal(b.attrs.path, 'dir with space/a.mjs');
});

test('an unterminated fence still yields a block so R3 can inspect it', () => {
  const blocks = parseFences('```js path=a.mjs lines=1-1\nnever closed');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].cited, true);
});

// --- normalization ------------------------------------------------------------------------------

test('CRLF in the repo file does not create a false provenance mismatch', () => {
  const md = '```js path=a.mjs lines=1-2\nconst a = 1;\nconst b = 2;\n```';
  const findings = checkProvenance(parseFences(md), () => 'const a = 1;\r\nconst b = 2;\r\n');
  assert.deepEqual(findings, [], 'CRLF vs LF is a checkout artifact, not a retyped line');
});

test('a genuine one-character change is still caught', () => {
  const md = '```js path=a.mjs lines=1-1\nconst a = 1;\n```';
  const findings = checkProvenance(parseFences(md), () => 'const a = 2;\n');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, 'R3');
});

// --- regression: the remit parser that silently disabled two gates ------------------------------

test('REGRESSION: a remit containing "z" is not truncated', () => {
  // `\Z` is not a JS assertion; under /i the old lookahead matched the literal letter z, cutting
  // the remit at "authori|zation" and silently disabling R4 and R5.
  const remit = remitFromDoc('## Remit\nIs the authorization check on /api/unblock correct?');
  assert.match(remit, /\/api\/unblock/, 'anchors after the first "z" must survive');
});

test('R5 warns rather than refuses on an unresolved bare symbol', () => {
  const r = checkPremises({ paths: [], routes: [], symbols: ['validatePacket'] }, () => false);
  assert.deepEqual(r.findings, [], 'a remit may name a symbol that is yet to be created');
  assert.equal(r.warnings.length, 1);
});

test('R1 is inclusive at exactly the budget', () => {
  assert.deepEqual(checkSize(100, 100), []);
  assert.equal(checkSize(101, 100)[0].code, 'R1');
});

// --- CLI contract -------------------------------------------------------------------------------

test('the canary suite is green (CI gate on gates being provably failable)', () => {
  const out = execFileSync('node', [SELFTEST], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /\b0 red\b/, out.slice(-400));
});

test('CLI exits 2 (fail-closed) when the document has no remit', () => {
  const f = join(tmp(), 'no-remit.md');
  writeFileSync(f, '# Notes\n\nSome prose with no remit at all.\n');
  const { code, out } = runGate(['--document', f]);
  assert.equal(code, 2, out);
  assert.match(out, /no remit found/i);
});

test('CLI exits 2 when the document does not exist', () => {
  const { code } = runGate(['--document', join(tmp(), 'absent.md')]);
  assert.equal(code, 2);
});

test('CLI exits 1 and names R5 for a phantom route', () => {
  const f = join(tmp(), 'phantom.md');
  writeFileSync(f, '## Remit\n\nIs /api/definitely-not-a-real-route correct?\n');
  const { code, out } = runGate(['--document', f]);
  assert.equal(code, 1, out);
  assert.match(out, /R5 PHANTOM-PREMISE/);
});

test('REGRESSION: a route named only in prose does NOT resolve (R5 fires)', () => {
  // Found in the hostile pass: /api/client/analytics-summary appears only in docs/*.md and is
  // implemented nowhere. Resolving premises against prose would bless the exact phantom R5 exists
  // to catch — a route that was written up and never built.
  const f = join(tmp(), 'doc-only.md');
  writeFileSync(f, '## Remit\n\nIs /api/client/analytics-summary implemented correctly?\n');
  const { code, out } = runGate([ '--document', f, '--json']);
  assert.equal(code, 1);
  assert.ok(JSON.parse(out).findings.some((x) => x.code === 'R5'), out);
});

test('REGRESSION: a real code route DOES resolve (guards the MSYS/no-shell spawn)', () => {
  // If the resolver is ever refactored to spawn git through a shell, Git Bash rewrites the
  // leading-slash pattern into a Windows path and EVERY route lookup returns "no hit", turning R5
  // into a false-refusal machine. This pins the working behavior.
  const f = join(tmp(), 'real-route.md');
  writeFileSync(f, '## Remit\n\nIs /api/sessions implemented correctly?\n');
  const { out } = runGate(['--document', f, '--json']);
  const codes = JSON.parse(out).findings.map((x) => x.code);
  assert.ok(!codes.includes('R5'), `/api/sessions must resolve; got ${codes.join(',')}`);
});

test('REGRESSION: R1 counts transport overhead, not just the document', () => {
  // consult.mjs assembles remit + fences + document + seed. Measuring the document alone
  // under-reports the quantity R1 exists to bound.
  const f = join(tmp(), 'sized.md');
  writeFileSync(f, `## Remit\n\nReview /api/sessions\n\n${'x'.repeat(1000)}\n`);
  const under = runGate(['--document', f, '--budget-chars', '4000', '--overhead-chars', '2200', '--json']);
  const over = runGate(['--document', f, '--budget-chars', '2000', '--overhead-chars', '2200', '--json']);
  assert.ok(!JSON.parse(under.out).findings.some((x) => x.code === 'R1'), 'should fit at 4000');
  assert.ok(JSON.parse(over.out).findings.some((x) => x.code === 'R1'), 'overhead alone exceeds 2000 — must refuse');
});

test('CLI exits 2 when a numeric flag is not a number (no silently-disabled check)', () => {
  const f = join(tmp(), 'x.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n');
  assert.equal(runGate(['--document', f, '--budget-chars', 'abc']).code, 2);
});

test('CLI emits machine-readable JSON with --json', () => {
  const f = join(tmp(), 'phantom.md');
  writeFileSync(f, '## Remit\n\nIs /api/definitely-not-a-real-route correct?\n');
  const { out } = runGate(['--document', f, '--json']);
  const parsed = JSON.parse(out);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.findings.some((x) => x.code === 'R5'));
});

test('REGRESSION: an indented (list-nested) verbatim fence does not false-fail R3', () => {
  const md = '- see:\n  ```js path=a.mjs lines=1-1\n  const a = 1;\n  ```';
  assert.deepEqual(checkProvenance(parseFences(md), () => 'const a = 1;\n'), [],
    'CommonMark strips fence indentation; a false refusal here breeds refusal fatigue');
});

test('uncited code fences alongside a cited one are WARNED, not silently accepted', () => {
  const f = join(tmp(), 'mixed.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n\n```js path=package.json lines=1-1\n{\n```\n\n```js\nconst fabricated = 1;\n```\n');
  const { out } = runGate(['--document', f, '--json']);
  const parsed = JSON.parse(out);
  assert.ok(parsed.warnings.some((w) => /uncited code fence/.test(w)), JSON.stringify(parsed.warnings));
});
