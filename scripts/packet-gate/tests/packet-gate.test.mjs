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
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFences, remitFromDoc, checkProvenance, checkPremises, checkSize, checkArtifact, normPath } from '../checks.mjs';
import { gateSourceFiles, gateSourceHash } from '../source-hash.mjs';
import { makeResolver, GateUnavailable } from '../repo-io.mjs';
import { readCitedFile } from '../citation.mjs';
import { unboundNamedPaths, weakBindingOnly, caseOnlyBinding } from '../artifact.mjs';
import { foldCase } from '../normalize.mjs';

/** A minimal cited CODE block, for the R4 binding tests. */
const codeBlock = (p, body = 'const x = 1;') => ({ cited: true, attrs: { path: p }, lang: 'js', body });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GATE = join(ROOT, 'scripts', 'packet-gate.mjs');
const SELFTEST = join(ROOT, 'scripts', 'packet-gate', 'selftest.mjs');
const tmp = () => mkdtempSync(join(tmpdir(), 'packet-gate-'));

/**
 * A scratch dir INSIDE the repo, for fixtures the gate requires to be contained (`--seed`).
 * Under gitignored out/, so nothing here is ever committed.
 */
const tmpInRepo = () => {
  const base = join(ROOT, 'out', 'packet-gate', 'test-tmp');
  mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, 'seed-'));
};

/**
 * Build a phantom route at RUNTIME from fragments.
 *
 * A literal phantom written anywhere in a tracked non-test file — including a COMMENT — is found by
 * `git grep` and RESOLVES, which silently switches R5 off and makes these tests fail for a reason
 * that looks nothing like the cause. This repo already uses the same trick to test secret scanners
 * without tripping them. Never spell a phantom route out.
 */
const phantomRoute = (tag) => ['/api', 'zz' + tag, 'not' + '-real'].join('/');


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

test('uncited code fences alongside a cited one are REFUSED, not merely warned', () => {
  // RE-ANCHOR (2026-08-15), classified deliberately: this test previously asserted a WARNING and
  // exit 0. Round 3 made uncited fences a REFUSAL with an explicit --allow-uncited opt-out, because
  // HY3 showed the warning left the real hole open: one byte-verified block plus unlimited
  // hand-typed code exited 0. Behaviour verified BEFORE the assertion was touched — this packet now
  // exits 2 where it used to exit 0. The assertion was re-pointed at STRICTER behaviour, never
  // relaxed to make a red test green.
  // RE-ANCHOR (2026-08-15, round 4): exit 2 -> exit 1. The BLOCKING behaviour is unchanged — this
  // packet was refused before and is refused now. What changed is the KIND of refusal: exit 2 is
  // defined in the gate header as "the gate could not run", while an uncited fence is a packet
  // defect, so it is now an R3 REFUSAL (exit 1) carrying a remedy and a JSON receipt. Verified by
  // running the CLI BEFORE this assertion was touched. The assertion is also STRENGTHENED: it now
  // pins the refusal CODE, which the old exit-2 version could not express at all.
  const f = join(tmp(), 'mixed.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n\n```js path=package.json lines=1-1\n{\n```\n\n```js\nconst fabricated = 1;\n```\n');
  const refused = runGate(['--document', f]);
  assert.equal(refused.code, 1, refused.out);
  assert.match(refused.out, /uncited fence/i);
  const asJson = JSON.parse(runGate(['--document', f, '--json']).out);
  assert.ok(asJson.findings.some((x) => x.code === 'R3'), asJson.findings.map((x) => x.code).join(','));

  // …and the opt-out must still let a deliberate snippet through, or the remedy is a dead end.
  const { out } = runGate(['--document', f, '--allow-uncited', '--json']);
  const parsed = JSON.parse(out);
  // RE-ANCHOR (2026-08-15): wording changed from "uncited code fence(s)" to "uncited fence(s)"
  // when the language filter was removed — the warning now covers bare and json/yaml fences too,
  // so this assertion was re-pointed at the new text, not weakened. Verified the warning still
  // fires before editing the assertion.
  assert.ok(parsed.warnings.some((w) => /uncited fence/.test(w)), JSON.stringify(parsed.warnings));
});

// --- Kimi K3 + HY3 hostile-review findings, 2026-08-14 (CLI level) -------------------------------

test('CRITICAL REGRESSION: anchor-free remit + code fences is UNEVALUABLE (exit 2), not "not required"', () => {
  // The bypass: hand-type fabricated fences with no path=, write a remit naming nothing, and the
  // gate returned PACKET READY with fabricated code on the wire. It was the DEFAULT outcome for any
  // plainly-worded remit. Kimi K3 S1 / HY3 S1.
  const f = join(tmp(), 'bypass.md');
  writeFileSync(f, '## Remit\n\nReview this module for correctness.\n\n```js\nconst fabricated = "typed from memory";\n```\n');
  const { code, out } = runGate(['--document', f]);
  // RE-ANCHOR (2026-08-15, round 4): exit 2 -> exit 1, same reason as the mixed-fence test above.
  // The bypass is still closed — this is the assertion that matters and it still holds; only the
  // refusal channel changed from "gate could not run" to a first-class R3 refusal.
  assert.equal(code, 1, out);
  // RE-ANCHOR (2026-08-15): the EXIT CODE assertion is unchanged and still passes — the bypass is
  // still closed. Only the message moved: the old `!aboutCode` guard said "unevaluable" and was
  // REMOVED in round 3 as fully subsumed by the uncited-fence refusal (keeping both meant two
  // predicates disagreeing about --allow-uncited). The wording assertion was re-pointed at the
  // surviving guard's text; the behaviour it protects is identical.
  assert.match(out, /not byte-verified|unevaluable/i);
});

test('a genuinely non-code packet (no code fences) is unaffected by that guard', () => {
  const f = join(tmp(), 'strategy.md');
  writeFileSync(f, '## Remit\n\nShould we prioritise retention over acquisition next quarter?\n');
  const { code } = runGate(['--document', f]);
  assert.equal(code, 0, 'a pure strategy question needs no artifact');
});

test('REGRESSION: a negative --overhead-chars cannot shrink the packet past R1', () => {
  const f = join(tmp(), 'neg.md');
  writeFileSync(f, `## Remit\n\nReview /api/sessions\n\n${'x'.repeat(30000)}\n`);
  assert.equal(runGate(['--document', f, '--overhead-chars', '-29000']).code, 2);
});

test('REGRESSION: a named-but-missing --seed is exit 2, not silently zero bytes', () => {
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n');
  const { code, out } = runGate(['--document', f, '--seed', join(tmp(), 'absent-seed.md')]);
  assert.equal(code, 2, out);
  assert.match(out, /seed not found/i);
});

test('REGRESSION: an unknown provider is exit 2, not a clean gate with no cost estimate', () => {
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n');
  const { code, out } = runGate(['--document', f, '--provider', 'kni']);
  assert.equal(code, 2, out);
  assert.match(out, /unknown provider/i);
});

