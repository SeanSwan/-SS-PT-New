#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/privacy-boundary-gate.test.mjs
 * PURPOSE: Prove the only fail-closed gate in the system actually fails CLOSED,
 *          and — just as important — that it does not fire on ordinary prose.
 * AUTHOR: Opus 5 | CREATED: 2026-08-19 | SLICE: 2 of 10
 * ============================================================================
 *
 * Run: node scripts/hooks/privacy-boundary-gate.test.mjs   -> RESULT: PASS (n/n)
 *
 * A blocking gate has TWO failure modes and the second one is the one that kills
 * it in practice. Missing a leak is the obvious failure. Firing on a version
 * string is the failure that gets the gate disabled within a week, after which
 * it catches nothing at all. The false-positive tests below are load-bearing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  scanText, luhnValid, looksLikeCard, isLlmBound, analyzeTurn, parseTranscript,
  scanArtifacts, decide, decidePretool, stagedGitignored, selftest,
  offenceReason, scannerErrorReason, invokesGitCommit,
} from './privacy-boundary-gate.mjs';
import { runGate, FAIL_CLOSED, FAIL_OPEN } from './lib/gate-run.mjs';
import { setGateRoot, setDisableRoot } from './lib/gate-trust.mjs';
import { qaDir, telemetryPath, disabledDir } from './lib/gate-common.mjs';

/**
 * FIXTURE POLICY. Every PII fixture in this file is unmistakably synthetic by
 * construction, because this file is committed to a public repository: the phone
 * uses the reserved 555-01xx fictional range, the SSN is a never-issued 123-45
 * prefix, the card is a published gateway test vector, the address is a public
 * landmark, and the email local part says what it is. A privacy gate whose own
 * test data is a real person's address would be the joke it exists to prevent.
 */

let total = 0;
let passed = 0;
const made = [];

function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-privacy-'));
  made.push(dir);
  setGateRoot(dir);
  setDisableRoot(null);
  return dir;
}
function lastLine() {
  const lines = readFileSync(telemetryPath(), 'utf8').trim().split(/\r?\n/);
  return JSON.parse(lines[lines.length - 1]);
}
function check(name, fn) {
  total += 1;
  test(name, async (t) => { await fn(t); passed += 1; });
}
const kinds = (text) => scanText(text).map((h) => h.kind).sort();

/* ---------------------------------------------------------------- detection */

check('detects the structured identifiers it claims to detect', () => {
  assert.deepEqual(kinds('reach her at fixture-not-a-real-person@gmail.com'), ['email']);
  assert.deepEqual(kinds('call 415-555-0198 today'), ['us-phone']);
  assert.deepEqual(kinds('ssn 123-45-6789 on file'), ['ssn']);
  assert.deepEqual(kinds('DOB: 04/11/1983'), ['dob']);
  assert.deepEqual(kinds('lives at 1600 Pennsylvania Avenue'), ['street-address']);
  assert.deepEqual(kinds('card 4111 1111 1111 1111 declined'), ['payment-card']);
});

check('FALSE POSITIVES: ordinary engineering prose must not block a turn', () => {
  // Each of these appears in real memos in this repo. A gate that fires on them
  // gets disabled, and a disabled gate catches nothing.
  const safe = [
    'bumped to 1.2.3 and pinned 10.0.26200',
    'commit 0123456789abcdef0123456789abcdef01234567 landed',
    'ports 5173 and 10000, timeout 900000 ms',
    'Client 4821 logged a session; trainer 77 reviewed it.',
    'see docs/ai-workflow/AI-HANDOFF/PACKET-slice1-hostile-review-2026-08-16.md',
    'the run was 13154 in / 32000 out, 544.9s wall',
    'ISO date 2026-08-19 and range 2026-08-13 to 2026-08-16',
  ];
  for (const s of safe) assert.deepEqual(kinds(s), [], `false positive on: ${s}`);
});

check('allowlisted placeholder emails are not PII', () => {
  for (const s of ['user@example.com', 'you@example.org', 'noreply@anthropic.com', 'someone@test']) {
    assert.deepEqual(kinds(`contact ${s} for details`), [], `flagged placeholder: ${s}`);
  }
  assert.deepEqual(kinds('fixture-other-not-real@gmail.com'), ['email'], 'a real domain must still hit');
});

