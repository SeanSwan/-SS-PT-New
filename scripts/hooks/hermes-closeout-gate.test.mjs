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
import { analyzeTurn, decide, memoMissingMistakes, parseTranscript } from './hermes-closeout-gate.mjs';

// Resolved from this file, not process.cwd(): read relatively, the suite failed
// outright from any other directory (found 2026-08-03 by running it from C:/tmp).
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
  // hook. Others have landed since (dry-loop, linear-sync, dual-tier), so the count
  // assertion had been failing for weeks, reporting a broken suite while nothing was
  // wrong. A test that fails for a reason nobody intends is one everybody ignores.
  //
  // The intent it was really protecting: this gate must run as a deterministic
  // COMMAND hook (harness-executed, zero model calls) rather than a prompt hook that
  // asks the model to police itself — the point of rule 69's fifth layer.
  assert.equal(
    stopHooks.filter((h) => h.type === 'prompt').length, 0,
    'a prompt-type Stop hook would put enforcement back in the model\'s hands',
  );
  const mine = stopHooks.filter(
    (h) => h.type === 'command' && /hermes-closeout-gate\.mjs/.test(String(h.command ?? '')),
  );
  // SUPERSEDED 2026-08-26: merged into closeout-gate.mjs (registered exactly once there —
  // see closeout-gate.test.mjs). This file stays only so the predecessor logic stays tested
  // until the old module is deleted in a later, separate PR (Rule 34).
  assert.equal(mine.length, 0, 'hermes-closeout-gate must NOT be registered — closeout-gate replaces it');
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

// ── Mistakes-section contract (Sean 2026-08-04) ─────────────────────────────
// "Give a report to Hermes, especially about the mistakes that you made so I
// can learn from them… this should be automatic." Detecting that a memo FILE
// exists was never enough — the mistakes section is the payload Hermes learns
// from, so the gate reads the emitted memo and blocks when the heading is gone.
const memoTurn = [
  userText('build'),
  toolUse('Write', {
    file_path: '.ai-workflow/hermes-inbox/pending/20260804T000000Z-vs-claude-x.md',
  }),
].join('\n');

test('memo WITHOUT a mistakes section is blocked', () => {
  const reason = decide({}, memoTurn, () => `## What I did
- shipped x`) ?? '';
  assert.match(reason, /missing its mistakes section/);
});

test('memo WITH a mistakes section passes', () => {
  assert.equal(decide({}, memoTurn, () => `## Mistakes I made
- got x wrong -> caught by y -> rule: z`), null);
});

test('honest-empty mistakes form passes (heading present, hostile pass ran dry)', () => {
  assert.equal(
    decide({}, memoTurn, () => '## Mistakes I made — none surfaced this task'),
    null,
  );
});

test('unreadable memo fails OPEN — a heuristic gate must never false-block', () => {
  assert.equal(decide({}, memoTurn, () => { throw new Error('ENOENT'); }), null);
});

test('memoMissingMistakes accepts any heading depth and names the offending file', () => {
  assert.equal(memoMissingMistakes(['a.md'], () => '#### Mistakes I made'), null);
  assert.equal(memoMissingMistakes(['bad.md'], () => 'no heading at all'), 'bad.md');
});

// HOSTILE ROUND 2026-08-04: headings that only LOOK like the contract must not
// satisfy it — otherwise the gate can be waived by renaming, which is exactly
// the deny-list failure this whole enforcement chain exists to prevent.
test('lookalike headings do not satisfy the mistakes contract', () => {
  for (const text of [
    '## Mistakes-adjacent notes',      // hyphen-joined word, not the section
    '## Mistaken assumptions\n- x',    // different word entirely
    'prose mentioning Mistakes I made but with no heading',
    'Some text ## Mistakes I made',    // not at line start
  ]) {
    assert.equal(memoMissingMistakes(['bad.md'], () => text), 'bad.md', text);
  }
});

test('legitimate heading variations still satisfy it', () => {
  for (const text of [
    '## Mistakes I made\n- x',
    '## mistakes i made\n- x',         // case-insensitive
    '   ## Mistakes I made',           // indented
    '##Mistakes I made',               // no space after hashes
    '## Mistakes I made — none surfaced this task',
  ]) {
    assert.equal(memoMissingMistakes(['ok.md'], () => text), null, text);
  }
});

test('stop_hook_active still short-circuits even with a non-compliant memo', () => {
  assert.equal(
    decide({ stop_hook_active: true }, memoTurn, () => 'no mistakes heading'),
    null,
  );
});