test('REGRESSION: a secret in the --seed is scanned, not waved through as "clean"', () => {
  // Secret-shaped string assembled at runtime so this committed file trips no scanner.
  // FIXTURE MOVED (round 5), assertion untouched: the seed now lives INSIDE the repo because a seed
  // that resolves outside it is refused for containment. The behaviour under test — a secret in the
  // seed produces an R6 refusal — is asserted exactly as before; only the fixture's address changed.
  const d = tmpInRepo();
  const doc = join(d, 'doc.md');
  const seed = join(d, 'seed.md');
  writeFileSync(doc, '## Remit\n\nReview /api/sessions\n');
  writeFileSync(seed, `context\nkey = "${'AKIA'}${'ZXCVBNMASDFGHJKL'}"\n`);
  const { code, out } = runGate(['--document', doc, '--seed', seed, '--json']);
  assert.equal(code, 1, out);
  assert.ok(JSON.parse(out).findings.some((x) => x.code === 'R6'), out);
});

test('the printed send command carries --remit when the gate verified one', () => {
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '# Doc\n\n```js path=package.json lines=1-1\n{\n```\n');
  const { out } = runGate(['--document', f, '--remit', 'Review package.json packaging']);
  assert.match(out, /--remit/, 'otherwise the gate certifies remit A while the model answers remit B');
});

// --- Round 2 findings, 2026-08-15 (CLI level) ----------------------------------------------------

test('CRITICAL REGRESSION: a BARE fence + anchor-free remit is exit 2', () => {
  // Round 1's guard filtered on `b.lang`; a bare ``` fence has falsy lang, so the identical bypass
  // reopened with one fewer keystroke and the approval view printed "no code fences present".
  const f = join(tmp(), 'bare.md');
  writeFileSync(f, '## Remit\n\nReview this module for correctness.\n\n```\nconst fabricated = 1;\n```\n');
  const { code, out } = runGate(['--document', f]);
  assert.equal(code, 1, out); // RE-ANCHOR round 4: exit 2 -> exit 1; still blocked, now as R3.
});

test('REGRESSION: a json fence + anchor-free remit is exit 2 (language must not exempt)', () => {
  const f = join(tmp(), 'json.md');
  writeFileSync(f, '## Remit\n\nReview this configuration.\n\n```json\n{"fabricated": true}\n```\n');
  assert.equal(runGate(['--document', f]).code, 1); // RE-ANCHOR round 4: exit 2 -> exit 1, still blocked.
});

test('REGRESSION: citing an unrelated real file does not satisfy R4 for a named path', () => {
  // The decoy attack: one real irrelevant block passes R3 and lends credibility to hand-typed
  // fences purporting to be the file actually under review.
  const f = join(tmp(), 'decoy.md');
  writeFileSync(f, '## Remit\n\nIs backend/services/sessions/sessionBlockAuthorization.mjs correct?\n\n```js path=package.json lines=1-1\n{\n```\n');
  const { out } = runGate(['--document', f, '--json']);
  assert.ok(JSON.parse(out).findings.some((x) => x.code === 'R4'), out);
});

// --- Round 4 findings, 2026-08-15 (Kimi K3, all re-verified by execution before any fix) ---------

test('CRITICAL REGRESSION: a CRLF packet cannot bypass the fabrication guard', () => {
  // THE ROUND-4 CRITICAL, and the worst class this gate has produced. `parseFences` split on '\n'
  // only, so on a CRLF document every line kept a trailing '\r'. The fence regex uses `.` and `$`,
  // and in JS `.` does NOT match '\r' — so a CRLF fence line matched nothing and parseFences
  // returned an EMPTY array for the whole document. No blocks meant no UNCITED blocks either, which
  // is what the fabrication guard filters on: byte-identical content exited 2 as LF and 0 as CRLF,
  // printing "no fences present" over hand-typed code. On Windows CRLF is the default save format.
  const body = '## Remit\n\nReview this module for correctness.\n\n```js\nconst fabricated = 1;\n```\n';
  const d = tmp();
  const lf = join(d, 'lf.md');
  const crlf = join(d, 'crlf.md');
  writeFileSync(lf, body);
  writeFileSync(crlf, body.replace(/\n/g, '\r\n'));
  const a = runGate(['--document', lf]);
  const b = runGate(['--document', crlf]);
  assert.equal(a.code, 1, a.out);
  assert.equal(b.code, b.code === a.code ? a.code : -1,
    `line endings must not change the verdict: LF=${a.code} CRLF=${b.code}\n${b.out}`);
});

test('REGRESSION: a CRLF packet with a real cited block still CLEARS (the fix is not "refuse everything")', () => {
  const f = join(tmp(), 'ok-crlf.md');
  writeFileSync(f, '## Remit\n\nReview package.json packaging\n\n```js path=package.json lines=1-1\n{\n```\n'.replace(/\n/g, '\r\n'));
  const { code, out } = runGate(['--document', f]);
  assert.equal(code, 0, out);
});

test('REGRESSION: parseFences and remitFromDoc both survive CRLF and lone CR', () => {
  const doc = '## Remit\n\nReview /api/sessions\n\n```js path=a.mjs lines=1-1\nconst a = 1;\n```\n';
  for (const [label, eol] of [['CRLF', '\r\n'], ['lone CR', '\r']]) {
    const converted = doc.replace(/\n/g, eol);
    assert.equal(parseFences(converted).length, 1, `${label}: fence must still parse`);
    assert.equal(parseFences(converted)[0].cited, true, `${label}: citation must survive`);
    assert.match(remitFromDoc(converted), /api\/sessions/, `${label}: remit must still extract`);
  }
  // The frontmatter form broke identically: `/^remit:\s*(.+)$/` cannot match a line ending in '\r'.
  assert.match(remitFromDoc('remit: Review /api/sessions\r\n\nbody\r\n'), /api\/sessions/);
});

test('REGRESSION: the uncited refusal reaches --json and does not mask later checks', () => {
  // It used to `return 2` straight out of main(), before report(): no JSON at all, and every check
  // queued behind it went unreported. A packet with an uncited fence AND a phantom path showed only
  // the fence, so the operator fixed one and met the next — the refusal-fatigue generator.
  const f = join(tmp(), 'masked.md');
  writeFileSync(f, `## Remit\n\nReview ${phantomRoute('r4mask')}\n\n\`\`\`js\nconst fabricated = 1;\n\`\`\`\n`);
  const { code, out } = runGate(['--document', f, '--json']);
  assert.equal(code, 1, out);
  const codes = JSON.parse(out).findings.map((x) => x.code);
  assert.ok(codes.includes('R3'), `uncited fence must be an R3 refusal: ${codes}`);
  assert.ok(codes.includes('R5'), `the phantom premise must NOT be masked by it: ${codes}`);
});