check('Luhn is a checksum, not an identity — brand shape is what makes it a card', () => {
  assert.equal(luhnValid('4111 1111 1111 1111'), true);
  assert.equal(luhnValid('1234 5678 9012 3456'), false);
  assert.deepEqual(kinds('id 1234 5678 9012 3456'), [], 'a non-Luhn run must not block');

  // THE CORPUS FINDING (2026-08-19). Luhn alone passed EIGHT non-cards across
  // 1,736 real artifacts — 13- and 14-digit ids beginning 2, 6 and 9. Roughly
  // one in ten random digit runs satisfies Luhn, so a checksum with no issuer
  // shape behind it is a false-positive generator, and every one of those would
  // have been a hard block on a doc containing a long id.
  for (const n of ['2000000000008', '6000000000004', '9000000000001',
    '20000000000006', '60000000000007', '2000000000000006']) {
    assert.equal(luhnValid(n), true, `${n} must genuinely pass Luhn or the test proves nothing`);
    assert.equal(looksLikeCard(n), false, `${n} is not any issuer shape`);
    assert.deepEqual(kinds(`reference ${n} on file`), [], `false positive on ${n}`);
  }

  // and real issuer vectors must still be caught
  for (const c of ['4111111111111111', '378282246310005', '5555555555554444', '6011111111111117']) {
    assert.equal(looksLikeCard(c), true, `${c} must still read as a card`);
  }
  assert.equal(looksLikeCard('411111111111111'), false, '15-digit Visa is not a shape');
});

check('a phone needs separators, so timestamps and ids do not match', () => {
  assert.deepEqual(kinds('415-555-0198'), ['us-phone']);
  assert.deepEqual(kinds('4155550198'), [], 'a bare 10-digit run is ambiguous, not a phone');
  assert.deepEqual(kinds('20260819T234500Z'), [], 'a memo timestamp is not a phone');
});

check('the reporter never echoes the matched text', () => {
  // The whole point: a gate that prints the PII it found into the transcript has
  // performed the leak it exists to prevent.
  const hits = scanText('fixture-not-a-real-person@gmail.com and 415-555-0198');
  const serialized = JSON.stringify(hits);
  assert.ok(!serialized.includes('fixture-not-a-real-person'), 'match text leaked into the hit record');
  assert.ok(!serialized.includes('0198'), 'match text leaked into the hit record');
  assert.deepEqual(hits.map((h) => h.kind).sort(), ['email', 'us-phone']);
  assert.equal(hits.find((h) => h.kind === 'email').count, 1);
});

/* ------------------------------------------------------------------ windowing */

check('LLM-bound classification covers the committed, model-read surfaces', () => {
  for (const p of [
    '.ai-workflow/hermes-inbox/pending/x.md',
    'docs/ai-workflow/hermes-learning-packets/y.md',
    'docs/ai-workflow/brainstorms/z.md',
    'docs/ai-workflow/AI-HANDOFF/h.md',
    'AI-Village-Documentation/v.md',
  ]) assert.equal(isLlmBound(p), true, `should be LLM-bound: ${p}`);
  for (const p of ['src/a.ts', 'scripts/hooks/x.mjs', 'README.md']) {
    assert.equal(isLlmBound(p), false, `should NOT be LLM-bound: ${p}`);
  }
  assert.equal(isLlmBound('.ai-workflow\\hermes-inbox\\pending\\x.md'), true, 'Windows separators');
});

check('artifacts INCLUDE emission paths while fileWrites excludes them', () => {
  const transcript = [
    { type: 'user', message: { content: 'go' } },
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', name: 'Edit', input: { file_path: 'src/a.ts' } },
          { type: 'tool_use', name: 'Write', input: { file_path: '.ai-workflow/hermes-inbox/pending/m.md' } },
          { type: 'tool_use', name: 'Write', input: { file_path: 'docs/ai-workflow/brainstorms/b.md' } },
        ],
      },
    },
  ].map((e) => JSON.stringify(e)).join('\n');
  const s = analyzeTurn(parseTranscript(transcript));
  assert.equal(s.fileWrites, 2, 'parity meaning: emissions are not build writes');
  assert.deepEqual(s.artifacts, ['.ai-workflow/hermes-inbox/pending/m.md', 'docs/ai-workflow/brainstorms/b.md']);
});

/* ------------------------------------------------------- absent vs unreadable */

check('an ABSENT artifact is skipped, not a scanner error', () => {
  const dir = freshRoot();
  // A turn that wrote and then removed a temp artifact must not be blocked: a
  // file that is gone cannot leak.
  assert.deepEqual(scanArtifacts(['docs/ai-workflow/brainstorms/gone.md'], dir), []);
});

check('a DIRECTORY at an artifact path is skipped, not scanned', () => {
  const dir = freshRoot();
  const rel = 'docs/ai-workflow/brainstorms';
  mkdirSync(join(dir, rel, 'weird.md'), { recursive: true });
  // Found by this test expecting a throw and getting a silent skip: statSync
  // succeeds on a directory, so isFile() is what keeps it out of the reader.
  assert.deepEqual(scanArtifacts([`${rel}/weird.md`], dir), []);
});

