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
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFences, remitFromDoc, checkProvenance, checkArtifact, checkPremises, checkSize, checkHygiene, checkCanary, checkUncited } from './checks.mjs';
import { runCanaries } from './canary-harness.mjs';
import { isUnverifiedFence, fenceParseAnomalies } from './fences.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'out', 'packet-gate');

/** A repo stub: one file whose bytes we control, so provenance canaries are deterministic. */
const FAKE_FILE = 'backend/services/example.mjs';
const FAKE_SRC = ['export function alpha() {', '  return 1;', '}', ''].join('\n');
const fakeReader = (p) => (p === FAKE_FILE ? FAKE_SRC : null);

const fence = (attrs, body) => ['```js ' + attrs, body, '```'].join('\n');
/** A cited fence whose language is prose — used to prove R4 is not satisfied by a description. */
const fenceMd = (attrs, body) => ['```md ' + attrs, body, '```'].join('\n');

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

// --- Kimi K3 + HY3 hostile-review findings, 2026-08-14 -------------------------------------------
// Every canary below pins a defect that was LIVE in the first build and shipped all-green. They are
// the reason "26 canaries passed" was not the same as "the gate works".

// S2 / HY3-S3 — gate 0 was the easiest check in the system to fake.
red('R15 malformed record ({ranAt} only) is blocked', 'R15', () => checkCanary({ ranAt: new Date().toISOString() }));
red('R15 zero-canary record {0,0,0} is blocked', 'R15', () =>
  checkCanary({ ranAt: new Date().toISOString(), total: 0, green: 0, red: 0 }));
red('R15 future-dated record is blocked (it would never expire)', 'R15', () =>
  checkCanary({ ranAt: new Date(Date.now() + 400 * 86_400_000).toISOString(), total: 5, green: 5, red: 0 }));
red('R15 record certifying a DIFFERENT gate source is blocked', 'R15', () =>
  checkCanary({ ranAt: new Date().toISOString(), total: 5, green: 5, red: 0, sourceHash: 'deadbeef' }, { sourceHash: 'cafe1234' }));

// S4 — the one check whose purpose is "a description of code is not code", cleared by a description.
red('R4 cited PROSE block does not satisfy the artifact requirement', 'R4', () =>
  checkArtifact(true, parseFences(fenceMd('path=docs/notes.md lines=1-2', 'some prose'))));
green('R4 cited CODE block does satisfy it', () =>
  checkArtifact(true, parseFences(fence('path=backend/x.mjs lines=1-2', 'const a = 1;'))));

// S6.3 / S7 — unusable cited paths were an uncaught EISDIR stack trace, and a read outside the repo.
const mustNotRead = () => { throw new Error('reader must not be called for an unusable path'); };
red('R3 empty cited path is refused, never read', 'R3', () =>
  checkProvenance(parseFences(fence('path="" lines=1-1', 'x')), mustNotRead));
red('R3 traversal path is refused before any read', 'R3', () =>
  checkProvenance(parseFences(fence('path=../../.env lines=1-1', 'x')), mustNotRead));
red('R3 unreadable file is a refusal, not an exception', 'R3', () =>
  checkProvenance(parseFences(fence('path=backend/somedir lines=1-1', 'x')), () => {
    const e = new Error('EISDIR'); e.code = 'EISDIR'; throw e;
  }));

// S6.4 / HY3-S1 — fence content could hijack remit extraction.
green('a remit: line inside a fence does not hijack extraction', () =>
  eq(remitFromDoc(['```yaml', 'remit: sample inside a fence', '```', '', '## Remit', 'the real remit'].join('\n')),
    'the real remit', 'remit'));
// RE-ANCHOR (round 10): the FIXTURE moved, the property did not. This canary proves that a
// `## Remit` heading inside a fence is ignored — and it did so with a `remit:` frontmatter line
// placed AFTER the fence, which only worked because the fallback scanned the whole document. That
// looseness is a hijack vector (any prose line beginning "remit:" became the packet's question), so
// the fallback is now bounded to the leading block, which is what "frontmatter" means. The fixture
// puts the frontmatter line where frontmatter goes; the assertion is unchanged.
green('a "## Remit" heading inside a fence is ignored', () =>
  eq(remitFromDoc(['remit: the real one', '', '```md', '## Remit', 'fence content', '```'].join('\n')),
    'the real one', 'remit'));

// Dogfooding the packet BUILDER against the gate: a file whose cited range ends on a trailing
// blank line could never match, because only the packet side was normalized. R3 refused a byte-exact
// extraction it had just produced — a false refusal on the tool built to prevent false authorship.
green('R3 a file ending in a blank line can be cited in full', () => {
  const NL = String.fromCharCode(10);
  const src = ['const a = 1;', '', ''].join(NL); // normalizes to ['const a = 1;', '']
  const body = ['const a = 1;', ''].join(NL);
  return checkProvenance(parseFences(fence('path=x.mjs lines=1-2', body)), () => src);
});

// --- Round 4 findings, 2026-08-15 ----------------------------------------------------------------
// The uncited-fence guard used to `return 2` from inside main(), where NO canary could reach it —
// a security predicate that was, by construction, not provably failable. R15's own rule is that a
// gate which cannot be driven red is presumed failed, so making it a pure check was as much the
// point as the exit code was.

