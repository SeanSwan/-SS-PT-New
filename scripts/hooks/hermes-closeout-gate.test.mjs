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
  // hook. Four more have landed since (dry-loop, linear-sync, dual-tier, backup), so
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