check('an UNREADABLE artifact throws, so R8-1 can turn it into a block', () => {
  const dir = freshRoot();
  const rel = 'docs/ai-workflow/brainstorms/locked.md';
  mkdirSync(join(dir, 'docs', 'ai-workflow', 'brainstorms'), { recursive: true });
  writeFileSync(join(dir, rel), 'x', 'utf8');
  // Injected reader: a permission-denied FILE is the real case, and chmod is not
  // honoured on Windows, so a filesystem fixture here could never fail.
  const denied = () => { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; };
  assert.throws(() => scanArtifacts([rel], dir, { readFile: denied }), /EACCES/);

  // And the throw must reach the gate as a BLOCK, not a silent allow.
  const transcript = [
    { type: 'user', message: { content: 'go' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: rel } }] } },
  ].map((e) => JSON.stringify(e)).join('\n');
  const r = runGate(
    { name: 'privacy-boundary-gate', boundary: 'turn', mode: FAIL_CLOSED, scannerErrorReason },
    () => {
      const reason = decide({ stop_hook_active: false }, transcript, dir, { readFile: denied });
      return reason ? { block: true, reason } : { block: false };
    },
  );
  assert.equal(r.result, 'error', 'an unscannable artifact must not pass');
  assert.ok(r.payload.reason.includes('EACCES'));
});

check('a clean artifact allows, a dirty one blocks and names the path', () => {
  const dir = freshRoot();
  mkdirSync(join(dir, 'docs', 'ai-workflow', 'brainstorms'), { recursive: true });
  const rel = 'docs/ai-workflow/brainstorms/notes.md';
  writeFileSync(join(dir, rel), 'Client 4821 improved squat depth.', 'utf8');
  const transcript = [
    { type: 'user', message: { content: 'go' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: rel } }] } },
  ].map((e) => JSON.stringify(e)).join('\n');
  assert.equal(decide({ stop_hook_active: false }, transcript, dir), null, 'clean prose must pass');

  writeFileSync(join(dir, rel), 'ping fixture-not-a-real-person@gmail.com about it', 'utf8');
  const reason = decide({ stop_hook_active: false }, transcript, dir);
  assert.ok(reason, 'PII in an LLM-bound artifact must block');
  assert.ok(reason.includes(rel), 'the offending path must be named');
  assert.ok(reason.includes('email'), 'the pattern class must be named');
  assert.ok(!reason.includes('fixture-not-a-real-person'), 'the block message must NOT contain the PII');
  assert.ok(reason.includes('No waiver exists'), 'R8-1 has no waiver');
  assert.ok(reason.includes('To unblock:'), 'S11: every block names its unblock command');
});

check('stop_hook_active short-circuits, so a continuation cannot loop', () => {
  const dir = freshRoot();
  mkdirSync(join(dir, 'docs', 'ai-workflow', 'brainstorms'), { recursive: true });
  const rel = 'docs/ai-workflow/brainstorms/leaky.md';
  writeFileSync(join(dir, rel), 'ping fixture-not-a-real-person@gmail.com', 'utf8');
  const transcript = [
    { type: 'user', message: { content: 'go' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: rel } }] } },
  ].map((e) => JSON.stringify(e)).join('\n');

  // Mutation-found: the old fixture passed 'garbage', which parses to an empty
  // turn and returns null whether the guard exists or not — the assertion proved
  // nothing. The transcript must be one that WOULD block.
  assert.ok(decide({ stop_hook_active: false }, transcript, dir), 'fixture must be blockable');
  assert.equal(decide({ stop_hook_active: true }, transcript, dir), null, 'a continuation must not re-fire');
});

/* ------------------------------------------------------------- tool boundary */

check('the pretool check ignores everything that is not a git commit', () => {
  const dir = freshRoot();
  const boom = () => { throw new Error('must not be consulted'); };
  assert.equal(decidePretool({ tool_input: { command: 'ls -la' } }, dir, { exec: boom }), null);
  assert.equal(decidePretool({ tool_input: { command: 'git status' } }, dir, { exec: boom }), null);
  assert.equal(decidePretool({ tool_input: { command: 'npm run commit-helper' } }, dir, { exec: boom }), null);
});

