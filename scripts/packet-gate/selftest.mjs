#!/usr/bin/env node
/**
 * selftest.mjs — the canary suite. Every gate must be provably failable.
 * ======================================================================
 * A gate with no canary history is presumed broken, and R15 blocks every send until this runs
 * green. That is deliberate: the failure mode this whole design exists to prevent is a checker
 * that exits 0 while checking nothing — "technically green, substantively decorative". The only
 * defense is a suite that drives each gate RED on purpose and fails loudly when it cannot.
 *
 * Two classes of canary:
 *   RED  — a deliberately bad packet that MUST produce the expected refusal code.
 *   GREEN— a known-good packet that MUST produce zero findings. This is the false-block measure;
 *          refusal fatigue kills the gate just as surely as a decorative gate does, so a check
 *          that fires on clean input is a bug of equal severity.
 *
 * Writes out/packet-gate/selftest.json (gitignored via out/) which packet-gate.mjs reads as R15.
 *
 * Run: node scripts/packet-gate/selftest.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFences, remitFromDoc, checkProvenance, checkArtifact, checkPremises, checkSize, checkHygiene, checkCanary } from './checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'out', 'packet-gate');

/** A repo stub: one file whose bytes we control, so provenance canaries are deterministic. */
const FAKE_FILE = 'backend/services/example.mjs';
const FAKE_SRC = ['export function alpha() {', '  return 1;', '}', ''].join('\n');
const fakeReader = (p) => (p === FAKE_FILE ? FAKE_SRC : null);

const fence = (attrs, body) => ['```js ' + attrs, body, '```'].join('\n');

const cases = [];
const red = (name, code, run) => cases.push({ name, expect: code, run });
const green = (name, run) => cases.push({ name, expect: null, run });

// --- R3 provenance -----------------------------------------------------------------------------
// The signature failure: code typed from memory, wearing a fence that claims a real file.
red('R3 hand-retyped code block is blocked', 'R3', () => {
  const md = fence(`path=${FAKE_FILE} lines=1-3`, ['export function alpha() {', '  return 2;', '}'].join('\n'));
  return checkProvenance(parseFences(md), fakeReader);
});
red('R3 citation to a nonexistent file is blocked', 'R3', () => {
  const md = fence('path=backend/does-not-exist.mjs lines=1-2', 'whatever');
  return checkProvenance(parseFences(md), fakeReader);
});
red('R3 line range past end of file is blocked', 'R3', () => {
  const md = fence(`path=${FAKE_FILE} lines=1-999`, FAKE_SRC);
  return checkProvenance(parseFences(md), fakeReader);
});
green('R3 verbatim block passes', () => {
  const md = fence(`path=${FAKE_FILE} lines=1-3`, ['export function alpha() {', '  return 1;', '}'].join('\n'));
  return checkProvenance(parseFences(md), fakeReader);
});
green('R3 uncited illustrative block is not byte-checked', () => {
  const md = ['```js', 'const sketch = "pseudo-code, not from the repo";', '```'].join('\n');
  return checkProvenance(parseFences(md), fakeReader);
});

// --- R4 no artifact ----------------------------------------------------------------------------
red('R4 code remit with no cited block is blocked', 'R4', () => checkArtifact(true, parseFences('Some prose about the code.')));
red('R4 code remit with only an uncited fence is blocked', 'R4', () =>
  checkArtifact(true, parseFences('```js\nconst retyped = true;\n```')));
green('R4 code remit with a cited block passes', () =>
  checkArtifact(true, parseFences(fence(`path=${FAKE_FILE} lines=1-3`, 'x'))));
green('R4 non-code remit needs no artifact', () => checkArtifact(false, parseFences('Pure strategy question.')));

// --- R5 phantom premise ------------------------------------------------------------------------
// The evidenced failure: a paid review spent a finding on /unblock, a route that does not exist.
const resolveNothing = () => false;
const resolveAll = () => true;
red('R5 phantom route is blocked', 'R5', () =>
  checkPremises({ paths: [], routes: ['/api/unblock'], symbols: [] }, resolveNothing).findings);
red('R5 phantom path is blocked', 'R5', () =>
  checkPremises({ paths: ['backend/ghost.mjs'], routes: [], symbols: [] }, resolveNothing).findings);
green('R5 resolving premises pass', () =>
  checkPremises({ paths: ['backend/real.mjs'], routes: ['/api/real'], symbols: [] }, resolveAll).findings);
green('R5 unresolved bare symbol WARNS but does not refuse', () => {
  const r = checkPremises({ paths: [], routes: [], symbols: ['validatePacket'] }, resolveNothing);
  if (r.warnings.length !== 1) throw new Error('expected exactly one warning for an unresolved symbol');
  return r.findings; // must be empty: a remit may legitimately name something to be created
});

