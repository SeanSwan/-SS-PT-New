/**
 * Contract tests for the deterministic Hermes closeout Stop gate.
 * Protects: command-hook wiring, no-loop guard, fail-open, current-turn scoping,
 * substantiality thresholds, and memo-emission pass-through.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyzeTurn, decide, isMemoFile, parseTranscript } from './hermes-closeout-gate.mjs';

// Resolved from this file, not process.cwd(): read relatively, the suite failed
// outright from any other directory (found 2026-08-03 by running it from C:/tmp).
// The same class the hook itself was already hardened against — the test that
// guards cwd-independence was not cwd-independent.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/settings.json'), 'utf8'));
const stopHooks = settings.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? [];

const line = (obj) => JSON.stringify(obj);
const userText = (text) => line({ type: 'user', message: { content: [{ type: 'text', text }] } });
const toolUse = (name, input) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const assistantText = (text) =>
  line({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

test('is registered as a command-type Stop hook, and no Stop hook is prompt-type', () => {
  // Was "exactly one command Stop hook" — true only while this was the ONLY Stop
  // hook. Others landed since (linear-sync, orient, backup — dry-loop deleted 2026-08-26,
  // dual-tier replaced by orient 2026-08-27), so
  // the count assertion had been failing at 4!==1 and then 5!==1 for weeks, reporting
  // a broken suite while nothing was actually wrong. A test that fails for a reason
  // nobody intends is a test everybody learns to ignore.
  //
  // The intent it was really protecting: this gate must run as a deterministic
  // COMMAND hook (harness-executed, zero model calls) rather than a prompt hook that
  // asks the model to police itself — the whole point of rule 69's fifth layer.
  assert.equal(
    stopHooks.filter((h) => h.type === 'prompt').length, 0,
    'a prompt-type Stop hook would put enforcement back in the model\'s hands',
  );
  const mine = stopHooks.filter(
    (h) => h.type === 'command' && /hermes-closeout-gate\.mjs/.test(String(h.command ?? '')),
  );
  assert.equal(mine.length, 1, 'this gate must be registered exactly once as a command hook');
  assert.equal(mine[0].timeout, 30, 'timeout must stay 30s');
});

test('stop_hook_active passes deterministically (no-loop guard)', () => {
  const raw = [userText('ship it'), toolUse('Write', { file_path: 'a.ts' })].join('\n');
  assert.equal(decide({ stop_hook_active: true }, raw), null);
});

test('trivial conversational turn passes silently', () => {
  const raw = [userText('what is 2+2?'), assistantText('4')].join('\n');
  assert.equal(decide({}, raw), null);
});

test('substantial turn without memo blocks with rules 68-69 guidance', () => {
  const raw = [
    userText('build the feature'),
    toolUse('Write', { file_path: 'backend/routes/a.mjs' }),
    toolUse('Edit', { file_path: 'backend/routes/b.mjs' }),
    toolUse('Write', { file_path: 'frontend/src/c.tsx' }),
    assistantText('Implemented and verified.'),
  ].join('\n');
  const reason = decide({}, raw);
  assert.match(reason, /hermes-inbox/);
  assert.match(reason, /sub-Fable output\s+never enters the durable corpus/i);
  assert.match(reason, /do not fabricate an artifact/);
});

test('git commit/push alone is a substantial signal', () => {
  const raw = [
    userText('commit it'),
    toolUse('Bash', { command: 'git commit -m "feat: x"' }),
  ].join('\n');
  assert.match(decide({}, raw) ?? '', /hermes-inbox/);
});

test('memo emission this turn passes (write path and cited path)', () => {
  const viaWrite = [
    userText('build'),
    toolUse('Write', { file_path: 'backend/a.mjs' }),
    toolUse('Bash', { command: 'git push origin main' }),
    toolUse('Write', { file_path: '.ai-workflow/hermes-inbox/pending/20260711T000000Z-vs-claude-x.md' }),
  ].join('\n');
  assert.equal(decide({}, viaWrite), null);
  const viaCitation = [
    userText('build'),
    toolUse('Bash', { command: 'git commit -m x' }),
    assistantText('Memo written to .ai-workflow/hermes-inbox/pending/20260711T000000Z-vs-claude-x.md'),
  ].join('\n');
  assert.equal(decide({}, viaCitation), null);
});

test('scopes analysis to the current turn only', () => {
  const raw = [
    userText('turn 1: build'),
    toolUse('Write', { file_path: 'a.ts' }),
    toolUse('Write', { file_path: 'b.ts' }),
    toolUse('Write', { file_path: 'c.ts' }),
    userText('turn 2: thanks, what time is it?'),
    assistantText('It is late.'),
  ].join('\n');
  assert.equal(decide({}, raw), null);
  const signals = analyzeTurn(parseTranscript(raw));
  assert.equal(signals.fileWrites, 0);
});

test('counts a memo citation in string-form assistant content (no false re-block)', () => {
  const stringAssistant = line({
    type: 'assistant',
    message: { content: 'Memo written to .ai-workflow/hermes-inbox/pending/20260712T000000Z-vs-claude-x.md' },
  });
  const raw = [userText('build'), toolUse('Bash', { command: 'git commit -m x' }), stringAssistant].join('\n');
  assert.equal(decide({}, raw), null);
});

test('tolerates malformed transcript lines (fail-open per line)', () => {
  const raw = ['not-json{{{', userText('hi'), 'also-bad', assistantText('hello')].join('\n');
  assert.equal(decide({}, raw), null);
});

// --- support files in the emission dirs are NOT memos (regression, 2026-08-13) ---------------
// The gate demanded a markdown "## Mistakes I made" heading inside _schema.json — a JSON file
// that is corpus infrastructure, not a report. Complying would have corrupted the schema, so
// the gate was asking for damage. It collected every write under the emission path as a memo.
test('isMemoFile: corpus support files are not treated as memos', () => {
  for (const p of [
    'docs/ai-workflow/hermes-learning-packets/_schema.json',
    'docs/ai-workflow/hermes-learning-packets/INDEX.md',
    '.ai-workflow/hermes-inbox/pending/ENTRY-TEMPLATE.md',
    '.ai-workflow/hermes-inbox/README.md',
  ]) {
    assert.equal(isMemoFile(p), false, `${p} must NOT be treated as a memo`);
  }
});

test('isMemoFile: real memos still are memos, on both path separators', () => {
  for (const p of [
    'docs/ai-workflow/hermes-learning-packets/20260813-a-real-packet.md',
    String.raw`.ai-workflow\hermes-inbox\pending\20260814T000000Z-vs-claude-a-real-memo.md`,
  ]) {
    assert.equal(isMemoFile(p), true, `${p} MUST be treated as a memo`);
  }
});

// --- durable-packet schema enforcement (added 2026-08-16) -------------------------------------
// The validator existed as the written contract from 2026-08-13 but NOTHING called it, so the
// corpus kept drifting: 12 packets written AFTER the schema shipped still failed it. These tests
// protect the wiring, and — more importantly — the fail-open paths, because a gate that crashes
// while the user is trying to stop is worse than a gate that misses a malformed packet.

const PACKET = 'docs/ai-workflow/hermes-learning-packets/20260816-x.md';
const MEMO = '.ai-workflow/hermes-inbox/pending/20260816T000000Z-vs-claude-x.md';
const withMistakes = () => '## Mistakes I made\n- something\n';

test('packetErrors: blocks a durable packet that fails the schema', () => {
  const raw = [userText('build'), toolUse('Write', { file_path: PACKET })].join('\n');
  const reason = decide({}, raw, withMistakes, () => ['missing required frontmatter: title']);
  assert.match(String(reason), /fails the corpus schema/);
  assert.match(String(reason), /missing required frontmatter: title/);
  // Must never coach the agent into faking provenance to get past the gate.
  assert.match(String(reason), /NEVER guess originating_model/);
});

test('packetErrors: a schema-clean packet passes', () => {
  const raw = [userText('build'), toolUse('Write', { file_path: PACKET })].join('\n');
  assert.equal(decide({}, raw, withMistakes, () => []), null);
});

test('packetErrors: ephemeral inbox memos are NOT schema-validated', () => {
  // Inbox memos are drained daily and have no schema; validating them would be pure noise.
  const raw = [userText('build'), toolUse('Write', { file_path: MEMO })].join('\n');
  assert.equal(decide({}, raw, withMistakes, () => ['missing required frontmatter: title']), null);
});

test('packetErrors: FAIL-OPEN when the validator is unavailable', () => {
  const raw = [userText('build'), toolUse('Write', { file_path: PACKET })].join('\n');
  assert.equal(decide({}, raw, withMistakes, undefined), null, 'no validator -> must not block');
  assert.equal(decide({}, raw, withMistakes, null), null, 'null validator -> must not block');
});

test('packetErrors: FAIL-OPEN when the validator throws', () => {
  const raw = [userText('build'), toolUse('Write', { file_path: PACKET })].join('\n');
  const boom = () => { throw new Error('schema unreadable'); };
  assert.equal(decide({}, raw, withMistakes, boom), null, 'throwing validator -> must not block');
});

test('the mistakes check still takes precedence over the schema check', () => {
  // A packet missing BOTH should report the mistakes section first: it is the payload Sean
  // actually asked for, and fixing frontmatter first would let a contentless packet through.
  const raw = [userText('build'), toolUse('Write', { file_path: PACKET })].join('\n');
  const reason = decide({}, raw, () => 'no mistakes heading here', () => ['missing required frontmatter: title']);
  assert.match(String(reason), /missing its mistakes section/);
});

test('the real validator module loads and exports validatePacket', async () => {
  // Guards the dynamic import path in loadPacketValidator(): a rename would silently disable
  // the whole check, and every fail-open test above would still pass.
  const mod = await import('../hermes-learning-validate.mjs');
  assert.equal(typeof mod.validatePacket, 'function');
  const schema = JSON.parse(
    readFileSync(join(REPO_ROOT, 'docs/ai-workflow/hermes-learning-packets/_schema.json'), 'utf8'),
  );
  const bad = mod.validatePacket('x.md', 'no frontmatter at all', schema);
  assert.ok(bad.errors.length > 0, 'a packet with no frontmatter must produce errors');
});

// --- cwd-independence of the packet check (regression, 2026-08-16) ---------------------------
// The unit tests above inject `validate`, so they proved the DECISION logic and nothing about the
// wiring that supplies it. loadPacketValidator() resolved the schema script-relative but read the
// packet relative to process.cwd(); run from anywhere but the repo root the read threw, the catch
// swallowed it, and the gate enforced NOTHING while still exiting 0. Every test above stayed green.
// Only a subprocess run from a foreign cwd can catch that, so this test spawns the real binary.
test('the real hook blocks a malformed packet when run from a foreign cwd', async () => {
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync, mkdtempSync, rmSync, openSync, closeSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');

  const packetRel = 'docs/ai-workflow/hermes-learning-packets/_zz-cwd-probe.md';
  const packetAbs = join(REPO_ROOT, packetRel);
  const dir = mkdtempSync(join(tmpdir(), 'gate-cwd-'));
  const transcript = join(dir, 't.jsonl');

  // Underscore-prefixed so a crash mid-test cannot leave a file the corpus validator counts.
  // isMemoFile() would reject that name, so assert against a non-underscore path instead.
  const realRel = 'docs/ai-workflow/hermes-learning-packets/zz-cwd-probe.md';
  const realAbs = join(REPO_ROOT, realRel);

  writeFileSync(realAbs, '---\noriginating_model: claude-opus-5\n---\n\n## Mistakes I made\n- probe\n');
  writeFileSync(transcript, [
    JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'build' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: realRel } }] } }),
  ].join('\n'));

  try {
    // stdin MUST come from a real file descriptor. Passing `input:` to spawn makes
    // readFileSync(0) throw on Windows, so the hook takes its "bad stdin -> allow" path and
    // returns silently — the test then "fails" for a reason that has nothing to do with cwd.
    // Claude Code pipes hook input for real, so a fd is the faithful harness.
    const hookInput = join(dir, 'hook-input.json');
    writeFileSync(hookInput, JSON.stringify({ stop_hook_active: false, transcript_path: transcript }));
    const fd = openSync(hookInput, 'r');
    let out;
    try {
      out = execFileSync(process.execPath, [join(REPO_ROOT, 'scripts/hooks/hermes-closeout-gate.mjs')], {
        cwd: dir,                    // <-- the whole point: NOT the repo root
        encoding: 'utf8',
        stdio: [fd, 'pipe', 'pipe'],
        // Pin the ORIGINAL blocking behaviour. Without this the assertion below reads
        // .ai-workflow/gate-mode.json and silently becomes a test of operational config
        // rather than of the gate — it went red the moment shadow mode shipped. The
        // override can only ever make the gate stricter, so it cannot mask a defect.
        env: { ...process.env, SWAN_GATE_FORCE_NORMAL: '1' },
      });
    } finally { closeSync(fd); }
    assert.match(out, /fails the corpus schema/, 'gate must enforce regardless of cwd');
  } finally {
    rmSync(realAbs, { force: true });
    rmSync(packetAbs, { force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── review debt (rules 46+74+82 merged, 2026-08-23) ───────────────────────────
// Fable's ruling: three procedurally-correct rules with no emitter produced six deferred panels.
// These are the negative/positive controls proving the merged obligation actually fires — a gate
// nobody has watched go red is indistinguishable from one that does nothing.
const DEBT = [{ id: 'x1', topic: 'the thing', reason: 'owed a hostile review' }];
const buildTurn = [
  userText('go'),
  toolUse('Bash', { command: 'git commit -m "x"' }),
].join('\n');
const chatTurn = [userText('what is this?'), assistantText('it is a thing')].join('\n');

test('review debt: NEGATIVE control — a build-shaped turn carrying debt is BLOCKED', () => {
  const reason = decide({}, buildTurn, undefined, undefined, () => DEBT);
  assert.match(reason ?? '', /outstanding review debt/i);
  assert.match(reason ?? '', /review-debt\.mjs close/);
});

test('review debt: POSITIVE control — same turn with an empty ledger is not blocked on debt', () => {
  const reason = decide({}, buildTurn, undefined, undefined, () => []);
  assert.doesNotMatch(reason ?? '', /outstanding review debt/i);
});

test('review debt: conversational turns are never blocked, even carrying debt', () => {
  // A gate that blocks chat gets switched off. Scope is the whole safety argument here.
  assert.equal(decide({}, chatTurn, undefined, undefined, () => DEBT), null);
});

test('review debt: a THROWING ledger fails open, never wedges the session', () => {
  const reason = decide({}, buildTurn, undefined, undefined, () => { throw new Error('boom'); });
  assert.doesNotMatch(reason ?? '', /outstanding review debt/i);
});

test('review debt: default param means an absent ledger cannot block', () => {
  const reason = decide({}, buildTurn);
  assert.doesNotMatch(reason ?? '', /outstanding review debt/i);
});