check('gitignored-but-staged is detected; check-ignore exit 1 is CLEAN, not an error', () => {
  const dir = freshRoot();
  const exec = (bin, args) => {
    if (args[0] === 'diff') return 'a.txt\n.ai-workflow/qa/secret.jsonl\n';
    const err = new Error('nothing matched');
    err.status = 1;                       // check-ignore says: none are ignored
    throw err;
  };
  assert.deepEqual(stagedGitignored(dir, { exec }), [], 'exit 1 must not fail-closed the world');

  const execHit = (bin, args) => (args[0] === 'diff'
    ? 'a.txt\n.ai-workflow/qa/secret.jsonl\n'
    : '.ai-workflow/qa/secret.jsonl\n');
  assert.deepEqual(stagedGitignored(dir, { exec: execHit }), ['.ai-workflow/qa/secret.jsonl']);
  const reason = decidePretool({ tool_input: { command: 'git commit -m x' } }, dir, { exec: execHit });
  assert.ok(reason.includes('.ai-workflow/qa/secret.jsonl'));
  assert.ok(reason.includes('git reset --'), 'the unblock command must be actionable');
});

check('a real check-ignore failure still propagates as a scanner error', () => {
  const dir = freshRoot();
  const exec = (bin, args) => {
    if (args[0] === 'diff') return 'a.txt\n';
    const err = new Error('fatal: not a git repository');
    err.status = 128;                     // NOT the "nothing matched" case
    throw err;
  };
  assert.throws(() => stagedGitignored(dir, { exec }), /not a git repository/);
});

/* --------------------------------------------------- runGate: the Q4 mechanism */

check('FAIL-CLOSED: a check that throws becomes a block, not a silent allow', () => {
  freshRoot();
  const r = runGate(
    { name: 'privacy-boundary-gate', boundary: 'turn', mode: FAIL_CLOSED, scannerErrorReason },
    () => { throw new Error('scanner exploded'); },
  );
  assert.equal(r.result, 'error');
  assert.ok(r.payload.reason.includes('fail-closed per R8-1'));
  assert.ok(r.payload.reason.includes('scanner exploded'));
  assert.equal(lastLine().result, 'error', 'the failure must be on the record');
});

check('FAIL-OPEN mode still allows on throw — the two modes really differ', () => {
  freshRoot();
  const r = runGate(
    { name: 'dry-loop-gate', boundary: 'turn', mode: FAIL_OPEN },
    () => { throw new Error('observer exploded'); },
  );
  assert.equal(r.result, 'fail-open');
  assert.equal(r.payload, null, 'an observer must not halt the repo');
  assert.equal(lastLine().result, 'fail-open');
});

check('GLM Q4 MECHANISM: an allow whose telemetry did not land BLOCKS at a boundary', () => {
  const dir = freshRoot();
  // Force every telemetry write to fail by making the qa dir a file.
  mkdirSync(join(dir, '.ai-workflow'), { recursive: true });
  writeFileSync(qaDir(), 'not a directory', 'utf8');
  const r = runGate(
    { name: 'privacy-boundary-gate', boundary: 'turn', mode: FAIL_CLOSED },
    () => ({ block: false }),
  );
  assert.equal(r.result, 'block', 'an unobservable allow is not an allow');
  assert.equal(r.telemetrySound, false);
  assert.ok(r.payload.reason.includes('left no evidence it ran'));
  // The same silence at an observer gate is tolerated — that is the difference.
  const open = runGate({ name: 'dry-loop-gate', boundary: 'turn', mode: FAIL_OPEN }, () => ({ block: false }));
  assert.equal(open.result, 'allow');
  assert.equal(open.payload, null);
  rmSync(dir, { recursive: true, force: true });
});

check('S10 DRILL: the disable marker is honoured AND announced', () => {
  freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'privacy-boundary-gate'), '', 'utf8');
  const r = runGate(
    { name: 'privacy-boundary-gate', boundary: 'turn', mode: FAIL_CLOSED },
    () => { throw new Error('must not run while disabled'); },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(r.payload, null);
  const line = lastLine();
  assert.equal(line.gate, 'privacy-boundary-gate');
  assert.equal(line.boundary, 'turn');
  assert.equal(line.result, 'fail-open');
  assert.equal(line.reason, 'disabled', 'a silently-disabled boundary reads as a satisfied one');
});