test('REGRESSION: R4 path binding is exact — a different real file with the same basename fails', () => {
  // H2 closed "root file vouches for deep file"; the reverse stayed open because the match allowed
  // the cited path to be MORE specific. R5 already proves the named path exists exactly, so the
  // endsWith allowance bought nothing and cost a decoy that needs zero fabrication.
  assert.equal(checkArtifact(true, [codeBlock('src/auth/login.mjs')], ['login.mjs'], []).length, 1);
  assert.equal(checkArtifact(true, [codeBlock('login.mjs')], ['login.mjs'], []).length, 0);
  // …and separator/prefix spelling still must not cause a FALSE refusal.
  assert.equal(checkArtifact(true, [codeBlock('src\\a.mjs')], ['./src/a.mjs'], []).length, 0);
});

test('REGRESSION: R4 content binding requires identifier boundaries, not a bare substring', () => {
  const body = '// this will remain stable\nexport const x = 1;\n';
  assert.equal(checkArtifact(true, [codeBlock('src/u.mjs', body)], [], ['main']).length, 1,
    '"remain" must not satisfy a remit naming the symbol main');
  assert.equal(checkArtifact(true, [codeBlock('src/u.mjs', 'export function main() {}')], [], ['main']).length, 0);
  // Routes keep substring semantics: word boundaries around a slash are meaningless.
  assert.equal(checkArtifact(true, [codeBlock('src/u.mjs', 'router.get("/api/sessions")')], [], ['/api/sessions']).length, 0);
});

test('REGRESSION: --allow-missing accepts every spelling of the same path, in R5 AND R4', () => {
  // Two comparisons for one flag: R5 folded backslashes, the CLI filter used a raw Array.includes.
  // So `--allow-missing src\x.mjs` cleared R5 and left the path in R4's binding, demanding a
  // citation of a file that by definition cannot be cited — one check contradicting another.
  const anchors = { paths: ['src/validate.mjs'], routes: [], symbols: [] };
  for (const spelling of ['src/validate.mjs', 'src\\validate.mjs', './src/validate.mjs', 'src//validate.mjs']) {
    assert.equal(checkPremises(anchors, () => false, [spelling]).findings.length, 0, `R5 rejected ${spelling}`);
    const allowed = new Set([spelling].map(normPath));
    assert.deepEqual(anchors.paths.filter((p) => !allowed.has(normPath(p))), [], `R4 binding kept ${spelling}`);
  }
});

test('REGRESSION: an unrecognized flag is exit 2, not a silent revert to the default', () => {
  // `--budjet-chars 8000` reverted to the 24,000 default — a LOOSER budget than chosen — at exit 0,
  // with a receipt showing a number the operator never asked for.
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '## Remit\n\nShould we prioritise retention next quarter?\n');
  assert.equal(runGate(['--document', f]).code, 0, 'control: this packet is otherwise clean');
  const { code, out } = runGate(['--document', f, '--budjet-chars', '8000']);
  assert.equal(code, 2, out);
  assert.match(out, /unrecognized flag/i);
});

test('NOT-A-BUG PIN: a cited range ending in blank lines matches (round-4 finding 8 was wrong)', () => {
  // Kimi ranked this LOW; running it disproved it. `norm` strips one trailing newline from BOTH
  // sides, and a fence body CAN represent trailing blank lines because the closing fence is its own
  // line. Pinned so a future round does not "fix" a non-bug and break byte-verification doing it.
  const md = '```js path=a.mjs lines=1-3\nfoo\n\n\n```\n';
  assert.deepEqual(checkProvenance(parseFences(md), () => 'foo\n\n\n'), []);
});

// --- Round 5 findings, 2026-08-16 (Kimi K3 + GLM-5.3 + my own pass on the round-4 diff) ----------

test('CRITICAL REGRESSION: R15 covers every file that defines a check, derived not hand-listed', () => {
  // The round-4 refactor split checks.mjs for the 300-line cap and left GATE_SOURCES listing three
  // files. R3, R4 and both normalizers moved OUT of them, so a neutered checkArtifact still passed
  // R15 and the decoy packet produced zero findings. The list is now derived from the directory.
  const files = gateSourceFiles(ROOT);
  for (const must of ['artifact', 'provenance', 'normalize', 'args', 'checks', 'fences', 'repo-io', 'canary']) {
    assert.ok(files.some((f) => f.endsWith(`/${must}.mjs`)), `${must}.mjs is not covered by R15: ${files.join(', ')}`);
  }
  assert.ok(files.includes('scripts/packet-gate.mjs'));
});

test('CRITICAL REGRESSION: a hidden character cannot hide a fence from the gate', () => {
  // Round 4 fixed \r. Round 5 found U+2028/U+2029 (same mechanism) and BOM/NBSP (different one:
  // `^[ \t]*` simply does not admit them). Patching code points one at a time is a losing game, so
  // the gate now refuses when a LENIENT reading finds a fence-like line the strict parser did not
  // consume. Both faces of the disagreement are covered: fail-open AND inverted fence parity.
  const BOM = String.fromCharCode(0xFEFF);
  const NBSP = String.fromCharCode(0xA0);
  const LS = String.fromCharCode(0x2028);
  const cases = {
    BOM: `${BOM}\`\`\`js path=src/x.mjs lines=1-40\nconst FABRICATED = true;\n\n## Remit\nIs this correct?\n`,
    NBSP: `## Remit\n\nIs this correct?\n\n${NBSP}\`\`\`js\nconst FABRICATED = true;\n${NBSP}\`\`\`\n`,
  };
  for (const [label, body] of Object.entries(cases)) {
    const f = join(tmp(), `hidden-${label}.md`);
    writeFileSync(f, body);
    const { code, out } = runGate(['--document', f]);
    assert.equal(code, 2, `${label} must not be certifiable:\n${out}`);
    assert.match(out, /did not consume/i, label);
  }
  // U+2028 as the line separator: no \n at all, so every fence sits mid-line where ^ cannot match.
  const f = join(tmp(), 'ls.md');
  writeFileSync(f, `## Remit${LS}${LS}Review this module.${LS}${LS}\`\`\`js${LS}const FABRICATED = true;${LS}\`\`\`${LS}`);
  const { code } = runGate(['--document', f, '--remit', 'Review this module for correctness.']);
  assert.notEqual(code, 0, 'a U+2028-separated packet must never reach PACKET READY');
});

test('HIGH REGRESSION: --seed gets the same provenance discipline as the document', () => {
  // The seed was measured for R1 and scanned for R6 — the gate plainly treats it as prompt content —
  // but nothing ever parsed it, so fabricated fences in a seed rode along behind a document whose
  // own approval line read "all byte-verified". Both paid reviewers found this independently.
  const d = tmpInRepo();
  const doc = join(d, 'doc.md');
  const seed = join(d, 'seed.md');
  writeFileSync(doc, '## Remit\n\nReview /api/sessions\n');
  writeFileSync(seed, 'As I remember it:\n\n```js\nexport const ADMIN_BYPASS = true;\n```\n');
  const { code, out } = runGate(['--document', doc, '--seed', seed, '--json']);
  assert.equal(code, 1, out);
  const f = JSON.parse(out).findings.find((x) => x.code === 'R3');
  assert.ok(f, `expected an R3 for the seed's uncited fence: ${out}`);
  assert.match(f.detail, /seed line/, 'the finding must say WHICH channel, or it is undiagnosable');
});