// --- remit extraction ---------------------------------------------------------------------------
// These are REGRESSION canaries for a real defect found during this build: the first parser used a
// `(?=^##\s|\Z)` lookahead, but `\Z` is not a JavaScript assertion — under `/i` it matched the
// literal letter `z`, truncating the remit at the first "z" and SILENTLY disabling R4 and R5. The
// gate reported a clean premise check because it had nothing left to check. Nothing failed loudly.
const eq = (got, want, what) => { if (got !== want) throw new Error(`${what}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); return []; };

green('remit containing "z" is not truncated (regression: \\Z is literal z)', () =>
  eq(remitFromDoc('## Remit\nIs the authorization check on /api/unblock correct?'),
    'Is the authorization check on /api/unblock correct?', 'remit'));
green('remit stops at the next heading', () =>
  eq(remitFromDoc('## Remit\nfirst line\n\n## Artifacts\nnot the remit'), 'first line', 'remit'));
green('remit falls back to frontmatter', () => eq(remitFromDoc('remit: check the zone parser'), 'check the zone parser', 'remit'));
green('absent remit yields empty string (caller must fail closed)', () => eq(remitFromDoc('# Doc\nno remit here'), '', 'remit'));

// --- R1 oversize -------------------------------------------------------------------------------
red('R1 oversize packet is blocked', 'R1', () => checkSize(24_001, 24_000));
green('R1 packet at exactly budget passes', () => checkSize(24_000, 24_000));

// --- R6 hygiene --------------------------------------------------------------------------------
red('R6 scanner hit is blocked', 'R6', () => checkHygiene({ ok: false, lines: ['line 12: aws-access-key-id'] }));
green('R6 clean scan passes', () => checkHygiene({ ok: true, lines: [] }));

// INTEGRATION canary — proves the real scanner is actually wired and actually fires. The pure
// check above would stay green forever if scan-secrets.sh silently stopped matching (the
// "broken checker exits 0" rot mode). The secret-shaped string is ASSEMBLED AT RUNTIME so this
// source file contains no literal that would trip the repo's own pre-commit scanner.
red('R6 real scanner fires on a planted secret (integration)', 'R6', () => {
  const planted = `aws_key = "${'AKIA'}${'QWERTYUIOPASDFGH'}"`;
  let ok = true; let lines = [];
  try {
    execFileSync('bash', [path.join(ROOT, 'scripts', 'scan-secrets.sh'), '--stdin'], {
      cwd: ROOT, input: planted, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8',
    });
  } catch (err) {
    ok = false;
    lines = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim().split('\n').filter(Boolean).slice(0, 5);
  }
  return checkHygiene({ ok, lines });
});

// --- R15 the gate on the gates -----------------------------------------------------------------
red('R15 missing canary record blocks', 'R15', () => checkCanary(null));
red('R15 red canary record blocks', 'R15', () =>
  checkCanary({ ranAt: new Date().toISOString(), total: 10, green: 9, red: 1 }));
red('R15 stale canary record blocks', 'R15', () =>
  checkCanary({ ranAt: '2020-01-01T00:00:00.000Z', total: 10, green: 10, red: 0 }));
green('R15 fresh green canary record passes', () =>
  checkCanary({ ranAt: new Date().toISOString(), total: 10, green: 10, red: 0 }));

// ---------------------------------------------------------------------------------------------

const results = cases.map((c) => {
  try {
    const findings = c.run();
    const codes = findings.map((f) => f.code);
    if (c.expect === null) {
      return { name: c.name, pass: findings.length === 0, detail: findings.length ? `expected clean, got ${codes.join(',')}` : 'clean' };
    }
    return { name: c.name, pass: codes.includes(c.expect), detail: codes.length ? codes.join(',') : 'NO REFUSAL — gate did not fire' };
  } catch (err) {
    return { name: c.name, pass: false, detail: `threw: ${err.message}` };
  }
});

const greenCount = results.filter((r) => r.pass).length;
const redCount = results.length - greenCount;

for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'}  ${r.name}${r.pass ? '' : `  [${r.detail}]`}`);
console.log(`\n${greenCount}/${results.length} canaries green, ${redCount} red`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'selftest.json'), JSON.stringify({
  ranAt: new Date().toISOString(), total: results.length, green: greenCount, red: redCount, cases: results,
}, null, 2));
console.log(`wrote ${path.relative(ROOT, path.join(OUT_DIR, 'selftest.json'))}`);

process.exit(redCount === 0 ? 0 : 1);
