/**
 * Contract tests for the deterministic Hermes closeout Stop gate.
 * Protects: command-hook wiring, no-loop guard, fail-open, current-turn scoping,
 * substantiality thresholds, and memo-emission pass-through.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { analyzeTurn, decide, parseTranscript } from './hermes-closeout-gate.mjs';

const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'));
const stopHooks = settings.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? [];

const line = (obj) => JSON.stringify(obj);
const userText = (text) => line({ type: 'user', message: { content: [{ type: 'text', text }] } });
const toolUse = (name, input) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const assistantText = (text) =>
  line({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

test('is registered as a command-type Stop hook, and no prompt hook survives', () => {
  // Was `commandHooks.length === 1`, which pinned a world that stopped existing the
  // moment a second Stop hook was added — it has been permanently red since dry-loop
  // and linear-sync landed, and adding lesson-recall made it no more wrong, just more
  // obviously so. The real intent of this test is that the original PROMPT-type hook was
  // replaced by a deterministic COMMAND hook (it blocked 100% of trivial turns), not that
  // this gate is the only one. Assert that intent, so siblings can be added without
  // falsifying it.
  assert.equal(stopHooks.filter((h) => h.type === 'prompt').length, 0);
  const commandHooks = stopHooks.filter((h) => h.type === 'command');
  const own = commandHooks.find((h) => /hermes-closeout-gate\.mjs/.test(h.command));
  assert.ok(own, 'hermes-closeout-gate must be registered as a Stop command hook');
  assert.equal(own.timeout, 30);
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

test('git -C worktree commit/push is also a substantial signal', () => {
  for (const command of [
    'git -C C:/tmp/review-worktree commit -m "fix: x"',
    'git -C "C:/tmp/review worktree" push origin HEAD:review',
  ]) {
    const raw = [userText('finish it'), toolUse('Bash', { command })].join('\n');
    assert.match(decide({}, raw) ?? '', /hermes-inbox/, command);
  }
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