test('HIGH REGRESSION: a --seed outside the repository is refused, not read', () => {
  // The approval view PRINTS the seed into the send command, so an uncontained seed meant the gate
  // was certifying a command that ships an arbitrary out-of-repo file to a paid model.
  const doc = join(tmpInRepo(), 'doc.md');
  writeFileSync(doc, '## Remit\n\nReview /api/sessions\n');
  const outside = join(tmp(), 'outside.md');
  writeFileSync(outside, 'context\n');
  const { code, out } = runGate(['--document', doc, '--seed', outside]);
  assert.equal(code, 2, out);
  assert.match(out, /outside the repository/i);
});

test('HIGH REGRESSION: a subheading inside the Remit section does not truncate its anchors', () => {
  // The stop test matched ANY heading, so `#### In scope` ended the remit and every anchor below it
  // vanished before extractAnchors ran: aboutCode went false, R4 returned [] and R5 had nothing to
  // resolve. Both checks silently did not run, and a phantom route below the subheading was blessed.
  const remit = remitFromDoc('## Remit\nReview the refund flow.\n#### In scope\nsrc/refunds/run.mjs\n\n## Artifact\nnot the remit\n');
  assert.match(remit, /run\.mjs/, 'anchors under a subheading must survive');
  assert.doesNotMatch(remit, /not the remit/, 'a same-level heading must still end the section');
  // Start and stop tests now both run on trimmed lines, so an indented ATX heading cannot be
  // absorbed into the remit and inject a path anchor the operator never wrote.
  assert.doesNotMatch(remitFromDoc('## Remit\nReview src/auth/login.mjs\n  ## src/utils/format.mjs\n'), /format\.mjs/);
});

// --- Round 6 findings, 2026-08-16 (the seven MEDIUM/LOW carried from round 5) --------------------

test('R4 DECLARES a weak binding instead of vetoing it', () => {
  // RE-ANCHOR (same session, round 6), and it is a LOOSENING — so the reasoning matters.
  // This test first asserted a veto: if the remit named any path, only a path could bind. Running
  // that revealed a FALSE REFUSAL on an ordinary remit — "does the handler for /api/sessions read
  // package.json?" names a path in passing while being about the route, so a packet citing the real
  // handler was refused for carrying the wrong file. The gate rates a false refusal as severe as a
  // fail-open, because it is what teaches operators to bypass.
  //
  // The protection is preserved in a STRONGER form than the veto: the packet is allowed, and the
  // weak binding is DECLARED in the receipt. This test now pins the declaration, which the veto
  // version could not express at all — so it asserts more than it did before, not less.
  const mentions = codeBlock('src/other.mjs', 'validateToken()');
  assert.equal(checkArtifact(true, [mentions], ['src/auth.mjs'], ['validateToken']).length, 0);
  assert.equal(weakBindingOnly([mentions], ['src/auth.mjs'], ['validateToken']), true,
    'a binding resting only on a mention MUST be declared');

  // Identity binding is not "weak" — citing the named path itself.
  const real = codeBlock('src/auth.mjs', 'export function validateToken() {}');
  assert.equal(weakBindingOnly([real], ['src/auth.mjs'], ['validateToken']), false);

  // With NO path named, content binding is the only mechanism and is not flagged as weak.
  assert.equal(checkArtifact(true, [mentions], [], ['validateToken']).length, 0);
  assert.equal(weakBindingOnly([mentions], [], ['validateToken']), false);

  // The false refusal that caused this re-anchor, pinned so it cannot come back.
  const handler = codeBlock('backend/routes/sessions.mjs', 'router.get("/api/sessions")');
  assert.equal(checkArtifact(true, [handler], ['package.json'], ['/api/sessions']).length, 0,
    'a remit naming a path in passing must not refuse a packet carrying the true subject');
});

test('R4: a test file cannot serve as the artifact for the code it tests', () => {
  // repo-io already refuses to let a test vouch for a route's EXISTENCE; nothing stopped a packet
  // citing one as the SUBJECT, so the model reviewed the test instead of the handler.
  for (const p of ['tests/refunds.test.mjs', 'src/__tests__/a.mjs', 'src/fixtures/b.mjs', 'src/a.spec.ts']) {
    assert.equal(checkArtifact(true, [codeBlock(p, 'it("/refunds/run")')], [], ['/refunds/run']).length, 1, p);
  }
  assert.equal(checkArtifact(true, [codeBlock('src/refunds/run.mjs', 'router.post("/refunds/run")')], [], ['/refunds/run']).length, 0);
});

test('R4 WARNS (not refuses) when the remit names a path the packet does not carry', () => {
  // Refusing would false-refuse the common "…and its neighbour" phrasing; silence let the model
  // answer about an interaction it could only see half of. Surfaced instead.
  assert.deepEqual(unboundNamedPaths([codeBlock('src/b.mjs')], ['src/a.mjs', 'src/b.mjs']), ['src/a.mjs']);
  assert.deepEqual(unboundNamedPaths([codeBlock('src/b.mjs')], ['src/b.mjs']), []);
});

test('normPath matches the filesystem it actually runs on', () => {
  // Backslash folding is correct on win32 (it IS the separator) and WRONG on POSIX, where a
  // backslash is a legal filename character and `src\x.mjs` is a different real file.
  // RE-ANCHOR (round 7): case folding MOVED OUT of normPath into `foldCase`, a declared secondary
  // comparison. Round 6 folded case inside normPath to fix a macOS/WSL false refusal, and that
  // traded it for a LINUX FAIL-OPEN — on ext4 `src/Config.mjs` and `src/config.mjs` are two
  // different real files, so a remit naming one was bound by a byte-exact citation of the other with
  // every check green and no warning. normPath is identity again; case-only matches still bind (no
  // false refusal) but are DECLARED via caseOnlyBinding.
  assert.notEqual(normPath('SRC/App.mjs'), normPath('src/app.mjs'), 'identity must not fold case');
  assert.equal(foldCase('SRC/App.mjs'), foldCase('src/app.mjs'), 'the secondary comparison folds it');
  if (process.platform === 'win32') {
    assert.equal(normPath('src\\x.mjs'), normPath('src/x.mjs'));
  } else {
    assert.notEqual(normPath('src\\x.mjs'), normPath('src/x.mjs'), 'a backslash filename is its own file');
  }
  // The bind still happens (macOS is not refused) and the case-only nature is reported.
  const b = codeBlock('src/app.mjs');
  assert.equal(checkArtifact(true, [b], ['SRC/App.mjs'], []).length, 0, 'case-only must still bind');
  assert.deepEqual(caseOnlyBinding([b], ['SRC/App.mjs']), [{ cited: 'src/app.mjs', named: 'SRC/App.mjs' }]);
  assert.deepEqual(caseOnlyBinding([codeBlock('src/app.mjs')], ['src/app.mjs']), [], 'identity is not case-only');
  assert.equal(normPath('src/./x.mjs'), normPath('src/x.mjs'), 'mid-path ./ resolves on disk');
  assert.equal(normPath('./src//x.mjs'), normPath('src/x.mjs'));
});