red('R3 an uncited fence is a refusal', 'R3', () =>
  checkUncited(parseFences(['```', 'const fabricated = 1;', '```'].join('\n')), false));

green('R3 --allow-uncited accepts uncited fences deliberately', () =>
  checkUncited(parseFences(['```', 'const illustrative = 1;', '```'].join('\n')), true));

green('R3 a packet whose fences are all cited is not caught by the uncited check', () =>
  checkUncited(parseFences(fence('path=x.mjs lines=1-1', 'x')), false));

// THE ROUND-4 CRITICAL. `.` does not match '\r' in JS, so a CRLF fence line matched nothing and
// parseFences returned [] for the whole document — no blocks meant no UNCITED blocks, and the
// fabrication guard filters on exactly those. Byte-identical content exited 2 as LF and 0 as CRLF.
red('R3 a CRLF packet cannot smuggle an uncited fence past the guard', 'R3', () =>
  checkUncited(parseFences('```\r\nconst fabricated = 1;\r\n```\r\n'), false));

red('R3 a lone-CR packet cannot either', 'R3', () =>
  checkUncited(parseFences('```\rconst fabricated = 1;\r```\r'), false));

// --- Round 5: parse integrity ---------------------------------------------------------------------
// Patching hidden characters one at a time is a losing game — the strict matcher will always admit a
// smaller set than a lenient reader, and every gap is a fence the gate cannot see while the model
// still reads it as code. So the gate compares the two readings and refuses when they disagree.
// These canaries drive that comparison red for each character class found in round 5.
const hidden = (cp) => String.fromCharCode(cp);
const anomalyCanary = (name, cp) => green(name, () => {
  const doc = `${hidden(cp)}\`\`\`js\nconst fabricated = 1;\n\`\`\`\n`;
  if (!fenceParseAnomalies(doc).length) throw new Error('a hidden character before the fence must be detected');
  return [];
});
anomalyCanary('parse-integrity detects a BOM before a fence', 0xFEFF);
anomalyCanary('parse-integrity detects a non-breaking space before a fence', 0xA0);
anomalyCanary('parse-integrity detects a vertical tab before a fence', 0x0B);
green('parse-integrity does NOT fire on a clean document', () => {
  if (fenceParseAnomalies('## Remit\ntext\n```js path=x.mjs lines=1-1\nx\n```\n').length) {
    throw new Error('false positive: a clean packet must have no anomalies');
  }
  return [];
});
green('parse-integrity does NOT fire on a nested fence inside a longer one', () => {
  if (fenceParseAnomalies('````md path=a.md lines=1-3\n```\ninner\n```\n````\n').length) {
    throw new Error('a fence inside a body is legitimately not a delimiter');
  }
  return [];
});

// --- Round 2 findings, 2026-08-15 ----------------------------------------------------------------
// Round 1's fix for the anchor-free bypass depended on a filter requiring `b.lang`. A BARE fence
// has falsy lang, so the identical bypass reopened with one fewer keystroke, and the approval view
// printed "no code fences present" over hand-typed code. Both reviewers found it independently.

green('a BARE fence (no info string) counts as unverified content', () => {
  const [b] = parseFences(['```', 'const fabricated = 1;', '```'].join('\n'));
  if (!isUnverifiedFence(b)) throw new Error('a bare uncited fence must count as unverified');
  return [];
});
green('a json/yaml fence counts as unverified content', () => {
  const [b] = parseFences(['```json', '{"fabricated": true}', '```'].join('\n'));
  if (!isUnverifiedFence(b)) throw new Error('language must not exempt a fence from being unverified');
  return [];
});
green('a CITED fence is not unverified', () => {
  const [b] = parseFences(fence('path=x.mjs lines=1-1', 'x'));
  if (isUnverifiedFence(b)) throw new Error('a cited block is byte-verified by R3');
  return [];
});

// R4 was satisfied by ONE cited block anywhere — cite a real irrelevant file, then hand-type fences
// purporting to be the file under review. The decoy lends the fabrication credibility.
red('R4 refuses when no cited block quotes a path the remit names', 'R4', () =>
  checkArtifact(true, parseFences(fence('path=backend/util/clamp.mjs lines=1-1', 'x')), ['backend/auth/login.mjs']));
green('R4 passes when a cited block quotes a named path', () =>
  checkArtifact(true, parseFences(fence('path=backend/auth/login.mjs lines=1-1', 'x')), ['backend/auth/login.mjs']));
green('R4 unaffected when the remit names no paths (routes/symbols only)', () =>
  checkArtifact(true, parseFences(fence('path=backend/x.mjs lines=1-1', 'x')), []));

// A falsy source hash silently turned the record-to-code binding OFF — reintroducing the spoofable
// canary the binding existed to kill, with no alarm.
red('R15 refuses when the gate source hash cannot be computed', 'R15', () =>
  checkCanary({ ranAt: new Date().toISOString(), total: 5, green: 5, red: 0, sourceHash: 'abc' }, { sourceHash: '' }));

// ---------------------------------------------------------------------------------------------

process.exit(runCanaries(cases, { root: ROOT, outDir: OUT_DIR }));