check('runGate strips adversary-controlled env BEFORE the check runs', () => {
  freshRoot();
  // Mutation-found gap: deleting the sanitizeGateEnv() call changed nothing that
  // any test could see. Slice 1 proved one env var relocates the whole trust
  // root, so an unsanitized check is a check reading configuration the examinee
  // chose.
  process.env.GIT_DIR = '/tmp/fake/.git';
  process.env.SWAN_GATE_ROOT = '/tmp/evil';
  let seen = null;
  runGate({ name: 'privacy-boundary-gate', boundary: 'turn', mode: FAIL_CLOSED }, () => {
    seen = { git: process.env.GIT_DIR, root: process.env.SWAN_GATE_ROOT };
    return { block: false };
  });
  assert.equal(seen.git, undefined, 'GIT_DIR must not survive into the check');
  assert.equal(seen.root, undefined, 'SWAN_GATE_ROOT must not survive into the check');
  delete process.env.GIT_DIR;
  delete process.env.SWAN_GATE_ROOT;
});

check('runGate refuses a malformed spec instead of guessing a mode', () => {
  freshRoot();
  assert.throws(() => runGate({ name: 'x', boundary: 'turn' }, () => ({ block: false })), TypeError);
  assert.throws(() => runGate({ name: 'x', boundary: 'turn', mode: 'sorta-closed' }, () => ({ block: false })), TypeError);
  assert.throws(() => runGate({ boundary: 'turn', mode: FAIL_CLOSED }, () => ({ block: false })), TypeError);
});

check('telemetry carries the contracted shape for this gate', () => {
  freshRoot();
  runGate({ name: 'privacy-boundary-gate', boundary: 'tool', mode: FAIL_CLOSED }, () => ({ block: true, reason: 'r' }));
  const line = lastLine();
  assert.deepEqual(Object.keys(line), ['ts', 'gate', 'boundary', 'result', 'reason', 'latency_ms']);
  assert.equal(line.gate, 'privacy-boundary-gate');
  assert.equal(line.boundary, 'tool');
  assert.equal(line.result, 'block');
  assert.equal(typeof line.latency_ms, 'number');
});

check('the shipped selftest is green and actually asserts something', () => {
  assert.deepEqual(selftest(), [], 'selftest must pass on the shipped patterns');
  assert.ok(offenceReason(['a.md']).includes('a.md'));
  assert.ok(scannerErrorReason(new Error('boom')).includes('boom'));
});

/* ------------------------------------------------- hostile-round regressions */

check('HOSTILE ROUND: real git needs --no-index, or the check is inert', () => {
  // The unit tests above pass an injected `exec`, which proved my branching and
  // nothing about git. Against a REAL repository the check returned EMPTY for
  // force-staged ignored files, because `git check-ignore` omits TRACKED paths
  // by default — and a staged file is tracked. The one situation this check
  // exists to detect was the one situation it could not see.
  const repo = mkdtempSync(join(tmpdir(), 'privgit-'));
  made.push(repo);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  git('init', '-q', '.');
  git('config', 'user.email', 'x@example.com');
  git('config', 'user.name', 'x');
  writeFileSync(join(repo, '.gitignore'), 'secrets/\n*.local\n', 'utf8');
  writeFileSync(join(repo, 'ok.txt'), 'fine', 'utf8');
  git('add', '.gitignore', 'ok.txt');
  assert.deepEqual(stagedGitignored(repo), [], 'a healthy commit must not be blocked');

  mkdirSync(join(repo, 'secrets'), { recursive: true });
  writeFileSync(join(repo, 'secrets', 'creds.txt'), 'x', 'utf8');
  writeFileSync(join(repo, 'notes.local'), 'x', 'utf8');
  git('add', '-f', 'secrets/creds.txt', 'notes.local');

  const hits = stagedGitignored(repo).sort();
  assert.deepEqual(hits, ['notes.local', 'secrets/creds.txt'], 'force-staged ignored files must be seen');
  const reason = decidePretool({ tool_input: { command: 'git commit -m wip' } }, repo);
  assert.ok(reason?.includes('secrets/creds.txt'), 'the commit must be blocked and the path named');
});

check('HOSTILE ROUND: a MENTION of git commit is not an INVOCATION', () => {
  // `echo "git commit" >> notes.md` matched the first regex, so an unrelated
  // command would be blocked whenever something ignored happened to be staged.
  for (const c of ['git commit -m x', 'git -C /repo commit -m x', 'cd foo && git commit',
    'git add . ; git commit -m y', 'sudo git commit']) {
    assert.equal(invokesGitCommit(c), true, `should invoke: ${c}`);
  }
  for (const c of ['echo "git commit" >> notes.md', 'grep -r "git commit" docs/',
    'git status', 'git log --oneline', 'npm run commit', 'git push']) {
    assert.equal(invokesGitCommit(c), false, `should NOT invoke: ${c}`);
  }
  // and the gate must not even consult git for a mention
  const boom = () => { throw new Error('must not be consulted'); };
  assert.equal(decidePretool({ tool_input: { command: 'echo "git commit"' } }, '.', { exec: boom }), null);
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