test('REGRESSION: `lines= 40-118` is refused as malformed, not silently widened to the whole file', () => {
  // `\S+` failed to match past the space, so the attribute vanished and R3 read undefined as
  // "cite the whole file" — printing a whole-file diff for a correctly-cited range.
  const [b] = parseFences('```js path=a.mjs lines= 40-118\nfoo\n```');
  assert.equal(b.attrs.lines, '', 'the empty value must be captured, not dropped');
  const f = checkProvenance([b], () => 'x\ny\nz\n');
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /malformed lines=/);
});

test('REGRESSION: a valued flag cannot swallow the next flag as its value', () => {
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n');
  // `--remit --json` set the remit to the literal "--json" (naming nothing, so R4/R5 went inert)
  // AND disabled JSON, at exit 0.
  const a = runGate(['--document', f, '--remit', '--json']);
  assert.equal(a.code, 2, a.out);
  assert.match(a.out, /another flag as their value|missing a value/i);
  // A flag with no value at all is the same shape: `--seed` last meant the seed was never measured.
  assert.equal(runGate(['--document', f, '--seed']).code, 2);
  // …and a legitimate value is untouched: the flag PARSES and the run reaches the real checks.
  // (This packet then fails R4 — it carries no cited code — which is the correct verdict and is
  // exactly the distinction being asserted: exit 1 is "the packet is wrong", exit 2 is "the flag
  // was wrong". Asserting 0 here would have been asserting a bug.)
  const good = runGate(['--document', f, '--remit', 'Review /api/sessions']);
  assert.equal(good.code, 1, good.out);
  assert.doesNotMatch(good.out, /missing a value|another flag as their value/i);
});

test('REGRESSION: a route can be excused with --allow-missing, like a path', () => {
  // "review the new handler for POST /api/widget" was a dead end while the path-shaped version of
  // the same packet cleared via one flag — an unactionable remedy teaches operators to bypass.
  const anchors = { paths: [], routes: ['/api/widget'], symbols: [] };
  const r = checkPremises(anchors, () => false, ['/api/widget']);
  assert.deepEqual(r.findings, [], 'the flag must excuse a route, not just a path');
  assert.equal(r.warnings.length, 1, 'and it must still be visible in the receipt');
  // Without the flag it is still a refusal — the phantom-route catch is intact.
  assert.equal(checkPremises(anchors, () => false, []).findings.length, 1);
});

// --- Round 6 REVIEW findings (Kimi K3 + GLM-5.3, converging on F1/F2) ---------------------------

test('CRITICAL REGRESSION: R15 covers the gate logic that lives OUTSIDE its own directory', () => {
  // Round 5 replaced a hand-written list with a scan of ONE directory — and the gate's logic lives
  // in two. `extractAnchors` decides aboutCode, which decides whether R4 runs at all; neuter it and
  // the canary record still matched. Both reviewers found this independently. The list is now the
  // transitive import graph unioned with a RECURSIVE directory scan, so a future subdirectory split
  // (which the 300-line cap makes inevitable) cannot escape either.
  const files = gateSourceFiles(ROOT);
  assert.ok(files.some((f) => f.endsWith('context-gateway/src/anchors.mjs')), files.join(', '));
  assert.ok(files.some((f) => f.endsWith('context-gateway/src/providers.mjs')), files.join(', '));
  for (const m of ['artifact', 'normalize', 'seed', 'args', 'provenance']) {
    assert.ok(files.some((f) => f.endsWith(`/${m}.mjs`)), `${m}.mjs uncovered`);
  }
});

test('HIGH REGRESSION: R4 sees seed blocks, exactly as R3 and checkUncited already do', () => {
  // checkArtifact received `blocks` while the adjacent lines passed [...blocks, ...seedBlocks], so a
  // packet whose subject arrived VIA THE SEED was refused for "no cited CODE block" while R3 had
  // just byte-verified it — one predicate, two channel-unions, adjacent lines.
  const d = tmpInRepo();
  const doc = join(d, 'doc.md');
  const seed = join(d, 'seed.md');
  writeFileSync(doc, '## Remit\n\nReview scripts/packet-gate/refusal.mjs — are the codes coherent?\n');
  execFileSync('node', [join(ROOT, 'scripts/packet-gate/build-packet.mjs'),
    '--out', seed, '--remit', 'x', '--file', 'scripts/packet-gate/refusal.mjs'], { cwd: ROOT });
  // strip the builder's own remit heading so the seed carries only the cited block
  const raw = readFileSync(seed, 'utf8');
  writeFileSync(seed, raw.slice(raw.indexOf('```')));
  const { code, out } = runGate(['--document', doc, '--seed', seed]);
  assert.equal(code, 0, out);
  assert.match(out, /1 cited block/, 'the approval view must COUNT the seed artifact it cleared on');
});

test('a test file is excluded as a DECOY but not as the SUBJECT', () => {
  // The first version excluded every test path unconditionally, which hard-failed "review
  // tests/refunds.test.mjs — is this test actually asserting the refund path?" with no remedy.
  assert.equal(checkArtifact(true, [codeBlock('tests/refunds.test.mjs')], ['tests/refunds.test.mjs'], []).length, 0);
  assert.equal(checkArtifact(true, [codeBlock('tests/refunds.test.mjs', 'it("/refunds/run")')], [], ['/refunds/run']).length, 1);
  // …and the warning must not then claim the named test is absent.
  assert.deepEqual(unboundNamedPaths([codeBlock('tests/x.test.mjs')], ['tests/x.test.mjs']), []);
});

test('REGRESSION: a misspelled flag cannot be swallowed as another flag value', () => {
  // The unknown-KEY fix and the bad-VALUE fix each closed half; their intersection stayed open:
  // `--remit --budjet-chars 8000` set remit to "--budjet-chars" (anchor-free, so R4+R5 went inert)
  // AND silently reverted the budget. Any `--`-prefixed value is now refused.
  const f = join(tmp(), 'ok.md');
  writeFileSync(f, '## Remit\n\nReview /api/sessions\n');
  const { code, out } = runGate(['--document', f, '--remit', '--budjet-chars', '8000']);
  assert.equal(code, 2, out);
  // The message names the TYPO rather than the swallowed value — which is the better diagnosis, and
  // is why this asserts the offending flag rather than one specific wording. (The value guard fires
  // first and declines to consume `--budjet-chars`, so it then falls through to the unknown-key
  // check. Asserting the wording would have pinned an implementation detail, not the behaviour.)
  assert.match(out, /--budjet-chars/, out);
  assert.match(out, /unrecognized flag|missing a value|another flag as their value/i, out);
});

test('REGRESSION: the Remit heading may carry the remit inline', () => {
  // `/^#{2,}\s*remit\s*$/` required the bare word, so `## Remit: review the refund flow` was never
  // found and the gate told the operator to add a section the document already had.
  assert.match(remitFromDoc('## Remit: review the refund flow\nand src/a.mjs\n'), /refund flow[\s\S]*src\/a\.mjs/);
  assert.match(remitFromDoc('## Remit — review src/x.mjs\n'), /src\/x\.mjs/);
  assert.equal(remitFromDoc('## Remit\nplain body\n'), 'plain body', 'the bare form is unchanged');
});

test('REGRESSION: --seed pointed at a directory is a labelled refusal, not a stack trace', () => {
  const doc = join(tmpInRepo(), 'doc.md');
  writeFileSync(doc, '## Remit\n\nReview /api/sessions\n');
  const { code, out } = runGate(['--document', doc, '--seed', 'out']);
  assert.equal(code, 2, out);
  assert.match(out, /cannot be read/i);
  assert.doesNotMatch(out, /unexpected failure/i, 'a stack trace is the least diagnosable output a gate can give');
});

// --- Round 7 findings, 2026-08-16 ----------------------------------------------------------------

test('CRITICAL REGRESSION: a packet cannot cite ITSELF into "byte-verified"', () => {
  // THE ROUND-7 CRITICAL, and it stood through six rounds because every one attacked the CHECKS
  // rather than what R3 actually proves. R3 proves "these bytes exist in a repo file at this line
  // range" — not "these bytes are the source they claim to be". A packet under ROOT can cite itself
  // at the exact lines its own fabricated fence body occupies; the comparison is byte-identical BY
  // CONSTRUCTION. Verified before the fix: PACKET READY, exit 0, "2 cited block(s), all
  // byte-verified against the repo [ok]" over `export function isAdmin(){ return true; }`.
  const d = tmpInRepo();
  const f = join(d, 'P.md');
  const rel = relative(ROOT, f).replaceAll('\\', '/');
  const head = ['## Remit', '', 'Review scripts/packet-gate/refusal.mjs.', ''];
  const payload = ['export function isAdmin(){ return true; } // FABRICATED'];
  const bodyStart = head.length + 2;
  writeFileSync(f, [...head, `\`\`\`js path=${rel} lines=${bodyStart}-${bodyStart + payload.length - 1}`, ...payload, '```', ''].join('\n'));
  const { code, out } = runGate(['--document', f]);
  assert.equal(code, 1, out);
  // RE-ANCHOR (round 8): round 7 closed this by IDENTITY (the document is not citable). Round 8
  // showed identity was the wrong axis — `cp packet.md cite.mjs` gives a different inode AND a
  // different realpath, and the copy contains the payload by construction. The close is now
  // "cited files must be TRACKED", which subsumes the self-cite, the hardlink and the copy. This
  // fixture is written under gitignored out/, so it trips the tracked check first; either reason is
  // the correct refusal, so the assertion pins the CLASS rather than one message.
  assert.match(out, /that is this packet|not tracked by git/i, out);
});

test('R4 still binds a case-only path match, but DECLARES it', () => {
  // Round 6 folded case inside normPath to fix a macOS/WSL false refusal and thereby created a LINUX
  // FAIL-OPEN: on ext4 `src/Config.mjs` and `src/config.mjs` are two different real files, so a
  // remit naming one was bound by a byte-exact citation of the other, every check green, no warning.
  // Signal, not veto — the same resolution as weakBindingOnly.
  const b = codeBlock('src/app.mjs');
  assert.equal(checkArtifact(true, [b], ['SRC/App.mjs'], []).length, 0, 'must not false-refuse macOS');
  assert.deepEqual(caseOnlyBinding([b], ['SRC/App.mjs']), [{ cited: 'src/app.mjs', named: 'SRC/App.mjs' }]);
  assert.deepEqual(caseOnlyBinding([codeBlock('src/app.mjs')], ['src/app.mjs']), []);
});

test('REGRESSION: `## Remit-to-pay …` does not hijack extraction from the real Remit section', () => {
  // `\s*[:—–-]` matched `Remit-driven`/`Remit-to-pay`, and findIndex takes the FIRST match — so the
  // remit became that section's text, aboutCode went false, R4 and R5 went inert, and the
  // empty-remit guard stayed silent because the remit was non-empty garbage.
  assert.equal(remitFromDoc('## Remit-to-pay reconciliation\nhijack\n\n## Remit\nthe real remit\n'), 'the real remit');
  assert.equal(remitFromDoc('## Remit-driven changes\nbody\n'), '');
  // …while the legitimate inline forms still work.
  assert.match(remitFromDoc('## Remit: review the refund flow\n'), /refund flow/);
  assert.match(remitFromDoc('## Remit — review src/x.mjs\n'), /src\/x\.mjs/);
});

test('the import walker covers side-effect and dynamic imports, not just `from`', () => {
  // The walker now DEFINES R15's coverage, so its regex defines the blast radius — and the recursive
  // floor only bounds that for files inside scripts/packet-gate/, which is exactly where anchors.mjs
  // is NOT. Latent when found (the gate uses only `from`), closed while it was still cheap.
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g;
  for (const [src, want] of [
    ["import x from './a.mjs'", './a.mjs'],
    ["import './b.mjs'", './b.mjs'],
    ["await import('./c.mjs')", './c.mjs'],
    ['export * from"./d.mjs"', './d.mjs'],
  ]) {
    const got = [...src.matchAll(new RegExp(re.source, 'g'))].map((m) => m[1]);
    assert.deepEqual(got, [want], src);
  }
});

// --- Round 8 review findings (GLM-5.3 F4/F6) -----------------------------------------------------

test('CRITICAL REGRESSION: a non-heading line cannot hijack remit extraction', () => {
  // Round 5 made both the start and stop tests run on `l.trim()`, which opened a worse hole than the
  // asymmetry it closed: trim() makes lines match that CommonMark does not call headings at all.
  // The decoy is found FIRST, the real `## Remit` below then STOPS extraction, and the remit becomes
  // the decoy's text — non-empty (so the empty-remit guard never fires) and naming nothing (so
  // aboutCode goes false and R4 + R5 are both inert). A phantom route in the REAL remit then ships.
  const hijack = ['## Sample packet format', '', '    ## Remit', '    review the refund flow', '',
    '## Remit', 'Review the handler for src/refunds/run.mjs', ''].join('\n');
  assert.match(remitFromDoc(hijack), /run\.mjs/, 'the indented sample must not win');

  for (const decoy of ['    ## Remit', '##Remit', '#######Remit']) {
    assert.equal(remitFromDoc(`${decoy}\nhijacked\n\n## Remit\nthe real remit\n`), 'the real remit', decoy);
  }
});

test('every legitimate CommonMark Remit spelling still extracts', () => {
  // The miss direction matters as much as the hijack direction: a heading the operator wrote and the
  // gate cannot see produces "add a ## Remit section" for a document that has one.
  assert.equal(remitFromDoc('## Remit\nbody\n'), 'body');
  assert.equal(remitFromDoc('   ## Remit\nbody\n'), 'body', '<=3 spaces is still a heading');
  assert.equal(remitFromDoc('## Remit ##\nbody\n'), 'body', 'closed ATX');
  assert.match(remitFromDoc('## Remit: review the refund flow\n'), /refund flow/);
  assert.match(remitFromDoc('## Remit — review src/x.mjs\n'), /src\/x\.mjs/);
  assert.match(remitFromDoc('## Remit (review the refund flow)\n'), /refund flow/, 'parenthesised');
  // …and the round-7 hijack stays closed in the other direction.
  assert.equal(remitFromDoc('## Remit-to-pay reconciliation\nbody\n'), '');
  // …and a subheading inside the section still does not truncate it.
  assert.match(remitFromDoc('## Remit\nReview refunds.\n#### In scope\nsrc/refunds/run.mjs\n'), /run\.mjs/);
});

test('NOT-A-BUG PIN: the seed IS held to R3-uncited, R1 and R6 (GLM R8 F3 disproven)', () => {
  // GLM flagged this as "probable, one run to confirm" because seed.mjs and packet-gate.mjs were not
  // in its packet. Running it disproves the finding — the seed goes through checkUncited, its bytes
  // are counted in the R1 total, and its content is scanned for R6. Pinned so the honest hedge is
  // not later mistaken for an open hole.
  const d = tmpInRepo();
  const doc = join(d, 'doc.md');
  const seed = join(d, 'seed.md');
  writeFileSync(doc, '## Remit\n\nReview scripts/packet-gate/refusal.mjs\n');
  writeFileSync(seed, 'prior context\n\n```js\nconst FABRICATED = true;\n```\n');
  const { code, out } = runGate(['--document', doc, '--seed', seed, '--json']);
  assert.equal(code, 1, out);
  const f = JSON.parse(out).findings.find((x) => x.code === 'R3');
  assert.ok(f && /seed line/.test(f.detail), out);
});

// --- Round 9 findings (Kimi K3) ------------------------------------------------------------------

test('CRITICAL REGRESSION: a cited path that IS git pathspec magic is refused', () => {
  // Round 8 closed self-citation by requiring cited files to be tracked. Round 9 defeated that
  // THROUGH the check: on POSIX `:` and `*` are legal filename characters, so `cp packet.md
  // ':(glob)**'` makes a real file whose NAME is a pathspec. existsSync passes, and
  // `git ls-files --error-unmatch -- ':(glob)**'` EXPANDS the magic and matches every tracked file
  // in the repo — reporting an untracked copy as tracked — while readFileSync reads the copy, which
  // byte-matches the fabricated fence by construction. `--` ends option parsing, not magic.
  const blk = { cited: true, attrs: { path: ':(glob)**' }, lang: 'js', body: 'x', start: 1 };
  const f = checkProvenance([blk], (rel) => readCitedFile(ROOT, rel, []));
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /pathspec magic/);
  // R5's path resolver gets the same rejection — Kimi named it as the sibling that would drift.
  assert.equal(makeResolver(ROOT)(':(glob)**', 'path'), false);
});

test('REGRESSION: the remit STOP test uses the raw line too (the round-8 fix was half-applied)', () => {
  // The start test was rewritten to CommonMark's raw-line grammar; its sibling still ran on
  // `l.trim()`, so an indented `    ## Artifact` — a code block, not a heading — still terminated
  // the remit early and dropped every anchor below it. My own tests missed it because they exercise
  // where extraction STARTS, not what stops it.
  assert.match(remitFromDoc('## Remit\nReview refunds.\n    ## Artifact\nsrc/refunds/run.mjs\n'), /run\.mjs/);
  assert.match(remitFromDoc('## Remit\nReview refunds.\n##Artifact\nsrc/refunds/run.mjs\n'), /run\.mjs/);
  // …and a genuine same-level heading still ends the section.
  assert.doesNotMatch(remitFromDoc('## Remit\nbody\n\n## Artifact\nnot the remit\n'), /not the remit/);
});

test('REGRESSION: a git failure is "cannot run", not "your file is untracked"', () => {
  // isTracked mapped EVERY git failure to false, so a broken tool, a wrong cwd or a safe.directory
  // refusal would report "not tracked by git" on every cited block — a false-refusal machine, and
  // inconsistent with makeResolver forty lines away, which has drawn the exit-1 distinction since
  // round 1. Asserted through a non-repo root, where ls-files exits 128.
  const outside = tmp(); // an OS temp dir is not a git repository
  writeFileSync(join(outside, 'a.mjs'), 'x'); // must EXIST, or existsSync short-circuits first
  assert.throws(
    () => readCitedFile(outside, 'a.mjs', []),
    (e) => e instanceof GateUnavailable,
    'a git failure must raise GateUnavailable (exit 2), never a silent "untracked" finding',
  );
});

// --- Round 9 review findings (GLM-5.3 F5/F6, converging with Kimi on F1-F4) ----------------------

test('REGRESSION: an NBSP after the hashes is a paragraph, not a Remit heading', () => {
  // Round 8 tightened the SHAPE of a heading (indent, hash count, required space) and left its
  // WHITESPACE CLASS as JavaScript's: `\s` matches U+00A0, U+2028, U+3000; CommonMark's ATX rule is
  // a space or a tab. So `##<NBSP>Remit` — a paragraph in every renderer — matched the gate, the
  // fake heading was found first, and the real `## Remit` below stopped extraction. The same hijack
  // this parser has now been patched for three times, each time through the previous patch.
  const NBSP = String.fromCharCode(0xA0);
  assert.equal(remitFromDoc(`##${NBSP}Remit\nhijacked\n\n## Remit\nthe real remit\n`), 'the real remit');
  // …and a TAB is still a legitimate ATX separator.
  assert.equal(remitFromDoc('##\tRemit\nbody\n'), 'body');
});

test("R6's engine is inside the canary hash, though no import walk can reach it", () => {
  // The hygiene verdict comes from scripts/scan-secrets.sh. No import graph and no .mjs scan can
  // ever see it, so R6's actual decision logic sat permanently outside the binding — the round-5
  // critical's shape (a check the canary does not certify) in the one place the derivation is
  // structurally blind. It cannot be derived, so it is named.
  assert.ok(gateSourceFiles(ROOT).includes('scripts/scan-secrets.sh'), gateSourceFiles(ROOT).join(', '));
});

// --- Round 10 findings (my own pass + GLM-5.3; Kimi's run died before writing) -------------------

test('CRITICAL REGRESSION: `git add` alone does not make a cited file provable', () => {
  // Found by my own round-10 pass BEFORE the reviews returned, and confirmed independently by GLM.
  // `git ls-files` reports the INDEX, so the round-8 "must be tracked" close cost exactly one extra
  // command to route around: `cp packet.md cite.mjs && git add cite.mjs` — no commit, no review, and
  // the fabricated copy byte-matches itself by construction. Fourth spelling of one attack across
  // four rounds: self-cite -> hardlink -> copy -> STAGED copy. Staging is not history; it is a local
  // act by the same author writing the packet.
  const dir = join(ROOT, 'scripts', '__r10test');
  const rel = 'scripts/__r10test/payload.mjs';
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(ROOT, rel), 'export function isAdmin(){ return true; }\n');
  try {
    execFileSync('git', ['add', '--', rel], { cwd: ROOT, stdio: 'ignore' });
    assert.throws(() => readCitedFile(ROOT, rel, []), (e) => e.code === 'ESTAGED');
  } finally {
    try { execFileSync('git', ['reset', '--quiet', 'HEAD', '--', rel], { cwd: ROOT, stdio: 'ignore' }); } catch { /* not staged */ }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CRITICAL REGRESSION: a second Remit-shaped heading makes the packet AMBIGUOUS, not first-match', () => {
  // Five hijacks, one mechanism: get ONE extra Remit-shaped line above the real one and findIndex
  // takes it. Patching container types and character classes failed four consecutive rounds, and
  // round 9's own parenthesised alternative made `## Remit (draft)` a legitimate heading — so an
  // ordinary draft-above-final layout hijacked with no trickery at all. The first-match RULE is the
  // defect, so two headings now yield '' and the CLI's fail-closed empty-remit guard fires.
  assert.equal(remitFromDoc('## Remit (draft)\nno constraints\n\n## Remit\nreal\n'), '');
  // An HTML comment is not document content — invisible in every renderer, a heading to findIndex.
  assert.equal(remitFromDoc('<!-- draft\n## Remit (draft)\nno constraints\n-->\n\n## Remit\nthe real remit\n'), 'the real remit');
  // A single heading, in any legitimate spelling, is unaffected.
  assert.equal(remitFromDoc('## Remit\nbody\n'), 'body');
  assert.match(remitFromDoc('## Remit (review the refund flow)\n'), /refund flow/);
});

test('REGRESSION: the `remit:` fallback is frontmatter, not "anywhere in the document"', () => {
  // The one part of this parser no review had touched, carrying the same hijack the heading form has
  // been patched for four times: any prose line beginning "remit:" became the packet's question.
  assert.equal(remitFromDoc('intro prose\n\nremit: wrong one\n\nmore prose\n'), '');
  assert.equal(remitFromDoc('remit: check the zone parser\n'), 'check the zone parser');
  assert.equal(remitFromDoc('remit: wrong\n\n## Remit\nright\n'), 'right', 'a heading still wins');
});

// --- Round 10 review findings (GLM-5.3 F4/F5/F6) -------------------------------------------------

test('REGRESSION: path spellings every other layer normalizes do not refuse as untracked', () => {
  // git pathspecs are literal; path.join and normPath are not. So a tracked file cited as
  // `scripts/./x.mjs` bound under R4, resolved under R5, READ successfully — and then the newest
  // check refused EUNTRACKED. The round-6 "two spellings of one path" drift, reborn inside the
  // module whose shared normalizer exists to prevent exactly it. (GLM-5.3 round 10, F5.)
  for (const rel of [
    'scripts/packet-gate/refusal.mjs',
    'scripts/./packet-gate/refusal.mjs',
    'scripts//packet-gate/refusal.mjs',
    './scripts/packet-gate/refusal.mjs',
  ]) {
    assert.ok(readCitedFile(ROOT, rel, []), `${rel} must read`);
  }
});

test('REGRESSION: an enumeration failure yields no hash at all, not a partial one', () => {
  // The docstring promised "'' rather than a hash over a partial set"; the code caught readdir and
  // returned a real 64-hex digest over the import graph alone, silently dropping the recursive floor
  // that covers not-yet-imported files. A partial hash that LOOKS valid is the exact property that
  // made round 5's critical invisible. (GLM-5.3 round 10, F6.)
  assert.match(gateSourceHash(ROOT), /^[0-9a-f]{64}$/, 'healthy root still hashes');
  assert.equal(gateSourceHash(join(tmp(), 'no-such-root')), '', 'unenumerable root must not hash');
});

// --- Round 11 findings (Kimi K3 + GLM-5.3 converged on F1 and F2) --------------------------------

test('CRITICAL REGRESSION: cited bytes come from the COMMIT, not the worktree', () => {
  // The fifth spelling: commit once, then edit freely. `isCommitted` asks whether the PATH has
  // history — it does — while R3 compared against bytes the packet's author had just rewritten in
  // the worktree. Four rounds of fixes all asked about the FILE's status and never about the BYTES'
  // provenance. Exercised in a THROWAWAY repo: an earlier version of this probe ran
  // `git reset --hard` in the real worktree and destroyed thirty minutes of uncommitted work.
  const repo = mkdtempSync(join(tmpdir(), 'pg-commit-'));
  const g = (a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
  g(['init', '--quiet']);
  g(['config', 'user.email', 'test@local']);
  g(['config', 'user.name', 'test']);
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'src/util.mjs'), 'export const answer = 42;\n');
  g(['add', '--', 'src/util.mjs']);
  g(['commit', '--quiet', '-m', 'innocuous']);

  // Rewrite the WORKTREE copy with a payload the commit has never seen.
  const payload = 'export function isAdmin(){ return true; }\n';
  writeFileSync(join(repo, 'src/util.mjs'), payload);

  assert.equal(readCitedFile(repo, 'src/util.mjs', []).trim(), 'export const answer = 42;',
    'the committed bytes, never the worktree');

  const fabricated = { cited: true, attrs: { path: 'src/util.mjs', lines: '1-1' }, lang: 'js', body: payload.trimEnd(), start: 1 };
  assert.equal(checkProvenance([fabricated], (p) => readCitedFile(repo, p, [])).length, 1, 'must refuse');

  const honest = { cited: true, attrs: { path: 'src/util.mjs', lines: '1-1' }, lang: 'js', body: 'export const answer = 42;', start: 1 };
  assert.deepEqual(checkProvenance([honest], (p) => readCitedFile(repo, p, [])), [], 'honest citation still clears');
});

test('REGRESSION: two Remit sections is a DIFFERENT refusal from no Remit section', () => {
  // Round 10 made two headings return '' (correctly) and then told the operator to "add a `## Remit`
  // section" to a document that has two — a remedy already followed twice over, shipped in the same
  // commit that fixed the hijack.
  const two = join(tmpInRepo(), 'two.md');
  const none = join(tmpInRepo(), 'none.md');
  writeFileSync(two, '## Remit (draft)\nno constraints\n\n## Remit\nReview /api/sessions\n');
  writeFileSync(none, '# Notes\n\nno remit at all\n');

  const a = runGate(['--document', two]);
  assert.equal(a.code, 2, a.out);
  assert.match(a.out, /2 "## Remit" sections found/, a.out);

  const b = runGate(['--document', none]);
  assert.equal(b.code, 2, b.out);
  assert.match(b.out, /no remit found/, b.out);
});
